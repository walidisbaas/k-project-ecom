import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden px-6 py-20">
      <div className="absolute inset-0 bg-gradient-to-br from-mk-bg-warm via-[#FFF8F0] to-[#FFF1E0]" />
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[rgba(224,90,26,0.06)] to-transparent" />
      <div className="relative mx-auto max-w-[600px] text-center">
        <h2 className="font-heading text-[clamp(32px,4.5vw,44px)] leading-[1.15] text-mk-text">
          Get your evenings back.
        </h2>

        <p className="mt-4 text-lg text-mk-text-secondary sm:text-xl">
          Connect your store in 2 minutes. Let Kenso handle the emails
          you&apos;re tired of answering. Your first 100 emails are free.
        </p>

        <div className="mt-8">
          <Link
            href="/signup"
            className="inline-flex items-center rounded-[10px] bg-mk-accent px-9 py-4 text-lg font-semibold text-white shadow-[0_2px_8px_rgba(224,90,26,0.3)] transition-all hover:-translate-y-0.5 hover:bg-mk-accent-hover hover:shadow-[0_4px_16px_rgba(224,90,26,0.35)]"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </section>
  );
}
