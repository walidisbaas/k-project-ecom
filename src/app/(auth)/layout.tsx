import { GradientBg } from "@/components/gradient-bg";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen font-body text-mk-text">
      <GradientBg />
      {children}
    </div>
  );
}
