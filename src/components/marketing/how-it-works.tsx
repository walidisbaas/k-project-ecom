const STEPS = [
  {
    number: 1,
    title: "Connect your Shopify store",
    description:
      "One click. Kenso instantly learns your products, policies, shipping info, and order data.",
    badge: "30 seconds",
  },
  {
    number: 2,
    title: "Connect your email",
    description:
      "Gmail, Outlook, or custom domain. Kenso reads incoming customer emails and matches them to orders automatically.",
    badge: "30 seconds",
  },
  {
    number: 3,
    title: "Review and go live",
    description:
      "Check your brand voice settings, set what gets auto-replied vs. flagged for you, and flip the switch. Kenso starts handling emails immediately.",
    badge: "1 minute",
  },
];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden px-6 py-20">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-mk-bg-warm/80 to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_0%,rgba(255,241,224,0.4)_50%,transparent_100%)]" />
      <div className="relative mx-auto max-w-[680px]">
        {/* Section label */}
        <p className="text-center text-sm font-semibold uppercase tracking-[1.5px] text-mk-accent-text">
          How it works
        </p>

        {/* Headline */}
        <h2 className="mx-auto mt-4 max-w-[500px] text-center font-heading text-[clamp(32px,4.5vw,44px)] leading-[1.15] text-mk-text">
          Set up in 2 minutes.
          <br />
          Never think about it again.
        </h2>

        {/* Steps */}
        <div className="mt-14 space-y-8">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="flex gap-5 rounded-xl border border-mk-border bg-white/95 p-6 shadow-[0_1px_2px_rgba(26,18,7,0.04)] backdrop-blur-sm"
            >
              {/* Number */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mk-accent text-lg font-bold text-white">
                {step.number}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-mk-text">
                    {step.title}
                  </h3>
                  <span className="rounded-full border border-mk-border bg-mk-bg px-3 py-0.5 text-sm font-medium text-mk-text-muted">
                    {step.badge}
                  </span>
                </div>
                <p className="mt-2 text-base leading-relaxed text-mk-text-secondary">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
