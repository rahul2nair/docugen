export default function PrivacyPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-4xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            This Privacy Policy explains how Templify collects, uses, stores, discloses, and protects personal
            information when you use our website, application, and APIs (collectively, the "Service").
          </p>

          <h2>1. Scope</h2>
          <p>
            This policy applies to personal information processed in connection with account creation, product use,
            billing, support, and security operations. It does not apply to third-party websites or services that are
            not controlled by Templify.
          </p>

          <h2>2. Information we collect</h2>

          <h3>Account and profile information</h3>
          <ul>
            <li>Email address</li>
            <li>Name and profile information (optional)</li>
            <li>Profile image and preferences (if provided)</li>
          </ul>

          <h3>Authentication and API credentials</h3>
          <ul>
            <li>API keys and session tokens</li>
            <li>Login events, IP address, user agent, and request metadata</li>
          </ul>

          <h3>Service and usage data</h3>
          <ul>
            <li>Templates, generation job metadata, and output metadata</li>
            <li>Operational logs needed to run and secure the service</li>
            <li>Feature usage metrics, diagnostics, and error reports</li>
          </ul>

          <h3>Billing data</h3>
          <ul>
            <li>Plan and subscription status</li>
            <li>Invoice and payment metadata via our payment processor</li>
          </ul>

          <h3>Communications</h3>
          <ul>
            <li>Support requests and correspondence you send to us</li>
            <li>Service notices (security, billing, policy, and operational updates)</li>
          </ul>

          <h2>3. Legal bases for processing</h2>
          <p>
            Depending on your location, we process personal information under one or more legal bases, including:
          </p>
          <ul>
            <li>Performance of a contract (to provide the Service you request)</li>
            <li>Legitimate interests (security, fraud prevention, product improvement)</li>
            <li>Compliance with legal obligations</li>
            <li>Consent, where required by law</li>
          </ul>

          <h2>4. How we use your information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Provide, maintain, and improve the Service</li>
            <li>Authenticate users and authorize API access</li>
            <li>Process generation jobs and deliver outputs</li>
            <li>Operate billing, subscriptions, and account management</li>
            <li>Prevent abuse, fraud, and security incidents</li>
            <li>Comply with legal, tax, audit, and regulatory obligations</li>
            <li>Respond to support requests and product inquiries</li>
          </ul>

          <h2>5. Cookies and similar technologies</h2>
          <p>
            Templify uses essential cookies and similar technologies for secure authentication, session continuity,
            and core product functionality.
          </p>
          <ul>
            <li>Authentication and session management</li>
            <li>Security controls and abuse prevention</li>
            <li>Basic product settings and preferences</li>
          </ul>
          <p>We do not use third-party advertising cookies in the Service.</p>

          <h2>6. Sharing and disclosure</h2>
          <p>
            We do not sell personal information. We may disclose information in the following circumstances:
          </p>
          <ul>
            <li>To service providers processing data on our behalf for legitimate business purposes</li>
            <li>To comply with legal obligations, court orders, or lawful requests</li>
            <li>To protect rights, safety, security, and integrity of Templify, users, and the public</li>
            <li>In connection with a merger, acquisition, financing, or asset sale</li>
          </ul>

          <h2>7. International data transfers</h2>
          <p>
            Your information may be processed in countries other than your own. Where required, we implement
            appropriate safeguards for cross-border transfers consistent with applicable data protection laws.
          </p>

          <h2>8. Data retention</h2>
          <p>
            We retain personal information for as long as necessary to provide the Service, fulfill legal
            obligations, resolve disputes, and enforce our agreements.
          </p>
          <ul>
            <li>Account profile and account configuration data: retained while your account remains active.</li>
            <li>Operational and security logs: retained for limited periods based on security and audit needs.</li>
            <li>Financial and tax-relevant records: retained where legally required.</li>
          </ul>

          <h2>9. Security</h2>
          <p>
            We apply reasonable technical and organizational safeguards designed to protect personal information.
            No method of transmission or storage is completely secure, and therefore we cannot guarantee absolute
            security.
          </p>

          <h2>10. Your privacy rights</h2>
          <p>
            Depending on your location, you may be able to request access, correction, export, or deletion of your
            personal information, or object to and restrict certain processing.
          </p>
          <p>
            In Germany and the wider EEA/UK, these rights include access, rectification, erasure, restriction,
            data portability, withdrawal of consent, and objection to processing based on legitimate interests.
          </p>
          <p>
            You can request deletion through account controls when signed in, or by contacting us through the
            contact page. We may need to verify identity before fulfilling requests.
          </p>

          <h2>11. Supervisory authority complaints</h2>
          <p>
            If you are in the EEA/UK, you may lodge a complaint with your local data protection supervisory authority
            if you believe processing of your personal data violates applicable law.
          </p>

          <h2>12. Children's privacy</h2>
          <p>
            The Service is not directed to children under the age required by applicable law to consent to data
            processing in their jurisdiction. We do not knowingly collect personal information from children in
            violation of applicable law.
          </p>

          <h2>13. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material updates will be reflected by revising
            the "Last updated" date and, where appropriate, by additional notice.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy-related questions or requests, contact us via the contact page.
          </p>
        </div>
      </section>
    </main>
  );
}
