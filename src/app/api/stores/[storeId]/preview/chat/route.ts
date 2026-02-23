import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openrouter, PREVIEW_MODEL } from "@/lib/openrouter/client";
import { buildPreviewSystemPrompt } from "@/lib/openrouter/prompts";

export const maxDuration = 30;
import type { Json, WebsitePage, PreviewThreadMessage } from "@/types";
import { z } from "zod";

type Params = { params: Promise<{ storeId: string }> };

const chatRequestSchema = z.object({
  threadId: z.string().uuid().nullable().optional(),
  subject: z.string().max(200).nullable().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["customer", "ai"]),
        text: z.string().min(1).max(5000),
      })
    )
    .min(1)
    .max(20),
});

/**
 * POST: Generate an AI reply for the onboarding preview chat.
 * Uses the store's crawled website_pages as context.
 * Persists the thread to preview_threads table.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { storeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, store_name, website_url, sign_off, website_pages")
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const pages = (store.website_pages ?? []) as WebsitePage[];
  const systemPrompt = buildPreviewSystemPrompt(store, pages);

  const chatMessages = parsed.data.messages.map((msg) => ({
    role: (msg.role === "customer" ? "user" : "assistant") as
      | "user"
      | "assistant",
    content: msg.text,
  }));

  try {
    const response = await openrouter.chat.completions.create({
      model: PREVIEW_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
      temperature: 0.4,
      max_tokens: 600,
    });

    const reply = response.choices[0]?.message.content ?? null;

    if (!reply) {
      return NextResponse.json(
        { error: "AI returned empty response" },
        { status: 502 }
      );
    }

    // Build full thread with AI reply included
    const fullMessages: PreviewThreadMessage[] = [
      ...parsed.data.messages,
      { role: "ai", text: reply },
    ];

    // Persist thread + generate follow-up suggestions in parallel
    let threadId = parsed.data.threadId ?? null;

    const threadPromise = (async () => {
      if (threadId) {
        await supabaseAdmin
          .from("preview_threads")
          .update({
            messages: fullMessages as unknown as Json,
            subject: parsed.data.subject ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", threadId)
          .eq("store_id", storeId);
      } else {
        const { data: newThread } = await supabaseAdmin
          .from("preview_threads")
          .insert({
            store_id: storeId,
            subject: parsed.data.subject ?? null,
            messages: fullMessages as unknown as Json,
          })
          .select("id")
          .single();

        threadId = newThread?.id ?? null;
      }
    })();

    // Generate 2 follow-up customer responses the user could send next
    interface Suggestion { label: string; full: string }
    const suggestionsPromise = openrouter.chat.completions
      .create({
        model: PREVIEW_MODEL,
        messages: [
          {
            role: "system",
            content: `You generate realistic follow-up customer replies for a support conversation with ${store.store_name}. Write in the SAME language as the conversation. Return a JSON array of exactly 2 objects, each with "label" (2-4 word summary for a button chip) and "full" (the actual 1-2 sentence customer reply). No markdown.`,
          },
          ...chatMessages,
          { role: "assistant", content: reply },
          {
            role: "user",
            content:
              "Generate 2 follow-up replies this customer would likely send next. Make them different scenarios (e.g. one satisfied, one pushing back). Return as JSON array of 2 objects: [{\"label\": \"short chip text\", \"full\": \"actual customer reply\"}, ...]",
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
        response_format: { type: "json_object" },
      })
      .then((res) => {
        const content = res.choices[0]?.message.content;
        if (!content) return [];
        try {
          const raw = JSON.parse(content);
          const arr: unknown[] = Array.isArray(raw)
            ? raw
            : (typeof raw === "object" && raw !== null
                ? (Object.values(raw).find(Array.isArray) as unknown[] | undefined) ?? []
                : []);
          return arr
            .filter((s): s is Suggestion =>
              typeof s === "object" && s !== null &&
              typeof (s as Suggestion).label === "string" &&
              typeof (s as Suggestion).full === "string"
            )
            .slice(0, 2);
        } catch {
          return [];
        }
      })
      .catch(() => [] as Suggestion[]);

    const [, suggestions] = await Promise.all([threadPromise, suggestionsPromise]);

    return NextResponse.json({ reply, threadId, suggestions });
  } catch (err) {
    const errObj = err as Record<string, unknown>;
    console.error("[preview/chat] OpenRouter error:", {
      storeId,
      message: err instanceof Error ? err.message : "unknown",
      status: errObj?.status,
      code: errObj?.code,
      type: errObj?.type,
    });
    return NextResponse.json(
      { error: "Failed to generate AI reply" },
      { status: 502 }
    );
  }
}
