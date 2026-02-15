import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has at least one onboarded store
  const { data: onboardedStores } = await supabase
    .from("stores")
    .select("id")
    .eq("merchant_id", user.id)
    .gte("onboarding_step", 5)
    .limit(1);

  const hasOnboardedStore = onboardedStores && onboardedStores.length > 0;

  // No sidebar for users still in onboarding (stores list, new store, etc.)
  if (!hasOnboardedStore) {
    return (
      <div className="min-h-screen bg-mk-bg">
        <header className="flex h-20 items-center justify-center border-b border-mk-border/50 bg-white/80 backdrop-blur-sm">
          <span className="font-heading text-2xl text-mk-text">
            kenso
            <sup className="ml-0.5 text-xs font-body font-semibold text-mk-accent">
              AI
            </sup>
          </span>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-mk-bg">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
