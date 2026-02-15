const WITHOUT_KENSO = [
  { label: "Your time on support", value: "2-4 hrs/day" },
  { label: "Avg. reply time", value: "3-8 hours" },
  { label: "Cost (your time or VA)", value: "€800-1500/mo" },
  { label: "Missed on weekends", value: "Yes" },
];

const WITH_KENSO = [
  { label: "Your time on support", value: "~15 min/day" },
  { label: "Avg. reply time", value: "Under 30 sec" },
  { label: "Cost", value: "€79/mo" },
  { label: "Missed on weekends", value: "Never" },
];

export function TheMath() {
  return (
    <section className="relative overflow-hidden px-6 py-20">
      <div className="absolute inset-0 bg-[linear-gradient(165deg,#1A1207_0%,#2A1F12_40%,#1A1207_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(224,90,26,0.15)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_20%_80%,rgba(29,122,78,0.08)_0%,transparent_50%)]" />
      <div className="relative mx-auto max-w-[680px]">
        {/* Section label */}
        <p className="text-center text-sm font-semibold uppercase tracking-[1.5px] text-[#F28C5A]">
          The math
        </p>

        {/* Headline */}
        <h2 className="mt-4 text-center font-heading text-[clamp(32px,4.5vw,44px)] leading-[1.15] text-white">
          What support actually costs you right now.
        </h2>

        {/* Comparison */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {/* Without Kenso */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-base font-semibold uppercase tracking-wider text-white/50">
              Without Kenso
            </h3>
            <div className="mt-5 space-y-4">
              {WITHOUT_KENSO.map((metric) => (
                <div key={metric.label}>
                  <p className="text-sm text-white/40">{metric.label}</p>
                  <p className="mt-0.5 text-xl font-semibold text-white/80">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* With Kenso */}
          <div className="rounded-xl border border-[#E05A1A]/30 bg-[#E05A1A]/10 p-6">
            <h3 className="text-base font-semibold uppercase tracking-wider text-[#F28C5A]">
              With Kenso
            </h3>
            <div className="mt-5 space-y-4">
              {WITH_KENSO.map((metric) => (
                <div key={metric.label}>
                  <p className="text-sm text-white/40">{metric.label}</p>
                  <p className="mt-0.5 text-xl font-semibold text-white">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Callout */}
        <div className="mt-12 text-center">
          <p className="font-heading text-[clamp(40px,5.5vw,52px)] leading-none text-[#F28C5A]">
            60+ hours/month
          </p>
          <p className="mt-3 text-lg text-white/60">
            back in your hands — to grow your store, not babysit your inbox
          </p>
        </div>
      </div>
    </section>
  );
}
