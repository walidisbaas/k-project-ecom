"use client";

import { Suspense } from "react";

import { useSearchParams } from "next/navigation";
import { useConversations } from "@/hooks/use-conversations";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

function ConversationsContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get("store");

  const { conversations, loading, refetch } = useConversations(storeId);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-mk-text-muted">
        Select a store to view conversations.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-mk-text font-heading">Conversations</h1>
          <p className="mt-1 text-mk-text-muted">
            All email threads processed by Kenso.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : (
          <ConversationList items={conversations} storeId={storeId} />
        )}
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense>
      <ConversationsContent />
    </Suspense>
  );
}
