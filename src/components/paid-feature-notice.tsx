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
        <div className="absolute inset-x-10 top-0 h-36 rounded-b-[100px] bg-[radial-gradient(circle_at_top,rgba(233,216,194,0.58),transparent_72%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">
              <LockKeyhole size={14} /> Pro access required
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink-900">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-700">{description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/billing"
                className="inline-flex items-center rounded-full border border-[rgba(120,90,58,0.18)] bg-[linear-gradient(180deg,#f3e4d0_0%,#d1aa7f_55%,#9d7247_100%)] px-5 py-3 text-sm font-semibold text-white shadow-metallic transition hover:-translate-y-0.5"
              >
                <CreditCard size={16} className="mr-2" /> Unlock in billing
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full border border-[rgba(120,90,58,0.18)] bg-white/88 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:bg-white"
              >
                Back to account home <ArrowRight size={16} className="ml-2" />
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#eadcc8] bg-white/82 p-6 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Included with Pro</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{feature}</div>
            <div className="mt-4 grid gap-3">
              {highlights.map((highlight) => (
                <div key={highlight} className="rounded-2xl border border-[#eadfce] bg-[#fcf8f2] px-4 py-3 text-sm leading-6 text-ink-700">
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