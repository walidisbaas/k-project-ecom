const CAPABILITIES = [
  {
    emoji: "📦",
    title: '"Where is my order?"',
    description:
      "Pulls real-time tracking from Shopify and replies with carrier, status, and estimated delivery date.",
  },
  {
    emoji: "↩️",
    title: '"I want to return this"',
    description:
      "Checks your return policy, verifies eligibility, and walks the customer through next steps.",
  },
  {
    emoji: "👕",
    title: '"Do you have this in my size?"',
    description:
      "Checks live inventory across all variants and responds with availability and direct links.",
  },
  {
    emoji: "🔄",
    title: '"I got the wrong item"',
    description:
      "Identifies the order, apologizes in your brand voice, and initiates a replacement or refund.",
  },
  {
    emoji: "🏷️",
    title: '"Is this still on sale?"',
    description:
      "Checks current pricing and active discount codes, responds with accurate info.",
  },
  {
    emoji: "🚫",
    title: "Angry or complex emails",
    description:
      "Detects frustration or edge cases and forwards them to you instantly — with full context so you can respond fast.",
  },
];

export function Capabilities() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-[680px]">
        {/* Section label */}
        <p className="text-center text-sm font-semibold uppercase tracking-[1.5px] text-mk-accent-text">
          What Kenso handles
        </p>

        {/* Headline */}
        <h2 className="mt-4 text-center font-heading text-[clamp(32px,4.5vw,44px)] leading-[1.15] text-mk-text">
          The emails you&apos;re tired of answering.
        </h2>

        {/* Subheadline */}
        <p className="mx-auto mt-4 max-w-[520px] text-center text-lg text-mk-text-secondary">
          Kenso doesn&apos;t guess. It pulls real data from your Shopify store
          and gives customers actual answers.
        </p>

        {/* Capability cards */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              className="rounded-xl border border-mk-border bg-white/90 p-6 shadow-[0_1px_2px_rgba(26,18,7,0.04)] backdrop-blur-sm transition-all hover:border-mk-accent/40 hover:shadow-[0_4px_16px_rgba(26,18,7,0.06)]"
            >
              <span className="text-3xl" role="img" aria-label={cap.title}>
                {cap.emoji}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-mk-text">
                {cap.title}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-mk-text-secondary">
                {cap.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
