"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CheckCircle2, ExternalLink } from "lucide-react";

interface PlanOption {
  id: string;
  priceId: string;
  title: string;
  cadenceLabel: string;
  amountLabel: string;
  helperLabel: string;
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

const freeFeatures = [
  "Document generation",
  "Built-in templates",
  "Instant HTML/PDF output"
];

const proFeatures = [
  "Unlimited saves",
  "Bulk generation from CSV/JSON",
  "Template import and custom templates",
  "SMTP/email delivery",
  "API key access"
];

export function BillingConsole({ email, isConfigured, plans, billing, trialDays, trialEligible }: Props) {
  const searchParams = useSearchParams();
  const [selectedPriceId, setSelectedPriceId] = useState<string>(plans[0]?.priceId || "");
  const [activeAction, setActiveAction] = useState<"checkout" | "portal" | "subscription" | "delete" | "">("");
  const [errorMessage, setErrorMessage] = useState("");
  const isTrialActive = billing?.subscriptionStatus === "trialing";
  const hasActiveSubscription = ["active", "trialing", "past_due"].includes(billing?.subscriptionStatus || "");

  const selectedPlan = plans.find((plan) => plan.priceId === selectedPriceId) || plans[0] || null;

  const notice = useMemo(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      return hasActiveSubscription
        ? "Checkout completed. Your Pro access is active."
        : "Checkout completed. Billing status is being reconciled with Stripe.";
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

  async function updateSubscription(action: "cancel" | "resume") {
    setActiveAction("subscription");
    setErrorMessage("");

    try {
      const response = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || "Unable to update subscription");
      }

      window.location.reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update subscription");
      setActiveAction("");
    }
  }

  async function deleteAccount() {
    const confirmation = window.confirm(
      "Delete your account permanently? This revokes API keys, removes stored profile/template data, and cannot be undone."
    );

    if (!confirmation) {
      return;
    }

    setActiveAction("delete");
    setErrorMessage("");

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || "Unable to delete account");
      }

      window.location.href = "/auth";
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete account");
      setActiveAction("");
    }
  }

  return (
    <section className="page-shell py-8">
      <div className="glass-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-36 rounded-b-[96px] bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.6),transparent_72%)]" />
        <div className="relative mb-6 max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-blue-100 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
            Billing
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{hasActiveSubscription ? "Manage your plan" : "Choose your plan"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {hasActiveSubscription
              ? "Your account already has paid access. Use the billing portal to manage renewal, payment method, or plan changes."
              : "Keep the free workflow for quick generation, or upgrade to Pro when you need reusable templates, API access, and delivery workflows."}
          </p>
        </div>

      {notice ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Free</h2>
          <p className="mt-1 text-sm text-slate-500">$0 / forever</p>
          <ul className="mt-6 space-y-3 text-sm text-slate-700">
            {freeFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 text-emerald-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Pro</h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedPlan ? `${selectedPlan.amountLabel} · ${selectedPlan.cadenceLabel}` : "Flexible billing"}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ${hasActiveSubscription ? "bg-emerald-600" : "bg-blue-600"}`}>
              {hasActiveSubscription ? "Current plan" : "Most Popular"}
            </span>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 text-sm text-slate-700">
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 text-blue-600" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {plans.length ? (
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {plans.map((plan) => {
                const selected = selectedPriceId === plan.priceId;
                return (
                  <button
                    key={plan.priceId}
                    type="button"
                    onClick={() => setSelectedPriceId(plan.priceId)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{plan.title}</div>
                    <div className="mt-1 text-lg font-bold text-blue-700">{plan.amountLabel}</div>
                    <div className="mt-1 text-xs text-slate-500">{plan.helperLabel}</div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {!isConfigured ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Stripe keys or price IDs are not configured yet. Add billing environment variables before checkout.
            </div>
          ) : null}

          {trialDays > 0 ? (
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {trialEligible
                ? `Start with a ${trialDays}-day Pro trial, then continue on your selected plan.`
                : "Trial has already been used for this account."}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {!hasActiveSubscription ? (
              <button
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!isConfigured || !plans.length || activeAction === "checkout"}
                onClick={() => startCheckout(Boolean(trialEligible))}
              >
                {activeAction === "checkout"
                  ? "Redirecting..."
                  : trialEligible
                    ? `Start ${trialDays}-day trial`
                    : "Upgrade to Pro"}
              </button>
            ) : null}

            {!hasActiveSubscription && trialEligible ? (
              <button
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!isConfigured || !plans.length || activeAction === "checkout"}
                onClick={() => startCheckout(false)}
              >
                Subscribe now
              </button>
            ) : null}

            <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!billing?.stripeCustomerId || activeAction === "portal"}
              onClick={openPortal}
            >
              <ExternalLink size={14} className="mr-2" />
              {activeAction === "portal" ? "Opening..." : hasActiveSubscription ? "Manage billing" : "Billing portal"}
            </button>

            {hasActiveSubscription ? (
              <button
                className="rounded-lg border border-rose-300 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={activeAction === "subscription"}
                onClick={() => updateSubscription(billing?.cancelAtPeriodEnd ? "resume" : "cancel")}
              >
                {activeAction === "subscription"
                  ? "Updating..."
                  : billing?.cancelAtPeriodEnd
                    ? "Resume subscription"
                    : "Cancel at period end"}
              </button>
            ) : null}
          </div>
        </article>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <div className="font-semibold text-slate-800">Account summary</div>
        <div className="mt-2">Signed in as: <span className="font-medium text-slate-900">{email}</span></div>
        <div className="mt-1">Subscription status: <span className="font-medium text-slate-900">{billing?.subscriptionStatus ? billing.subscriptionStatus.replace(/_/g, " ") : "No active subscription"}</span></div>
        {billing?.currentPeriodEnd ? (
          <div className="mt-1">Current period ends: <span className="font-medium text-slate-900">{new Date(billing.currentPeriodEnd).toLocaleDateString()}</span></div>
        ) : null}
        {billing?.cancelAtPeriodEnd ? (
          <div className="mt-1 text-amber-700">Cancellation scheduled at the end of the current billing period.</div>
        ) : null}
        {isTrialActive ? (
          <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Trial active
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 shadow-sm">
        <div className="font-semibold">Danger zone</div>
        <p className="mt-2 leading-6">
          You can permanently delete your account and profile data from Templify. Billing history required for tax
          and regulatory compliance may be retained as described in our policies.
        </p>
        <button
          className="mt-4 rounded-lg border border-rose-300 bg-white px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={activeAction === "delete"}
          onClick={deleteAccount}
          type="button"
        >
          {activeAction === "delete" ? "Deleting account..." : "Delete account permanently"}
        </button>
      </div>
      </div>
    </section>
  );
}
