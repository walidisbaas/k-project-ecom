"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  BookOpen,
  ShieldCheck,
  MessageSquare,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Store, StoreFaq, StoreRule } from "@/types";

type Tab = "faqs" | "rules" | "brand";

function TrainingContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get("store");
  const [activeTab, setActiveTab] = useState<Tab>("faqs");

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-mk-text-muted">
        Select a store to manage training data.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-mk-text font-heading">Training Center</h1>
      <p className="mt-1 text-mk-text-muted">
        Teach Kenso about your business to improve reply quality.
      </p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-lg bg-mk-bg-warm p-1">
        {[
          { key: "faqs" as Tab, label: "FAQs", icon: BookOpen },
          { key: "rules" as Tab, label: "Rules", icon: ShieldCheck },
          { key: "brand" as Tab, label: "Brand Voice", icon: MessageSquare },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === key
                ? "bg-white text-mk-text shadow-sm"
                : "text-mk-text-secondary hover:text-mk-text"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "faqs" && <FaqsTab storeId={storeId} />}
        {activeTab === "rules" && <RulesTab storeId={storeId} />}
        {activeTab === "brand" && <BrandTab storeId={storeId} />}
      </div>
    </div>
  );
}

// ── FAQs Tab ──────────────────────────────────────────────

