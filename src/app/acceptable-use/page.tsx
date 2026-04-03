export default function AcceptableUsePage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-4xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Acceptable Use Policy</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            This policy outlines prohibited use of Templify. Violations may result in service suspension or
            termination of your account and API keys.
          </p>

          <h2>Prohibited content</h2>
          <p>
            You must not use Templify to generate, store, or transmit:
          </p>
          <ul>
            <li>Illegal content or content that violates local, state, or national law</li>
            <li>Child sexual abuse material or imagery</li>
            <li>Non-consensual intimate images or deepfakes</li>
            <li>Instructions for creating weapons, explosives, or other dangerous materials</li>
            <li>Intellectual property you do not own or have permission to use</li>
            <li>Pirated software, media, or other copyrighted material</li>
          </ul>

          <h2>Prohibited activities</h2>
          <ul>
            <li>
              <strong>Rate limit abuse:</strong> Deliberately exceeding rate limits, automating requests to trigger abuse,
              or using multiple accounts/IPs to circumvent limits
            </li>
            <li>
              <strong>Service disruption:</strong> Attempting to overwhelm or crash the service, stress-testing without
              permission, or causing availability issues
            </li>
            <li>
              <strong>Fraud and deception:</strong> Misrepresenting identity, creating fake accounts, or using refund
              requests dishonestly
            </li>
            <li>
              <strong>Credential abuse:</strong> Sharing API keys with unauthorized users, stealing or using another
              user's API key
            </li>
            <li>
              <strong>Reverse engineering:</strong> Attempting to extract, decompile, or extract templates, algorithms,
              or proprietary logic
            </li>
            <li>
              <strong>Commercial resale:</strong> Reselling Templify or its output as a service without authorization
            </li>
            <li>
              <strong>Phishing and malware:</strong> Using Templify to create phishing documents, malware distributions,
              or social engineering tools
            </li>
            <li>
              <strong>Data harvesting:</strong> Scraping user accounts, extracting bulk data, or using the service to
              build competing products
            </li>
          </ul>

          <h2>Spam and unwanted contact</h2>
          <p>
            You must not use Templify to:
          </p>
          <ul>
            <li>Send unsolicited bulk emails or marketing messages</li>
            <li>Generate counterfeit invoices, receipts, or documents for deception</li>
            <li>Create documents for harassment, threats, or unwanted contact</li>
          </ul>

          <h2>Compliance with laws</h2>
          <p>
            All use of Templify must comply with applicable laws, regulations, and third-party rights. You are
            responsible for ensuring your documents comply with export controls, sanctions, privacy laws, and
            data protection regulations in your jurisdiction.
          </p>

          <h2>Enforcement</h2>
          <p>
            We monitor for abuse and reserve the right to:
          </p>
          <ul>
            <li>Suspend or disable your account without notice if abuse is detected</li>
            <li>Revoke API keys and prevent future use</li>
            <li>Report serious violations (illegal content, threats) to law enforcement</li>
            <li>Retain evidence of violations for investigation and legal proceedings</li>
          </ul>

          <h2>Reporting abuse</h2>
          <p>
            If you encounter abuse, illegal content, or suspect a security issue, report it via the contact page with
            as much detail as possible. We will investigate and respond within 48 hours.
          </p>
        </div>
      </section>
    </main>
  );
}
