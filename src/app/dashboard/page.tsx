import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Braces, CreditCard, FolderOpen, Layers3, Settings2, Upload, WandSparkles } from "lucide-react";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { describeBillingStatus, getBillingAccountByOwnerKey, isActiveSubscriptionStatus } from "@/server/billing-store";
import { prisma } from "@/server/prisma";
import { userOwnerKey } from "@/server/user-data-store";

const continueFeatures = [
  {
    href: "/my-files",
    title: "My Files",
    copy: "Open the generated documents saved to your account and download them again before they expire.",
    icon: FolderOpen,
    requiresPaid: false
  },
  {
    href: "/workspace/custom",
    title: "Draft from notes",
    copy: "Paste rough content, a policy draft, or meeting notes and turn it into a branded document without choosing a template first.",
    icon: WandSparkles,
    requiresPaid: true
  },
  {
    href: "/billing",
    title: "Billing",
    copy: "Start or manage the paid plan from a dedicated account area instead of mixing billing into the document workflow.",
    icon: CreditCard,
    requiresPaid: false
  },
  {
    href: "/settings",
    title: "Settings & delivery",
    copy: "Manage branding, SMTP, API keys, and other account-level configuration.",
    icon: Settings2,
    requiresPaid: true
  }
];

const advancedFeatures = [
  {
    href: "/workspace/batch",
    title: "Generate in bulk",
    copy: "Create many documents in one run when you have a spreadsheet or repeated workflow to process.",
    icon: Layers3,
    requiresPaid: true
  },
  {
    href: "/workspace/import",
    title: "Import a template",
    copy: "Turn an existing document into a reusable template and keep it in your saved library.",
    icon: Upload,
    requiresPaid: true
  },
  {
    href: "/api-docs",
    title: "API & integrations",
    copy: "Connect Templify to another system when your document flow needs backend or automation support.",
    icon: Braces,
    requiresPaid: true
  }
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const avatarUrl = [user?.user_metadata?.avatar_url, user?.user_metadata?.picture, user?.user_metadata?.picture_url]
    .find((value) => typeof value === "string" && value.trim().length > 0);
  const avatarLabel = (user?.email || "A").charAt(0).toUpperCase();

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
  const planLabel = billing?.planInterval ? `${billing.planInterval} plan` : "No paid plan yet";
  const hasPaidAccess = isActiveSubscriptionStatus(billing?.subscriptionStatus);

  return (
    <main className="pb-12">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <section className="page-shell pt-8">
        <div className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr] lg:items-start">
          <div className="glass-panel relative overflow-hidden p-8 lg:p-10">
            <div className="absolute inset-x-8 top-0 h-36 rounded-b-[100px] bg-[radial-gradient(circle_at_top,rgba(233,216,194,0.62),transparent_72%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">
                Account Home
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink-900">Saved work, billing, and account tools.</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink-700">
                This page should feel like your account home, not a generic dashboard. Use it to reopen saved documents,
                manage plan status, and jump into the heavier workflows that only matter once you are signed in.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[26px] border border-[#eadcc8] bg-white/78 p-5">
                  <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(180deg,#f3e4d0_0%,#d1aa7f_55%,#9d7247_100%)] text-lg font-bold text-white shadow-metallic">
                      {typeof avatarUrl === "string" ? (
                        <img alt={user.email || "Account user"} className="h-full w-full object-cover" src={avatarUrl} />
                      ) : (
                        avatarLabel
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Signed in as</div>
                      <div className="mt-1 truncate text-lg font-semibold text-ink-900">{user.email || "Account user"}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm leading-6 text-ink-600">Anonymous creation still happens in the main workspace. This account area exists for saved files, saved settings, billing, imports, and automation workflows.</div>
                </div>

                <div className="soft-metal-card rounded-[26px] border border-[#e6d5bf] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Plan status</div>
                  <div className="mt-2 text-2xl font-semibold text-ink-900">{billingStatus}</div>
                  <div className="mt-2 text-sm leading-6 text-ink-700">{planLabel}</div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#8f6238]">
                    <Link href="/billing">Open billing</Link>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
              { label: "Saved templates", value: templateCount, detail: "Reusable imports and personal templates" },
              { label: "Active files", value: activeFileCount, detail: "Generated files still available in My Files" },
              { label: "Paid access", value: hasPaidAccess ? "On" : "Off", detail: "Stripe-backed billing state for account-only features" }
            ].map((stat) => (
              <div key={stat.label} className="rounded-[26px] border border-[#eadcc8] bg-white/82 p-5 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">{stat.label}</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">{stat.value}</div>
                <div className="mt-2 text-sm leading-6 text-ink-600">{stat.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="glass-panel p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Continue work</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">The signed-in essentials</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">These are the pages people actually revisit after they start saving data to their account.</p>
            <div className="mt-5 grid gap-4">
              {continueFeatures.map((feature, index) => (
                (() => {
                  const locked = feature.requiresPaid && !hasPaidAccess;
                  const destination = locked ? "/billing" : feature.href;

                  return (
                <Link
                  key={feature.title}
                  href={destination}
                  className={`relative overflow-hidden rounded-[26px] border p-4 transition hover:-translate-y-0.5 hover:shadow-soft ${index === 0 || feature.title === "Billing" ? "soft-metal-card border-[#e6d5bf]" : "glass-panel border-white/60"}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3e4d0_0%,#d1aa7f_55%,#9d7247_100%)] text-white shadow-metallic">
                      <feature.icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-tight text-ink-900">{feature.title}</h3>
                        {locked ? (
                          <span className="rounded-full border border-[#eadfce] bg-[#fcf5eb] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f6a44]">
                            Pro
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink-700">{feature.copy}</p>
                      <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#8f6238]">
                        {locked ? "Unlock in billing" : "Open feature"} <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
                  );
                })()
              ))}
            </div>
          </section>

          <section className="glass-panel p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Advanced workflows</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">The heavier tools stay here</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">Batch work, imports, note drafting, and API access make sense in the account area because they are longer-running or reusable workflows.</p>
            <div className="mt-5 grid gap-4">
              {advancedFeatures.map((feature) => (
                (() => {
                  const locked = feature.requiresPaid && !hasPaidAccess;
                  const destination = locked ? "/billing" : feature.href;

                  return (
                <Link
                  key={feature.title}
                  href={destination}
                  className="glass-panel relative overflow-hidden rounded-[26px] border-white/60 p-4 transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3e4d0_0%,#d1aa7f_55%,#9d7247_100%)] text-white shadow-metallic">
                      <feature.icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-tight text-ink-900">{feature.title}</h3>
                        {locked ? (
                          <span className="rounded-full border border-[#eadfce] bg-[#fcf5eb] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f6a44]">
                            Pro
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink-700">{feature.copy}</p>
                      <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#8f6238]">
                        {locked ? "Unlock in billing" : "Open feature"} <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
                  );
                })()
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}