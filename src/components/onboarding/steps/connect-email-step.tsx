"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectEmailForm } from "@/components/onboarding/connect-email-form";
import { ArrowRight, ArrowLeft } from "lucide-react";
import Image from "next/image";
import type { Store, EmailConnection } from "@/types";

interface ConnectEmailStepProps {
  storeId: string;
  onNext: () => void;
  onBack: () => void;
}

export function ConnectEmailStep({
  storeId,
  onNext,
  onBack,
}: ConnectEmailStepProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [emailConn, setEmailConn] = useState<EmailConnection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/stores/${storeId}`);
        if (res.ok) {
          const data = (await res.json()) as {
            data: Store & { email_connections?: EmailConnection[] };
          };
          setStore(data.data);
          if (data.data.email_connections?.length) {
            setEmailConn(data.data.email_connections[0]);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [storeId]);

  const isConnected = emailConn?.connection_status === "active";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col justify-center">
      <div className="text-center onboarding-stagger-1">
        <div className="mb-6 flex items-center justify-center gap-5">
          <Image src="/gmail-icon.svg" alt="Gmail" width={48} height={48} />
          <Image src="/outlook-icon.svg" alt="Outlook" width={48} height={48} />
        </div>
        <h1 className="font-heading text-4xl leading-tight text-mk-text sm:text-5xl">
          Connect your support email
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-mk-text-muted">
          Connect the inbox that receives customer emails for{" "}
          <span className="font-medium text-mk-text-secondary">
            {store?.store_name}
          </span>
          . Kenso will start handling replies automatically.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-lg onboarding-stagger-2">
        <ConnectEmailForm
          storeId={storeId}
          connected={isConnected}
          emailAddress={emailConn?.email_address}
        />
      </div>

      <div className="mt-12 flex justify-between onboarding-stagger-3">
        <Button variant="outline" size="lg" onClick={onBack} className="h-12">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-3">
          {!isConnected && (
            <Button variant="ghost" size="lg" onClick={onNext} className="h-12">
              Skip for now
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={!isConnected}
            size="lg"
            className="h-12 bg-mk-accent hover:bg-mk-accent-hover"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
