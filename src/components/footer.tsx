"use client";

import Link from "next/link";
import { FileText, LockKeyhole, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

export function Footer({ hasPaidAccess = false }: { hasPaidAccess?: boolean }) {
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
    { href: withSession("/workspace"), label: "Document Builder" },
    { href: withSession("/workspace/activity"), label: "Recent Generations" },
    { href: "/templates", label: "Templates" }
  ];

  const companyLinks = [
    { href: "/contact", label: "Contact Us" },
    { href: "/refunds", label: "Refund Policy" }
  ];

  const accountHref = user ? (hasPaidAccess ? "/dashboard" : "/billing") : "/auth?next=%2Fbilling";
  const accountLabel = user ? (hasPaidAccess ? "Open account home" : "Open billing") : "Sign in to save more";

  const openCookieSettings = () => {
    window.dispatchEvent(new Event("templify:open-cookie-consent"));
  };

  return (
    <footer className="mt-16 border-t border-slate-200 bg-[linear-gradient(180deg,rgba(249,251,255,0.72)_0%,rgba(241,245,252,0.94)_100%)]">
      <div className="page-shell py-12">
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
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Product</div>
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
              <LockKeyhole size={13} /> Account
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
              <Sparkles size={13} /> Get Started
            </div>
            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Company</div>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {companyLinks.map((item) => (
                <div key={item.href}>
                  <Link className="hover:text-slate-900" href={item.href}>{item.label}</Link>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Start by creating a document. When your workflow grows, move into saved settings,
              imports, and integrations without changing the core experience.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" href={accountHref}>
                {accountLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>Create first. Add advanced tools only when you need them.</div>
          <div className="flex items-center gap-4">
            <Link className="hover:text-slate-700" href="/">Home</Link>
            <Link className="hover:text-slate-700" href="/terms">Terms of Service</Link>
            <Link className="hover:text-slate-700" href="/privacy">Privacy Policy</Link>
            <Link className="hover:text-slate-700" href="/dpa">DPA</Link>
            <Link className="hover:text-slate-700" href="/cookies">Cookie Policy</Link>
            <button className="hover:text-slate-700" onClick={openCookieSettings} type="button">Cookie settings</button>
          </div>
        </div>
      </div>
    </footer>
  );
}