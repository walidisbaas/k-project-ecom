import Link from "next/link";
import { ChatWidget } from "@/components/marketing/chat-widget";
import { GradientBg } from "@/components/gradient-bg";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="marketing"
      className="relative min-h-screen font-body text-mk-text"
    >
      <GradientBg />
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-mk-border/50 bg-[rgba(255,248,240,0.85)] backdrop-blur-md">
        <nav className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-4">
          <Link href="/" className="font-heading text-3xl text-mk-text">
            kenso
            <sup className="ml-1 text-[13px] font-body font-semibold text-mk-accent">
              AI
            </sup>
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-mk-text px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-mk-text/90"
          >
            Start Free Trial
          </Link>
        </nav>
      </header>

      {children}

      <ChatWidget />

      {/* Footer */}
      <footer className="border-t border-mk-border bg-gradient-to-b from-transparent to-[rgba(26,18,7,0.02)] py-10">
        <p className="text-center text-sm text-mk-text-secondary">
          &copy; 2026 Kenso AI &middot;{" "}
          <Link href="/privacy" className="hover:text-mk-text">
            Privacy
          </Link>{" "}
          &middot;{" "}
          <Link href="/terms" className="hover:text-mk-text">
            Terms
          </Link>{" "}
          &middot;{" "}
          <Link href="mailto:hello@kenso.ai" className="hover:text-mk-text">
            Contact
          </Link>
        </p>
      </footer>
    </div>
  );
}
