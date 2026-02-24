"use client";

import { useEffect, useState } from "react";

const TOTAL_STEPS = 5;

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Delay to allow the bar to animate from 0 on first mount
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const progress = mounted
    ? Math.min(((currentStep - 1) / (TOTAL_STEPS - 1)) * 100, 100)
    : 0;

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mb-4 h-[2px] w-screen bg-mk-border/40 sm:mb-8">
      <div
        className="h-full bg-mk-accent transition-all duration-700 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
