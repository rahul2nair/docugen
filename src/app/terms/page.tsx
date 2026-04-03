export default function TermsPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-4xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            These Terms of Service ("Terms") govern your use of Templify, including the web application and REST API.
            By accessing or using Templify, you agree to these Terms. If you do not agree, do not use the service.
          </p>

          <h2>1. Service overview</h2>
          <p>
            Templify is a document generation platform that allows you to create personalized documents from templates
            using data you provide. The service includes template management, generation queuing, output storage,
            API access, and account management.
          </p>

          <h2>2. Your account</h2>
          <p>
            You are responsible for maintaining the confidentiality of your password and API keys. You agree to notify
            us immediately of any unauthorized access or use of your account. You are liable for all activity on your
            account, whether authorized or not.
          </p>
          <p>
            You must provide accurate information during registration and keep it up to date. You may not impersonate
            another person or entity or use another's API key without permission.
          </p>

          <h2>3. Acceptable use</h2>
          <p>
            You agree not to use Templify for any unlawful purpose, to violate any laws, or to infringe the rights of
            others. See the Acceptable Use Policy for prohibited activities and content.
          </p>

          <h2>4. Subscription and billing</h2>
          <ul>
            <li><strong>Plans:</strong> Free and paid subscription plans are available. Pricing is stated on the billing page.</li>
            <li><strong>Billing cycle:</strong> Paid subscriptions renew automatically on the anniversary of your purchase.</li>
            <li><strong>Payment:</strong> Charges are processed through Stripe. By providing payment information, you authorize charges.</li>
            <li><strong>Cancellation:</strong> You can cancel your subscription anytime from the billing page. Cancellation takes effect at the end of the current billing period.</li>
            <li><strong>Refunds:</strong> See the Refund & Cancellation policy for our refund terms.</li>
          </ul>

          <h2>5. Usage limits and quotas</h2>
          <p>
            Different plans have different quotas and rate limits. You may not exceed or circumvent these limits.
            Attempts to bypass limits through multiple accounts, automated sessions, or other means will result in
            suspension. See the API Limits page for current limits.
          </p>

          <h2>6. Intellectual property</h2>
          <p>
            Templify and its templates are owned by us or our licensors. You may not copy, modify, reverse engineer,
            or distribute templates or the service. You retain ownership of content you create (data, documents), but
            grant us a license to process and store it as needed to operate the service.
          </p>

          <h2>7. Data and privacy</h2>
          <p>
            Your use of Templify is governed by our Privacy Policy and Data Retention policy. You agree that we may
            collect and use your data as described in those policies. You are responsible for ensuring your use
            complies with all applicable data protection laws.
          </p>

          <h2>8. Service availability</h2>
          <p>
            Templify is provided on an "as-is" basis. We aim for 99.5% uptime but cannot guarantee uninterrupted
            service. We may perform maintenance, suspend service for abuse, or discontinue features at any time.
          </p>

          <h2>9. Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, TEMPLIFY AND ITS OPERATORS DISCLAIM ALL WARRANTIES, EXPRESS OR
            IMPLIED, AND ASSUME NO LIABILITY FOR:
          </p>
          <ul>
            <li>Data loss, corruption, or unavailability</li>
            <li>Service interruptions or outages</li>
            <li>Lost revenue, profits, or business opportunity</li>
            <li>Indirect, incidental, or consequential damages</li>
          </ul>
          <p>
            OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID IN THE 12 MONTHS PRECEDING THE CLAIM.
          </p>

          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless Templify from any claims, damages, or costs arising from:
          </p>
          <ul>
            <li>Your use of the service</li>
            <li>Your violation of these Terms</li>
            <li>Content you create or generate</li>
            <li>Infringement or violation of third-party rights</li>
          </ul>

          <h2>11. Termination</h2>
          <p>
            We may suspend or terminate your account and access if:
          </p>
          <ul>
            <li>You violate these Terms or the Acceptable Use Policy</li>
            <li>Your account is inactive for 12 months</li>
            <li>You engage in abuse or fraud</li>
          </ul>
          <p>
            Upon termination, your access is immediately revoked. Data retention obligations remain in effect per the
            Data Retention policy.
          </p>

          <h2>12. Changes to terms</h2>
          <p>
            We may modify these Terms at any time. Material changes will be announced via email to your account address.
            Continued use after notification constitutes acceptance.
          </p>

          <h2>13. Dispute resolution and governing law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which the service operator is located, excluding
            conflict-of-law principles. Any disputes shall be resolved through binding arbitration or small claims court,
            at our option.
          </p>

          <h2>14. Severability</h2>
          <p>
            If any provision of these Terms is found invalid or unenforceable, the remaining provisions continue in
            full force and effect.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about these Terms should be directed to our contact page.
          </p>
        </div>
      </section>
    </main>
  );
}
