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
  const { loading } = useAuthUser();
  const billingHref = "/billing";

  return (
    <section id="pricing" className="page-shell pt-6">
      <div className="glass-panel relative overflow-hidden p-8 lg:p-10">
        <div className="absolute inset-x-10 top-0 h-40 rounded-b-[120px] bg-[radial-gradient(circle_at_top,rgba(225,192,151,0.48),transparent_72%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(130,97,62,0.12)] bg-white/84 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">
            <LockKeyhole size={14} /> Pricing
          </div>
          <div className="mt-5 max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Start free. Upgrade only when you need saved work and automation.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-700">
              The free plan lets people create and export documents immediately. Pro is where persistence, reuse, and higher-volume workflows begin.
            </p>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-2">
              <div className="soft-metal-card rounded-[28px] border border-[rgba(133,99,64,0.13)] p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(133,99,64,0.12)] bg-white/88 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f6a44]">
                  Free
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-tight text-ink-900">Create documents right away</div>
                <div className="mt-2 text-sm leading-7 text-ink-700">Best for one-off document creation where users want a fast result without account-backed storage.</div>
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
                <div className="mt-6">
                  <Link href="/workspace">
                    <MetallicButton>Start free</MetallicButton>
                  </Link>
                </div>
              </div>

              <div className="ink-panel rounded-[28px] border border-white/8 p-6 text-[#f4e6d6]">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7b38c]">
                  Pro trial or paid
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-tight">Save your setup and go further</div>
                <div className="mt-2 text-sm leading-7 text-[#e8d8c6]">Best for repeat work where saved files, reusable templates, settings, and automation save real time.</div>
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
                <div className="mt-6">
                  <Link href={billingHref}>
                    <SecondaryButton className="bg-white text-ink-900">View Pro plan</SecondaryButton>
                  </Link>
                </div>
              </div>
          </div>
        </div>
      </div>
      {!loading ? null : <div className="sr-only">Loading access state</div>}
    </section>
  );
}