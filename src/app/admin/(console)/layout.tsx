"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig, useActiveEvent } from "@/hooks/useData";
import { TestModeBanner } from "@/components/common/TestModeBanner";
import {
  LayoutDashboard,
  Building2,
  Tag,
  Music,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/performances", label: "Performances", icon: Music },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavItems({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <nav aria-label="Admin navigation">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "text-white" : "hover:opacity-80"
                )}
                style={
                  active
                    ? { background: "var(--primary)", color: "#fff" }
                    : { color: "var(--ink-muted)" }
                }
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { signOutUser } = useAuth();
  const { config } = useAppConfig();
  const { event } = useActiveEvent(config?.activeEventId);
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isTestEvent = event?.isTest ?? false;

  return (
    <div className="flex min-h-dvh" style={{ background: "var(--bg)" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-60 shrink-0 flex-col border-r px-4 py-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        aria-label="Admin sidebar"
      >
        <div className="mb-6">
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-bricolage)", color: "var(--primary)" }}
          >
            {config?.festName ?? "Euphoria"}
          </span>
          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--ink-muted)" }}>
            Admin Console
          </p>
        </div>

        {isTestEvent && <TestModeBanner compact className="mb-4" />}

        <NavItems pathname={pathname} />

        <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={signOutUser}
            className="flex items-center gap-2 text-sm rounded-[12px] px-3 py-2.5 w-full hover:opacity-80 transition-opacity"
            style={{ color: "var(--ink-muted)" }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ background: "rgba(27,23,64,0.4)" }}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r px-4 py-6 transition-transform lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
      >
        <div className="mb-6 flex items-center justify-between">
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-bricolage)", color: "var(--primary)" }}
          >
            {config?.festName ?? "Euphoria"}
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg"
            aria-label="Close navigation"
            style={{ color: "var(--ink-muted)" }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {isTestEvent && <TestModeBanner compact className="mb-4" />}
        <NavItems pathname={pathname} onClose={() => setSidebarOpen(false)} />
        <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={signOutUser}
            className="flex items-center gap-2 text-sm rounded-[12px] px-3 py-2.5 w-full"
            style={{ color: "var(--ink-muted)" }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center gap-3 border-b px-4 py-3 lg:px-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <button
            className="lg:hidden p-1 rounded-lg"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            style={{ color: "var(--ink-muted)" }}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {/* Event pill */}
            {event && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: isTestEvent ? "var(--warning-soft)" : "var(--success-soft)",
                  color: isTestEvent ? "var(--warning)" : "var(--success)",
                }}
              >
                {isTestEvent ? "TEST" : "LIVE"} · {event.name}
              </span>
            )}
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 lg:p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
