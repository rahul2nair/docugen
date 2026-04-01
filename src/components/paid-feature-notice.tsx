import Link from "next/link";
import { ArrowRight, CreditCard, LockKeyhole } from "lucide-react";

export function PaidFeatureNotice({
  feature,
  title,
  description,
  highlights
}: {
  feature: string;
  title: string;
  description: string;
  highlights: string[];
}) {
  return (
    <section className="page-shell pt-8">
      <div className="glass-panel relative overflow-hidden p-8 lg:p-10">
        <div className="absolute inset-x-10 top-0 h-36 rounded-b-[100px] bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.62),transparent_72%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              <LockKeyhole size={14} /> Pro access required
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/billing"
                className="inline-flex items-center rounded-full border border-blue-700 bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_55%,#1e3a8a_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5"
              >
                <CreditCard size={16} className="mr-2" /> Unlock in billing
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              >
                Back to account home <ArrowRight size={16} className="ml-2" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Included with Pro</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{feature}</div>
            <div className="mt-4 grid gap-3">
              {highlights.map((highlight) => (
                <div key={highlight} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  {highlight}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}