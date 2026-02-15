"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectShopifyForm } from "@/components/onboarding/connect-shopify-form";
import { ArrowRight, ArrowLeft } from "lucide-react";
import Image from "next/image";
import type { Store, ShopifyConnection } from "@/types";

interface ConnectShopifyStepProps {
  storeId: string;
  onNext: () => void;
  onBack: () => void;
}

export function ConnectShopifyStep({
  storeId,
  onNext,
  onBack,
}: ConnectShopifyStepProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [shopifyConn, setShopifyConn] = useState<ShopifyConnection | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/stores/${storeId}`);
        if (res.ok) {
          const data = (await res.json()) as {
            data: Store & { shopify_connections?: ShopifyConnection[] };
          };
          setStore(data.data);
          if (data.data.shopify_connections?.length) {
            setShopifyConn(data.data.shopify_connections[0]);
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

  const isConnected = !!shopifyConn;

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
        <div className="mb-6 flex items-center justify-center">
          <Image src="/shopify-icon.png" alt="Shopify" width={56} height={56} />
        </div>
        <h1 className="font-heading text-4xl leading-tight text-mk-text sm:text-5xl">
          Connect Shopify
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-mk-text-muted">
          Connect your Shopify store so Kenso can look up order details for{" "}
          <span className="font-medium text-mk-text-secondary">
            {store?.store_name}
          </span>
          .
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-lg onboarding-stagger-2">
        <ConnectShopifyForm
          storeId={storeId}
          connected={isConnected}
          shopDomain={shopifyConn?.shop_domain}
          websiteUrl={store?.website_url}
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
            size="lg"
            className="h-12 bg-mk-text text-white hover:bg-mk-text/90"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
