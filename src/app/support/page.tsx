export default function SupportPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-4xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Support & Service Levels</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            This page sets expectations for support coverage, response targets, and the practical scope of
            service availability for Templify.
          </p>

          <h2>Support channels</h2>
          <p>
            Support requests should be submitted through the contact page. Include your account email,
            the affected job or template if available, and enough detail to reproduce the issue.
          </p>

          <h2>Coverage hours</h2>
          <p>
            Standard support is handled during normal business hours on business days. Requests submitted
            outside those hours are queued for the next support window unless they involve a production outage.
          </p>

          <h2>Response targets</h2>
          <ul>
            <li>Critical: target initial response within 4 business hours.</li>
            <li>High: target initial response within 1 business day.</li>
            <li>Normal: target initial response within 2 business days.</li>
            <li>Low: target initial response within 3 business days.</li>
          </ul>

          <h2>Severity definitions</h2>
          <ul>
            <li>Critical: core generation workflow is unavailable for multiple users.</li>
            <li>High: major feature degradation with no practical workaround.</li>
            <li>Normal: isolated errors, degraded experience, or account issues with a workaround.</li>
            <li>Low: documentation, usability, or feature questions.</li>
          </ul>

          <h2>Availability target</h2>
          <p>
            Templify is operated on a commercially reasonable basis with a target monthly uptime of 99.5%
            for the hosted application, excluding scheduled maintenance, third-party outages, customer-side
            internet issues, and force majeure events.
          </p>

          <h2>Planned maintenance</h2>
          <p>
            We may perform maintenance to improve rendering reliability, billing, storage, or security. When
            practical, material maintenance windows will be announced in advance.
          </p>

          <h2>Not included in standard support</h2>
          <ul>
            <li>Custom template design or document consulting.</li>
            <li>Debugging third-party customer systems outside the documented API surface.</li>
            <li>Immediate recovery obligations tied to custom enterprise contracts.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}