function FaqsTab({ storeId }: { storeId: string }) {
  const [faqs, setFaqs] = useState<StoreFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetch(`/api/stores/${storeId}/faqs`);
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { data: StoreFaq[] };
      setFaqs(data.data ?? []);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void fetchFaqs();
  }, [fetchFaqs]);

  const handleToggle = async (faq: StoreFaq) => {
    setFaqs((prev) =>
      prev.map((f) => (f.id === faq.id ? { ...f, enabled: !f.enabled } : f))
    );
    try {
      await fetch(`/api/stores/${storeId}/faqs/${faq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !faq.enabled }),
      });
    } catch {
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? { ...f, enabled: faq.enabled } : f))
      );
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/stores/${storeId}/faqs/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: editQ, answer: editA }),
      });
      if (!res.ok) throw new Error("Failed");
      setFaqs((prev) =>
        prev.map((f) =>
          f.id === editingId ? { ...f, question: editQ, answer: editA } : f
        )
      );
      setEditingId(null);
    } catch {
      // Failed to save
    }
  };

  const handleDelete = async (faqId: string) => {
    try {
      await fetch(`/api/stores/${storeId}/faqs/${faqId}`, {
        method: "DELETE",
      });
      setFaqs((prev) => prev.filter((f) => f.id !== faqId));
    } catch {
      // Failed to delete
    }
  };

  const handleAdd = async () => {
    if (!newQ.trim() || !newA.trim()) return;
    try {
      const res = await fetch(`/api/stores/${storeId}/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQ, answer: newA }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { data: StoreFaq };
      setFaqs((prev) => [...prev, data.data]);
      setNewQ("");
      setNewA("");
      setAdding(false);
    } catch {
      // Failed to add FAQ
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-mk-text-muted">
          {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""} — enabled FAQs are
          included in every AI prompt.
        </p>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-3 w-3" />
          Add FAQ
        </Button>
      </div>

      {adding && (
        <div className="mb-4 rounded-lg border border-mk-accent/20 bg-mk-accent-light p-4 space-y-2">
          <Input
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            placeholder="Question"
          />
          <Textarea
            value={newA}
            onChange={(e) => setNewA(e.target.value)}
            placeholder="Answer"
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {faqs.map((faq) => (
          <div
            key={faq.id}
            className="rounded-lg border border-mk-border bg-white p-4"
          >
            {editingId === faq.id ? (
              <div className="space-y-2">
                <Input
                  value={editQ}
                  onChange={(e) => setEditQ(e.target.value)}
                />
                <Textarea
                  value={editA}
                  onChange={(e) => setEditA(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Save className="mr-1 h-3 w-3" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-mk-text">
                      {faq.question}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {faq.source}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-mk-text-muted">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={faq.enabled}
                    onCheckedChange={() => handleToggle(faq)}
                  />
                  <button
                    onClick={() => {
                      setEditingId(faq.id);
                      setEditQ(faq.question);
                      setEditA(faq.answer);
                    }}
                    className="rounded p-1 text-mk-text-muted hover:text-mk-text-secondary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    className="rounded p-1 text-mk-text-muted hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Rules Tab ─────────────────────────────────────────────

function RulesTab({ storeId }: { storeId: string }) {
  const [rules, setRules] = useState<StoreRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<"do" | "dont">("do");
  const [newRule, setNewRule] = useState("");

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`/api/stores/${storeId}/rules`);
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { data: StoreRule[] };
      setRules(data.data ?? []);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  const handleAdd = async () => {
    if (!newRule.trim()) return;
    try {
      const res = await fetch(`/api/stores/${storeId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType, rule: newRule }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { data: StoreRule };
      setRules((prev) => [...prev, data.data]);
      setNewRule("");
      setAdding(false);
    } catch {
      // Failed to add rule
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      await fetch(`/api/stores/${storeId}/rules/${ruleId}`, {
        method: "DELETE",
      });
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch {
      // Failed to delete rule
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  const doRules = rules.filter((r) => r.type === "do");
  const dontRules = rules.filter((r) => r.type === "dont");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-mk-text-muted">
          Tell Kenso what it should and shouldn&apos;t do when replying.
        </p>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-3 w-3" />
          Add rule
        </Button>
      </div>

      {adding && (
        <div className="mb-4 rounded-lg border border-mk-accent/20 bg-mk-accent-light p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setNewType("do")}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium",
                newType === "do"
                  ? "bg-green-100 text-green-700"
                  : "bg-mk-bg-warm text-mk-text-muted"
              )}
            >
              Do
            </button>
            <button
              onClick={() => setNewType("dont")}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium",
                newType === "dont"
                  ? "bg-red-100 text-red-700"
                  : "bg-mk-bg-warm text-mk-text-muted"
              )}
            >
              Don&apos;t
            </button>
          </div>
          <Input
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            placeholder={
              newType === "do"
                ? "e.g. Always offer to connect to a human agent"
                : "e.g. Never promise refunds without manager approval"
            }
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {doRules.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-600">
            Do
          </p>
          <div className="space-y-2">
            {doRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3"
              >
                <p className="text-sm text-green-900">{rule.rule}</p>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-green-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {dontRules.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600">
            Don&apos;t
          </p>
          <div className="space-y-2">
            {dontRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
              >
                <p className="text-sm text-red-900">{rule.rule}</p>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {rules.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-mk-border text-sm text-mk-text-muted">
          No rules yet. Add rules to guide how Kenso replies.
        </div>
      )}
    </div>
  );
}

// ── Brand Voice Tab ───────────────────────────────────────

function BrandTab({ storeId }: { storeId: string }) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeSuccess, setScrapeSuccess] = useState(false);
  const [brandVoice, setBrandVoice] = useState("");
  const [signOff, setSignOff] = useState("");
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await fetch(`/api/stores/${storeId}`);
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as { data: Store };
        setStore(data.data);
        setBrandVoice(data.data.brand_voice ?? "");
        setSignOff(data.data.sign_off ?? "");
        setLanguage(data.data.primary_language ?? "en");
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    };
    void fetchStore();
  }, [storeId]);

  const handleRescrape = async () => {
    if (!store?.website_url) return;
    setScraping(true);
    setScrapeSuccess(false);
    try {
      const res = await fetch(`/api/stores/${storeId}/scrape`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to start scrape");
      setScrapeSuccess(true);
      // Poll for completion to refresh the brand voice fields
      const poll = setInterval(async () => {
        try {
          const storeRes = await fetch(`/api/stores/${storeId}`);
          if (storeRes.ok) {
            const storeData = (await storeRes.json()) as { data: Store };
            setStore(storeData.data);
            if (
              storeData.data.scrape_status === "complete" ||
              storeData.data.scrape_status === "failed"
            ) {
              clearInterval(poll);
              // Update form fields with new data
              setBrandVoice(storeData.data.brand_voice ?? "");
              setLanguage(storeData.data.primary_language ?? "en");
            }
          }
        } catch {
          clearInterval(poll);
        }
      }, 3000);
      // Stop polling after 2 minutes max
      setTimeout(() => clearInterval(poll), 120000);
    } catch {
      // Failed to trigger scrape
    } finally {
      setScraping(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_voice: brandVoice || null,
          sign_off: signOff,
          primary_language: language,
        }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Failed to save
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-mk-text-secondary">
          Brand voice description
        </label>
        <Textarea
          value={brandVoice}
          onChange={(e) => setBrandVoice(e.target.value)}
          placeholder="Describe your brand's tone (e.g. friendly and professional, uses first name, no emojis)"
          rows={3}
        />
        <p className="mt-1 text-xs text-mk-text-muted">
          This is included in every AI prompt to match your brand tone.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-mk-text-secondary">
          Email sign-off
        </label>
        <Input
          value={signOff}
          onChange={(e) => setSignOff(e.target.value)}
          placeholder="e.g. Best regards, The Support Team"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-mk-text-secondary">
          Primary language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-md border border-mk-border px-3 py-2 text-sm focus:border-mk-accent focus:outline-none focus:ring-1 focus:ring-mk-accent"
        >
          <option value="en">English</option>
          <option value="nl">Dutch</option>
          <option value="de">German</option>
          <option value="fr">French</option>
          <option value="es">Spanish</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
        </select>
        <p className="mt-1 text-xs text-mk-text-muted">
          Kenso auto-detects the customer&apos;s language but defaults to this
          if uncertain.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-mk-accent hover:bg-mk-accent-hover"
        >
          {saving ? "Saving..." : "Save changes"}
        </Button>

        {store?.website_url && (
          <>
            <Button
              variant="outline"
              onClick={handleRescrape}
              disabled={scraping || store.scrape_status === "scraping"}
            >
              {scraping || store.scrape_status === "scraping" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-scan website
                </>
              )}
            </Button>
            {scrapeSuccess && (
              <span className="flex items-center gap-1 text-sm text-mk-green">
                <CheckCircle2 className="h-4 w-4" />
                Scan started
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function TrainingPage() {
  return (
    <Suspense>
      <TrainingContent />
    </Suspense>
  );
}
