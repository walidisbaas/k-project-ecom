"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Mail, Bot } from "lucide-react";
import type { EmailPreview } from "@/types";

interface PreviewWidgetProps {
  storeId: string;
}

export function PreviewWidget({ storeId }: PreviewWidgetProps) {
  const [previews, setPreviews] = useState<EmailPreview[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPreviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/preview`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to fetch previews");
      const data = (await res.json()) as { data: EmailPreview[] };
      setPreviews(data.data ?? []);
    } catch {
      // Failed to load previews
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-mk-text-muted">
          See how Kenso would reply to your recent emails.
        </p>
        <Button
          onClick={fetchPreviews}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {previews.length > 0 ? "Refresh" : "Load previews"}
        </Button>
      </div>

      {previews.length === 0 && !loading && (
        <div className="flex h-56 items-center justify-center rounded-xl border-2 border-dashed border-mk-border text-base text-mk-text-muted">
          Click &quot;Load previews&quot; to see how Kenso would handle your emails.
        </div>
      )}

      {previews.map((preview, index) => (
        <div
          key={index}
          className="rounded-xl border border-mk-border bg-white p-6"
        >
          {/* Original email */}
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 text-mk-text-muted" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-mk-text-secondary">
                  {preview.original.from}
                </span>
                {preview.intent && (
                  <Badge className="bg-mk-accent-light text-mk-accent text-xs">
                    {preview.intent}
                  </Badge>
                )}
                {preview.order_found && (
                  <Badge className="bg-mk-green-light text-mk-green text-xs">
                    Order found
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-mk-text">
                {preview.original.subject}
              </p>
              <p className="mt-1 text-sm text-mk-text-muted">
                {preview.original.snippet}
              </p>
            </div>
          </div>

          {/* AI Reply */}
          {preview.ai_reply && (
            <div className="mt-4 flex items-start gap-3 border-t border-mk-border pt-4">
              <Bot className="mt-0.5 h-4 w-4 text-mk-accent" />
              <div className="flex-1">
                <p className="text-xs font-medium text-mk-accent">
                  Kenso would reply:
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-mk-text-secondary">
                  {preview.ai_reply}
                </p>
              </div>
            </div>
          )}

          {preview.error && (
            <div className="mt-4 border-t border-mk-border pt-4">
              <p className="text-sm text-red-500">{preview.error}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
