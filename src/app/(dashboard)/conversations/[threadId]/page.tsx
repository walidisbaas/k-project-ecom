"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Bot, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ThreadMessage {
  id: string;
  from: string;
  to?: string;
  subject: string;
  body: string;
  date: string;
  is_reply: boolean;
}

interface ThreadData {
  thread_id: string;
  subject: string;
  messages: ThreadMessage[];
  intent: string | null;
  order_number: string | null;
}

function ThreadDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const threadId = params.threadId as string;
  const storeId = searchParams.get("store");

  const [thread, setThread] = useState<ThreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId || !threadId) return;

    const fetchThread = async () => {
      try {
        const res = await fetch(
          `/api/stores/${storeId}/conversations?thread_id=${threadId}`
        );
        if (!res.ok) throw new Error("Failed to load thread");
        const data = (await res.json()) as { data: ThreadData };
        setThread(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void fetchThread();
  }, [storeId, threadId]);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-mk-text-muted">
        Missing store parameter.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/conversations?store=${storeId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-mk-text-muted hover:text-mk-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to conversations
      </Link>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
          {error}
        </div>
      ) : thread ? (
        <>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-mk-text font-heading">
              {thread.subject || "No subject"}
            </h1>
            {thread.intent && (
              <Badge className="bg-mk-accent-light text-mk-accent">
                {thread.intent}
              </Badge>
            )}
            {thread.order_number && (
              <Badge variant="secondary">#{thread.order_number}</Badge>
            )}
          </div>

          <div className="mt-6 space-y-4">
            {thread.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-xl border p-5",
                  msg.is_reply
                    ? "border-mk-accent/20 bg-mk-accent-light"
                    : "border-mk-border bg-white"
                )}
              >
                <div className="flex items-center gap-2">
                  {msg.is_reply ? (
                    <Bot className="h-4 w-4 text-mk-accent" />
                  ) : (
                    <User className="h-4 w-4 text-mk-text-muted" />
                  )}
                  <span className="text-sm font-medium text-mk-text-secondary">
                    {msg.from}
                  </span>
                  <span className="text-xs text-mk-text-muted">
                    {formatDistanceToNow(new Date(msg.date), {
                      addSuffix: true,
                    })}
                  </span>
                  {msg.is_reply && (
                    <Badge className="bg-mk-accent-light text-mk-accent text-xs">
                      Kenso AI
                    </Badge>
                  )}
                </div>
                <div className="mt-3 whitespace-pre-wrap text-sm text-mk-text-secondary">
                  {msg.body}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-mk-border bg-mk-bg p-4 text-center text-sm text-mk-text-muted">
            <Mail className="mx-auto mb-2 h-5 w-5 text-mk-text-muted" />
            Email content is fetched live from Nylas and is never stored in
            Kenso.
          </div>
        </>
      ) : (
        <div className="text-center text-mk-text-muted">Thread not found.</div>
      )}
    </div>
  );
}

export default function ThreadDetailPage() {
  return (
    <Suspense>
      <ThreadDetailContent />
    </Suspense>
  );
}
