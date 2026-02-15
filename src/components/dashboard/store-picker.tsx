"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Store, Plus, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Store as StoreType } from "@/types";

interface StorePickerProps {
  stores: StoreType[];
  currentStoreId: string | null;
}

export function StorePicker({ stores, currentStoreId }: StorePickerProps) {
  const [open, setOpen] = useState(false);
  const currentStore = stores.find((s) => s.id === currentStoreId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-mk-border bg-white px-3 py-2 text-sm font-medium text-mk-text-secondary shadow-sm hover:bg-mk-bg focus:outline-none"
      >
        <Store className="h-4 w-4 text-mk-text-muted" />
        <span className="max-w-[140px] truncate">
          {currentStore?.store_name ?? "Select store"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-mk-text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-mk-border bg-white py-1 shadow-lg">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/dashboard?store=${store.id}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-mk-bg",
                  store.id === currentStoreId && "bg-mk-accent-light text-mk-accent"
                )}
              >
                <Circle
                  className={cn(
                    "h-2 w-2 fill-current",
                    store.is_live
                      ? "text-mk-green"
                      : store.is_active
                      ? "text-yellow-500"
                      : "text-mk-border"
                  )}
                />
                <span className="flex-1 truncate">{store.store_name}</span>
                <span className="text-xs text-mk-text-muted">
                  {store.is_live
                    ? "Live"
                    : store.is_active
                    ? "Setup"
                    : "Paused"}
                </span>
              </Link>
            ))}

            <div className="my-1 border-t border-mk-border" />

            <Link
              href="/stores/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-mk-text-secondary hover:bg-mk-bg"
            >
              <Plus className="h-4 w-4" />
              Add another store
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
