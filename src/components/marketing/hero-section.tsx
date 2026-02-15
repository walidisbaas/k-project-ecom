import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative px-6 pb-16 pt-10 sm:pb-20 sm:pt-14">
      {/* Hero glow */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[400px] -translate-y-1/2">
        <div className="mx-auto h-full max-w-[800px] rounded-full bg-gradient-to-b from-[rgba(224,90,26,0.06)] via-transparent to-transparent blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-[720px] text-center">
        {/* Badge */}
        <div className="group relative mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/60 bg-white/40 px-4 py-1.5 text-sm font-medium text-mk-text-secondary shadow-[0_1px_2px_rgba(255,255,255,0.8)_inset,0_2px_8px_rgba(26,18,7,0.04)] backdrop-blur-md transition-all duration-300 hover:bg-white/55 hover:shadow-[0_1px_2px_rgba(255,255,255,0.9)_inset,0_4px_16px_rgba(26,18,7,0.06)]">
          {/* Soft outer glow */}
          <div className="pointer-events-none absolute -inset-1 rounded-full bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(255,255,255,0.5)_0%,transparent_70%)] opacity-70" aria-hidden />
          <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
            <Image
              src="/shopify-icon.png"
              alt="Shopify"
              width={32}
              height={32}
              className="h-7 w-7 object-contain"
            />
          </span>
          <span className="relative z-10">Built for Shopify stores</span>
        </div>

        {/* Headline */}
        <h1 className="font-heading text-[clamp(42px,6.5vw,64px)] leading-[1.1] tracking-tight text-mk-text">
          You didn&apos;t start a store to answer{" "}
          <em className="font-heading italic text-mk-accent">
            &ldquo;where&apos;s my order?&rdquo;
          </em>{" "}
          all day.
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-[600px] text-lg leading-relaxed text-mk-text-secondary sm:text-xl">
          Kenso connects to your Shopify store and answers every customer email
          in seconds — with real order data, real tracking numbers, and your
          brand voice. You never touch it.
        </p>

        {/* CTA */}
        <div className="mt-10">
          <Link
            href="/signup"
            className="inline-flex items-center rounded-[10px] bg-mk-accent px-9 py-4 text-lg font-semibold text-white shadow-[0_2px_8px_rgba(224,90,26,0.3)] transition-all hover:-translate-y-0.5 hover:bg-mk-accent-hover hover:shadow-[0_4px_16px_rgba(224,90,26,0.35)]"
          >
            Connect Your Store — Free
          </Link>
        </div>
        <p className="relative mt-4 text-base text-mk-text-muted">
          Takes 2 minutes. First 100 emails free. No card needed.
        </p>
      </div>
    </section>
  );
}
