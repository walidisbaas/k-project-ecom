export function GradientBg() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#FFFBF7_0%,#FFF8F0_25%,#FFF1E0_60%,#FFF8F0_100%)]" />
      <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[rgba(254,240,232,0.7)] via-[rgba(255,241,224,0.35)] to-transparent blur-3xl" />
      <div className="absolute right-0 top-1/3 h-[400px] w-[500px] rounded-full bg-gradient-to-l from-[rgba(232,245,238,0.5)] via-transparent to-transparent blur-3xl" />
      <div className="absolute bottom-1/4 left-0 h-[350px] w-[400px] rounded-full bg-gradient-to-r from-[rgba(255,241,224,0.6)] via-transparent to-transparent blur-3xl" />
    </div>
  );
}
