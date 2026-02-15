const PAIN_POINTS = [
  {
    emoji: "📬",
    title: "Same 5 questions, 50 times a day",
    description:
      '"Where\'s my order?" "Can I return this?" "Do you have this in medium?" You could answer them in your sleep. Actually, you do.',
  },
  {
    emoji: "⏰",
    title: "Slow replies cost you money",
    description:
      "Every hour a customer waits, the chance of a chargeback goes up and the chance of a repeat purchase goes down. You know this but you can't reply faster alone.",
  },
  {
    emoji: "💸",
    title: "Hiring help doesn't actually help",
    description:
      "A VA costs €500-1500/month, takes weeks to train, still gets things wrong, and you end up checking their work anyway. You traded one problem for two.",
  },
  {
    emoji: "🔥",
    title: "Support is eating your growth time",
    description:
      "Every hour you spend on support is an hour you're not spending on product, marketing, or the things that actually grow revenue. Support is important — but it shouldn't be YOUR job anymore.",
  },
];

export function PainSection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-[680px]">
        {/* Section label */}
        <p className="text-center text-sm font-semibold uppercase tracking-[1.5px] text-mk-accent-text">
          Sound familiar?
        </p>

        {/* Headline */}
        <h2 className="mx-auto mt-4 max-w-[600px] text-center font-heading text-[clamp(32px,4.5vw,44px)] leading-[1.15] text-mk-text">
          You&apos;re running the store, the ads, the product — and also
          answering emails until midnight.
        </h2>

        {/* Pain point cards */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {PAIN_POINTS.map((point) => (
            <div
              key={point.title}
              className="rounded-xl border border-mk-border bg-white/90 p-6 shadow-[0_1px_2px_rgba(26,18,7,0.04)] backdrop-blur-sm transition-all hover:border-mk-accent/40 hover:shadow-[0_4px_16px_rgba(26,18,7,0.06)]"
            >
              <span className="text-3xl" role="img" aria-label={point.title}>
                {point.emoji}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-mk-text">
                {point.title}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-mk-text-secondary">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
