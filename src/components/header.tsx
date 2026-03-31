"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, FolderOpen, Home, Sparkles } from "lucide-react";
import { AuthControls } from "@/components/auth-controls";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

function NavPill({ href, children, accent = false }: { href: string; children: ReactNode; accent?: boolean }) {
  return (
    <Link
      className={accent
        ? "rounded-full border border-[rgba(140,101,60,0.18)] bg-[rgba(255,251,246,0.92)] px-4 py-2 text-sm font-semibold text-ink-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] hover:bg-white"
        : "rounded-full border border-transparent px-4 py-2 text-sm font-medium text-ink-700 hover:border-[rgba(120,90,58,0.12)] hover:bg-white/72"}
      href={href}
      prefetch={false}
    >
      {children}
    </Link>
  );
}

export function Header() {
  const searchParams = useSearchParams();
  const { user } = useAuthUser();
  const sessionToken = searchParams.get("s")?.trim();
  const withSession = (path: string) => {
    if (!sessionToken || (!path.startsWith("/workspace") && path !== "/settings")) {
      return path;
    }

    return `${path}?s=${encodeURIComponent(sessionToken)}`;
  };

  const publicLinks = [
    {
      href: "/",
      label: (
        <span className="inline-flex items-center gap-2">
          <Home size={15} /> Home
        </span>
      )
    },
    { href: withSession("/workspace"), label: "Create" },
    { href: withSession("/workspace/activity"), label: "Recent" },
    ...(user
      ? [
          {
            href: "/my-files",
            label: (
              <span className="inline-flex items-center gap-2">
                <FolderOpen size={15} /> My Files
              </span>
            )
          }
        ]
      : []),
    {
      href: "/templates",
      label: (
        <span className="inline-flex items-center gap-2">
          <Sparkles size={15} /> Templates
        </span>
      )
    }
  ];

  return (
    <header className="page-shell relative z-50 pt-6">
      <div className="glass-panel relative z-50 flex flex-col gap-4 overflow-visible border-[rgba(120,90,58,0.12)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(125,90,55,0.12)] bg-[linear-gradient(180deg,#f6ecdf_0%,#ebd5ba_100%)] text-[#8a6137] shadow-[0_10px_24px_rgba(114,81,48,0.12)]">
              <FileText size={20} />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Templify</div>
              <div className="text-xs text-ink-500">Business documents without the heavy setup</div>
            </div>
          </Link>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-ink-700">
            {publicLinks.map((item) => (
              <NavPill key={item.href} href={item.href}>
                {item.label}
              </NavPill>
            ))}
          </nav>
          <AuthControls />
        </div>
      </div>
    </header>
  );
}
