"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const WELCOME_MESSAGE = {
  text: "Hi! 👋 I'm here to help. Ask me anything about Kenso — setup, pricing, or how we can help your Shopify store.",
  from: "bot",
};

export function ChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string; from: "user" | "bot" }[]>([
    WELCOME_MESSAGE,
  ]);
  const [inputValue, setInputValue] = useState("");

  // Only show on landing page (root)
  if (pathname !== "/") return null;

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setMessages((prev) => [...prev, { text: inputValue.trim(), from: "user" }]);
    setInputValue("");
    // Placeholder bot response - could connect to API later
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          text: "Thanks for your message! Our team will get back to you shortly. In the meantime, you can start a free trial or check out our FAQ section below.",
          from: "bot",
        },
      ]);
    }, 800);
  };

  return (
    <>
      {/* Floating button - hidden when panel is open */}
      {!isOpen && (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-mk-accent text-white shadow-[0_2px_8px_rgba(26,18,7,0.1)] transition-all hover:scale-105 hover:bg-mk-accent-hover focus:outline-none focus:ring-2 focus:ring-mk-accent focus:ring-offset-2"
        aria-label="Open chat"
      >
        <MessageCircle className="h-7 w-7 scale-x-[-1]" />
      </button>
      )}

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-[480px] w-[380px] flex-col overflow-hidden rounded-2xl border border-mk-border bg-white shadow-[0_8px_40px_rgba(26,18,7,0.12)] transition-all duration-300",
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mk-border bg-mk-bg px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mk-accent-light">
              <MessageCircle className="h-4 w-4 text-mk-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-mk-text">Kenso Support</p>
              <p className="text-xs text-mk-text-muted">We typically reply in minutes</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-mk-text-muted transition-colors hover:bg-mk-bg-warm hover:text-mk-text"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-xl px-4 py-2.5 text-sm",
                msg.from === "user"
                  ? "ml-auto bg-mk-accent text-white"
                  : "mr-auto border border-mk-border bg-mk-bg text-mk-text-secondary"
              )}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-mk-border p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 rounded-xl border border-mk-border bg-mk-bg px-4 py-2.5 text-sm text-mk-text placeholder:text-mk-text-muted focus:border-mk-accent focus:outline-none focus:ring-1 focus:ring-mk-accent"
            />
            <button
              onClick={handleSend}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mk-accent text-white transition-colors hover:bg-mk-accent-hover"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop when open (optional - closes on outside click) */}
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
          aria-label="Close chat"
        />
      )}
    </>
  );
}
