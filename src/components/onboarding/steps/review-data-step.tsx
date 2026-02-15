"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Trash2, Pencil, ArrowLeft } from "lucide-react";
import type { Store, StoreFaq } from "@/types";

interface ReviewDataStepProps {
  storeId: string;
  onNext: () => void;
  onBack: () => void;
}

export function ReviewDataStep({ storeId, onNext, onBack }: ReviewDataStepProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [faqs, setFaqs] = useState<StoreFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [brandVoice, setBrandVoice] = useState("");
  const [companySummary, setCompanySummary] = useState("");
  const [shippingPolicy, setShippingPolicy] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");

  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [addingFaq, setAddingFaq] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [storeRes, faqsRes] = await Promise.all([
          fetch(`/api/stores/${storeId}`),
          fetch(`/api/stores/${storeId}/faqs`),
        ]);

        if (storeRes.ok) {
          const storeData = (await storeRes.json()) as { data: Store };
          const s = storeData.data;
          setStore(s);
          setBrandVoice(s.brand_voice ?? "");
          setCompanySummary(s.company_summary ?? "");
          setShippingPolicy(s.shipping_policy ?? "");
          setReturnPolicy(s.return_policy ?? "");
        }

        if (faqsRes.ok) {
          const faqsData = (await faqsRes.json()) as { data: StoreFaq[] };
          setFaqs(faqsData.data ?? []);
        }
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [storeId]);

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_voice: brandVoice || null,
          company_summary: companySummary || null,
          shipping_policy: shippingPolicy || null,
          return_policy: returnPolicy || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      onNext();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFaq = async (faq: StoreFaq) => {
    try {
      await fetch(`/api/stores/${storeId}/faqs/${faq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !faq.enabled }),
      });
      setFaqs((prev) =>
        prev.map((f) =>
          f.id === faq.id ? { ...f, enabled: !f.enabled } : f
        )
      );
    } catch {
      // Failed to update FAQ
    }
  };

  const handleSaveFaqEdit = async (faqId: string) => {
    try {
      const res = await fetch(`/api/stores/${storeId}/faqs/${faqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: editQuestion, answer: editAnswer }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setFaqs((prev) =>
        prev.map((f) =>
          f.id === faqId
            ? { ...f, question: editQuestion, answer: editAnswer }
            : f
        )
      );
      setEditingFaqId(null);
    } catch {
      // Failed to update FAQ
    }
  };

  const handleDeleteFaq = async (faqId: string) => {
    try {
      await fetch(`/api/stores/${storeId}/faqs/${faqId}`, {
        method: "DELETE",
      });
      setFaqs((prev) => prev.filter((f) => f.id !== faqId));
    } catch {
      // Failed to delete FAQ
    }
  };

  const handleAddFaq = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    try {
      const res = await fetch(`/api/stores/${storeId}/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQuestion, answer: newAnswer }),
      });
      if (!res.ok) throw new Error("Failed to add");
      const data = (await res.json()) as { data: StoreFaq };
      setFaqs((prev) => [...prev, data.data]);
      setNewQuestion("");
      setNewAnswer("");
      setAddingFaq(false);
    } catch {
      // Failed to add FAQ
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="onboarding-stagger-1">
        <h1 className="font-heading text-4xl leading-tight text-mk-text sm:text-5xl">
          Review scraped data
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-mk-text-muted">
          We analyzed{" "}
          {store?.website_url ? (
            <span className="font-medium text-mk-text-secondary">
              {store.website_url}
            </span>
          ) : (
            "your website"
          )}
          . Review and edit the information below.
        </p>
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2 onboarding-stagger-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-mk-text-secondary">
            Brand voice
          </label>
          <Textarea
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            placeholder="e.g. Friendly, professional, helpful"
            rows={3}
            className="text-base"
          />
          <p className="mt-2 text-sm text-mk-text-muted">
            Describes the tone Kenso uses when replying.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-mk-text-secondary">
            Company summary
          </label>
          <Textarea
            value={companySummary}
            onChange={(e) => setCompanySummary(e.target.value)}
            placeholder="Brief description of what your company does"
            rows={3}
            className="text-base"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-mk-text-secondary">
            Shipping policy
          </label>
          <Textarea
            value={shippingPolicy}
            onChange={(e) => setShippingPolicy(e.target.value)}
            placeholder="Describe your shipping times, costs, and methods"
            rows={3}
            className="text-base"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-mk-text-secondary">
            Return policy
          </label>
          <Textarea
            value={returnPolicy}
            onChange={(e) => setReturnPolicy(e.target.value)}
            placeholder="Describe your return/refund process and conditions"
            rows={3}
            className="text-base"
          />
        </div>
      </div>

      <div className="mt-10 onboarding-stagger-3">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-mk-text-secondary">
            FAQs ({faqs.length})
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingFaq(true)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add FAQ
          </Button>
        </div>

        {addingFaq && (
          <div className="mb-3 rounded-lg border border-mk-accent/20 bg-mk-accent-light p-5 space-y-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Question"
              className="h-12 text-base"
            />
            <Textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Answer"
              rows={2}
              className="text-base"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddFaq}>
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingFaq(false)}
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
              className="rounded-lg border border-mk-border bg-white p-5"
            >
              {editingFaqId === faq.id ? (
                <div className="space-y-2">
                  <Input
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    className="h-12 text-base"
                  />
                  <Textarea
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    rows={2}
                    className="text-base"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveFaqEdit(faq.id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingFaqId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-mk-text">
                      {faq.question}
                    </p>
                    <p className="mt-1 text-sm text-mk-text-muted">
                      {faq.answer}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={faq.enabled}
                      onCheckedChange={() => handleToggleFaq(faq)}
                    />
                    <button
                      onClick={() => {
                        setEditingFaqId(faq.id);
                        setEditQuestion(faq.question);
                        setEditAnswer(faq.answer);
                      }}
                      className="rounded p-1 text-mk-text-muted hover:text-mk-text-secondary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFaq(faq.id)}
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

      <div className="mt-10 flex justify-between onboarding-stagger-4">
        <Button variant="outline" size="lg" onClick={onBack} className="h-12">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleSaveAndContinue}
          disabled={saving}
          size="lg"
          className="h-12 bg-mk-accent text-base hover:bg-mk-accent-hover"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Looks good \u2192"
          )}
        </Button>
      </div>
    </div>
  );
}
