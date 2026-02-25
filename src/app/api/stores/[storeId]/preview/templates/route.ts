import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openrouter, PREVIEW_MODEL } from "@/lib/openrouter/client";
import { buildTemplateGenerationPrompt } from "@/lib/openrouter/prompts";
import type { Json, WebsitePage } from "@/types";

export const maxDuration = 30;

type Params = { params: Promise<{ storeId: string }> };

interface TemplateChipRaw {
  label: string;
  email: string;
  product_name?: string;
}

interface TemplateChip {
  label: string;
  email: string;
}

/**
 * GET: Return personalized customer email templates for the preview step.
 * Generated from the store's crawled website_pages content.
 * Cached in scrape_data.templates after first generation.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, store_name, website_pages, scrape_data, primary_language")
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Check cache first
  const scrapeData = (store.scrape_data ?? {}) as Record<string, unknown>;
  if (Array.isArray(scrapeData.templates) && scrapeData.templates.length > 0) {
    return NextResponse.json({ templates: scrapeData.templates });
  }

  const pages = (store.website_pages ?? []) as WebsitePage[];
  if (pages.length === 0) {
    return NextResponse.json({ templates: [] });
  }

  try {
    const language = (store.primary_language as string) || "en";
    const prompt = buildTemplateGenerationPrompt(store.store_name, pages, language);

    const response = await openrouter.chat.completions.create({
      model: PREVIEW_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      return NextResponse.json({ templates: [] });
    }

    // Parse — handle both raw array and wrapped object
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ templates: [] });
    }

    let raw: TemplateChipRaw[];
    if (Array.isArray(parsed)) {
      raw = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      const arr = Object.values(parsed as Record<string, unknown>).find(Array.isArray);
      if (!arr) return NextResponse.json({ templates: [] });
      raw = arr as TemplateChipRaw[];
    } else {
      return NextResponse.json({ templates: [] });
    }

    // Validate shape and build final labels
    const FIXED_LABELS = ["Where is my order?", "Return request"];
    const templates: TemplateChip[] = raw
      .filter(
        (t) =>
          typeof t.label === "string" &&
          typeof t.email === "string" &&
          t.label.length > 0 &&
          t.email.length > 0
      )
      .slice(0, 3)
      .map((t, i) => ({
        label:
          i < 2
            ? FIXED_LABELS[i]
            : t.product_name
              ? `Question about ${t.product_name}`
              : "Product question",
        email: t.email,
      }));

    if (templates.length === 0) {
      return NextResponse.json({ templates: [] });
    }

    // Cache in scrape_data
    await supabaseAdmin
      .from("stores")
      .update({
        scrape_data: { ...scrapeData, templates } as unknown as Json,
      })
      .eq("id", storeId);

    return NextResponse.json({ templates });
  } catch (err) {
    console.error("[preview/templates] Generation failed:", {
      storeId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ templates: [] });
  }
}
