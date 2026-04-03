export default function TermsPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-4xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            These Terms of Service ("Terms") govern your access to and use of Templify, including our website,
            web application, APIs, and related services (collectively, the "Service"). By creating an account,
            accessing the Service, or using our APIs, you agree to be bound by these Terms.
          </p>

          <h2>1. Eligibility and account registration</h2>
          <p>
            You must be legally able to enter a binding agreement to use Templify. If you use the Service on
            behalf of a company or organization, you represent that you have authority to bind that entity to
            these Terms. You are responsible for maintaining accurate account information and for all activity
            under your account.
          </p>

          <h2>2. Service scope</h2>
          <p>
            Templify provides tools for template-based document generation, job processing, output retrieval,
            account management, and related features. The Service may evolve over time. We may add, modify,
            or remove features to improve quality, security, or compliance.
          </p>

          <h2>3. Account security and API keys</h2>
          <p>
            You are responsible for safeguarding account credentials, session tokens, and API keys. Any activity
            performed using your credentials is treated as your activity. You must immediately rotate credentials
            and notify us if you suspect unauthorized use.
          </p>

          <h2>4. Customer content and responsibility</h2>
          <p>
            You are solely responsible for data, templates, prompts, files, and other content you submit or
            generate through the Service ("Customer Content"). You represent that you have the necessary rights
            and legal basis to use Customer Content and to instruct us to process it.
          </p>

          <h2>5. License and ownership</h2>
          <ul>
            <li>You retain ownership of Customer Content.</li>
            <li>
              You grant Templify a non-exclusive, worldwide license to host, process, transmit, and store Customer
              Content solely as needed to provide and secure the Service.
            </li>
            <li>
              Templify and its licensors retain all rights in the Service, software, documentation, trademarks,
              and related intellectual property.
            </li>
          </ul>

          <h2>6. Acceptable use</h2>
          <p>
            You must use Templify lawfully and in accordance with our Acceptable Use Policy. Prohibited behavior
            includes abuse, fraud, unauthorized access, rights infringement, or attempts to disrupt the Service.
          </p>

          <h2>7. Subscription, billing, and taxes</h2>
          <ul>
            <li>Paid plans are billed in advance on a recurring basis unless cancelled.</li>
            <li>Applicable taxes may be charged unless a valid exemption is provided.</li>
            <li>Payments are processed by Stripe or another authorized payment provider.</li>
            <li>Refund and cancellation terms are described on the Refund & Cancellation page.</li>
          </ul>

          <h2>8. Plan limits, quotas, and fair use</h2>
          <p>
            Access to features, quotas, throughput, and storage may vary by plan. We may enforce rate limits,
            concurrency limits, and fair-use controls to preserve system reliability and security. Excessive or
            abusive usage may result in throttling, suspension, or required plan changes.
          </p>

          <h2>9. Availability and maintenance</h2>
          <p>
            We strive to provide reliable service, but uninterrupted availability is not guaranteed. We may perform
            scheduled or emergency maintenance and may temporarily limit functionality to address operational,
            security, or legal issues.
          </p>

          <h2>10. Privacy and data handling</h2>
          <p>
            Use of the Service is also subject to our Privacy Policy and Cookie Policy, which describe how we
            collect, use, retain, and protect personal data and related identifiers.
          </p>

          <h2>11. Suspension and termination</h2>
          <p>
            We may suspend or terminate access if required by law, if your use violates these Terms or policy,
            or if your use creates material risk to the Service, users, or third parties. You may stop using the
            Service at any time and may request account deletion via the contact page.
          </p>

          <h2>12. Disclaimer of warranties</h2>
          <p>
            To the maximum extent permitted by law, the Service is provided on an "as is" and "as available" basis
            without warranties of any kind, whether express or implied, including implied warranties of
            merchantability, fitness for a particular purpose, and non-infringement.
          </p>

          <h2>13. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Templify will not be liable for indirect, incidental, special,
            consequential, exemplary, or punitive damages, or for loss of profits, revenue, data, goodwill, or
            business interruption, arising from or related to the Service.
          </p>

          <h2>14. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Templify, its affiliates, and personnel from claims,
            liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of your
            Customer Content, your use of the Service, or your violation of these Terms or applicable law.
          </p>

          <h2>15. Governing law and disputes</h2>
          <p>
            These Terms are governed by applicable law in the jurisdiction where Templify is established,
            without regard to conflict-of-law principles. Disputes will be resolved in competent courts in that
            jurisdiction unless otherwise required by mandatory law.
          </p>

          <h2>16. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes will be reflected by updating the
            "Last updated" date and, where appropriate, by additional notice in the Service. Continued use after
            changes become effective constitutes acceptance of the revised Terms.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about these Terms can be submitted via the contact page.
          </p>
        </div>
      </section>
    </main>
  );
}
