"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle, Lock } from "lucide-react";

interface ConnectEmailFormProps {
  storeId: string;
  connected?: boolean;
  emailAddress?: string;
}

export function ConnectEmailForm({
  storeId,
  connected = false,
  emailAddress,
}: ConnectEmailFormProps) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/auth/nylas/callback?store_id=${storeId}&action=auth_url`
      );
      if (!res.ok) throw new Error("Failed to get auth URL");
      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  if (connected) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-mk-green/20 bg-mk-green-light px-6 py-8 text-center">
        <CheckCircle className="h-8 w-8 text-mk-green" />
        <p className="mt-3 text-lg font-medium text-mk-green">
          Email connected
        </p>
        {emailAddress && (
          <p className="mt-1 text-sm text-mk-green/80">{emailAddress}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <Button
        onClick={handleConnect}
        disabled={loading}
        size="lg"
        className="h-14 w-full bg-mk-accent text-base hover:bg-mk-accent-hover"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-5 w-5" />
            Connect your email
          </>
        )}
      </Button>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-mk-text-muted">
        <Lock className="h-3 w-3" />
        Secure OAuth via Nylas — we never store your email content
      </p>
    </div>
  );
}
