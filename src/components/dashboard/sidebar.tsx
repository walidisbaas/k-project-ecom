"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  AlertCircle,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/conversations",
    label: "Conversations",
    icon: MessageSquare,
  },
  {
    href: "/review-queue",
    label: "Review Queue",
    icon: AlertCircle,
  },
  {
    href: "/training",
    label: "Training",
    icon: BookOpen,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

interface SidebarProps {
  storeId?: string;
}

export function Sidebar({ storeId }: SidebarProps) {
  const pathname = usePathname();

  const buildHref = (base: string) =>
    storeId ? `${base}?store=${storeId}` : base;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-mk-border bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-mk-border px-6">
        <Link href="/stores" className="flex items-center gap-2">
          <span className="font-heading text-lg text-mk-text">kenso<sup className="ml-0.5 text-[10px] font-body font-semibold text-mk-accent">AI</sup></span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "?");
          return (
            <Link
              key={href}
              href={buildHref(href)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-mk-accent-light text-mk-accent"
                  : "text-mk-text-muted hover:bg-mk-bg-warm hover:text-mk-text"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-mk-border p-4">
        <p className="text-xs text-mk-text-muted">Kenso AI v1.0</p>
      </div>
    </aside>
  );
}
