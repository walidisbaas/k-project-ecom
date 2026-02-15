export function DemoMockup() {
  return (
    <section className="px-6 pb-20">
      <div className="mx-auto max-w-[680px]">
        <div className="overflow-hidden rounded-2xl border border-mk-border bg-white shadow-[0_1px_3px_rgba(26,18,7,0.06),0_8px_32px_rgba(26,18,7,0.08),0_0_0_1px_rgba(255,255,255,0.5)_inset]">
          {/* Email window chrome */}
          <div className="flex items-center gap-2 border-b border-mk-border bg-mk-bg px-5 py-3">
            <span className="h-3 w-3 rounded-full bg-[#E8DDD0]" />
            <span className="h-3 w-3 rounded-full bg-[#E8DDD0]" />
            <span className="h-3 w-3 rounded-full bg-[#E8DDD0]" />
            <span className="ml-3 text-sm font-medium text-mk-text-muted">
              Inbox — Re: Order #4821
            </span>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            {/* Incoming email */}
            <div
              className="mk-fade-up"
              style={{ animationDelay: "0.1s", opacity: 0 }}
            >
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mk-accent-light text-sm font-semibold text-mk-accent">
                  SM
                </div>
                <div>
                  <span className="text-base font-semibold text-mk-text">
                    Sarah Mitchell
                  </span>
                  <span className="ml-2 text-sm text-mk-text-muted">
                    2 min ago
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-mk-border bg-mk-bg p-4">
                <p className="text-base leading-relaxed text-mk-text-secondary">
                  Hi, I ordered a jacket 5 days ago and still haven&apos;t
                  received any shipping update. Can you tell me where my order
                  is? I need it by Friday.
                </p>
              </div>
            </div>

            {/* AI Response */}
            <div
              className="mk-fade-up"
              style={{ animationDelay: "0.4s", opacity: 0 }}
            >
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mk-green-light text-sm font-semibold text-mk-green">
                  K
                </div>
                <div>
                  <span className="text-base font-semibold text-mk-text">
                    Kenso AI
                  </span>
                  <span className="mx-1.5 text-sm text-mk-text-muted">→</span>
                  <span className="text-base text-mk-text-muted">
                    Sarah Mitchell
                  </span>
                  <span className="ml-2 text-sm text-mk-accent">
                    11 seconds later
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-mk-green/20 bg-mk-green-light/50 p-4">
                <p className="text-base leading-relaxed text-mk-text-secondary">
                  Hi Sarah! I just checked your order #4821 — great news. Your
                  Wool Bomber Jacket shipped yesterday via DHL Express.
                  Here&apos;s your tracking link: dhl.com/track/8294… It&apos;s
                  currently in transit from our warehouse and estimated delivery
                  is Thursday, Feb 12 — right before your Friday deadline! Let me
                  know if there&apos;s anything else I can help with{" "}
                  <span role="img" aria-label="smile">
                    😊
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Resolve tag */}
          <div className="border-t border-mk-border bg-mk-bg px-5 py-3">
            <div
              className="mk-fade-up inline-flex items-center gap-2 rounded-full bg-mk-green-light px-3 py-1.5 text-sm font-medium text-mk-green"
              style={{ animationDelay: "0.7s", opacity: 0 }}
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Resolved in 11 seconds — no human needed
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
