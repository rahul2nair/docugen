"use client";

import Link from "next/link";
import { Check, ChevronRight, LockKeyhole } from "lucide-react";
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
  const { user, loading } = useAuthUser();
  const billingHref = user ? "/billing" : "/auth?next=%2Fbilling";

  return (
    <section className="page-shell pt-6">
      <div className="glass-panel relative overflow-hidden p-8 lg:p-10">
        <div className="absolute inset-x-10 top-0 h-40 rounded-b-[120px] bg-[radial-gradient(circle_at_top,rgba(225,192,151,0.48),transparent_72%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(130,97,62,0.12)] bg-white/84 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">
            <LockKeyhole size={14} /> Start Simple
          </div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
            <div>
              <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
                The product should make sense in two passes: try it free, then unlock Pro when persistence matters.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-ink-700">
                Free users should be able to generate a document immediately. Pro users should clearly get the durable value: saved files, reusable setups, and faster repeat work.
              </p>
              <div className="mt-6 rounded-[24px] border border-[rgba(133,99,64,0.14)] bg-[rgba(255,255,255,0.78)] px-5 py-4 text-sm leading-7 text-ink-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                The rule is simple: free users finish a document, Pro users keep and reuse their work.
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="soft-metal-card rounded-[28px] border border-[rgba(133,99,64,0.13)] p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(133,99,64,0.12)] bg-white/88 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f6a44]">
                  Free
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-tight text-ink-900">Create documents right away</div>
                <div className="mt-2 text-sm leading-7 text-ink-700">Best for first-time visitors who just need to produce one document quickly and learn by doing.</div>
                <div className="mt-5 space-y-3">
                  {availableNow.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-[20px] border border-[rgba(133,99,64,0.12)] bg-white/86 px-4 py-3 text-sm text-ink-800">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#efe2d1] text-[#8f6238]">
                        <Check size={14} />
                      </div>
                      <div>{item}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ink-panel rounded-[28px] border border-white/8 p-6 text-[#f4e6d6]">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7b38c]">
                  Pro trial or paid
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-tight">Save your setup and go further</div>
                <div className="mt-2 text-sm leading-7 text-[#e8d8c6]">Best for repeat work where saved files, template libraries, team settings, and automation save real time.</div>
                <div className="mt-5 space-y-3">
                  {unlockWithAccount.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#f4e6d6]">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[#d9b184]">
                        <ChevronRight size={14} />
                      </div>
                      <div>{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={billingHref}>
              <MetallicButton>{user ? "Choose Pro" : "Start 2-day Pro trial"}</MetallicButton>
            </Link>
            <Link href={user ? "/billing" : "/auth?next=%2Fbilling"}>
              <SecondaryButton>See plans and direct paid options</SecondaryButton>
            </Link>
          </div>
        </div>
      </div>
      {!loading ? null : <div className="sr-only">Loading access state</div>}
    </section>
  );
}