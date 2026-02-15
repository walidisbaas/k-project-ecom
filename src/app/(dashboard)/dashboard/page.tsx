"use client";

import { Suspense } from "react";

import { useSearchParams } from "next/navigation";
import { useStats } from "@/hooks/use-stats";
import { useConversations } from "@/hooks/use-conversations";
import { StatsCard } from "@/components/dashboard/stats-card";
import { IntentChart } from "@/components/dashboard/intent-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get("store");

  const { stats, loading: statsLoading } = useStats(storeId);
  const { conversations, loading: convoLoading } = useConversations(storeId);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-mk-text-muted">
        Select a store from the sidebar to view your dashboard.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-mk-text font-heading">Dashboard</h1>
      <p className="mt-1 text-mk-text-muted">
        Overview of your AI email support performance.
      </p>

      {/* Stats cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </>
        ) : stats ? (
          <>
            <StatsCard
              title="Emails today"
              value={stats.emails_today}
            />
            <StatsCard
              title="This week"
              value={stats.emails_this_week}
            />
            <StatsCard
              title="Auto-resolve rate"
              value={`${Math.round(stats.auto_resolve_rate * 100)}%`}
            />
            <StatsCard
              title="Avg response"
              value={
                stats.avg_response_time_ms > 0
                  ? `${(stats.avg_response_time_ms / 1000).toFixed(1)}s`
                  : "—"
              }
            />
          </>
        ) : (
          <div className="col-span-4 text-center text-mk-text-muted">
            No data yet
          </div>
        )}
      </div>

      {/* Usage bar */}
      {stats && (
        <div className="mt-6 rounded-xl border border-mk-border bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-mk-text-secondary">Monthly usage</p>
            <p className="text-sm text-mk-text-muted">
              {stats.emails_used} / {stats.emails_limit} emails
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-mk-border">
            <div
              className="h-full rounded-full bg-mk-accent transition-all"
              style={{
                width: `${Math.min(
                  (stats.emails_used / stats.emails_limit) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Intent chart */}
        <div className="rounded-xl border border-mk-border bg-white p-5">
          <h2 className="text-sm font-medium text-mk-text-secondary">
            Intent breakdown
          </h2>
          {statsLoading ? (
            <Skeleton className="mt-4 h-60" />
          ) : (
            <IntentChart data={stats?.top_intents ?? []} />
          )}
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-mk-border bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-mk-text-secondary">
            Recent activity
          </h2>
          {convoLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <ActivityFeed items={conversations.slice(0, 10)} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
