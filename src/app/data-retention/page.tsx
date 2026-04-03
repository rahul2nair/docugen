export default function DataRetentionPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-4xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Data Retention & Deletion</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            This page explains how long Templify retains different types of data, how the retention periods differ
            by plan, and how to request data deletion.
          </p>

          <h2>Generated files (output documents)</h2>
          <p>
            Generated HTML, PDF, and other output files are retained in storage based on your plan and the original
            generation date:
          </p>
          <ul>
            <li><strong>During and after a job:</strong> Available for immediate download for up to 24 hours</li>
            <li><strong>In "My Files":</strong> Saved outputs are retained for 30 days from generation date</li>
            <li><strong>After retention window:</strong> Automatically deleted; not recoverable</li>
          </ul>

          <h2>Session snapshots</h2>
          <ul>
            <li><strong>Maximum stored:</strong> 50 snapshots per session</li>
            <li><strong>Session lifetime:</strong> 48 hours of inactivity before expiration</li>
            <li><strong>After expiration:</strong> Session and all snapshots are deleted</li>
          </ul>

          <h2>Account data</h2>
          <p>
            Account information (email, name, API keys, billing records) is retained as long as your account is active.
          </p>
          <ul>
            <li><strong>Active account:</strong> Data retained indefinitely</li>
            <li><strong>Account deletion:</strong> On your request, all personal data is deleted within 30 days</li>
            <li><strong>Billing records:</strong> Retained for 7 years for tax and compliance purposes</li>
          </ul>

          <h2>API keys</h2>
          <ul>
            <li><strong>Creation date:</strong> Recorded for audit purposes</li>
            <li><strong>Last used:</strong> Tracked to identify stale keys</li>
            <li><strong>On deletion:</strong> Key is immediately revoked and usage history is archived</li>
          </ul>

          <h2>Logs and metadata</h2>
          <p>
            Operational logs (API calls, errors, rate limit events) are retained to troubleshoot issues and prevent abuse.
          </p>
          <ul>
            <li><strong>Request logs:</strong> 90 days</li>
            <li><strong>Error logs:</strong> 180 days</li>
            <li><strong>Security/rate-limit events:</strong> 1 year</li>
          </ul>

          <h2>Payment information</h2>
          <ul>
            <li><strong>Stored with Stripe:</strong> Credit card details are never stored by Templify</li>
            <li><strong>Billing metadata:</strong> Invoice records and subscription history retained for 7 years</li>
          </ul>

          <h2>Request your data</h2>
          <p>
            You can request a copy of your personal data (account info, API keys, billing records) in machine-readable
            format. Submit a request via the contact page. We aim to respond within 30 days.
          </p>

          <h2>Delete your account and data</h2>
          <p>
            You can request complete account deletion at any time. This will:
          </p>
          <ul>
            <li>Immediately revoke all active API keys</li>
            <li>Cancel any active subscription</li>
            <li>Delete all account data and generated files within 30 days</li>
            <li>Retain billing records for tax compliance (7 years)</li>
          </ul>
          <p>Submit a deletion request via the contact page. Deletion is permanent and cannot be reversed.</p>
        </div>
      </section>
    </main>
  );
}
