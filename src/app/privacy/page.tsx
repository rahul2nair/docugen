export default function PrivacyPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-4xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            This privacy policy describes how Templify collects, uses, and protects personal information when you use
            our service through the web application or API.
          </p>

          <h2>Information we collect</h2>

          <h3>Account data</h3>
          <ul>
            <li>Email address</li>
            <li>Name and profile information (optional)</li>
            <li>Avatar or profile picture (optional)</li>
            <li>Password (encrypted)</li>
            <li>Timezone and language preferences</li>
          </ul>

          <h3>API and authentication</h3>
          <ul>
            <li>API keys you generate (securely stored)</li>
            <li>Session tokens used for web authentication</li>
            <li>Login timestamps and IP addresses</li>
          </ul>

          <h3>Usage data</h3>
          <ul>
            <li>Generated documents and their metadata (template ID, format, timestamp)</li>
            <li>Job status and processing times</li>
            <li>API calls and endpoints accessed</li>
            <li>Stored sessions and snapshots (content not indexed or analyzed)</li>
          </ul>

          <h3>Technical data</h3>
          <ul>
            <li>Your IP address</li>
            <li>Browser type and user agent</li>
            <li>Device type and operating system</li>
            <li>Referrer and landing page</li>
          </ul>

          <h3>Billing data</h3>
          <ul>
            <li>Billing email and address (if provided)</li>
            <li>Subscription plan and pricing</li>
            <li>Invoice records and payment metadata (Stripe)</li>
          </ul>

          <h2>How we use your information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Authenticate your account and authorize API access</li>
            <li>Process your document generation requests</li>
            <li>Provide and improve the service</li>
            <li>Send billing notifications and subscription updates</li>
            <li>Prevent abuse and enforce limits</li>
            <li>Troubleshoot errors and investigate incidents</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>Data processors</h2>
          <p>
            We share personal data with trusted vendors to operate Templify:
          </p>
          <ul>
            <li><strong>Supabase</strong> — Authentication, account data, database</li>
            <li><strong>Stripe</strong> — Billing and subscription management</li>
            <li><strong>Backblaze B2</strong> — Generated file storage</li>
            <li><strong>Railway</strong> — Application hosting and infrastructure</li>
          </ul>
          <p>
            These vendors process your data under data processing agreements and are required to maintain
            confidentiality and security.
          </p>

          <h2>Your rights</h2>
          <p>
            Subject to local law, you have the right to:
          </p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong>Portability:</strong> Download your data in machine-readable format</li>
            <li><strong>Objection:</strong> Opt out of non-essential processing</li>
          </ul>
          <p>Submit requests via the contact page. We aim to respond within 30 days.</p>

          <h2>Cookies and tracking</h2>
          <p>
            Templify uses cookies for:
          </p>
          <ul>
            <li><strong>Authentication:</strong> Maintaining your login session</li>
            <li><strong>Preferences:</strong> Remembering your settings and theme</li>
            <li><strong>Essential:</strong> CSRF tokens and session IDs</li>
          </ul>
          <p>We do not use cookies for behavioral tracking or advertising.</p>

          <h2>Data retention</h2>
          <p>
            See our Data Retention & Deletion policy for details on how long we keep different types of data.
          </p>

          <h2>Security</h2>
          <p>
            All data in transit is encrypted using TLS 1.2+. Passwords are hashed. API keys are encrypted at rest.
            Billing data is handled by Stripe with PCI DSS compliance. We monitor for unauthorized access and
            maintain security patches and updates.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy questions or concerns, contact us via the contact page.
          </p>
        </div>
      </section>
    </main>
  );
}
