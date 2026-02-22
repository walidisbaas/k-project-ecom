"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  ArrowLeft,
  Send,
  RotateCcw,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Store, WebsitePage } from "@/types";

// ── Template chips ──────────────────────────────────────────

interface TemplateChip {
  label: string;
  email: string;
}

const DEFAULT_CHIPS: TemplateChip[] = [
  {
    label: "Where's my order?",
    email:
      "Hi, I placed order #4821 three days ago and still haven't received a shipping confirmation. Can you check the status for me? Thanks, Sarah",
  },
  {
    label: "Product question",
    email:
      "Hey! I saw a product on your website but I have a few questions before ordering. Can you help me out? Thanks, James",
  },
  {
    label: "I want to return this",
    email:
      "Hello, I received my order but it's not what I expected. I'd like to return it. How do I start? Thanks, Emily",
  },
];

function generateSubject(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("order") || lower.includes("shipping") || lower.includes("track"))
    return "Order status inquiry";
  if (lower.includes("size") || lower.includes("fit") || lower.includes("measurement"))
    return "Sizing question";
  if (lower.includes("return") || lower.includes("refund") || lower.includes("exchange"))
    return "Return request";
  return "Customer inquiry";
}

function getSnippet(text: string): string {
  return text.split("\n").filter(Boolean)[0] || text;
}

// ── Component ──────────────────────────────────────────────────

interface ThreadMessage {
  role: "customer" | "ai";
  text: string;
}

interface PreviewStepProps {
  storeId: string;
  onNext: () => void;
  onBack: () => void;
}

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 90_000;

