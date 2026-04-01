"use client";

import Link from "next/link";
import { Check, ChevronRight, LockKeyhole, Sparkles } from "lucide-react";
import { MetallicButton, SecondaryButton } from "@/components/buttons";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

const availableNow = [
  "Fill documents from the workspace immediately",
  "Track jobs and exports in activity",
  "Browse the built-in template catalogue",
  "Leave the workspace and return home at any time"
];

const unlockWithAccount = [
  "Keep a My Files library of generated documents until they expire",
  "Turn rough notes into branded documents without starting from a template",
  "Run batch jobs from uploaded data",
  "Import legacy documents into reusable templates",
  "Use account-backed SMTP, API keys, and branding settings",
  "Inspect API docs and wire the product into your backend"
];

export function AccessShowcase() {
  const { loading } = useAuthUser();
  const billingHref = "/billing";

  return (
    <section id="pricing" className="page-shell pt-6">
      <div className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-[linear-gradient(145deg,#f8fbff_0%,#ffffff_52%,#f4f8fd_100%)] p-6 shadow-[0_28px_100px_rgba(15,23,42,0.08)] lg:p-10">
        <div className="absolute inset-x-10 top-0 h-40 rounded-b-[120px] bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.65),transparent_72%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            <LockKeyhole size={14} /> Access model
          </div>
          <div className="mt-5 grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Free handles immediate drafting. Pro turns the product into an operating layer.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                The split is deliberate: everyone can create and export. Teams that need persistence, reuse, integrations,
                and workflow control move into the paid tier when the document system starts carrying real operational load.
              </p>

              <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-[0_20px_70px_rgba(15,23,42,0.22)]">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200">
                  <Sparkles size={14} /> Upgrade trigger
                </div>
                <div className="mt-3 text-lg font-semibold">Move to Pro when documents stop being one-off tasks.</div>
                <div className="mt-2 text-sm leading-7 text-slate-300">
                  Saved files, API keys, SMTP, batch work, and imports only matter once the workflow is recurring.
                  That boundary keeps the free path clean while making the paid tier obviously useful.
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="soft-metal-card rounded-[30px] border border-slate-200 p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Free lane
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Generate now, decide later</div>
                <div className="mt-2 text-sm leading-7 text-slate-600">Best when speed matters more than persistence.</div>
                <div className="mt-5 space-y-3">
                  {availableNow.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-[20px] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <Check size={14} />
                      </div>
                      <div>{item}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <Link href="/workspace">
                    <MetallicButton>Use the free workspace</MetallicButton>
                  </Link>
                </div>
              </div>

              <div className="ink-panel rounded-[30px] border border-slate-700/40 p-6 text-slate-100">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/30 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
                  Pro lane
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-tight">Run document work like a system</div>
                <div className="mt-2 text-sm leading-7 text-slate-200">Best when repeatability and control save more time than the plan costs.</div>
                <div className="mt-5 space-y-3">
                  {unlockWithAccount.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-[20px] border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-100">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-300/20 text-blue-100">
                        <ChevronRight size={14} />
                      </div>
                      <div>{item}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <Link href={billingHref}>
                    <SecondaryButton className="bg-white text-slate-900">View Pro plan</SecondaryButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {!loading ? null : <div className="sr-only">Loading access state</div>}
    </section>
  );
}