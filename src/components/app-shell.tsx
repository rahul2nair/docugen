"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Braces,
  CreditCard,
  FileText,
  FolderOpen,
  Home,
  LayoutTemplate,
  LogIn,
  Settings,
  TableProperties,
  WandSparkles,
  LayoutDashboard
} from "lucide-react";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

const mainNav = [
  { href: "/", icon: Home, label: "Home", exact: true },
  { href: "/workspace", icon: WandSparkles, label: "Create" },
  { href: "/templates", icon: LayoutTemplate, label: "Templates" },
  { href: "/my-files", icon: FolderOpen, label: "My Files" },
  { href: "/workspace/batch", icon: TableProperties, label: "Bulk Generate" },
  { href: "/api-docs", icon: Braces, label: "API Docs" },
  { href: "/settings", icon: Settings, label: "Settings" }
];

function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition-all group-hover:opacity-100">
      {label}
    </span>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}

function NavLink({ href, icon: Icon, label, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
          : "text-slate-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      <Tooltip label={label} />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuthUser();

  const avatarUrl = [user?.user_metadata?.avatar_url, user?.user_metadata?.picture, user?.user_metadata?.picture_url]
    .find((v): v is string => typeof v === "string" && v.trim().length > 0);
  const avatarLabel = (user?.email || "U").charAt(0).toUpperCase();

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    if (href === "/workspace") {
      // Only match /workspace exactly and /workspace/* but NOT /workspace/batch etc as separate items
      return pathname === "/workspace" || (pathname.startsWith("/workspace/") && !mainNav.some((n) => n.href !== "/workspace" && n.href.startsWith("/workspace/") && pathname.startsWith(n.href)));
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Left Sidebar */}
      <aside className="relative z-40 flex w-16 shrink-0 flex-col bg-[#0f172a]">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-white/[0.07]">
          <Link
            href="/"
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md transition hover:bg-blue-500"
          >
            <FileText size={18} strokeWidth={2} />
            <Tooltip label="Templify" />
          </Link>
        </div>

        {/* Main nav */}
        <nav className="flex flex-1 flex-col items-center gap-1 px-3 pt-4">
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href, item.exact)}
            />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-2 border-t border-white/[0.07] px-3 py-3">
          <NavLink
            href="/billing"
            icon={CreditCard}
            label="Billing"
            active={isActive("/billing")}
          />

          {!loading && !user && (
            <NavLink
              href="/auth"
              icon={LogIn}
              label="Sign in"
              active={false}
            />
          )}

          {!loading && user && (
            <Link
              href="/dashboard"
              className={`group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 transition-all duration-150 ${
                isActive("/dashboard")
                  ? "border-blue-500 shadow-md shadow-blue-900/40"
                  : "border-white/20 hover:border-blue-400"
              }`}
            >
              {avatarUrl ? (
                <img
                  alt={user.email || "Account"}
                  className="h-full w-full object-cover"
                  src={avatarUrl}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-b from-slate-600 to-slate-800 text-xs font-bold text-white">
                  {avatarLabel}
                </span>
              )}
              <Tooltip label="Dashboard" />
            </Link>
          )}

          {loading && (
            <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
