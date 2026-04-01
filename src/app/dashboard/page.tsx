import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Braces, CheckCircle2, CreditCard, FolderOpen, Layers3, Settings2, Upload, WandSparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { describeBillingStatus, getBillingAccountByOwnerKey, isActiveSubscriptionStatus } from "@/server/billing-store";
import { prisma } from "@/server/prisma";
import { userOwnerKey } from "@/server/user-data-store";

const allFeatures = [
  { href: "/my-files",         title: "My Files",         icon: FolderOpen, requiresPaid: true,  copy: "View generated documents saved to your account." },
  { href: "/workspace/custom", title: "Draft from Notes",  icon: WandSparkles, requiresPaid: true, copy: "Turn rough notes into a polished document." },
  { href: "/workspace/batch",  title: "Bulk Generate",    icon: Layers3,    requiresPaid: true,  copy: "Generate many documents at once from a spreadsheet." },
  { href: "/workspace/import", title: "Import Template",  icon: Upload,     requiresPaid: true,  copy: "Convert an existing file into a reusable template." },
  { href: "/api-docs",         title: "API & Integrations", icon: Braces,  requiresPaid: true,  copy: "Connect Templify to another system via REST API." },
  { href: "/settings",         title: "Settings",         icon: Settings2,  requiresPaid: true,  copy: "Configure branding, SMTP, and API keys." },
  { href: "/billing",          title: "Billing",          icon: CreditCard, requiresPaid: false, copy: "Manage your Pro plan or start a free trial." }
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=%2Fdashboard");
  }

  const ownerKey = userOwnerKey(user.id);
  const [billing, templateCount, activeFileCount] = await Promise.all([
    getBillingAccountByOwnerKey(ownerKey),
    prisma.userTemplate.count({ where: { ownerKey } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM user_generated_files
      WHERE owner_session_id = ${ownerKey}
        AND expires_at > NOW()
    `.then((rows) => Number(rows[0]?.count || 0n))
  ]);

  const billingStatus = describeBillingStatus(billing?.subscriptionStatus);
  const hasPaidAccess = isActiveSubscriptionStatus(billing?.subscriptionStatus);

  return (
    <main className="pb-12">
      <section className="page-shell py-8">
        {/* Page header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500 truncate max-w-sm">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${hasPaidAccess ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}>
              <CheckCircle2 size={12} />
              {hasPaidAccess ? "Pro" : "Free"}
            </span>
            {!hasPaidAccess && (
              <Link href="/billing" className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Saved Templates", value: templateCount, detail: "Custom and imported templates" },
            { label: "Active Files",    value: activeFileCount, detail: "Generated files in retention window" },
            { label: "Plan Status",     value: billingStatus,   detail: "Current billing state" }
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{stat.label}</div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{stat.value}</div>
              <div className="mt-1 text-xs text-slate-500">{stat.detail}</div>
            </div>
          ))}
        </div>

        {/* Feature grid */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">Quick Access</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allFeatures.map((feature) => {
              const locked = feature.requiresPaid && !hasPaidAccess;
              const destination = locked ? "/billing" : feature.href;
              return (
                <Link
                  key={feature.title}
                  href={destination}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                      <feature.icon size={18} />
                    </div>
                    {locked && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Pro
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{feature.title}</div>
                  <div className="mt-1 flex-1 text-xs leading-5 text-slate-500">{feature.copy}</div>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100">
                    {locked ? "Unlock" : "Open"} <ArrowRight size={12} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}