"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { MetallicButton, SecondaryButton } from "@/components/buttons";

interface PlanOption {
  id: string;
  priceId: string;
  title: string;
  cadenceLabel: string;
}

interface BillingSummary {
  subscriptionStatus: string | null;
  planInterval: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

interface Props {
  email: string;
  isConfigured: boolean;
  plans: PlanOption[];
  billing: BillingSummary | null;
  trialDays: number;
  trialEligible: boolean;
}

export function BillingConsole({ email, isConfigured, plans, billing, trialDays, trialEligible }: Props) {
  const searchParams = useSearchParams();
  const [selectedPriceId, setSelectedPriceId] = useState<string>(plans[0]?.priceId || "");
  const [activeAction, setActiveAction] = useState<"checkout" | "portal" | "">("");
  const [errorMessage, setErrorMessage] = useState("");
  const isTrialActive = billing?.subscriptionStatus === "trialing";

  const notice = useMemo(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      return "Checkout completed. Billing status updates as soon as Stripe confirms the subscription.";
    }

    if (checkout === "cancel") {
      return "Checkout was canceled. You can pick a plan again whenever you are ready.";
    }

    return "";
  }, [searchParams]);

  async function startCheckout(withTrial: boolean) {
    if (!selectedPriceId) {
      setErrorMessage("Choose a plan before continuing to checkout.");
      return;
    }

    setActiveAction("checkout");
    setErrorMessage("");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: selectedPriceId, withTrial })
      });
      const payload = await response.json();

      if (!response.ok || !payload.url) {
        throw new Error(payload.error?.message || "Unable to start checkout");
      }

      window.location.href = payload.url;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start checkout");
      setActiveAction("");
    }
  }

  async function openPortal() {
    setActiveAction("portal");
    setErrorMessage("");

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST"
      });
      const payload = await response.json();

      if (!response.ok || !payload.url) {
        throw new Error(payload.error?.message || "Unable to open billing portal");
      }

      window.location.href = payload.url;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to open billing portal");
      setActiveAction("");
    }
  }

  return (
    <section className="page-shell pt-8">
      <div className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
        <div className="glass-panel p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">
            <CreditCard size={14} /> Billing
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink-900">Manage your plan without leaving the app.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink-700">
            Billing belongs in the signed-in account area, not in the document flow. Use this page to start a Pro trial, subscribe directly without a trial, review status, or open the Stripe customer portal.
          </p>

          {trialDays > 0 ? (
            <div className="mt-5 rounded-[20px] border border-[#eadcc8] bg-white/82 px-4 py-4 text-sm leading-6 text-ink-700">
              New accounts can start with a {trialDays}-day Pro trial. Stripe still collects a payment method, then the subscription converts automatically unless canceled before the trial ends.
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-[#eadcc8] bg-white/82 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Account</div>
              <div className="mt-2 text-lg font-semibold text-ink-900">{email}</div>
              <div className="mt-2 text-sm text-ink-600">Stripe customers are linked to your signed-in account and stay separate from anonymous workspace sessions.</div>
            </div>
            <div className="rounded-[24px] border border-[#eadcc8] bg-white/82 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Current status</div>
              <div className="mt-2 text-lg font-semibold text-ink-900">{billing?.subscriptionStatus ? billing.subscriptionStatus.replace(/_/g, " ") : "No active subscription"}</div>
              <div className="mt-2 text-sm text-ink-600">
                {billing?.currentPeriodEnd
                  ? `Current period ends ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`
                  : "Checkout is available as soon as Stripe keys and price IDs are configured."}
              </div>
              {isTrialActive ? (
                <div className="mt-2 text-sm text-[#8f6238]">
                  Trial access is currently active for this account.
                </div>
              ) : null}
            </div>
          </div>

          {notice ? (
            <div className="mt-5 rounded-[20px] border border-[#d6ead8] bg-[#f4fff5] px-4 py-3 text-sm text-[#2b5d34]">
              {notice}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-5 rounded-[20px] border border-[#efcdc9] bg-[#fff4f2] px-4 py-3 text-sm text-[#92443c]">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="soft-metal-card rounded-[28px] border border-[#e6d5bf] p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3e4d0_0%,#d1aa7f_55%,#9d7247_100%)] text-white shadow-metallic">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="text-lg font-semibold text-ink-900">Plan and portal</div>
                <div className="mt-1 text-sm text-ink-600">
                  Choose a plan here. If you are eligible, you can start with a short Pro trial or skip it and subscribe immediately.
                </div>
              </div>
            </div>

            {trialEligible ? (
              <div className="mt-5 rounded-[20px] border border-[#eadcc8] bg-white/75 px-4 py-4 text-sm text-ink-700">
                You can start a {trialDays}-day Pro trial on your first checkout, or skip the trial and go paid now.
              </div>
            ) : null}

            {!isConfigured ? (
              <div className="mt-5 rounded-[20px] border border-dashed border-[#eadcc8] bg-white/75 px-4 py-4 text-sm text-ink-600">
                Stripe keys or price IDs are not configured yet. Add the Stripe environment variables before using checkout.
              </div>
            ) : null}

            {plans.length ? (
              <div className="mt-5 space-y-3">
                {plans.map((plan) => (
                  <button
                    key={plan.priceId}
                    type="button"
                    onClick={() => setSelectedPriceId(plan.priceId)}
                    className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${selectedPriceId === plan.priceId ? "border-[#c89d70] bg-[#fff8ef]" : "border-[#eadcc8] bg-white/80 hover:bg-white"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-ink-900">{plan.title}</div>
                        <div className="mt-1 text-xs text-ink-500">{plan.cadenceLabel} billing through Stripe Checkout</div>
                      </div>
                      {selectedPriceId === plan.priceId ? <CheckCircle2 size={18} className="text-[#8f6a44]" /> : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <MetallicButton className="px-5 py-3" disabled={!isConfigured || !plans.length || activeAction === "checkout"} onClick={() => startCheckout(Boolean(trialEligible))}>
                {activeAction === "checkout"
                  ? "Redirecting..."
                  : trialEligible
                    ? `Start ${trialDays}-day trial`
                    : "Open Stripe checkout"}
              </MetallicButton>
              {trialEligible ? (
                <SecondaryButton className="px-5 py-3" disabled={!isConfigured || !plans.length || activeAction === "checkout"} onClick={() => startCheckout(false)}>
                  Go paid now
                </SecondaryButton>
              ) : null}
              <SecondaryButton className="px-5 py-3" disabled={!billing?.stripeCustomerId || activeAction === "portal"} onClick={openPortal}>
                <ExternalLink size={15} className="mr-2" />
                {activeAction === "portal" ? "Opening..." : "Open billing portal"}
              </SecondaryButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}