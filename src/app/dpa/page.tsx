export default function DpaPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-4xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Data Processing Agreement (DPA)</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            This Data Processing Agreement ("DPA") applies when Templify processes personal data on behalf of a
            customer ("Controller") in connection with the Service. Templify acts as a processor for such Customer
            Personal Data and processes it only on documented instructions from the Controller, except where otherwise
            required by law.
          </p>

          <h2>1. Definitions</h2>
          <ul>
            <li><strong>Controller:</strong> The customer determining purposes and means of processing.</li>
            <li><strong>Processor:</strong> Templify, processing personal data on behalf of the Controller.</li>
            <li><strong>Data Subject:</strong> Identified or identifiable natural person to whom data relates.</li>
            <li><strong>Customer Personal Data:</strong> Personal data submitted to the Service by or for the customer.</li>
          </ul>

          <h2>2. Subject matter and duration</h2>
          <p>
            Processing under this DPA is limited to operation of the Service, including document generation, account
            management, security operations, and technical support. Processing continues for the duration of the
            customer's use of the Service and any agreed post-termination period needed for deletion workflows.
          </p>

          <h2>3. Nature and purpose of processing</h2>
          <ul>
            <li>Host and store templates, metadata, and generated output files.</li>
            <li>Execute generation and delivery workflows initiated by the customer.</li>
            <li>Provide account administration, billing support, and operational troubleshooting.</li>
            <li>Detect, prevent, and investigate security threats and service abuse.</li>
          </ul>

          <h2>4. Categories of data and data subjects</h2>
          <p>
            Categories of personal data may include identifiers (name, email, account ID), business contact details,
            document content provided by the customer, and technical usage metadata. Data subjects may include the
            customer's employees, contractors, clients, and end users whose data is included in customer workflows.
          </p>

          <h2>5. Controller obligations</h2>
          <ul>
            <li>Ensure a lawful basis for processing and all required notices to data subjects.</li>
            <li>Provide accurate processing instructions and avoid prohibited content.</li>
            <li>Use the Service in compliance with applicable data protection laws.</li>
            <li>Implement suitable access controls and credential management on the customer side.</li>
          </ul>

          <h2>6. Processor obligations</h2>
          <ul>
            <li>Process Customer Personal Data only on documented instructions from the Controller.</li>
            <li>Ensure personnel with access are subject to confidentiality obligations.</li>
            <li>Implement reasonable technical and organizational security measures.</li>
            <li>Assist the Controller with data subject rights requests as required by law.</li>
            <li>Assist with breach notifications, impact assessments, and consultations when applicable.</li>
          </ul>

          <h2>7. Security measures</h2>
          <p>
            Templify maintains a security program that includes access controls, credential protections, encrypted
            transport, logging and monitoring, and incident response procedures proportionate to risk.
          </p>

          <h2>8. Sub-processing</h2>
          <p>
            Templify may engage subprocessors for infrastructure, storage, authentication, and payment operations.
            Templify remains responsible for subprocessors' processing obligations under applicable data protection law
            and uses contractual safeguards requiring confidentiality and appropriate security controls.
          </p>

          <h2>9. International transfers</h2>
          <p>
            Where Customer Personal Data is transferred across borders, Templify applies appropriate transfer
            safeguards required by applicable law.
          </p>

          <h2>10. Incident notification</h2>
          <p>
            Templify will notify the Controller without undue delay after becoming aware of a confirmed personal data
            breach involving Customer Personal Data and will provide available information reasonably needed for the
            Controller to meet legal obligations.
          </p>

          <h2>11. Audit and information rights</h2>
          <p>
            On reasonable request and subject to confidentiality obligations, Templify will provide information
            necessary to demonstrate compliance with this DPA. Audit requests must be proportionate, non-disruptive,
            and limited to once per year unless required by law.
          </p>

          <h2>12. Return and deletion</h2>
          <p>
            Upon termination of the Service, Templify will delete or return Customer Personal Data according to
            customer instructions and product capabilities, except where retention is required by law.
          </p>

          <h2>13. Liability and precedence</h2>
          <p>
            This DPA is subject to the liability limitations in the Terms of Service unless mandatory law requires
            otherwise. If there is a conflict between this DPA and Terms of Service regarding data protection matters,
            this DPA controls.
          </p>

          <h2>Contact</h2>
          <p>
            For DPA requests, signed versions, or privacy compliance questions, contact us via the contact page.
          </p>
        </div>
      </section>
    </main>
  );
}
