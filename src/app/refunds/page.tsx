export default function RefundsPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-4xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Refund & Cancellation</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            This page explains how subscription cancellation works, when refunds may be issued,
            and what customers should expect after a refund request is approved.
          </p>

          <h2>Subscription cancellation</h2>
          <p>
            Paid subscriptions can be cancelled from the billing page. Cancellation is applied at
            the end of the current billing period, which means access remains available until the
            already-paid term expires.
          </p>

          <h2>Default refund position</h2>
          <p>
            Charges are generally non-refundable once a billing cycle has started because document
            generation, storage, and infrastructure costs begin as soon as the plan is active.
            We still review refund requests in good faith when there is a clear product or billing issue.
          </p>

          <h2>When we typically consider a refund</h2>
          <ul>
            <li>Duplicate charges for the same subscription period.</li>
            <li>A billing error caused by our system.</li>
            <li>A major service failure that prevented reasonable use of the paid plan.</li>
            <li>Cancellation shortly after renewal where there was no meaningful product usage.</li>
          </ul>

          <h2>When refunds are usually not issued</h2>
          <ul>
            <li>Partial use of a billing period.</li>
            <li>Change of mind after successful document generation or storage use.</li>
            <li>Failure to cancel before the renewal date.</li>
            <li>Issues caused by customer-provided templates, data, SMTP settings, or third-party systems.</li>
          </ul>

          <h2>Request window</h2>
          <p>
            Refund requests should be submitted within 14 days of the charge date through the contact page,
            with the account email, invoice or charge reference, and a short explanation of the issue.
          </p>

          <h2>Refund processing</h2>
          <p>
            Approved refunds are returned to the original payment method through Stripe. Banks and card issuers
            typically take 5 to 10 business days to post the credit, although some refunds can take longer.
          </p>

          <h2>Abuse prevention</h2>
          <p>
            We may deny refunds where there is evidence of abuse, repeated one-cycle usage followed by refund
            requests, chargeback threats used as leverage, or activity that violates the acceptable use rules.
          </p>
        </div>
      </section>
    </main>
  );
}