const subprocessors = [
  {
    name: "Supabase",
    purpose: "Authentication, hosted Postgres, and account-linked application data",
    data: "Account identifiers, auth metadata, template records, generated file metadata"
  },
  {
    name: "Stripe",
    purpose: "Subscription billing, checkout, and customer portal management",
    data: "Billing identifiers, email, subscription and payment metadata"
  },
  {
    name: "Backblaze B2",
    purpose: "Object storage for generated files and downloadable outputs",
    data: "Generated documents, file names, storage metadata"
  },
  {
    name: "Railway",
    purpose: "Application hosting and operational runtime infrastructure",
    data: "Application logs, runtime metadata, environment-hosted services"
  },
  {
    name: "Redis",
    purpose: "Queue coordination, rate limiting, and transient job state",
    data: "Job identifiers, rate-limit counters, temporary processing metadata"
  }
];

export default function SubprocessorsPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-5xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Subprocessors</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            This page lists the main third-party service providers used to operate Templify. These vendors help
            deliver infrastructure, billing, storage, and authentication functionality.
          </p>

          <h2>How to read this list</h2>
          <p>
            The list reflects the services currently visible in the application configuration and codebase. It should
            be updated whenever a provider is added, removed, or used for a materially different processing purpose.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Typical data involved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {subprocessors.map((provider) => (
                <tr key={provider.name}>
                  <td className="px-4 py-4 font-medium text-slate-900">{provider.name}</td>
                  <td className="px-4 py-4">{provider.purpose}</td>
                  <td className="px-4 py-4">{provider.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="prose mt-6 max-w-none text-slate-700">
          <h2>Change management</h2>
          <p>
            If a new subprocessor is introduced for customer data, this page should be updated before or alongside
            deployment of that change. Enterprise customers can use this page as the baseline disclosure for vendor review.
          </p>
        </div>
      </section>
    </main>
  );
}