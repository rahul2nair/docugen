"use client";

import Link from "next/link";
import { FileText, LockKeyhole, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

export function Footer() {
  const searchParams = useSearchParams();
  const { user } = useAuthUser();
  const sessionToken = searchParams.get("s")?.trim();

  const withSession = (path: string) => {
    if (!sessionToken || (!path.startsWith("/workspace") && path !== "/settings")) {
      return path;
    }

    return `${path}?s=${encodeURIComponent(sessionToken)}`;
  };

  const accountLinks = user
    ? [
        { href: "/my-files", label: "My Files" },
        { href: withSession("/workspace/custom"), label: "Draft from notes" },
        { href: withSession("/workspace/batch"), label: "Batch generation" },
        { href: withSession("/workspace/import"), label: "Template import" },
        { href: "/api-docs", label: "API reference" },
        { href: withSession("/settings"), label: "Settings" }
      ]
    : [];

  const publicLinks = [
    { href: withSession("/workspace"), label: "Create" },
    { href: withSession("/workspace/activity"), label: "Recent" },
    { href: "/templates", label: "Templates" },
    { href: "/contact", label: "Contact" },
    { href: "/support", label: "Support" },
    { href: "/refunds", label: "Refunds" },
    { href: "/subprocessors", label: "Subprocessors" }
  ];

  return (
    <footer className="mt-16 bg-transparent">
      <div className="page-shell pb-10 pt-2">
        <div className="glass-panel overflow-hidden rounded-[28px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,255,0.96)_100%)] px-6 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.8fr_0.85fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-blue-600 shadow-sm">
                <FileText size={20} />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight text-slate-900">Templify</div>
                <div className="text-sm text-slate-600">Create polished business documents with less friction.</div>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">
              Start with templates and previews right away. Sign in later when you want saved settings,
              reusable templates, and advanced workflows.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Explore</div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              {publicLinks.map((item) => (
                <div key={item.href}>
                  <Link className="hover:text-slate-900" href={item.href}>{item.label}</Link>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <LockKeyhole size={13} /> Account Tools
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              {user ? accountLinks.map((item) => (
                <div key={item.href}>
                  <Link className="hover:text-slate-900" href={item.href}>{item.label}</Link>
                </div>
              )) : (
                <>
                  <div className="text-slate-500">Draft from notes</div>
                  <div className="text-slate-500">Batch generation</div>
                  <div className="text-slate-500">Template import</div>
                  <div className="text-slate-500">API & integrations</div>
                  <div className="text-slate-500">Settings & delivery</div>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Sparkles size={13} /> How It Works
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Start by creating a document. When your workflow grows, move into saved settings,
              imports, and integrations without changing the core experience.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" href={user ? "/dashboard" : "/auth?next=%2Fdashboard"}>
                {user ? "Open account home" : "Sign in to save more"}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>Create first. Add advanced tools only when you need them.</div>
          <div className="flex items-center gap-4">
            <Link className="hover:text-slate-700" href="/">Home</Link>
            <Link className="hover:text-slate-700" href="/templates">Templates</Link>
            <Link className="hover:text-slate-700" href="/terms">Terms</Link>
            <Link className="hover:text-slate-700" href="/privacy">Privacy</Link>
            <Link className="hover:text-slate-700" href={user ? "/dashboard" : "/auth?next=%2Fdashboard"}>Account</Link>
          </div>
        </div>
        </div>
      </div>
    </footer>
  );
}