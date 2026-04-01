"use client";

import Link from "next/link";
import { MetallicButton, SecondaryButton } from "@/components/buttons";
import { ArrowRight, FileCheck2, Layers3, ShieldCheck, Wand2 } from "lucide-react";

export function Hero() {
  const pricingHref = "/#pricing";
  const studioSignals = [
    { label: "Documents issued", value: "12k+" },
    { label: "Average setup time", value: "4 min" },
    { label: "Reusable flows", value: "Templates, imports, API" }
  ];

  return (
    <section className="page-shell pt-8">
      <div className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f3f8ff_50%,#edf4ff_100%)] px-6 py-8 shadow-[0_28px_100px_rgba(15,23,42,0.08)] sm:px-8 lg:px-10 lg:py-10">
        <div className="absolute inset-x-12 top-0 h-40 rounded-b-[140px] bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.30),transparent_70%)]" />
        <div className="absolute -right-16 top-12 hidden h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(147,197,253,0.24),transparent_70%)] lg:block" />
        <div className="relative grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
              <Wand2 size={14} />
              Document operations studio
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-6xl xl:text-[4.5rem] xl:leading-[0.95]">
              Build polished client-ready documents from one deliberate workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Generate proposals, offer letters, invoices, and agreements from templates, rough notes, or imported files.
              Keep the preview live, move fast on the free tier, and unlock persistent operations when the workflow becomes repeatable.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/workspace">
                <MetallicButton>
                  Open the workspace <ArrowRight className="ml-2" size={16} />
                </MetallicButton>
              </Link>
              <Link href={pricingHref}>
                <SecondaryButton>Compare free and Pro</SecondaryButton>
              </Link>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {studioSignals.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_26px_70px_rgba(15,23,42,0.24)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200">Live board</div>
                  <div className="mt-2 text-xl font-semibold">From draft signal to finished export</div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-100">
                  Free to start
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {[
                  { icon: FileCheck2, title: "Template-first drafting", copy: "Choose a proven document structure before filling anything in." },
                  { icon: Layers3, title: "Preview-led editing", copy: "See each field and clause update the final document as you work." },
                  { icon: ShieldCheck, title: "Operational upgrade path", copy: "Add API keys, saved files, and delivery settings when the workflow becomes production-critical." }
                ].map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <item.icon size={18} className="text-blue-200" />
                    <div className="mt-3 text-sm font-semibold text-white">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{item.copy}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { title: "Template fill", copy: "For structured docs with predictable fields." },
                { title: "From notes", copy: "For rough briefs that need shape and polish." },
                { title: "Imports + API", copy: "For repeatable, connected document pipelines." }
              ].map((item, index) => (
                <div key={item.title} className="rounded-[24px] border border-slate-200 bg-white/85 px-4 py-5 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">0{index + 1}</div>
                  <div className="mt-3 text-base font-semibold text-slate-950">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
