import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { GradientBg } from "@/components/gradient-bg";

export default async function OnboardingLayout({
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

  return (
    <div className="relative min-h-[100dvh]">
      <GradientBg />
      <header className="relative z-50 flex h-20 items-center justify-center">
        <Link href="/stores" className="flex items-center gap-2">
          <span className="font-heading text-3xl text-mk-text">
            kenso
            <sup className="ml-0.5 text-sm font-body font-semibold text-mk-accent">
              AI
            </sup>
          </span>
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-8 sm:px-8 sm:pb-10">{children}</main>
    </div>
  );
}
