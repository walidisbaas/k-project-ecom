import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Plus, Circle, Store, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function StoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("*, email_connections(connection_status)")
    .eq("merchant_id", user.id)
    .order("created_at", { ascending: false });

  // Auto-redirect: new user with no stores → onboarding wizard (creates store as step 0)
  if (!stores || stores.length === 0) {
    redirect("/onboarding");
  }

  // Auto-redirect: single un-onboarded store → go straight to onboarding
  if (stores.length === 1 && !stores[0].is_live && stores[0].onboarding_step < 5) {
    redirect(`/onboarding?store_id=${stores[0].id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-mk-text font-heading">Your stores</h1>
          <p className="mt-1 text-mk-text-muted">
            Select a store to manage it, or add a new one.
          </p>
        </div>
        <Button asChild className="bg-mk-accent hover:bg-mk-accent-hover">
          <Link href="/stores/new">
            <Plus className="mr-2 h-4 w-4" />
            Add store
          </Link>
        </Button>
      </div>

      {!stores || stores.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-mk-border py-16 text-center">
          <Store className="mx-auto h-10 w-10 text-mk-border" />
          <p className="mt-4 font-medium text-mk-text-muted">No stores yet</p>
          <p className="mt-1 text-sm text-mk-text-muted">
            Add your first store to get started.
          </p>
          <Button asChild className="mt-6 bg-mk-accent hover:bg-mk-accent-hover">
            <Link href="/stores/new">
              <Plus className="mr-2 h-4 w-4" />
              Add your first store
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => {
            const emailConn = Array.isArray(store.email_connections)
              ? store.email_connections[0]
              : store.email_connections;
            const isConnBroken =
              emailConn?.connection_status === "broken";

            const storeHref =
              store.is_live || store.onboarding_step >= 5
                ? `/dashboard?store=${store.id}`
                : `/onboarding?store_id=${store.id}`;

            return (
              <Link
                key={store.id}
                href={storeHref}
                className="flex items-center justify-between rounded-xl border border-mk-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mk-accent-light">
                    <Store className="h-5 w-5 text-mk-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-mk-text">
                        {store.store_name}
                      </p>
                      {store.is_live ? (
                        <Badge className="bg-mk-green-light text-mk-green hover:bg-mk-green-light">
                          Live
                        </Badge>
                      ) : store.onboarding_step < 5 ? (
                        <Badge
                          variant="secondary"
                          className="bg-yellow-100 text-yellow-700"
                        >
                          Continue setup
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Paused</Badge>
                      )}
                      {isConnBroken && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                          Connection broken
                        </Badge>
                      )}
                    </div>
                    {store.website_url && (
                      <p className="mt-0.5 text-sm text-mk-text-muted">
                        {store.website_url}
                      </p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-mk-text-muted" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
