"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { CreateStoreStep } from "@/components/onboarding/steps/create-store-step";
import { ConfirmStoreStep } from "@/components/onboarding/steps/confirm-store-step";
import { PreviewStep } from "@/components/onboarding/steps/preview-step";
import { FeaturesOverviewStep } from "@/components/onboarding/steps/features-overview-step";
import { GoLiveStep } from "@/components/onboarding/steps/go-live-step";
import { cn } from "@/lib/utils";
import type { Store } from "@/types";

function OnboardingWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStoreId = searchParams.get("store_id");

  const [storeId, setStoreId] = useState<string | null>(initialStoreId);
  // Step 1 = URL (create store), steps 2-6 = onboarding
  const [currentStep, setCurrentStep] = useState(initialStoreId ? 2 : 1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [loading, setLoading] = useState(!!initialStoreId);
  const initialStepSet = useRef(false);

  // Fetch store to determine the initial step (only when we have a storeId)
  useEffect(() => {
    if (!storeId || initialStepSet.current) return;

    const fetchStore = async () => {
      try {
        const res = await fetch(`/api/stores/${storeId}`);
        if (res.ok) {
          const data = (await res.json()) as { data: Store };
          const store = data.data;

          if (store.is_live) {
            router.replace(`/dashboard?store=${storeId}`);
            return;
          }

          // DB steps 1-4 map to UI steps 2-5; clamp old steps to 4 (Features Overview)
          const dbStep = Math.min(Math.max(store.onboarding_step ?? 1, 1), 4);
          setCurrentStep(dbStep + 1);
          initialStepSet.current = true;
        }
      } catch {
        // fallback to step 1
      } finally {
        setLoading(false);
      }
    };

    void fetchStore();
  }, [storeId, router]);

  const goToStep = useCallback(
    (step: number) => {
      setDirection(step > currentStep ? "forward" : "backward");
      setCurrentStep(step);
      window.scrollTo(0, 0);
    },
    [currentStep]
  );

  const handleStoreCreated = useCallback((newStoreId: string) => {
    // Prevent the store-fetch useEffect from overriding the step
    initialStepSet.current = true;
    setStoreId(newStoreId);
    // Update URL so refresh works
    window.history.replaceState(null, "", `/onboarding?store_id=${newStoreId}`);
    setDirection("forward");
    setCurrentStep(2);
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className="space-y-10">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-6 w-64" />
        <div className="mt-4 grid grid-cols-2 gap-8">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Steps 1-5: onboarding wizard
  const stepContent: Record<number, React.ReactNode> = {
    1: <CreateStoreStep onCreated={handleStoreCreated} />,
    2: (
      <ConfirmStoreStep
        storeId={storeId!}
        onNext={() => goToStep(3)}
        onBack={() => goToStep(1)}
      />
    ),
    3: (
      <PreviewStep
        storeId={storeId!}
        onNext={() => goToStep(4)}
        onBack={() => goToStep(2)}
      />
    ),
    4: (
      <FeaturesOverviewStep
        onNext={() => goToStep(5)}
        onBack={() => goToStep(3)}
      />
    ),
    5: <GoLiveStep storeId={storeId!} onBack={() => goToStep(4)} />,
  };

  return (
    <div>
      {currentStep >= 2 && (
        <StepIndicator currentStep={currentStep} onStepClick={goToStep} />
      )}

      <div
        key={currentStep}
        className={cn(
          direction === "forward"
            ? "onboarding-enter-forward"
            : "onboarding-enter-backward"
        )}
      >
        {stepContent[currentStep]}
      </div>
    </div>
  );
}

export default function OnboardingWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-10">
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-6 w-64" />
          <div className="mt-4 grid grid-cols-2 gap-8">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      }
    >
      <OnboardingWizardContent />
    </Suspense>
  );
}
