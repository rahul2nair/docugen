"use client";

import Link from "next/link";
import { MetallicButton, SecondaryButton } from "@/components/buttons";
import { ArrowRight, FileCheck2, Layers3, Wand2 } from "lucide-react";

export function Hero() {
  const pricingHref = "/#pricing";

  return (
    <section className="page-shell pt-8">
      <div className="glass-panel relative overflow-hidden px-8 py-10 lg:px-10 lg:py-12">
        <div className="absolute inset-y-0 right-0 hidden w-[36%] bg-[radial-gradient(circle_at_top,rgba(212,173,126,0.16),transparent_56%),linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(241,232,220,0.14)_100%)] lg:block" />
        <div className="absolute inset-x-8 top-0 h-40 rounded-b-[112px] bg-[radial-gradient(circle_at_top,rgba(238,223,202,0.85),transparent_74%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(130,97,62,0.12)] bg-white/86 px-4 py-2 text-xs font-medium text-ink-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
            <Wand2 size={14} />
            Invoices, offers, agreements, and more in one place
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-ink-900 sm:text-5xl lg:text-6xl">
              Draft business documents with a calmer, faster workflow.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink-700 sm:text-lg">
              Use the free workspace to generate and export documents immediately. Move to Pro when you want saved files,
              reusable templates, imports, API access, and batch workflows.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/workspace">
                <MetallicButton>
                  Try it free <ArrowRight className="ml-2" size={16} />
                </MetallicButton>
              </Link>
              <Link href={pricingHref}>
                <SecondaryButton>See plans</SecondaryButton>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: FileCheck2, title: "Start from a template", copy: "Create invoices, offer letters, proposals, and more." },
              { icon: Layers3, title: "Turn notes into a document", copy: "Paste rough content and shape it into something ready to send." },
              { icon: Wand2, title: "Update an existing file", copy: "Refresh older documents without rebuilding them from scratch." }
            ].map((item) => (
              <div key={item.title} className="rounded-[26px] border border-[rgba(128,96,63,0.12)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[2px]">
                <item.icon size={18} className="text-[#9c754c]" />
                <div className="mt-3 text-sm font-semibold text-ink-900">{item.title}</div>
                <div className="mt-1 text-sm leading-6 text-ink-600">{item.copy}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
