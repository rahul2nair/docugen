export default function RefundsPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-4xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Refund & Cancellation</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            This page explains how subscription cancellation, renewals, and refund requests are handled for paid
            plans unless different terms are agreed in a separate written contract.
          </p>

          <h2>1. Subscription cancellation</h2>
          <p>
            Paid subscriptions can be cancelled from the billing page. Cancellation takes effect at the end of
            the current paid period unless otherwise required by law.
          </p>

          <h2>2. Renewal and billing responsibility</h2>
          <p>
            Subscriptions renew automatically unless cancelled before the renewal date. You are responsible for
            managing cancellation timing through your billing settings.
          </p>

          <h2>3. Refund handling</h2>
          <p>
            Charges are generally non-refundable after a billing cycle starts. We review refund requests case by case,
            especially for billing errors or significant service issues.
          </p>

          <h2>4. Situations where refunds may be considered</h2>
          <ul>
            <li>Duplicate charges for the same subscription period.</li>
            <li>Billing errors caused by our system.</li>
            <li>Substantial service issues that prevented normal use.</li>
          </ul>

          <h2>5. Situations where refunds are usually not issued</h2>
          <ul>
            <li>Partial use of a billing period.</li>
            <li>Change of mind after successful use of paid features.</li>
            <li>Failure to cancel before the renewal date.</li>
            <li>Issues caused by customer-provided data or third-party systems outside Templify control.</li>
          </ul>

          <h2>6. Trials and promotional pricing</h2>
          <p>
            Trial eligibility, trial duration, promotional discounts, and introductory offers are limited-time and
            may include additional conditions. Trial and promotion terms are shown at checkout when applicable.
          </p>

          <h2>7. How to request a refund</h2>
          <p>
            Submit a request through the contact page with your account email, charge reference, and a short
            explanation.
          </p>

          <h2>8. Review process</h2>
          <p>
            We may request supporting details to review your request, including invoice identifiers, transaction
            timestamps, and a description of the issue. Submitting a request does not guarantee approval.
          </p>

          <h2>9. Refund processing</h2>
          <p>
            Approved refunds are sent to the original payment method through Stripe. Final posting time depends on
            the payment provider.
          </p>

          <h2>10. Chargebacks and payment disputes</h2>
          <p>
            If you submit a chargeback, we may limit or suspend account access while the dispute is under review.
            Please contact support first so we can investigate and attempt to resolve billing issues directly.
          </p>

          <h2>11. Policy updates</h2>
          <p>
            We may revise this policy to reflect legal, payment, and product changes. Updates are reflected by
            revising the "Last updated" date.
          </p>
        </div>
      </section>
    </main>
  );
}