export function PreviewStep({ storeId, onNext, onBack }: PreviewStepProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [progress, setProgress] = useState(0);

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateChip[]>(DEFAULT_CHIPS);
  const [inputText, setInputText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController>(null);
  const pollStartRef = useRef(0);

  // Fetch store data — if website_pages not ready, start polling
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await fetch(`/api/stores/${storeId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { data: Store };
        setStore(data.data);

        const pages = data.data.website_pages as WebsitePage[] | null;
        if (!pages || pages.length === 0) {
          setCrawling(true);
          pollStartRef.current = Date.now();
        } else {
          // Pages ready — fetch personalized templates
          void fetchTemplates();
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    void fetchStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // Poll while crawling is in progress
  useEffect(() => {
    if (!crawling) return;

    const interval = setInterval(async () => {
      const elapsed = Date.now() - pollStartRef.current;

      if (elapsed > POLL_TIMEOUT_MS) {
        setCrawling(false);
        setProgress(100);
        void fetchTemplates();
        clearInterval(interval);
        return;
      }

      // Smooth progress — fast at first, slows down
      setProgress(Math.min(90, (elapsed / POLL_TIMEOUT_MS) * 120));

      try {
        const res = await fetch(`/api/stores/${storeId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { data: Store };
        setStore(data.data);

        const pages = data.data.website_pages as WebsitePage[] | null;
        if (pages && pages.length > 0) {
          setProgress(100);
          setTimeout(() => setCrawling(false), 600);
          void fetchTemplates();
          clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crawling, storeId]);

  const fetchTemplates = () =>
    fetch(`/api/stores/${storeId}/preview/templates`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { templates: TemplateChip[] } | null) => {
        if (data?.templates && data.templates.length > 0) {
          setTemplates(data.templates);
        }
      })
      .catch(() => {});

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const storeName = store?.store_name || "Your Store";

  const handleSend = useCallback(
    async (text?: string) => {
      const value = (text ?? inputText).trim();
      if (!value || thinking || !store) return;

      setError(false);
      const isFirstMessage = messages.length === 0;
      const currentSubject = isFirstMessage ? generateSubject(value) : subject;
      if (isFirstMessage) {
        setSubject(currentSubject);
      }

      const newMessages: ThreadMessage[] = [
        ...messages,
        { role: "customer", text: value },
      ];
      setMessages(newMessages);
      setExpandedIndex(newMessages.length - 1);
      setInputText("");
      setThinking(true);

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch(`/api/stores/${storeId}/preview/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages,
            threadId,
            subject: currentSubject,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error("Failed to generate reply");

        const data = (await res.json()) as { reply: string; threadId: string | null };

        if (data.threadId) {
          setThreadId(data.threadId);
        }

        setMessages((prev) => {
          const updated = [...prev, { role: "ai" as const, text: data.reply }];
          setExpandedIndex(updated.length - 1);
          return updated;
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // On error: roll back the customer message and show error banner
        setMessages(messages);
        setInputText(value);
        setError(true);
        if (isFirstMessage) {
          setSubject(null);
        }
      } finally {
        setThinking(false);
      }
    },
    [inputText, thinking, store, messages, storeId, threadId, subject]
  );

  const handleTemplateClick = useCallback(
    (template: TemplateChip) => {
      if (thinking || !store) return;
      setInputText(template.email);
    },
    [thinking, store]
  );

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSubject(null);
    setThreadId(null);
    setInputText("");
    setThinking(false);
    setError(false);
    setExpandedIndex(null);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  if (crawling) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center py-10">
        {/* Pulsing globe */}
        <div className="relative mb-8">
          <div className="absolute inset-0 animate-ping rounded-full bg-mk-accent/10" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-mk-accent/10 to-mk-accent/5 ring-1 ring-mk-accent/20">
            <Globe className="h-7 w-7 text-mk-accent animate-[spin_6s_linear_infinite]" />
          </div>
        </div>

        {/* Copy */}
        <h2 className="font-heading text-2xl text-mk-text animate-in fade-in slide-in-from-bottom-2 duration-500">
          Checking out your site
        </h2>
        <p className="mt-2 text-sm text-mk-text-muted animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
          {progress < 40
            ? "Reading your pages…"
            : progress < 75
              ? "Learning about your products…"
              : "Almost done…"}
        </p>

        {/* Progress bar */}
        <div className="mt-8 w-full max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
          <div className="h-1 overflow-hidden rounded-full bg-mk-border/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-mk-accent to-[#E0A060] transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="py-10">
      {/* Header */}
      <div className="text-center onboarding-stagger-1">
        <h1 className="font-heading text-4xl leading-tight text-mk-text sm:text-5xl">
          See your AI agent in action
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-mk-text-muted">
          Write an email and see how Kenso responds using your website data.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-2xl onboarding-stagger-2">
        {/* Subject header — Gmail style */}
        {subject && (
          <div className="mb-4 flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <h2 className="text-xl font-normal text-mk-text leading-snug">
              {subject}
            </h2>
            <button
              onClick={handleReset}
              className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full border border-mk-border px-3 py-1 text-xs font-medium text-mk-text-muted transition-colors hover:border-mk-accent/40 hover:text-mk-accent"
            >
              <RotateCcw className="h-3 w-3" />
              New thread
            </button>
          </div>
        )}

        {/* Thread */}
        {hasMessages && (
          <div className="overflow-hidden rounded-2xl border border-mk-border/80 bg-white shadow-[0_1px_3px_rgba(26,18,7,0.04),0_4px_20px_rgba(26,18,7,0.06)] animate-in fade-in slide-in-from-bottom-4 duration-400">
            {messages.map((msg, i) => {
              const isExpanded = expandedIndex === i;
              const isAi = msg.role === "ai";
              const senderName = isAi ? storeName : "Customer";
              const senderInitial = isAi
                ? storeName.charAt(0).toUpperCase()
                : "C";
              const recipient = isAi ? "to customer" : `to ${storeName}`;
              const isLast = i === messages.length - 1 && !thinking;

              if (!isExpanded) {
                // ── Collapsed row ──
                return (
                  <button
                    key={i}
                    onClick={() => setExpandedIndex(i)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-mk-bg/50 sm:px-5 animate-in fade-in slide-in-from-bottom-1 duration-300",
                      i > 0 && "border-t border-mk-border/40"
                    )}
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm",
                        isAi
                          ? "bg-gradient-to-br from-mk-accent to-[#C44D15]"
                          : "bg-gradient-to-br from-[#8C7B6A] to-[#6B5A49]"
                      )}
                    >
                      {senderInitial}
                    </div>
                    {/* Sender name */}
                    <span className="w-[90px] shrink-0 truncate text-sm font-semibold text-mk-text sm:w-[120px]">
                      {senderName}
                    </span>
                    {/* Snippet */}
                    <span className="min-w-0 flex-1 truncate text-sm text-mk-text-muted">
                      {getSnippet(msg.text)}
                    </span>
                    {/* Timestamp */}
                    <span className="shrink-0 text-[11px] text-mk-text-muted">
                      just now
                    </span>
                  </button>
                );
              }

              // ── Expanded message ──
              return (
                <div
                  key={i}
                  className={cn(
                    "bg-white animate-in fade-in duration-300",
                    i > 0 && "border-t border-mk-border/40"
                  )}
                >
                  {/* Header — clickable to collapse */}
                  <button
                    onClick={() => setExpandedIndex(null)}
                    className="flex w-full items-start justify-between px-4 pt-5 pb-1 text-left sm:px-5"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm",
                          isAi
                            ? "bg-gradient-to-br from-mk-accent to-[#C44D15]"
                            : "bg-gradient-to-br from-[#8C7B6A] to-[#6B5A49]"
                        )}
                      >
                        {senderInitial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-mk-text">
                            {senderName}
                          </p>
                          {isAi && (
                            <span className="rounded-md bg-mk-accent-light px-1.5 py-0.5 text-[10px] font-medium text-mk-accent">
                              Re: {subject}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-mk-text-muted">
                          {recipient}
                        </p>
                      </div>
                    </div>
                    <span className="mt-1 shrink-0 text-[11px] text-mk-text-muted">
                      just now
                    </span>
                  </button>

                  {/* Body */}
                  <div
                    className={cn(
                      "px-4 pt-3 sm:px-5 sm:pl-[68px]",
                      isLast ? "pb-6" : "pb-5"
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-mk-text-secondary">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Thinking indicator */}
            {thinking && (
              <div className="flex items-center gap-3 border-t border-mk-border/40 px-4 py-4 sm:px-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mk-accent to-[#C44D15] text-xs font-semibold text-white shadow-sm">
                  {storeName.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-mk-text">
                    {storeName}
                  </span>
                  <div className="flex gap-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-mk-accent/40 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-mk-accent/40 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-mk-accent/40 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-xs text-mk-text-muted">
                    typing…
                  </span>
                </div>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <span>Failed to generate a reply. Please try again.</span>
            <button
              onClick={() => {
                setError(false);
                void handleSend();
              }}
              className="ml-auto shrink-0 rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* Input */}
        <div className={cn("relative", hasMessages || error ? "mt-5 animate-in fade-in slide-in-from-bottom-2 duration-300" : "mt-0 onboarding-stagger-3")}>
          <textarea
            rows={hasMessages ? 2 : 3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              hasMessages ? "Reply to this thread…" : "Write a customer email…"
            }
            disabled={thinking}
            className={cn(
              "w-full resize-none rounded-2xl border border-mk-border/80 bg-white px-4 py-3 pr-14 text-sm leading-relaxed text-mk-text shadow-[0_1px_3px_rgba(26,18,7,0.04),0_4px_20px_rgba(26,18,7,0.06)] placeholder:text-mk-text-muted transition-all focus:border-mk-accent focus:outline-none focus:ring-1 focus:ring-mk-accent/30 focus:shadow-[0_1px_3px_rgba(26,18,7,0.04),0_4px_20px_rgba(26,18,7,0.06),0_0_0_3px_rgba(224,90,26,0.08)]",
              thinking && "opacity-60 cursor-not-allowed"
            )}
          />
          <button
            onClick={() => void handleSend()}
            disabled={thinking || !inputText.trim()}
            className={cn(
              "absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-lg transition-all",
              inputText.trim() && !thinking
                ? "bg-mk-accent text-white hover:bg-mk-accent-hover"
                : "bg-mk-border/60 text-mk-text-muted cursor-not-allowed"
            )}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Template chips — only when empty */}
        {!hasMessages && (
          <div className="mt-3 flex flex-wrap items-center gap-2 onboarding-stagger-4">
            <span className="text-xs text-mk-text-muted">
              or choose from a template:
            </span>
            {templates.map((t) => (
              <button
                key={t.label}
                onClick={() => handleTemplateClick(t)}
                disabled={thinking}
                className="rounded-full border border-mk-border bg-white px-3 py-1.5 text-xs font-medium text-mk-text-secondary transition-colors hover:border-mk-accent/40 hover:text-mk-accent"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mx-auto mt-10 flex max-w-2xl justify-between onboarding-stagger-3">
        <Button variant="outline" size="lg" onClick={onBack} className="h-12">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          size="lg"
          className="h-12 bg-mk-accent hover:bg-mk-accent-hover"
        >
          Looks good, continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
