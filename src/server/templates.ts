export interface TemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number";
  required?: boolean;
  placeholder?: string;
}

export interface TemplateClause {
  id: string;
  title: string;
  description: string;
  category: string;
  defaultEnabled?: boolean;
  editable?: boolean;
  content: string;
}

export interface BuiltinTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  family?: string;
  supportedOutputs: Array<"html" | "pdf">;
  fields: TemplateField[];
  clauses?: TemplateClause[];
  content: string;
}

export interface BuiltinTemplatePreview {
  id: string;
  html: string;
}

function getPreviewValue(field: TemplateField) {
  if (field.placeholder?.trim()) {
    return field.placeholder.trim();
  }

  const normalizedKey = field.key.toLowerCase();

  if (field.type === "date") return "2026-04-15";
  if (field.type === "number") {
    if (/(percent|rate|tax)/.test(normalizedKey)) return "20";
    if (/(hours|days|qty|quantity)/.test(normalizedKey)) return "24";
    return "7500";
  }
  if (/(email)/.test(normalizedKey)) return "team@acmelabs.io";
  if (/(phone|mobile|contact_number)/.test(normalizedKey)) return "+44 20 1234 5678";
  if (/(currency)/.test(normalizedKey)) return "USD";
  if (/(timeline|duration|term)/.test(normalizedKey)) return "6 weeks";
  if (/(status|rating)/.test(normalizedKey)) return "On Track";
  if (/(amount|price|salary|fee|subtotal|total|stipend)/.test(normalizedKey)) return "7500";
  if (/(invoice_number|quote_number|po_number)/.test(normalizedKey)) return "DOC-2026-014";

  if (field.type === "textarea") {
    if (/(address)/.test(normalizedKey)) return "12 Main Street\nDublin D01 AB12\nIreland";
    if (/(line_items|items|deliverables|scope|services|achievements|strengths|growth|goals|steps|payment_schedule|media_contact|boilerplate|body|summary|notes|details)/.test(normalizedKey)) {
      return "First key point\nSecond key point\nThird key point";
    }
    return `${field.label} details go here.`;
  }

  return field.label;
}

export function buildTemplatePreviewData(template: BuiltinTemplate) {
  return template.fields.reduce<Record<string, unknown>>((accumulator, field) => {
    accumulator[field.key] = getPreviewValue(field);
    return accumulator;
  }, {});
}

export const builtinTemplates: BuiltinTemplate[] = [
  {
    id: "offer_letter",
    name: "Offer Letter",
    description: "Formal hiring letter for startups and HR teams.",
    category: "HR",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "candidate_name", label: "Candidate Name", type: "text", required: true, placeholder: "Rahul Nair" },
      { key: "company_name", label: "Company Name", type: "text", required: true, placeholder: "Acme Labs" },
      { key: "job_title", label: "Job Title", type: "text", required: true, placeholder: "Solution Architect" },
      { key: "salary", label: "Salary", type: "text", required: true, placeholder: "€120,000" },
      { key: "start_date", label: "Start Date", type: "date", required: true },
      { key: "manager_name", label: "Hiring Manager", type: "text", required: true, placeholder: "Asha Menon" }
    ],
    clauses: [
      {
        id: "probation_period",
        title: "Probation Period",
        description: "Adds a standard probation review window.",
        category: "Employment Terms",
        defaultEnabled: true,
        editable: true,
        content:
          "This offer is subject to an initial probation period of six months, during which performance, conduct, and role fit will be reviewed by {{manager_name}} and the leadership team."
      },
      {
        id: "work_structure",
        title: "Work Structure",
        description: "Clarifies in-office, hybrid, or remote expectations.",
        category: "Work Structure",
        defaultEnabled: true,
        editable: true,
        content:
          "This role follows a hybrid working structure, with team collaboration expected across shared office and remote working days according to business needs and manager guidance."
      },
      {
        id: "data_privacy",
        title: "Data Privacy",
        description: "Adds privacy and internal data handling expectations.",
        category: "Compliance",
        editable: true,
        content:
          "You are expected to comply with all internal privacy, confidentiality, and information security policies while handling employee, candidate, customer, and company data."
      },
      {
        id: "confidentiality",
        title: "Confidentiality",
        description: "Protects company-sensitive information.",
        category: "Compliance",
        editable: true,
        content:
          "During your employment you may have access to confidential and proprietary information. You must not disclose such information except as required in the ordinary course of your duties or as required by law."
      }
    ],
    content: `
      <section>
        <div style="border:1px solid #e4d7c8;border-radius:30px;background:#fffdfa;overflow:hidden;box-shadow:0 18px 48px rgba(58,37,18,0.08);">
          <div style="padding:26px 32px;background:linear-gradient(180deg,#2f2219 0%,#453227 100%);color:#f6efe8;">
            <div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start;">
              <div>
                <div style="font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#d8bda0;">Office of People and Culture</div>
                <div style="margin-top:14px;font-size:34px;font-weight:800;line-height:1.02;letter-spacing:-0.05em;">Formal Offer Letter</div>
              </div>
              <div style="text-align:right;font-size:13px;line-height:1.9;color:#e4d2c2;">
                <div><strong style="color:#ffffff;">Issued by</strong> {{company_name}}</div>
                <div><strong style="color:#ffffff;">Prepared by</strong> {{manager_name}}</div>
              </div>
            </div>
          </div>

          <div style="padding:30px 32px 34px;">
            <div style="display:grid;grid-template-columns:1fr 240px;gap:24px;align-items:start;">
              <div>
                <div style="font-size:14px;line-height:1.9;color:#5d4d42;">
                  {{company_name}}<br />
                  {{start_date}}
                </div>

                <div style="margin-top:26px;font-size:15px;line-height:1.95;color:#332821;">
                  <strong>{{candidate_name}}</strong><br />
                  Candidate for {{job_title}}
                </div>

                <div style="margin-top:28px;padding-bottom:18px;border-bottom:1px solid #ebdfd2;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#9b7551;">Subject</div>
                  <div style="margin-top:10px;font-size:38px;font-weight:800;line-height:1.06;letter-spacing:-0.05em;color:#2f241e;">Offer of employment as {{job_title}}</div>
                </div>

                <div style="margin-top:24px;font-size:16px;line-height:1.98;color:#352922;">
                  <p style="margin:0 0 18px;">Dear {{candidate_name}},</p>
                  <p style="margin:0 0 18px;">We are pleased to formally offer you the position of <strong>{{job_title}}</strong> with <strong>{{company_name}}</strong>. This offer reflects our confidence in your capability, judgement, and the contribution we believe you will make to the organisation.</p>
                  <p style="margin:0 0 18px;">You will report to <strong>{{manager_name}}</strong>, and we expect your appointment to begin on <strong>{{start_date}}</strong>, subject to final internal approvals and completion of standard employment documentation.</p>
                  <p style="margin:0;">We would be pleased to welcome you to the team and support your transition into the role with clarity on expectations, working arrangements, and the resources needed to succeed from the outset.</p>
                </div>

                <div style="margin-top:28px;padding:22px 24px;border-radius:22px;background:#faf4ed;border:1px solid #eadfce;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#8f6a44;margin-bottom:12px;">Appointment Summary</div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:14px;line-height:1.9;color:#4e4036;">
                    <div><strong style="color:#2f241e;">Position</strong><br />{{job_title}}</div>
                    <div><strong style="color:#2f241e;">Manager</strong><br />{{manager_name}}</div>
                    <div><strong style="color:#2f241e;">Proposed Start Date</strong><br />{{start_date}}</div>
                    <div><strong style="color:#2f241e;">Annual Compensation</strong><br />{{salary}}</div>
                  </div>
                </div>

                <div style="margin-top:28px;font-size:15px;line-height:1.95;color:#352922;">
                  Sincerely,<br />
                  <strong>{{manager_name}}</strong><br />
                  {{company_name}}
                </div>

                <div style="margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:18px;">
                  <div style="padding-top:18px;border-top:1px solid #e6d7c8;font-size:13px;line-height:1.9;color:#5f5044;">
                    <div style="font-weight:700;color:#2f241e;">For {{company_name}}</div>
                    <div style="margin-top:18px;">Signature: ____________________</div>
                    <div>Name: {{manager_name}}</div>
                  </div>
                  <div style="padding-top:18px;border-top:1px solid #e6d7c8;font-size:13px;line-height:1.9;color:#5f5044;">
                    <div style="font-weight:700;color:#2f241e;">Candidate Acceptance</div>
                    <div style="margin-top:18px;">Signature: ____________________</div>
                    <div>Name: {{candidate_name}}</div>
                  </div>
                </div>
              </div>

              <div style="padding:20px 18px;border-radius:24px;background:#f8efe6;border:1px solid #eadfce;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8f6a44;">Offer Terms</div>
                <div style="margin-top:16px;padding-bottom:14px;border-bottom:1px solid #e6d6c6;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8f6a44;">Compensation</div>
                  <div style="margin-top:8px;font-size:28px;font-weight:800;line-height:1.08;letter-spacing:-0.05em;color:#2f241e;">{{salary}}</div>
                </div>
                <div style="margin-top:16px;font-size:13px;line-height:1.9;color:#5d4f44;">
                  <div><strong style="color:#2f241e;">Candidate</strong></div>
                  <div>{{candidate_name}}</div>
                  <div style="margin-top:12px;"><strong style="color:#2f241e;">Reporting Line</strong></div>
                  <div>{{manager_name}}</div>
                  <div style="margin-top:12px;"><strong style="color:#2f241e;">Company</strong></div>
                  <div>{{company_name}}</div>
                </div>
                <div style="margin-top:18px;padding:14px 16px;border-radius:18px;background:#fffaf4;border:1px solid #eadfce;font-size:13px;line-height:1.85;color:#6a5b4d;">This letter is intended to read as an official appointment document rather than a profile or résumé layout.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "welcome_email",
    name: "Welcome Email",
    description: "Polished onboarding email for customers or new hires.",
    category: "Communication",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "recipient_name", label: "Recipient Name", type: "text", required: true, placeholder: "Rahul" },
      { key: "product_name", label: "Product Name", type: "text", required: true, placeholder: "Templify" },
      { key: "sender_name", label: "Sender Name", type: "text", required: true, placeholder: "Team Templify" },
      { key: "cta_link", label: "CTA Link", type: "text", required: true, placeholder: "https://example.com/get-started" }
    ],
    content: `
      <section>
        <div style="padding:34px 34px 28px;border-radius:28px;background:radial-gradient(circle at top right,#dff7f0 0%,transparent 34%),linear-gradient(180deg,#0f3a36 0%,#164d47 100%);color:#effaf8;text-align:center;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#9fded3;">Customer Onboarding</div>
          <div style="margin-top:14px;font-size:38px;font-weight:800;line-height:1.08;letter-spacing:-0.05em;">Welcome to {{product_name}}</div>
          <div style="margin:14px auto 0;max-width:620px;font-size:16px;line-height:1.8;color:#d3ece7;">A polished first touchpoint should feel clear, confident, and easy to act on.</div>
          <div style="margin-top:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#effaf8;padding:14px 24px;font-size:14px;font-weight:700;color:#164d47;">Open workspace: {{cta_link}}</div>
        </div>

        <div style="margin-top:-18px;padding:24px;border-radius:24px;background:#fff;border:1px solid #d9ece8;box-shadow:0 18px 40px rgba(17,57,52,0.08);">
          <p style="font-size:16px;line-height:1.8;color:#24413d;">Hi {{recipient_name}},</p>
          <p style="font-size:16px;line-height:1.85;color:#24413d;">We’re glad to have you on board. {{product_name}} helps teams create polished, repeatable documents with less manual work and more consistency across every output.</p>
          <p style="font-size:16px;line-height:1.85;color:#24413d;">Use the link above to complete your setup and start with your first workflow in just a few minutes.</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:20px;">
          <div style="padding:18px;border-radius:18px;background:#f3fbf9;border:1px solid #d9ece8;">
            <div style="font-size:12px;font-weight:700;color:#164d47;margin-bottom:8px;">Create faster</div>
            <div style="font-size:13px;line-height:1.8;color:#45635e;">Use ready-made templates instead of rebuilding document structure each time.</div>
          </div>
          <div style="padding:18px;border-radius:18px;background:#ffffff;border:1px solid #d9ece8;">
            <div style="font-size:12px;font-weight:700;color:#164d47;margin-bottom:8px;">Stay consistent</div>
            <div style="font-size:13px;line-height:1.8;color:#45635e;">Keep formatting, tone, and presentation aligned across every output.</div>
          </div>
          <div style="padding:18px;border-radius:18px;background:#f3fbf9;border:1px solid #d9ece8;">
            <div style="font-size:12px;font-weight:700;color:#164d47;margin-bottom:8px;">Need help?</div>
            <div style="font-size:13px;line-height:1.8;color:#45635e;">Reply to this email and {{sender_name}} will help you get set up quickly.</div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "proposal",
    name: "Client Proposal",
    description: "Simple professional project proposal for freelancers and agencies.",
    category: "Sales",
    family: "proposal",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "client_name", label: "Client Name", type: "text", required: true, placeholder: "Acme Inc." },
      { key: "project_name", label: "Project Name", type: "text", required: true, placeholder: "Marketing Website Revamp" },
      { key: "scope", label: "Scope", type: "textarea", required: true, placeholder: "Design, build, QA, deployment" },
      { key: "timeline", label: "Timeline", type: "text", required: true, placeholder: "6 weeks" },
      { key: "pricing", label: "Pricing", type: "text", required: true, placeholder: "€7,500 fixed fee" }
    ],
    content: `
      <section>
        <div style="padding:34px;border-radius:28px;background:linear-gradient(135deg,#1a1f27 0%,#2a3240 58%,#1f2631 100%);color:#f4f7fb;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#9fb0c8;">Client Proposal</div>
          <div style="margin-top:14px;font-size:40px;font-weight:800;line-height:1.06;letter-spacing:-0.05em;max-width:620px;">Proposal for {{client_name}}</div>
          <div style="margin-top:12px;font-size:16px;color:#c2cede;">Project: {{project_name}}</div>
        </div>

        <div style="display:grid;grid-template-columns:1.15fr 0.85fr;gap:22px;margin-top:22px;align-items:start;">
          <div>
            <div style="padding:24px;border-left:6px solid #3c5b86;background:#f7f9fc;border-radius:0 20px 20px 0;">
              <div style="font-size:13px;font-weight:700;color:#223243;margin-bottom:10px;">Scope of Work</div>
              <div style="font-size:15px;line-height:1.95;color:#46586c;white-space:pre-line;">{{scope}}</div>
            </div>

            <div style="margin-top:18px;padding:20px 22px;border-radius:18px;background:#ffffff;border:1px solid #dfe7f0;">
              <div style="font-size:13px;font-weight:700;color:#223243;margin-bottom:8px;">Engagement Approach</div>
              <div style="font-size:14px;line-height:1.85;color:#5a6d81;">This proposal is designed for easy client review, clear approval, and a direct transition into project kickoff without ambiguity around delivery expectations.</div>
            </div>
          </div>

          <div style="padding:22px;border-radius:22px;background:#ffffff;border:1px solid #dfe7f0;box-shadow:0 18px 40px rgba(31,39,49,0.08);">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#58708a;margin-bottom:12px;">Commercial Summary</div>
            <div style="padding:12px 0;border-bottom:1px solid #e7edf4;font-size:14px;color:#56687a;display:flex;justify-content:space-between;"><span>Timeline</span><strong style="color:#223243;">{{timeline}}</strong></div>
            <div style="padding:14px 0 0;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#58708a;">Investment</div>
              <div style="margin-top:10px;font-size:30px;font-weight:800;line-height:1.2;color:#1f2b36;">{{pricing}}</div>
            </div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "consulting_proposal",
    name: "Consulting Proposal",
    description: "A more executive consulting proposal variant with discovery framing, workstreams, and a phased commercial summary.",
    category: "Sales",
    family: "proposal",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "client_name", label: "Client Name", type: "text", required: true, placeholder: "Northstar Systems" },
      { key: "initiative_name", label: "Initiative Name", type: "text", required: true, placeholder: "Revenue Operations Reset" },
      { key: "business_context", label: "Business Context", type: "textarea", required: true, placeholder: "Leadership needs clearer pipeline visibility, tighter sales process governance, and better forecasting confidence." },
      { key: "workstreams", label: "Workstreams", type: "textarea", required: true, placeholder: "Diagnostic and stakeholder interviews\nCommercial process redesign\nExecutive reporting model" },
      { key: "phase_timeline", label: "Timeline", type: "text", required: true, placeholder: "10 weeks across discovery, design, and rollout planning" },
      { key: "commercial_model", label: "Commercial Model", type: "text", required: true, placeholder: "Fixed fee with executive steering checkpoints" },
      { key: "investment", label: "Investment", type: "text", required: true, placeholder: "USD 28,000" },
      { key: "partner_name", label: "Prepared By", type: "text", required: true, placeholder: "Rahul Nair" }
    ],
    content: `
      <section>
        <div style="border:1px solid #dde6ef;border-radius:30px;background:#ffffff;overflow:hidden;box-shadow:0 20px 48px rgba(27,43,63,0.08);">
          <div style="padding:30px;background:linear-gradient(135deg,#20324a 0%,#314f72 58%,#f5f8fc 58%,#fbfcfe 100%);">
            <div style="display:grid;grid-template-columns:1.04fr 0.96fr;gap:22px;align-items:start;">
              <div style="color:#eef5fb;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#b8cde2;">Advisory Engagement</div>
                <div style="margin-top:12px;font-size:40px;font-weight:800;line-height:1.02;letter-spacing:-0.06em;">Consulting Proposal</div>
                <div style="margin-top:10px;font-size:15px;line-height:1.85;color:#d7e4f0;">Prepared for {{client_name}} in support of {{initiative_name}}.</div>
              </div>
              <div style="padding:18px 20px;border-radius:22px;background:#ffffff;border:1px solid #dfe7f0;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#58708a;margin-bottom:10px;">Engagement Snapshot</div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#5a6d81;padding-bottom:8px;border-bottom:1px solid #e7edf4;"><span>Initiative</span><strong style="color:#223243;">{{initiative_name}}</strong></div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#5a6d81;padding:8px 0;border-bottom:1px solid #e7edf4;"><span>Timeline</span><strong style="color:#223243;">{{phase_timeline}}</strong></div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#5a6d81;padding-top:8px;"><span>Investment</span><strong style="color:#1f4b6d;">{{investment}}</strong></div>
              </div>
            </div>
          </div>

          <div style="padding:26px 30px 30px;">
            <div style="display:grid;grid-template-columns:1.08fr 0.92fr;gap:18px;align-items:start;">
              <div style="padding:22px;border-radius:22px;background:#fff;border:1px solid #dfe7f0;">
                <div style="font-size:13px;font-weight:700;color:#223243;margin-bottom:10px;">Business Context</div>
                <div style="font-size:15px;line-height:1.92;color:#4b5f73;white-space:pre-line;">{{business_context}}</div>
              </div>
              <div style="padding:22px;border-radius:22px;background:#f7f9fc;border:1px solid #dfe7f0;">
                <div style="font-size:13px;font-weight:700;color:#223243;margin-bottom:10px;">Workstreams</div>
                <ul style="margin:0;padding:0;font-size:14px;line-height:1.85;color:#4b5f73;list-style:disc;">{{{bulletList workstreams}}}</ul>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px;">
              <div style="padding:20px;border-radius:20px;background:#ffffff;border:1px solid #dfe7f0;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#58708a;margin-bottom:10px;">Delivery Shape</div>
                <div style="font-size:14px;line-height:1.85;color:#5a6d81;">This proposal is designed for leadership-facing consulting work where the case for change, executive alignment, and phased outcomes matter as much as the task list itself.</div>
              </div>
              <div style="padding:20px 22px;border-radius:20px;background:#223243;color:#eef5fb;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#b8cbdd;margin-bottom:10px;">Commercial Model</div>
                <div style="font-size:18px;font-weight:700;line-height:1.5;">{{commercial_model}}</div>
                <div style="margin-top:14px;font-size:28px;font-weight:800;line-height:1.1;">{{investment}}</div>
              </div>
            </div>

            <div style="margin-top:20px;padding:18px 20px;border-radius:20px;background:#f3f7fb;border:1px solid #dfe7f0;font-size:13px;line-height:1.85;color:#5a6d81;">Prepared by <strong style="color:#223243;">{{partner_name}}</strong>. Approval of this proposal confirms readiness to move into engagement contracting and kickoff planning.</div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "internship_offer",
    name: "Internship Offer Letter",
    description: "Structured internship offer for universities, hiring teams, and startup programs.",
    category: "HR",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "candidate_name", label: "Candidate Name", type: "text", required: true, placeholder: "Aarav Shah" },
      { key: "company_name", label: "Company Name", type: "text", required: true, placeholder: "Acme Labs" },
      { key: "intern_role", label: "Internship Role", type: "text", required: true, placeholder: "Product Intern" },
      { key: "start_date", label: "Start Date", type: "date", required: true },
      { key: "duration", label: "Duration", type: "text", required: true, placeholder: "6 months" },
      { key: "stipend", label: "Monthly Stipend", type: "text", required: true, placeholder: "€1,200" },
      { key: "manager_name", label: "Supervisor", type: "text", required: true, placeholder: "Asha Menon" }
    ],
    content: `
      <section>
        <div style="border:1px solid #d7e2ee;border-radius:28px;background:#ffffff;overflow:hidden;">
          <div style="padding:26px 30px;background:linear-gradient(180deg,#eff5ff 0%,#e7f0fb 100%);border-bottom:1px solid #d7e2ee;">
            <div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start;">
              <div>
                <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#537394;">Internship Programme</div>
                <div style="margin-top:10px;font-size:34px;font-weight:800;letter-spacing:-0.05em;color:#1d3042;">Internship Offer Letter</div>
                <div style="margin-top:10px;font-size:15px;color:#61768a;">A structured development placement issued by {{company_name}}</div>
              </div>
              <div style="padding:14px 16px;border-radius:18px;background:#ffffff;border:1px solid #d7e2ee;font-size:13px;line-height:1.8;color:#5d7387;">
                <div><strong style="color:#1d3042;">Programme start:</strong> {{start_date}}</div>
                <div><strong style="color:#1d3042;">Duration:</strong> {{duration}}</div>
              </div>
            </div>
          </div>

          <div style="padding:28px 30px 32px;">
            <div style="font-size:16px;line-height:1.95;color:#273745;">
              <p style="margin:0 0 16px;">Dear {{candidate_name}},</p>
              <p style="margin:0 0 16px;">{{company_name}} is pleased to offer you the role of <strong>{{intern_role}}</strong> as part of our internship programme. This placement is intended to combine meaningful project work, day-to-day guidance, and structured learning over the course of the engagement.</p>
              <p style="margin:0;">You will work under the supervision of <strong>{{manager_name}}</strong>, beginning on <strong>{{start_date}}</strong>, for a programme duration of <strong>{{duration}}</strong>.</p>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:24px;">
              <div style="padding:18px;border-radius:20px;background:#ffffff;border:1px solid #dce7f3;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#4c6b8b;margin-bottom:8px;">Role</div>
                <div style="font-size:18px;font-weight:700;color:#1d3042;">{{intern_role}}</div>
              </div>
              <div style="padding:18px;border-radius:20px;background:#f6faff;border:1px solid #dce7f3;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#4c6b8b;margin-bottom:8px;">Supervisor</div>
                <div style="font-size:18px;font-weight:700;color:#1d3042;">{{manager_name}}</div>
              </div>
              <div style="padding:18px;border-radius:20px;background:#1f3447;color:#f3f8fd;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#b8d0e5;margin-bottom:8px;">Monthly Stipend</div>
                <div style="font-size:24px;font-weight:800;">{{stipend}}</div>
              </div>
            </div>

            <div style="margin-top:22px;padding:20px 22px;border-radius:20px;background:#f5f9fd;border:1px solid #dce7f3;font-size:15px;line-height:1.9;color:#425666;">We look forward to supporting your development through practical work, regular feedback, and close collaboration with the team throughout the internship.</div>

            <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:18px;">
              <div style="padding-top:18px;border-top:1px solid #dce7f3;font-size:13px;line-height:1.9;color:#5d7387;">
                <div style="font-weight:700;color:#1d3042;">Programme Approval</div>
                <div style="margin-top:18px;">Signature: ____________________</div>
                <div>Name: {{manager_name}}</div>
              </div>
              <div style="padding-top:18px;border-top:1px solid #dce7f3;font-size:13px;line-height:1.9;color:#5d7387;">
                <div style="font-weight:700;color:#1d3042;">Intern Acceptance</div>
                <div style="margin-top:18px;">Signature: ____________________</div>
                <div>Name: {{candidate_name}}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "contractor_agreement",
    name: "Contractor Agreement",
    description: "Clear independent contractor agreement for freelance or project-based work.",
    category: "Operations",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "company_name", label: "Company Name", type: "text", required: true, placeholder: "Acme Labs" },
      { key: "contractor_name", label: "Contractor Name", type: "text", required: true, placeholder: "Brightline Studio" },
      { key: "services", label: "Services", type: "textarea", required: true, placeholder: "Design, development, QA" },
      { key: "term", label: "Contract Term", type: "text", required: true, placeholder: "1 May 2026 to 30 June 2026" },
      { key: "fees", label: "Fees", type: "text", required: true, placeholder: "€12,000 fixed fee" },
      { key: "signer_name", label: "Signer Name", type: "text", required: true, placeholder: "Asha Menon" }
    ],
    clauses: [
      {
        id: "delivery_timeline",
        title: "Delivery Timeline",
        description: "Sets milestone and timing expectations.",
        category: "Delivery",
        defaultEnabled: true,
        editable: true,
        content:
          "The contractor will perform the services according to the mutually agreed project schedule, providing progress updates at reasonable intervals and raising delivery risks without undue delay."
      },
      {
        id: "payment_terms",
        title: "Payment Terms",
        description: "Adds standard invoice and payment language.",
        category: "Commercial",
        defaultEnabled: true,
        editable: true,
        content:
          "Invoices will be issued according to the agreed billing milestones and shall be payable within 14 days of receipt unless otherwise agreed in writing between the parties."
      },
      {
        id: "data_protection",
        title: "Data Protection",
        description: "Covers handling of systems and confidential data.",
        category: "Compliance",
        editable: true,
        content:
          "Where the contractor accesses company systems, materials, or operational data, the contractor must use reasonable security controls and comply with documented data handling instructions communicated by {{company_name}}."
      },
      {
        id: "ip_ownership",
        title: "IP Ownership",
        description: "Clarifies ownership of work product.",
        category: "Legal",
        editable: true,
        content:
          "All work product, deliverables, drafts, and related materials created specifically for {{company_name}} under this agreement shall belong to {{company_name}} upon full payment of the applicable fees, unless otherwise stated in writing."
      }
    ],
    content: `
      <section>
        <div style="border:1px solid #e2d8ca;border-radius:28px;background:#fffdfa;overflow:hidden;">
          <div style="display:grid;grid-template-columns:220px 1fr;align-items:stretch;">
            <div style="padding:28px 22px;background:linear-gradient(180deg,#2f251e 0%,#413128 100%);color:#f7efe6;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#d9c1a6;">Independent Services</div>
              <div style="margin-top:16px;font-size:30px;font-weight:800;line-height:1.04;letter-spacing:-0.05em;">Contractor Agreement</div>
              <div style="margin-top:22px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.12);font-size:12px;line-height:1.9;color:#dbcbbc;">
                <div><strong style="color:#ffffff;">Client</strong></div>
                <div>{{company_name}}</div>
                <div style="margin-top:12px;"><strong style="color:#ffffff;">Contractor</strong></div>
                <div>{{contractor_name}}</div>
                <div style="margin-top:12px;"><strong style="color:#ffffff;">Term</strong></div>
                <div>{{term}}</div>
              </div>
            </div>

            <div style="padding:28px 30px 30px;">
              <div style="padding-bottom:18px;border-bottom:1px solid #eadfce;display:flex;justify-content:space-between;gap:20px;align-items:flex-start;">
                <div>
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8a6a50;">Agreement Summary</div>
                  <div style="margin-top:10px;font-size:36px;font-weight:800;line-height:1.05;letter-spacing:-0.05em;color:#2a241f;">Services to be performed by {{contractor_name}}</div>
                </div>
                <div style="padding:10px 14px;border-radius:999px;background:#f8efe6;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a6a50;">Operations</div>
              </div>

              <div style="display:grid;grid-template-columns:1.08fr 0.92fr;gap:18px;margin-top:22px;align-items:start;">
                <div style="padding:22px;border-radius:22px;background:#ffffff;border:1px solid #eadfce;">
                  <div style="font-size:13px;font-weight:700;color:#2a241f;margin-bottom:10px;">Services in Scope</div>
                  <div style="font-size:15px;line-height:1.92;color:#4c4037;white-space:pre-line;">{{services}}</div>
                </div>
                <div style="padding:22px;border-radius:22px;background:#f7efe7;border:1px solid #eadfce;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#8a6a50;margin-bottom:10px;">Commercial Basis</div>
                  <div style="font-size:30px;font-weight:800;line-height:1.14;color:#2a241f;">{{fees}}</div>
                  <div style="margin-top:12px;font-size:13px;line-height:1.85;color:#5c4d42;">Invoices, milestones, and payment expectations follow the agreed commercial schedule and incorporated clauses.</div>
                </div>
              </div>

              <div style="margin-top:18px;padding:20px 22px;border-radius:20px;background:#fbf6ef;border:1px solid #eadfce;">
                <div style="font-size:13px;font-weight:700;color:#2a241f;margin-bottom:8px;">Execution Summary</div>
                <div style="font-size:14px;line-height:1.9;color:#4c4037;">This agreement defines the delivery relationship, expected work product, and payment basis for services performed by <strong style="color:#2a241f;">{{contractor_name}}</strong> on behalf of <strong style="color:#2a241f;">{{company_name}}</strong>.</div>
              </div>

              <div style="margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:18px;">
                <div style="padding-top:18px;border-top:1px solid #eadfce;font-size:13px;line-height:1.9;color:#5d4f44;">
                  <div style="font-weight:700;color:#2a241f;">Client Signature</div>
                  <div style="margin-top:18px;">Signature: ____________________</div>
                  <div>Name: {{signer_name}}</div>
                  <div>Organisation: {{company_name}}</div>
                </div>
                <div style="padding-top:18px;border-top:1px solid #eadfce;font-size:13px;line-height:1.9;color:#5d4f44;">
                  <div style="font-weight:700;color:#2a241f;">Contractor Signature</div>
                  <div style="margin-top:18px;">Signature: ____________________</div>
                  <div>Name: {{contractor_name}}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "nda",
    name: "Mutual NDA",
    description: "Mutual confidentiality agreement for discussions with clients, vendors, and partners.",
    category: "Legal",
    family: "nda",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "party_one", label: "Party One", type: "text", required: true, placeholder: "Acme Labs" },
      { key: "party_two", label: "Party Two", type: "text", required: true, placeholder: "Northstar Systems" },
      { key: "effective_date", label: "Effective Date", type: "date", required: true },
      { key: "confidential_scope", label: "Confidential Scope", type: "textarea", required: true, placeholder: "Business plans, technical architecture, customer lists" },
      { key: "term", label: "Confidentiality Term", type: "text", required: true, placeholder: "24 months" }
    ],
    clauses: [
      {
        id: "return_or_delete",
        title: "Return or Delete Information",
        description: "Specifies cleanup obligations after discussions end.",
        category: "Compliance",
        defaultEnabled: true,
        editable: true,
        content:
          "Upon written request or at the end of the business discussions, each party will promptly return, delete, or securely destroy confidential materials belonging to the other party, except where retention is required by law or internal archival policy."
      }
    ],
    content: `
      <section>
        <div style="border:1px solid #d8e0e6;border-radius:28px;background:linear-gradient(180deg,#fbfcfd 0%,#f1f4f6 100%);overflow:hidden;">
          <div style="display:grid;grid-template-columns:240px 1fr;align-items:stretch;">
            <div style="padding:28px 22px;background:linear-gradient(180deg,#1f2b36 0%,#2d3a46 100%);color:#edf4fa;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#b8cad8;">Restricted</div>
              <div style="margin-top:16px;font-size:30px;font-weight:800;line-height:1.02;letter-spacing:-0.05em;">Mutual NDA</div>
              <div style="margin-top:12px;font-size:13px;line-height:1.8;color:#d5e1eb;">Confidentiality framework for strategic, commercial, and technical disclosures.</div>

              <div style="margin-top:28px;padding:16px 0;border-top:1px solid rgba(255,255,255,0.12);border-bottom:1px solid rgba(255,255,255,0.12);">
                <div style="font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#b8cad8;">Effective Date</div>
                <div style="margin-top:6px;font-size:19px;font-weight:700;color:#ffffff;">{{effective_date}}</div>
              </div>

              <div style="margin-top:18px;font-size:12px;line-height:1.9;color:#d5e1eb;">
                <div><strong style="color:#ffffff;">Disclosing parties</strong></div>
                <div style="margin-top:6px;">{{party_one}}</div>
                <div>{{party_two}}</div>
              </div>
            </div>

            <div style="padding:28px 30px 30px;background:#fbfcfd;">
              <div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding-bottom:18px;border-bottom:1px solid #dce4ea;">
                <div>
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#667f93;">Confidentiality Agreement</div>
                  <div style="margin-top:10px;font-size:38px;font-weight:800;line-height:1.05;letter-spacing:-0.05em;color:#1f2b36;">Protecting bilateral disclosures between {{party_one}} and {{party_two}}</div>
                </div>
                <div style="padding:10px 14px;border-radius:999px;background:#e7edf2;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#425363;">Legal</div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px;">
                <div style="padding:18px 20px;border-radius:20px;background:#ffffff;border:1px solid #dce4ea;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#667f93;margin-bottom:10px;">Protection Window</div>
                  <div style="font-size:30px;font-weight:800;line-height:1.1;color:#1f2b36;">{{term}}</div>
                  <div style="margin-top:8px;font-size:13px;line-height:1.8;color:#5a6d7c;">Confidentiality obligations continue for the duration stated here unless replaced by a later written agreement.</div>
                </div>
                <div style="padding:18px 20px;border-radius:20px;background:#f3f6f8;border:1px solid #dce4ea;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#667f93;margin-bottom:10px;">Covered Information</div>
                  <div style="font-size:14px;line-height:1.9;color:#425363;white-space:pre-line;">{{confidential_scope}}</div>
                </div>
              </div>

              <div style="margin-top:18px;padding:20px;border-radius:20px;background:#ffffff;border:1px solid #dce4ea;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#667f93;margin-bottom:10px;">Core Covenant</div>
                <div style="font-size:15px;line-height:1.95;color:#425363;">Each party agrees to protect shared confidential information and use it only for evaluating or performing the contemplated business relationship. Access should be limited to those who need the information for that purpose.</div>
              </div>

              <div style="margin-top:18px;padding:16px 18px;border-radius:18px;background:#f7fafc;border:1px solid #dce4ea;font-size:13px;line-height:1.85;color:#5a6d7c;">This document is designed to read like a formal legal control sheet rather than a sales or HR document, with clearer metadata and narrower neutral styling.</div>

              <div style="margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:18px;">
                <div style="padding-top:18px;border-top:1px solid #dce4ea;font-size:13px;line-height:1.9;color:#5a6d7c;">
                  <div style="font-weight:700;color:#1f2b36;">For {{party_one}}</div>
                  <div style="margin-top:18px;">Signature: ____________________</div>
                  <div>Name: Authorized Signatory</div>
                </div>
                <div style="padding-top:18px;border-top:1px solid #dce4ea;font-size:13px;line-height:1.9;color:#5a6d7c;">
                  <div style="font-weight:700;color:#1f2b36;">For {{party_two}}</div>
                  <div style="margin-top:18px;">Signature: ____________________</div>
                  <div>Name: Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "one_way_nda",
    name: "One-Way NDA",
    description: "A unilateral NDA variant for product demos, vendor reviews, and one-directional disclosures.",
    category: "Legal",
    family: "nda",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "disclosing_party", label: "Disclosing Party", type: "text", required: true, placeholder: "Acme Labs" },
      { key: "receiving_party", label: "Receiving Party", type: "text", required: true, placeholder: "Northstar Systems" },
      { key: "effective_date", label: "Effective Date", type: "date", required: true },
      { key: "purpose", label: "Purpose", type: "textarea", required: true, placeholder: "Evaluation of a proposed software partnership and product capabilities." },
      { key: "confidential_scope", label: "Confidential Scope", type: "textarea", required: true, placeholder: "Product roadmap, pricing logic, technical architecture, demo credentials" },
      { key: "term", label: "Confidentiality Term", type: "text", required: true, placeholder: "24 months" }
    ],
    content: `
      <section>
        <div style="border:1px solid #dbe3ea;border-radius:28px;background:linear-gradient(180deg,#fafcfd 0%,#f4f7f9 100%);overflow:hidden;">
          <div style="display:grid;grid-template-columns:220px 1fr;align-items:stretch;">
            <div style="padding:28px 22px;background:linear-gradient(180deg,#223243 0%,#304659 100%);color:#eef5fb;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#b8cbdd;">Restricted</div>
              <div style="margin-top:16px;font-size:30px;font-weight:800;line-height:1.02;letter-spacing:-0.05em;">One-Way NDA</div>
              <div style="margin-top:12px;font-size:13px;line-height:1.8;color:#d5e1ea;">Used when confidentiality obligations flow primarily from one party to the other.</div>

              <div style="margin-top:28px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.12);font-size:12px;line-height:1.9;color:#d5e1ea;">
                <div><strong style="color:#ffffff;">Disclosing Party</strong></div>
                <div>{{disclosing_party}}</div>
                <div style="margin-top:12px;"><strong style="color:#ffffff;">Receiving Party</strong></div>
                <div>{{receiving_party}}</div>
              </div>
            </div>

            <div style="padding:28px 30px 30px;background:#fbfcfd;">
              <div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding-bottom:18px;border-bottom:1px solid #dce4ea;">
                <div>
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#667f93;">Unilateral Confidentiality</div>
                  <div style="margin-top:10px;font-size:38px;font-weight:800;line-height:1.05;letter-spacing:-0.05em;color:#1f2b36;">Disclosure control for one-directional information sharing</div>
                </div>
                <div style="padding:10px 14px;border-radius:999px;background:#e7edf2;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#425363;">Legal</div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px;">
                <div style="padding:18px 20px;border-radius:20px;background:#ffffff;border:1px solid #dce4ea;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#667f93;margin-bottom:10px;">Purpose</div>
                  <div style="font-size:14px;line-height:1.9;color:#425363;white-space:pre-line;">{{purpose}}</div>
                </div>
                <div style="padding:18px 20px;border-radius:20px;background:#f3f6f8;border:1px solid #dce4ea;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#667f93;margin-bottom:10px;">Protection Window</div>
                  <div style="font-size:30px;font-weight:800;line-height:1.1;color:#1f2b36;">{{term}}</div>
                  <div style="margin-top:8px;font-size:13px;line-height:1.8;color:#5a6d7c;">The receiving party must maintain confidentiality for the stated period unless a stricter written obligation applies.</div>
                </div>
              </div>

              <div style="margin-top:18px;padding:20px;border-radius:20px;background:#ffffff;border:1px solid #dce4ea;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#667f93;margin-bottom:10px;">Protected Information</div>
                <div style="font-size:15px;line-height:1.95;color:#425363;white-space:pre-line;">{{confidential_scope}}</div>
              </div>

              <div style="margin-top:18px;padding:18px 20px;border-radius:20px;background:#f7fafc;border:1px solid #dce4ea;font-size:13px;line-height:1.85;color:#5a6d7c;">This version is intentionally narrower than a mutual NDA. It works best when only one side is disclosing product, commercial, or technical material during evaluation.</div>

              <div style="margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:18px;">
                <div style="padding-top:18px;border-top:1px solid #dce4ea;font-size:13px;line-height:1.9;color:#5a6d7c;">
                  <div style="font-weight:700;color:#1f2b36;">For {{disclosing_party}}</div>
                  <div style="margin-top:18px;">Signature: ____________________</div>
                  <div>Name: Authorized Signatory</div>
                </div>
                <div style="padding-top:18px;border-top:1px solid #dce4ea;font-size:13px;line-height:1.9;color:#5a6d7c;">
                  <div style="font-weight:700;color:#1f2b36;">For {{receiving_party}}</div>
                  <div style="margin-top:18px;">Signature: ____________________</div>
                  <div>Name: Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "invoice_cover",
    name: "Invoice Cover Letter",
    description: "Professional cover note to send alongside invoices and payment reminders.",
    category: "Finance",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "client_name", label: "Client Name", type: "text", required: true, placeholder: "Acme Inc." },
      { key: "invoice_number", label: "Invoice Number", type: "text", required: true, placeholder: "INV-2048" },
      { key: "amount_due", label: "Amount Due", type: "text", required: true, placeholder: "EUR 4,800" },
      { key: "due_date", label: "Due Date", type: "date", required: true },
      { key: "sender_name", label: "Sender Name", type: "text", required: true, placeholder: "Rahul Nair" }
    ],
    content: `
      <section>
        <div style="border:1px solid #e4d9c9;border-radius:28px;background:#fffdfa;overflow:hidden;">
          <div style="padding:26px 30px;background:linear-gradient(180deg,#f3efe8 0%,#f8f3ec 100%);border-bottom:1px solid #eadfce;">
            <div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start;">
              <div>
                <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8f6a44;">Accounts Receivable</div>
                <div style="margin-top:10px;font-size:34px;font-weight:800;letter-spacing:-0.05em;color:#2e241d;">Invoice Cover Letter</div>
                <div style="margin-top:10px;font-size:15px;color:#6a5b4d;">Payment note accompanying invoice {{invoice_number}}</div>
              </div>
              <div style="padding:16px 18px;border-radius:20px;background:#fffaf4;border:1px solid #eadfce;min-width:220px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8f6a44;margin-bottom:8px;">Remittance Summary</div>
                <div style="font-size:26px;font-weight:800;color:#2e241d;">{{amount_due}}</div>
                <div style="margin-top:8px;font-size:13px;color:#c0591c;">Due {{due_date}}</div>
              </div>
            </div>
          </div>

          <div style="padding:28px 30px 30px;">
            <div style="font-size:16px;line-height:1.95;color:#302720;">
              <p style="margin:0 0 16px;">Dear {{client_name}},</p>
              <p style="margin:0 0 16px;">Please find attached invoice <strong>{{invoice_number}}</strong> in the amount of <strong>{{amount_due}}</strong>, due on <strong>{{due_date}}</strong>.</p>
              <p style="margin:0;">If your accounts-payable team requires any purchase-order reference, supporting documentation, or confirmation of services delivered, we will provide it promptly to support processing.</p>
            </div>

            <div style="margin-top:24px;padding:18px 20px;border-radius:20px;background:#fbf6ef;border:1px solid #eadfce;display:grid;grid-template-columns:1fr 200px;gap:16px;align-items:start;">
              <div>
                <div style="font-size:13px;font-weight:700;color:#2e241d;margin-bottom:8px;">Processing Guidance</div>
                <div style="font-size:14px;line-height:1.9;color:#4a3e35;">This cover note is structured for quick internal review by highlighting the invoice reference, amount due, and payment timing in a compact format.</div>
              </div>
              <div style="padding-left:16px;border-left:1px solid #eadfce;font-size:13px;line-height:1.85;color:#5a4a3d;">
                <div><strong style="color:#2e241d;">Invoice</strong> {{invoice_number}}</div>
                <div><strong style="color:#2e241d;">Amount</strong> {{amount_due}}</div>
                <div><strong style="color:#2e241d;">Due</strong> {{due_date}}</div>
              </div>
            </div>

            <p style="margin-top:24px;font-size:16px;line-height:1.8;color:#302720;">Kind regards,<br /><strong>{{sender_name}}</strong></p>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "statement_of_work",
    name: "Statement of Work",
    description: "Detailed SOW with milestones, acceptance criteria, and payment structure.",
    category: "Operations",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "client_name", label: "Client Name", type: "text", required: true, placeholder: "Acme Inc." },
      { key: "project_name", label: "Project Name", type: "text", required: true, placeholder: "Website Redesign" },
      { key: "start_date", label: "Start Date", type: "date", required: true },
      { key: "end_date", label: "End Date", type: "date", required: true },
      { key: "deliverables", label: "Deliverables", type: "textarea", required: true, placeholder: "Discovery, UX, UI, build, QA, launch" },
      { key: "hours", label: "Estimated Hours", type: "number", required: true, placeholder: "120" },
      { key: "hourly_rate", label: "Hourly Rate", type: "number", required: true, placeholder: "95" },
      { key: "currency", label: "Currency (ISO)", type: "text", required: true, placeholder: "USD" }
    ],
    clauses: [
      {
        id: "milestone_payments",
        title: "Milestone Payments",
        description: "Breaks payments into staged approvals.",
        category: "Commercial",
        defaultEnabled: true,
        editable: true,
        content: "Payments are made in milestones: 40% kickoff, 40% delivery candidate, and 20% final handover."
      },
      {
        id: "revision_rounds",
        title: "Revision Rounds",
        description: "Limits included revision rounds.",
        category: "Scope",
        defaultEnabled: true,
        editable: true,
        content: "This SOW includes up to two revision rounds per approved deliverable. Additional revisions are billed separately at {{money hourly_rate currency}} per hour."
      }
    ],
    content: `
      <section>
        <div style="border:1px solid #d8e4db;border-radius:28px;background:#ffffff;overflow:hidden;">
          <div style="padding:26px 30px;background:linear-gradient(180deg,#eef4f0 0%,#f8fcf8 100%);border-bottom:1px solid #dce8dd;">
            <div style="display:grid;grid-template-columns:1fr 240px;gap:20px;align-items:start;">
              <div>
                <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#56755c;">Delivery Framework</div>
                <div style="margin-top:10px;font-size:36px;font-weight:800;letter-spacing:-0.05em;color:#203028;">Statement of Work</div>
                <div style="margin-top:10px;font-size:15px;color:#607268;">Scope and commercial definition for {{project_name}} on behalf of {{client_name}}</div>
              </div>
              <div style="padding:16px 18px;border-radius:20px;background:#ffffff;border:1px solid #dce8dd;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#56755c;margin-bottom:8px;">Project Window</div>
                <div style="font-size:15px;font-weight:700;line-height:1.8;color:#203028;">{{start_date}} to {{end_date}}</div>
              </div>
            </div>
          </div>

          <div style="padding:28px 30px 30px;">
            <div style="display:grid;grid-template-columns:1.12fr 0.88fr;gap:18px;align-items:start;">
              <div style="padding:22px;border-radius:22px;background:#ffffff;border:1px solid #dce8dd;">
                <div style="font-size:13px;font-weight:700;color:#203028;margin-bottom:10px;">Deliverables</div>
                <div style="font-size:15px;line-height:1.92;color:#43544b;white-space:pre-wrap;">{{deliverables}}</div>
              </div>
              <div style="padding:22px;border-radius:22px;background:#203028;color:#edf7ef;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#b9d4bf;margin-bottom:10px;">Commercial Summary</div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:14px;"><span>Estimated Hours</span><strong>{{hours}}</strong></div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:14px;"><span>Rate</span><strong>{{money hourly_rate currency}}</strong></div>
                <div style="display:flex;justify-content:space-between;padding-top:12px;font-size:19px;font-weight:800;"><span>Estimated Total</span><span>{{money (mul hours hourly_rate) currency}}</span></div>
              </div>
            </div>

            <div style="margin-top:18px;padding:18px 20px;border-radius:20px;background:#f5faf6;border:1px solid #dce8dd;font-size:14px;line-height:1.9;color:#43544b;">This SOW defines the planned delivery scope, expected effort, and commercial basis for the engagement. Any approved change requests should be reflected through written amendments to this document or the governing agreement.</div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "freelance_service_agreement",
    name: "Freelance Service Agreement",
    description: "Freelancer-friendly service agreement with payment protection defaults.",
    category: "Legal",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "provider_name", label: "Provider Name", type: "text", required: true, placeholder: "Rahul Nair" },
      { key: "client_name", label: "Client Name", type: "text", required: true, placeholder: "Acme Inc." },
      { key: "service_summary", label: "Service Summary", type: "textarea", required: true, placeholder: "Design and development services" },
      { key: "project_fee", label: "Project Fee", type: "number", required: true, placeholder: "7500" },
      { key: "deposit_percent", label: "Deposit Percent", type: "number", required: true, placeholder: "40" },
      { key: "currency", label: "Currency (ISO)", type: "text", required: true, placeholder: "USD" },
      { key: "effective_date", label: "Effective Date", type: "date", required: true }
    ],
    clauses: [
      {
        id: "late_fee",
        title: "Late Fee",
        description: "Adds a late payment deterrent.",
        category: "Commercial",
        defaultEnabled: true,
        editable: true,
        content: "Invoices outstanding beyond 10 days from the due date may incur a late fee of 1.5% per month on unpaid balances."
      },
      {
        id: "pause_for_nonpayment",
        title: "Pause for Nonpayment",
        description: "Allows service pause for unpaid invoices.",
        category: "Commercial",
        defaultEnabled: true,
        editable: true,
        content: "The provider may pause work if invoices remain unpaid beyond the agreed due date, with schedule impact handled through a revised timeline."
      },
      {
        id: "scope_changes",
        title: "Scope Changes",
        description: "Protects against unmanaged scope growth.",
        category: "Scope",
        defaultEnabled: true,
        editable: true,
        content: "Requests outside the agreed scope will be estimated separately and begin only after written approval from {{client_name}}."
      }
    ],
    content: `
      <section>
        <div style="border:1px solid #e6d8cd;border-radius:28px;background:#fffdfa;overflow:hidden;">
          <div style="padding:26px 30px;background:linear-gradient(180deg,#f4ece7 0%,#fbf6f1 100%);border-bottom:1px solid #eadfce;">
            <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;">
              <div>
                <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8e6549;">Independent Services</div>
                <div style="margin-top:10px;font-size:34px;font-weight:800;letter-spacing:-0.05em;color:#2f241e;">Freelance Service Agreement</div>
                <div style="margin-top:10px;font-size:15px;color:#68584d;">Effective {{effective_date}}</div>
              </div>
              <div style="padding:16px 18px;border-radius:18px;background:#fffaf6;border:1px solid #eadfce;min-width:230px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8e6549;margin-bottom:8px;">Parties</div>
                <div style="font-size:15px;line-height:1.8;color:#2f241e;"><strong>{{provider_name}}</strong><br />and<br /><strong>{{client_name}}</strong></div>
              </div>
            </div>
          </div>

          <div style="padding:28px 30px 30px;">
            <div style="display:grid;grid-template-columns:1.08fr 0.92fr;gap:18px;align-items:start;">
              <div style="padding:22px;border-radius:22px;background:#fff;border:1px solid #eadfce;">
                <div style="font-size:13px;font-weight:700;color:#2f241e;margin-bottom:10px;">Service Summary</div>
                <div style="font-size:15px;line-height:1.92;color:#4a3e35;white-space:pre-line;">{{service_summary}}</div>
              </div>
              <div style="padding:22px;border-radius:22px;background:#2f251e;color:#f7efe6;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#d9c1a6;margin-bottom:10px;">Commercial Overview</div>
                <div style="font-size:26px;font-weight:800;line-height:1.2;">{{money project_fee currency}}</div>
                <div style="margin-top:12px;font-size:13px;line-height:1.8;color:#dbcbbc;">Deposit: <strong style="color:#ffffff;">{{money (mul project_fee (div deposit_percent 100)) currency}}</strong> ({{deposit_percent}}%)</div>
                <div style="margin-top:6px;font-size:13px;line-height:1.8;color:#dbcbbc;">Remaining balance: <strong style="color:#ffffff;">{{money (sub project_fee (mul project_fee (div deposit_percent 100))) currency}}</strong></div>
              </div>
            </div>

            <div style="margin-top:18px;padding:18px 20px;border-radius:20px;background:#fbf6ef;border:1px solid #eadfce;font-size:14px;line-height:1.9;color:#4a3e35;">This agreement sets the commercial basis for the engagement, including service scope, deposit protection, and final payment expectations prior to completion and handover.</div>

            <div style="margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:18px;">
              <div style="padding-top:18px;border-top:1px solid #eadfce;font-size:13px;line-height:1.9;color:#5d4f44;">
                <div style="font-weight:700;color:#2f241e;">Provider Signature</div>
                <div style="margin-top:18px;">Signature: ____________________</div>
                <div>Name: {{provider_name}}</div>
              </div>
              <div style="padding-top:18px;border-top:1px solid #eadfce;font-size:13px;line-height:1.9;color:#5d4f44;">
                <div style="font-weight:700;color:#2f241e;">Client Signature</div>
                <div style="margin-top:18px;">Signature: ____________________</div>
                <div>Name: {{client_name}}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `
  },

  // ─── Invoice ─────────────────────────────────────────────────────────────────
  // Field keys are aligned with the Company Profile auto-fill system:
  //   company_name  → profile.companyName  (auto-filled)
  //   contact_email → profile.contactEmail (auto-filled)
  //   signer_name   → profile.signerName   (auto-filled)
  // Regional tax: set tax_label = "VAT" (EU/UK/India), "GST" (AU/NZ/IN), "HST" (CA), or leave blank for no-VAT regions.
  {
    id: "invoice",
    name: "Invoice",
    description: "Industry-standard itemised invoice with VAT/GST support, PO reference, and payment instructions.",
    category: "Finance",
    family: "invoice",
    supportedOutputs: ["html", "pdf"],
    fields: [
      // ── Seller (pre-fills from Company Profile in Settings) ──────────────
      { key: "company_name",    label: "Your Company Name",    type: "text",     required: true,  placeholder: "Acme Labs" },
      { key: "company_address", label: "Your Address",         type: "textarea", required: true,  placeholder: "12 Main St\nDublin, D01 AB12\nIreland" },
      { key: "contact_email",   label: "Billing Email",        type: "text",     required: true,  placeholder: "billing@acmelabs.io" },
      { key: "vat_number",      label: "VAT / GST / Tax ID (optional)", type: "text", required: false, placeholder: "IE1234567T" },
      // ── Buyer ────────────────────────────────────────────────────────────
      { key: "client_name",     label: "Client Name",          type: "text",     required: true,  placeholder: "Northstar Systems" },
      { key: "client_address",  label: "Client Address",       type: "textarea", required: true,  placeholder: "99 River Rd\nLondon, EC1A 1BB\nUnited Kingdom" },
      { key: "client_vat",      label: "Client VAT / Tax ID (optional)", type: "text", required: false, placeholder: "GB123456789" },
      // ── Invoice metadata ─────────────────────────────────────────────────
      { key: "invoice_number",  label: "Invoice Number",       type: "text",     required: true,  placeholder: "INV-2048" },
      { key: "po_number",       label: "PO Number (optional)", type: "text",     required: false, placeholder: "PO-9123" },
      { key: "invoice_date",    label: "Invoice Date",         type: "date",     required: true },
      { key: "due_date",        label: "Due Date",             type: "date",     required: true },
      { key: "payment_terms",   label: "Payment Terms (optional)", type: "text", required: false, placeholder: "Net 14" },
      // ── Line items ───────────────────────────────────────────────────────
      { key: "line_items",      label: "Line Items (one per line: description · qty · unit price)", type: "textarea", required: true, placeholder: "Web Design · 1 · 3500\nDevelopment · 40 hrs · 95\nQA Testing · 8 hrs · 75" },
      // ── Financials ───────────────────────────────────────────────────────
      { key: "subtotal",        label: "Subtotal (before tax)", type: "number",  required: true,  placeholder: "3500" },
      { key: "tax_label",       label: "Tax Label (VAT · GST · HST · none)", type: "text", required: true, placeholder: "VAT" },
      { key: "tax_rate",        label: "Tax Rate (%)",         type: "number",   required: true,  placeholder: "23" },
      { key: "currency",        label: "Currency (ISO)",       type: "text",     required: true,  placeholder: "EUR" },
      // ── Payment ──────────────────────────────────────────────────────────
      { key: "bank_details",    label: "Payment Details",      type: "textarea", required: true,  placeholder: "IBAN: IE12 AIBK 9311 5212 3456 78\nBIC: AIBKIE2D\nRef: INV-2048" },
      { key: "notes",           label: "Notes (optional)",     type: "textarea", required: false, placeholder: "Thank you for your business!" }
    ],
    clauses: [
      {
        id: "late_payment",
        title: "Late Payment Notice",
        description: "Adds a late payment penalty clause.",
        category: "Commercial",
        defaultEnabled: true,
        editable: true,
        content: "Invoices outstanding beyond the due date may incur a late payment interest of 1.5% per month on the outstanding balance, without further notice."
      },
      {
        id: "dispute_window",
        title: "Dispute Window",
        description: "Defines the period within which disputes must be raised.",
        category: "Commercial",
        editable: true,
        content: "Any disputes regarding this invoice must be raised in writing within 7 days of receipt. Failure to raise a dispute within this period constitutes acceptance of the invoice."
      }
    ],
    content: `
      <section>
        <div style="border:1px solid #d4deeb;border-radius:30px;background:#ffffff;overflow:hidden;box-shadow:0 20px 50px rgba(22,50,75,0.08);">
          <div style="padding:30px;background:linear-gradient(135deg,#12324b 0%,#1f4b6d 58%,#143954 100%);color:#eef5fb;">
            <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:24px;align-items:start;">
              <div>
                <div style="font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#9dbddb;">Accounts Receivable</div>
                <div style="margin-top:12px;font-size:42px;font-weight:800;line-height:1.02;letter-spacing:-0.06em;">Invoice</div>
                <div style="margin-top:10px;font-size:15px;line-height:1.8;color:#c7d9ea;">Issued by {{company_name}} for professional services delivered to {{client_name}}.</div>
              </div>
              <div style="padding:18px 20px;border-radius:22px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#b8d1e6;margin-bottom:10px;">Document Control</div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#d7e5f1;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.14);"><span>Invoice #</span><strong style="color:#ffffff;">{{invoice_number}}</strong></div>
                {{#if po_number}}<div style="display:flex;justify-content:space-between;font-size:12px;color:#d7e5f1;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.14);"><span>PO Number</span><strong style="color:#ffffff;">{{po_number}}</strong></div>{{/if}}
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#d7e5f1;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.14);"><span>Invoice Date</span><strong style="color:#ffffff;">{{invoice_date}}</strong></div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#d7e5f1;padding-top:8px;"><span>Due Date</span><strong style="color:#ffd4b2;">{{due_date}}</strong></div>
              </div>
            </div>
          </div>

          <div style="padding:24px 28px 28px;background:#ffffff;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;">
              <div style="padding:20px;border-radius:22px;background:#f8fbff;border:1px solid #dfe8f2;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#51708d;margin-bottom:8px;">From</div>
                <div style="font-size:18px;font-weight:700;color:#16324b;">{{company_name}}</div>
                <div style="margin-top:8px;font-size:13px;line-height:1.8;color:#4f6172;white-space:pre-line;">{{company_address}}</div>
                <div style="margin-top:6px;font-size:13px;color:#617486;">{{contact_email}}</div>
                {{#if vat_number}}<div style="margin-top:6px;font-size:12px;color:#718395;">VAT / Tax ID: {{vat_number}}</div>{{/if}}
              </div>

              <div style="padding:20px;border-radius:22px;background:#ffffff;border:1px solid #dfe8f2;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#51708d;margin-bottom:8px;">Bill To</div>
                <div style="font-size:18px;font-weight:700;color:#16324b;">{{client_name}}</div>
                <div style="margin-top:8px;font-size:13px;line-height:1.8;color:#4f6172;white-space:pre-line;">{{client_address}}</div>
                {{#if client_vat}}<div style="margin-top:6px;font-size:12px;color:#718395;">VAT / Tax ID: {{client_vat}}</div>{{/if}}
                {{#if payment_terms}}<div style="margin-top:8px;font-size:12px;color:#617486;"><strong style="color:#16324b;">Terms:</strong> {{payment_terms}}</div>{{/if}}
              </div>
            </div>

            <div style="margin-top:18px;padding:20px 22px;border-radius:22px;background:linear-gradient(180deg,#fff3e9 0%,#fffaf5 100%);border:1px solid #f0d7c0;">
              <div style="display:flex;justify-content:space-between;gap:18px;align-items:flex-start;">
                <div>
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#a35d1d;">Total Due</div>
                  <div style="margin-top:10px;font-size:32px;font-weight:800;line-height:1.08;letter-spacing:-0.05em;color:#7d3d11;overflow-wrap:anywhere;">{{money (mul subtotal (add 1 (div tax_rate 100))) currency}}</div>
                </div>
                <div style="max-width:260px;font-size:13px;line-height:1.8;color:#8a5a38;text-align:right;">Please reference <strong style="color:#7d3d11;">{{invoice_number}}</strong> with payment.</div>
              </div>
            </div>

            <div style="margin-top:20px;border:1px solid #dfe8f2;border-radius:24px;overflow:hidden;">
              <table>
                <thead>
                  <tr style="background:#eff5fb;">
                    <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#51708d;text-align:left;">Description</th>
                    <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#51708d;text-align:left;">Qty / Basis</th>
                    <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#51708d;text-align:right;">Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {{{lineItemRows line_items}}}
                </tbody>
              </table>
            </div>

            <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:18px;margin-top:20px;align-items:start;">
              <div style="padding:18px 20px;border-radius:22px;background:#f7fafc;border:1px solid #dfe8f2;">
                <div style="font-size:13px;font-weight:700;color:#223243;margin-bottom:8px;">Payment Details</div>
                <div style="font-size:13px;line-height:1.85;color:#4f6172;white-space:pre-line;">{{bank_details}}</div>
              </div>
              <div style="padding:20px 22px;border-radius:22px;background:#16324b;color:#eef5fb;">
                <div style="display:flex;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>Subtotal</span><strong>{{money subtotal currency}}</strong></div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>{{tax_label}} ({{tax_rate}}%)</span><strong>{{money (mul subtotal (div tax_rate 100)) currency}}</strong></div>
                <div style="display:flex;justify-content:space-between;padding-top:12px;font-size:20px;font-weight:800;"><span>Total Due</span><span>{{money (mul subtotal (add 1 (div tax_rate 100))) currency}}</span></div>
              </div>
            </div>

            {{#if notes}}
            <div style="margin-top:20px;padding:18px 20px;border-radius:20px;background:#f8fbfe;border:1px solid #dfe8f2;font-size:13px;line-height:1.8;color:#617486;">{{notes}}</div>
            {{/if}}
          </div>
        </div>
      </section>
    `
  },
  {
    id: "freelancer_invoice",
    name: "Freelancer Invoice",
    description: "A cleaner, consultant-focused invoice variant with service period, balance tracking, and a more client-friendly summary.",
    category: "Finance",
    family: "invoice",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "provider_name", label: "Provider Name", type: "text", required: true, placeholder: "Rahul Nair Studio" },
      { key: "provider_email", label: "Provider Email", type: "text", required: true, placeholder: "hello@rahulnair.studio" },
      { key: "client_name", label: "Client Name", type: "text", required: true, placeholder: "Northstar Systems" },
      { key: "invoice_number", label: "Invoice Number", type: "text", required: true, placeholder: "INV-2026-042" },
      { key: "service_period", label: "Service Period", type: "text", required: true, placeholder: "March 2026" },
      { key: "invoice_date", label: "Invoice Date", type: "date", required: true },
      { key: "due_date", label: "Due Date", type: "date", required: true },
      { key: "line_items", label: "Line Items", type: "textarea", required: true, placeholder: "Website strategy workshop · 1 · 900\nUX wireframes · 1 · 1800\nPrototype revisions · 6 hrs · 120" },
      { key: "project_total", label: "Project Total", type: "number", required: true, placeholder: "3420" },
      { key: "amount_paid", label: "Amount Already Paid", type: "number", required: true, placeholder: "900" },
      { key: "currency", label: "Currency (ISO)", type: "text", required: true, placeholder: "USD" },
      { key: "payment_details", label: "Payment Details", type: "textarea", required: true, placeholder: "Bank transfer\nAccount name: Rahul Nair Studio\nReference: INV-2026-042" },
      { key: "notes", label: "Notes (optional)", type: "textarea", required: false, placeholder: "Thank you for the collaboration. Final files will be handed over on settlement." }
    ],
    content: `
      <section>
        <div style="border:1px solid #e6ded0;border-radius:30px;background:#fffefc;overflow:hidden;box-shadow:0 18px 44px rgba(64,44,26,0.07);">
          <div style="padding:30px;background:linear-gradient(140deg,#f5ede2 0%,#ffffff 55%,#f1e0cb 100%);border-bottom:1px solid #eadfce;">
            <div style="display:grid;grid-template-columns:1.08fr 0.92fr;gap:22px;align-items:start;">
              <div>
                <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#9a6a3a;">Independent Invoice</div>
                <div style="margin-top:12px;font-size:40px;font-weight:800;letter-spacing:-0.06em;color:#342419;">Freelancer Invoice</div>
                <div style="margin-top:10px;font-size:15px;line-height:1.85;color:#705844;">Issued by {{provider_name}} for work completed during {{service_period}}.</div>
              </div>
              <div style="padding:18px 20px;border-radius:22px;background:#fffaf4;border:1px solid #eadfce;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#9a6a3a;margin-bottom:10px;">Invoice Summary</div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#735e4c;padding-bottom:8px;border-bottom:1px solid #efe5d7;"><span>Invoice #</span><strong style="color:#342419;">{{invoice_number}}</strong></div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#735e4c;padding:8px 0;border-bottom:1px solid #efe5d7;"><span>Issued</span><strong style="color:#342419;">{{invoice_date}}</strong></div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#735e4c;padding-top:8px;"><span>Due</span><strong style="color:#be6b2f;">{{due_date}}</strong></div>
              </div>
            </div>
          </div>

          <div style="padding:26px 30px 30px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;">
              <div style="padding:20px;border-radius:22px;background:#fff;border:1px solid #eadfce;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#9a6a3a;margin-bottom:8px;">From</div>
                <div style="font-size:18px;font-weight:700;color:#342419;">{{provider_name}}</div>
                <div style="margin-top:8px;font-size:13px;line-height:1.8;color:#6f5b49;">{{provider_email}}</div>
              </div>
              <div style="padding:20px;border-radius:22px;background:#ffffff;border:1px solid #eadfce;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#9a6a3a;margin-bottom:8px;">Bill To</div>
                <div style="font-size:18px;font-weight:700;color:#342419;">{{client_name}}</div>
                <div style="margin-top:8px;font-size:13px;line-height:1.8;color:#6f5b49;">Service period: {{service_period}}</div>
              </div>
            </div>

            <div style="margin-top:18px;padding:20px;border-radius:22px;background:linear-gradient(180deg,#342419 0%,#4c3526 100%);color:#fff5ec;">
              <div style="display:flex;justify-content:space-between;gap:18px;align-items:flex-start;">
                <div>
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#e5c8a8;">Balance Due</div>
                  <div style="margin-top:10px;font-size:31px;font-weight:800;line-height:1.08;letter-spacing:-0.05em;overflow-wrap:anywhere;">{{money (sub project_total amount_paid) currency}}</div>
                </div>
                <div style="max-width:260px;font-size:13px;line-height:1.8;color:#e8d6c6;text-align:right;">Based on {{money project_total currency}} total with {{money amount_paid currency}} already received.</div>
              </div>
            </div>

            <div style="margin-top:20px;border:1px solid #eadfce;border-radius:22px;overflow:hidden;background:#fff;">
              <table>
                <thead>
                  <tr style="background:#fbf6ef;">
                    <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9a6a3a;text-align:left;">Delivered Work</th>
                    <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9a6a3a;text-align:left;">Qty / Basis</th>
                    <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9a6a3a;text-align:right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {{{lineItemRows line_items}}}
                </tbody>
              </table>
            </div>

            <div style="display:grid;grid-template-columns:1.05fr 0.95fr;gap:18px;margin-top:20px;align-items:start;">
              <div style="padding:18px 20px;border-radius:22px;background:#fdf9f3;border:1px solid #eadfce;">
                <div style="font-size:13px;font-weight:700;color:#342419;margin-bottom:8px;">Payment Details</div>
                <div style="font-size:13px;line-height:1.85;color:#6f5b49;white-space:pre-line;">{{payment_details}}</div>
                {{#if notes}}<div style="margin-top:14px;font-size:13px;line-height:1.85;color:#7a6654;">{{notes}}</div>{{/if}}
              </div>
              <div style="padding:20px 22px;border-radius:22px;background:#fff;border:1px solid #eadfce;">
                <div style="display:flex;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid #efe5d7;font-size:13px;color:#6f5b49;"><span>Project Total</span><strong style="color:#342419;">{{money project_total currency}}</strong></div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #efe5d7;font-size:13px;color:#6f5b49;"><span>Amount Paid</span><strong style="color:#342419;">{{money amount_paid currency}}</strong></div>
                <div style="display:flex;justify-content:space-between;padding-top:12px;font-size:20px;font-weight:800;color:#342419;"><span>Outstanding</span><span>{{money (sub project_total amount_paid) currency}}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "retainer_invoice",
    name: "Retainer Invoice",
    description: "A recurring retainer billing variant with included hours, overage math, and a clean monthly summary.",
    category: "Finance",
    family: "invoice",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "agency_name", label: "Agency or Provider", type: "text", required: true, placeholder: "Acme Labs" },
      { key: "client_name", label: "Client Name", type: "text", required: true, placeholder: "Northstar Systems" },
      { key: "invoice_number", label: "Invoice Number", type: "text", required: true, placeholder: "RET-2026-004" },
      { key: "retainer_month", label: "Retainer Month", type: "text", required: true, placeholder: "April 2026" },
      { key: "invoice_date", label: "Invoice Date", type: "date", required: true },
      { key: "due_date", label: "Due Date", type: "date", required: true },
      { key: "included_services", label: "Included Services", type: "textarea", required: true, placeholder: "Strategy support\nDesign QA\nWeekly planning and review" },
      { key: "base_retainer", label: "Base Retainer", type: "number", required: true, placeholder: "6000" },
      { key: "included_hours", label: "Included Hours", type: "number", required: true, placeholder: "40" },
      { key: "overage_hours", label: "Overage Hours", type: "number", required: true, placeholder: "6" },
      { key: "overage_rate", label: "Overage Rate", type: "number", required: true, placeholder: "140" },
      { key: "currency", label: "Currency (ISO)", type: "text", required: true, placeholder: "USD" },
      { key: "payment_details", label: "Payment Details", type: "textarea", required: true, placeholder: "Wire transfer\nReference: RET-2026-004" }
    ],
    content: `
      <section>
        <div style="border:1px solid #d7e6de;border-radius:30px;background:#ffffff;overflow:hidden;box-shadow:0 18px 44px rgba(30,60,45,0.08);">
          <div style="padding:30px;background:linear-gradient(135deg,#1f3b37 0%,#2e5a51 58%,#edf6f2 58%,#f7fcfa 100%);">
            <div style="display:grid;grid-template-columns:1.04fr 0.96fr;gap:22px;align-items:start;">
              <div style="color:#eef8f6;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#b7d7cd;">Recurring Billing</div>
                <div style="margin-top:12px;font-size:40px;font-weight:800;letter-spacing:-0.06em;line-height:1.02;">Retainer Invoice</div>
                <div style="margin-top:10px;font-size:15px;line-height:1.8;color:#d4ebe4;">Monthly billing summary for {{retainer_month}}.</div>
              </div>
              <div style="padding:18px 20px;border-radius:22px;background:#ffffff;border:1px solid #dce9e3;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#4b7a70;margin-bottom:10px;">Document Control</div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#5f7d75;padding-bottom:8px;border-bottom:1px solid #e4efea;"><span>Invoice #</span><strong style="color:#1f3b37;">{{invoice_number}}</strong></div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#5f7d75;padding:8px 0;border-bottom:1px solid #e4efea;"><span>Invoice Date</span><strong style="color:#1f3b37;">{{invoice_date}}</strong></div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#5f7d75;padding-top:8px;"><span>Due Date</span><strong style="color:#2c8b73;">{{due_date}}</strong></div>
              </div>
            </div>
          </div>

          <div style="padding:26px 30px 30px;">
            <div style="display:grid;grid-template-columns:1fr 1fr 240px;gap:18px;align-items:start;">
              <div style="padding:20px;border-radius:22px;background:#fff;border:1px solid #e1ece7;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#4b7a70;margin-bottom:8px;">Provider</div>
                <div style="font-size:18px;font-weight:700;color:#1f3b37;">{{agency_name}}</div>
              </div>
              <div style="padding:20px;border-radius:22px;background:#fff;border:1px solid #e1ece7;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#4b7a70;margin-bottom:8px;">Client</div>
                <div style="font-size:18px;font-weight:700;color:#1f3b37;">{{client_name}}</div>
                <div style="margin-top:8px;font-size:13px;line-height:1.8;color:#5f7d75;">Coverage month: {{retainer_month}}</div>
              </div>
              <div style="padding:20px;border-radius:22px;background:linear-gradient(180deg,#eff8f3 0%,#ffffff 100%);border:1px solid #dce9e3;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#4b7a70;">Amount Due</div>
                <div style="margin-top:10px;font-size:31px;font-weight:800;line-height:1.08;letter-spacing:-0.05em;color:#1f3b37;">{{money (add base_retainer (mul overage_hours overage_rate)) currency}}</div>
                <div style="margin-top:10px;font-size:13px;line-height:1.8;color:#5f7d75;">Base retainer plus any approved overage for the month.</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1.05fr 0.95fr;gap:18px;margin-top:20px;align-items:start;">
              <div style="padding:20px;border-radius:22px;background:#f7fcfa;border:1px solid #e1ece7;">
                <div style="font-size:13px;font-weight:700;color:#1f3b37;margin-bottom:10px;">Included Services</div>
                <ul style="margin:0;padding:0;font-size:14px;line-height:1.85;color:#4f6661;list-style:disc;">{{{bulletList included_services}}}</ul>
              </div>
              <div style="padding:20px 22px;border-radius:22px;background:#1f3b37;color:#eef8f6;">
                <div style="display:flex;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>Base Retainer</span><strong>{{money base_retainer currency}}</strong></div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>Included Hours</span><strong>{{included_hours}}</strong></div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>Overage Hours</span><strong>{{overage_hours}}</strong></div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>Overage Rate</span><strong>{{money overage_rate currency}}</strong></div>
                <div style="display:flex;justify-content:space-between;padding-top:12px;font-size:20px;font-weight:800;"><span>Total Due</span><span>{{money (add base_retainer (mul overage_hours overage_rate)) currency}}</span></div>
              </div>
            </div>

            <div style="margin-top:20px;padding:18px 20px;border-radius:20px;background:#ffffff;border:1px solid #e1ece7;display:grid;grid-template-columns:1fr 240px;gap:18px;align-items:start;">
              <div>
                <div style="font-size:13px;font-weight:700;color:#1f3b37;margin-bottom:8px;">Service Notes</div>
                <div style="font-size:13px;line-height:1.85;color:#4f6661;">This format works best when your monthly agreement has a flat recurring fee plus separately approved overage or out-of-scope effort.</div>
              </div>
              <div style="padding-left:18px;border-left:1px solid #e1ece7;font-size:13px;line-height:1.85;color:#4f6661;white-space:pre-line;">
                <div style="font-weight:700;color:#1f3b37;margin-bottom:8px;">Payment Details</div>
                {{payment_details}}
              </div>
            </div>
          </div>
        </div>
      </section>
    `
  },

  // ─── Payment Reminder ─────────────────────────────────────────────────────────
  {
    id: "payment_reminder",
    name: "Payment Reminder",
    description: "Professional overdue payment reminder that keeps the relationship intact.",
    category: "Finance",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "client_name",    label: "Client Name",     type: "text",   required: true, placeholder: "Northstar Systems" },
      { key: "invoice_number", label: "Invoice Number",  type: "text",   required: true, placeholder: "INV-2048" },
      { key: "amount_due",     label: "Amount Due",      type: "text",   required: true, placeholder: "EUR 4,800" },
      { key: "original_due",   label: "Original Due Date", type: "date", required: true },
      { key: "days_overdue",   label: "Days Overdue",    type: "number", required: true, placeholder: "14" },
      { key: "pay_to",         label: "Pay To / Account Details", type: "textarea", required: true, placeholder: "IBAN: IE12 AIBK 9311 5212 3456 78" },
      { key: "sender_name",    label: "Sender Name",     type: "text",   required: true, placeholder: "Rahul Nair" },
      { key: "sender_email",   label: "Sender Email",    type: "text",   required: true, placeholder: "billing@acmelabs.io" }
    ],
    clauses: [
      {
        id: "escalation_warning",
        title: "Escalation Warning",
        description: "Adds a polite warning about further action.",
        category: "Commercial",
        defaultEnabled: true,
        editable: true,
        content: "If payment is not received within 7 days of this notice, we may be required to escalate the matter, which may affect your credit standing or result in collection proceedings."
      }
    ],
    content: `
      <section>
        <div style="border:1px solid #eed4bf;border-radius:28px;background:#fffdfa;overflow:hidden;">
          <div style="display:grid;grid-template-columns:160px 1fr;align-items:stretch;">
            <div style="padding:28px 18px;background:linear-gradient(180deg,#c0591c 0%,#a14b16 100%);color:#fff7f0;text-align:center;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#ffd8bf;">Overdue</div>
              <div style="margin-top:14px;font-size:34px;font-weight:800;line-height:1;letter-spacing:-0.05em;">{{days_overdue}}</div>
              <div style="margin-top:8px;font-size:12px;line-height:1.6;color:#ffe8d8;">days past due</div>
            </div>
            <div style="padding:28px 30px 30px;">
              <div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding-bottom:18px;border-bottom:1px solid #eadfce;">
                <div>
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#b0672b;">Accounts Follow-up</div>
                  <div style="margin-top:10px;font-size:36px;font-weight:800;letter-spacing:-0.05em;color:#2e241d;">Payment Reminder</div>
                  <div style="margin-top:10px;font-size:15px;color:#7b6655;">Invoice {{invoice_number}} remains unpaid as of {{original_due}}</div>
                </div>
                <div style="padding:16px 18px;border-radius:20px;background:#fff7ef;border:1px solid #eed4bf;min-width:220px;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#b0672b;margin-bottom:8px;">Outstanding Balance</div>
                  <div style="font-size:28px;font-weight:800;color:#2e241d;">{{amount_due}}</div>
                  <div style="margin-top:6px;font-size:13px;color:#7b6655;">Contact: {{sender_email}}</div>
                </div>
              </div>

              <div style="margin-top:22px;font-size:16px;line-height:1.95;color:#302720;">
                <p style="margin:0 0 16px;">Dear {{client_name}},</p>
                <p style="margin:0 0 16px;">This is a reminder that invoice <strong>{{invoice_number}}</strong> for <strong>{{amount_due}}</strong> was due on <strong>{{original_due}}</strong> and remains outstanding.</p>
                <p style="margin:0;">Please arrange payment at your earliest convenience. If payment has already been sent, please disregard this notice and accept our thanks.</p>
              </div>

              <div style="margin-top:22px;padding:18px 20px;border-radius:20px;background:#fbf6ef;border:1px solid #eadfce;display:grid;grid-template-columns:1fr 220px;gap:16px;align-items:start;">
                <div>
                  <div style="font-size:13px;font-weight:700;color:#2e241d;margin-bottom:8px;">Payment Details</div>
                  <div style="font-size:13px;line-height:1.9;color:#4a3e35;white-space:pre-line;">{{pay_to}}</div>
                </div>
                <div style="padding-left:16px;border-left:1px solid #eadfce;font-size:13px;line-height:1.85;color:#5b5047;">
                  <div><strong style="color:#2e241d;">Reminder issued by</strong></div>
                  <div>{{sender_name}}</div>
                  <div style="margin-top:10px;"><strong style="color:#2e241d;">Reference</strong></div>
                  <div>{{invoice_number}}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `
  },

  // ─── Monthly Expense Report ───────────────────────────────────────────────────
  {
    id: "expense_report",
    name: "Monthly Expense Report",
    description: "Structured expense report for employees and contractors to submit for reimbursement.",
    category: "Finance",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "employee_name",  label: "Employee / Submitter",  type: "text",   required: true, placeholder: "Rahul Nair" },
      { key: "department",     label: "Department / Team",     type: "text",   required: true, placeholder: "Engineering" },
      { key: "report_month",   label: "Report Month",          type: "text",   required: true, placeholder: "March 2026" },
      { key: "expense_items",  label: "Expense Items (description · date · amount, one per line)", type: "textarea", required: true, placeholder: "Flight to Dublin · 2026-03-10 · 320\nHotel (2 nights) · 2026-03-10 · 280\nClient Dinner · 2026-03-11 · 145" },
      { key: "total_amount",   label: "Total Amount",          type: "number", required: true, placeholder: "745" },
      { key: "currency",       label: "Currency (ISO)",        type: "text",   required: true, placeholder: "EUR" },
      { key: "approved_by",    label: "Approved By",           type: "text",   required: true, placeholder: "Asha Menon" },
      { key: "notes",          label: "Notes (optional)",      type: "textarea", required: false, placeholder: "Receipts attached." }
    ],
    content: `
      <section>
        <div style="border:1px solid #dce2ea;border-radius:28px;background:#ffffff;overflow:hidden;">
          <div style="padding:26px 30px;background:linear-gradient(180deg,#f2f5f9 0%,#eef2f6 100%);border-bottom:1px solid #e1e8ef;">
            <div style="display:grid;grid-template-columns:1fr 240px;gap:22px;align-items:start;">
              <div>
                <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#5d738a;">Reimbursement Report</div>
                <div style="margin-top:10px;font-size:36px;font-weight:800;letter-spacing:-0.05em;color:#233140;">Expense Report</div>
                <div style="margin-top:10px;font-size:15px;color:#667a8d;">{{report_month}}</div>
              </div>
              <div style="padding:16px 18px;border-radius:20px;background:#ffffff;border:1px solid #e1e8ef;font-size:13px;line-height:1.9;color:#526576;">
                <div><strong style="color:#233140;">Submitted by</strong> {{employee_name}}</div>
                <div><strong style="color:#233140;">Department</strong> {{department}}</div>
                <div><strong style="color:#233140;">Approved by</strong> {{approved_by}}</div>
              </div>
            </div>
          </div>

          <div style="padding:26px 30px 30px;">
            <div style="border:1px solid #e1e8ef;border-radius:22px;overflow:hidden;">
              <div style="display:grid;grid-template-columns:1fr 160px;gap:0;background:#f7fafc;border-bottom:1px solid #e1e8ef;">
                <div style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#5d738a;">Submitted Expenses</div>
                <div style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#5d738a;text-align:right;">Audit View</div>
              </div>
              <table>
                <thead>
                  <tr style="background:#f7fafc;">
                    <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#5d738a;text-align:left;">Expense</th>
                    <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#5d738a;text-align:left;">Date</th>
                    <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#5d738a;text-align:right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {{{expenseRows expense_items}}}
                </tbody>
              </table>
            </div>

            <div style="display:flex;justify-content:flex-end;margin-top:18px;">
              <div style="min-width:260px;padding:18px 20px;border-radius:20px;background:#233140;color:#eef5fb;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#b7cbdd;margin-bottom:8px;">Total Reimbursement</div>
                <div style="font-size:28px;font-weight:800;line-height:1.2;">{{money total_amount currency}}</div>
              </div>
            </div>

            {{#if notes}}
            <div style="margin-top:20px;padding:18px 20px;border-radius:20px;background:#f7fafc;border:1px solid #e1e8ef;font-size:13px;line-height:1.85;color:#5a6b7b;">{{notes}}</div>
            {{/if}}
          </div>
        </div>
      </section>
    `
  },

  // ─── Project Status Report ────────────────────────────────────────────────────
  {
    id: "project_status_report",
    name: "Project Status Report",
    description: "Weekly or sprint-based project status report for stakeholders and leadership.",
    category: "Operations",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "project_name",   label: "Project Name",      type: "text",     required: true, placeholder: "Platform Relaunch" },
      { key: "report_period",  label: "Reporting Period",   type: "text",     required: true, placeholder: "24–28 Mar 2026" },
      { key: "pm_name",        label: "Project Manager",    type: "text",     required: true, placeholder: "Asha Menon" },
      { key: "overall_status", label: "Overall Status",     type: "text",     required: true, placeholder: "On Track / At Risk / Off Track" },
      { key: "summary",        label: "Executive Summary",  type: "textarea", required: true, placeholder: "Brief 2–3 sentence summary of the period..." },
      { key: "accomplishments",label: "Accomplishments",    type: "textarea", required: true, placeholder: "- Completed API design review\n- Deployed staging environment" },
      { key: "next_steps",     label: "Next Steps",         type: "textarea", required: true, placeholder: "- Begin integration testing\n- Client UAT kick-off" },
      { key: "risks_issues",   label: "Risks & Issues",     type: "textarea", required: false, placeholder: "- API latency under load — mitigation in progress" },
      { key: "budget_status",  label: "Budget Status",      type: "text",     required: false, placeholder: "EUR 48,000 spent of EUR 72,000 approved" }
    ],
    clauses: [
      {
        id: "escalation_path",
        title: "Escalation Path",
        description: "Documents the escalation contact for critical issues.",
        category: "Governance",
        editable: true,
        content: "Critical issues requiring executive decision should be immediately escalated to the project sponsor. Non-critical items should be logged in the project issue tracker."
      },
      {
        id: "change_control",
        title: "Change Control",
        description: "Reminds stakeholders of change control process.",
        category: "Governance",
        editable: true,
        content: "Any scope, schedule, or budget change must be submitted via the formal change control process and approved by both the project manager and the client before implementation."
      }
    ],
    content: `
      <section>
        <div style="border:1px solid #dbe3ed;border-radius:28px;background:#ffffff;overflow:hidden;">
          <div style="display:grid;grid-template-columns:220px 1fr;align-items:stretch;">
            <div style="padding:28px 22px;background:linear-gradient(180deg,#223243 0%,#304659 100%);color:#eef5fb;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#b8cbdd;">Status Snapshot</div>
              <div style="margin-top:18px;font-size:28px;font-weight:800;line-height:1.08;letter-spacing:-0.04em;">{{overall_status}}</div>
              <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.12);font-size:12px;line-height:1.9;color:#d5e1ea;">
                <div><strong style="color:#ffffff;">Project</strong></div>
                <div>{{project_name}}</div>
                <div style="margin-top:12px;"><strong style="color:#ffffff;">Period</strong></div>
                <div>{{report_period}}</div>
                <div style="margin-top:12px;"><strong style="color:#ffffff;">Project Manager</strong></div>
                <div>{{pm_name}}</div>
              </div>
            </div>

            <div style="padding:28px 30px 30px;">
              <div style="padding-bottom:18px;border-bottom:1px solid #e0e8f0;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#58708a;">Stakeholder Reporting</div>
                <div style="margin-top:10px;font-size:36px;font-weight:800;letter-spacing:-0.05em;color:#223243;">Project Status Report</div>
                <div style="margin-top:10px;font-size:15px;color:#64788d;">Executive update for {{project_name}}</div>
              </div>

              <div style="margin-top:22px;padding:22px;border-radius:22px;background:#fff;border:1px solid #e0e8f0;">
                <div style="font-size:13px;font-weight:700;color:#223243;margin-bottom:8px;">Executive Summary</div>
                <div style="font-size:15px;line-height:1.9;color:#455869;">{{summary}}</div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px;">
                <div style="padding:20px;border-radius:20px;background:#fff;border:1px solid #e0e8f0;">
                  <div style="font-size:13px;font-weight:700;color:#223243;margin-bottom:10px;">Accomplishments</div>
                  <ul style="margin:0;padding:0;font-size:13px;line-height:1.9;color:#455869;list-style:disc;">{{{bulletList accomplishments}}}</ul>
                </div>
                <div style="padding:20px;border-radius:20px;background:#f7fafc;border:1px solid #e0e8f0;">
                  <div style="font-size:13px;font-weight:700;color:#223243;margin-bottom:10px;">Next Steps</div>
                  <ul style="margin:0;padding:0;font-size:13px;line-height:1.9;color:#455869;list-style:disc;">{{{bulletList next_steps}}}</ul>
                </div>
              </div>

              {{#if risks_issues}}
              <div style="margin-top:18px;padding:18px 20px;border-radius:20px;background:#fff7ef;border:1px solid #f1d7bc;">
                <div style="font-size:13px;font-weight:700;color:#b0672b;margin-bottom:8px;">Risks &amp; Issues</div>
                <ul style="margin:0;padding:0;font-size:13px;line-height:1.9;color:#5b5047;list-style:disc;">{{{bulletList risks_issues}}}</ul>
              </div>
              {{/if}}

              {{#if budget_status}}
              <div style="margin-top:18px;padding:18px 20px;border-radius:20px;background:#223243;color:#eef5fb;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#b8cbdd;margin-bottom:8px;">Budget Status</div>
                <div style="font-size:14px;line-height:1.85;">{{budget_status}}</div>
              </div>
              {{/if}}
            </div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "sales_quote",
    name: "Sales Quote",
    description: "Market-standard quote with commercial summary, validity period, and approval-ready pricing layout.",
    category: "Sales",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "seller_name", label: "Seller Name", type: "text", required: true, placeholder: "Acme Labs" },
      { key: "seller_address", label: "Seller Address", type: "textarea", required: true, placeholder: "12 Main Street\nDublin, D01 AB12\nIreland" },
      { key: "client_name", label: "Client Name", type: "text", required: true, placeholder: "Northstar Systems" },
      { key: "client_contact", label: "Client Contact", type: "text", required: true, placeholder: "Asha Menon" },
      { key: "quote_number", label: "Quote Number", type: "text", required: true, placeholder: "QT-2026-014" },
      { key: "issue_date", label: "Issue Date", type: "date", required: true },
      { key: "valid_until", label: "Valid Until", type: "date", required: true },
      { key: "project_summary", label: "Project Summary", type: "textarea", required: true, placeholder: "Website redesign, design system refresh, and CMS implementation." },
      { key: "scope_items", label: "Scope Items", type: "textarea", required: true, placeholder: "Discovery workshop\nUI design\nCMS implementation\nQA and launch support" },
      { key: "timeline", label: "Timeline", type: "text", required: true, placeholder: "8 weeks from project kickoff" },
      { key: "pricing_model", label: "Pricing Model", type: "text", required: true, placeholder: "Fixed fee" },
      { key: "subtotal", label: "Subtotal", type: "number", required: true, placeholder: "18000" },
      { key: "tax_rate", label: "Tax Rate (%)", type: "number", required: true, placeholder: "20" },
      { key: "currency", label: "Currency (ISO)", type: "text", required: true, placeholder: "USD" },
      { key: "payment_schedule", label: "Payment Schedule", type: "textarea", required: true, placeholder: "50% on approval\n30% on design sign-off\n20% on final delivery" },
      { key: "prepared_by", label: "Prepared By", type: "text", required: true, placeholder: "Rahul Nair" }
    ],
    clauses: [
      {
        id: "change_request_basis",
        title: "Change Request Basis",
        description: "Clarifies how out-of-scope changes are handled.",
        category: "Commercial",
        defaultEnabled: true,
        editable: true,
        content: "Any work requested outside the quoted scope will be estimated and approved separately before execution."
      },
      {
        id: "quote_validity",
        title: "Quote Validity",
        description: "States the commercial validity period.",
        category: "Commercial",
        defaultEnabled: true,
        editable: true,
        content: "This quotation remains valid until {{valid_until}} and is subject to resource availability until accepted in writing by {{client_name}}."
      }
    ],
    content: `
      <section>
        <div style="padding:28px 30px;border-radius:24px;background:linear-gradient(145deg,#fbf1e5 0%,#fffdf9 56%,#f4e5d4 100%);border:1px solid #ead9c7;">
          <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;">
            <div>
              <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#9a6a3a;">Commercial Proposal</div>
              <div style="margin-top:8px;font-size:34px;font-weight:800;letter-spacing:-0.05em;color:#342419;">Sales Quote</div>
              <div style="margin-top:10px;font-size:15px;color:#7a6450;white-space:pre-line;line-height:1.8;">{{seller_name}}\n{{seller_address}}</div>
            </div>
            <div style="min-width:250px;padding:16px 18px;border-radius:18px;background:#fffaf4;border:1px solid #eadfce;">
              <div style="display:flex;justify-content:space-between;font-size:12px;color:#7a6654;padding-bottom:8px;border-bottom:1px solid #efe5d7;"><span>Quote #</span><strong style="color:#342419;">{{quote_number}}</strong></div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:#7a6654;padding:8px 0;border-bottom:1px solid #efe5d7;"><span>Issue Date</span><strong style="color:#342419;">{{issue_date}}</strong></div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:#7a6654;padding-top:8px;"><span>Valid Until</span><strong style="color:#c2672d;">{{valid_until}}</strong></div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px;">
          <div style="padding:20px;border-radius:20px;background:#fff;border:1px solid #eadfce;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#9a6a3a;margin-bottom:8px;">Prepared For</div>
            <div style="font-size:20px;font-weight:700;color:#342419;">{{client_name}}</div>
            <div style="margin-top:6px;font-size:13px;color:#7a6654;">Attention: {{client_contact}}</div>
            <div style="margin-top:14px;font-size:14px;line-height:1.85;color:#5a4a3d;">{{project_summary}}</div>
          </div>
          <div style="padding:20px 22px;border-radius:20px;background:linear-gradient(180deg,#342419 0%,#4a3325 100%);color:#fff5ec;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#e3c3a2;margin-bottom:10px;">Commercial Summary</div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>Pricing Model</span><strong>{{pricing_model}}</strong></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>Timeline</span><strong>{{timeline}}</strong></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>Subtotal</span><strong>{{money subtotal currency}}</strong></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>Tax</span><strong>{{tax_rate}}%</strong></div>
            <div style="display:flex;justify-content:space-between;padding-top:12px;font-size:20px;font-weight:800;"><span>Total</span><span>{{money (mul subtotal (add 1 (div tax_rate 100))) currency}}</span></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px;">
          <div style="padding:20px;border-radius:20px;background:#fff;border:1px solid #eadfce;">
            <div style="font-size:13px;font-weight:700;color:#342419;margin-bottom:10px;">Scope</div>
            <ul style="margin:0;padding:0;font-size:14px;line-height:1.85;color:#5a4a3d;list-style:disc;">{{{bulletList scope_items}}}</ul>
          </div>
          <div style="padding:20px;border-radius:20px;background:#fbf6ef;border:1px solid #eadfce;">
            <div style="font-size:13px;font-weight:700;color:#342419;margin-bottom:10px;">Payment Schedule</div>
            <ul style="margin:0;padding:0;font-size:14px;line-height:1.85;color:#5a4a3d;list-style:disc;">{{{bulletList payment_schedule}}}</ul>
          </div>
        </div>

        <div style="margin-top:20px;padding:18px 20px;border-radius:18px;background:#fff8f0;border:1px solid #eadfce;font-size:13px;line-height:1.8;color:#7a6654;">Prepared by <strong style="color:#342419;">{{prepared_by}}</strong>. Approval of this quote authorizes scheduling and issuance of final contracting paperwork.</div>
      </section>
    `
  },
  {
    id: "purchase_order",
    name: "Purchase Order",
    description: "Procurement-ready purchase order with buyer, supplier, delivery, and approval sections in a standard enterprise format.",
    category: "Operations",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "buyer_company", label: "Buyer Company", type: "text", required: true, placeholder: "Northstar Systems" },
      { key: "buyer_address", label: "Buyer Address", type: "textarea", required: true, placeholder: "99 River Road\nLondon EC1A 1BB\nUnited Kingdom" },
      { key: "supplier_name", label: "Supplier Name", type: "text", required: true, placeholder: "Acme Labs" },
      { key: "supplier_address", label: "Supplier Address", type: "textarea", required: true, placeholder: "12 Main Street\nDublin D01 AB12\nIreland" },
      { key: "po_number", label: "PO Number", type: "text", required: true, placeholder: "PO-2026-112" },
      { key: "order_date", label: "Order Date", type: "date", required: true },
      { key: "delivery_date", label: "Delivery Date", type: "date", required: true },
      { key: "requested_by", label: "Requested By", type: "text", required: true, placeholder: "Asha Menon" },
      { key: "delivery_location", label: "Delivery Location", type: "textarea", required: true, placeholder: "Northstar Systems\nWarehouse B\nDock 4" },
      { key: "line_items", label: "Order Items", type: "textarea", required: true, placeholder: "Design Retainer · 1 · 6500\nImplementation Sprint · 2 · 4200" },
      { key: "subtotal", label: "Subtotal", type: "number", required: true, placeholder: "14900" },
      { key: "tax_rate", label: "Tax Rate (%)", type: "number", required: true, placeholder: "20" },
      { key: "currency", label: "Currency (ISO)", type: "text", required: true, placeholder: "GBP" },
      { key: "payment_terms", label: "Payment Terms", type: "text", required: true, placeholder: "Net 30 from invoice date" },
      { key: "approver_name", label: "Approver Name", type: "text", required: true, placeholder: "Rahul Nair" }
    ],
    clauses: [
      {
        id: "acceptance_of_terms",
        title: "Acceptance of Terms",
        description: "Confirms supplier acceptance of the PO terms.",
        category: "Commercial",
        defaultEnabled: true,
        editable: true,
        content: "Fulfilment of this purchase order constitutes acceptance of the pricing, delivery commitments, and payment terms stated herein unless otherwise agreed in writing by {{buyer_company}}."
      }
    ],
    content: `
      <section>
        <div style="padding:28px 30px;border-radius:24px;background:linear-gradient(150deg,#eef7f5 0%,#ffffff 60%,#e8f2ef 100%);border:1px solid #d8e6e0;">
          <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;">
            <div>
              <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#4b7a70;">Procurement Order</div>
              <div style="margin-top:8px;font-size:34px;font-weight:800;letter-spacing:-0.05em;color:#1f3b37;">Purchase Order</div>
              <div style="margin-top:10px;font-size:15px;color:#628178;">{{buyer_company}}</div>
            </div>
            <div style="min-width:250px;padding:16px 18px;border-radius:18px;background:#f7fcfa;border:1px solid #dce9e3;">
              <div style="display:flex;justify-content:space-between;font-size:12px;color:#5f7d75;padding-bottom:8px;border-bottom:1px solid #e4efea;"><span>PO Number</span><strong style="color:#1f3b37;">{{po_number}}</strong></div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:#5f7d75;padding:8px 0;border-bottom:1px solid #e4efea;"><span>Order Date</span><strong style="color:#1f3b37;">{{order_date}}</strong></div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:#5f7d75;padding-top:8px;"><span>Delivery Date</span><strong style="color:#2c8b73;">{{delivery_date}}</strong></div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px;">
          <div style="padding:20px;border-radius:20px;background:#fff;border:1px solid #e1ece7;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#4b7a70;margin-bottom:8px;">Buyer</div>
            <div style="font-size:18px;font-weight:700;color:#1f3b37;">{{buyer_company}}</div>
            <div style="margin-top:8px;font-size:13px;line-height:1.8;color:#4f6661;white-space:pre-line;">{{buyer_address}}</div>
            <div style="margin-top:8px;font-size:12px;color:#5f7d75;"><strong style="color:#1f3b37;">Requested by:</strong> {{requested_by}}</div>
          </div>
          <div style="padding:20px;border-radius:20px;background:#fff;border:1px solid #e1ece7;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#4b7a70;margin-bottom:8px;">Supplier</div>
            <div style="font-size:18px;font-weight:700;color:#1f3b37;">{{supplier_name}}</div>
            <div style="margin-top:8px;font-size:13px;line-height:1.8;color:#4f6661;white-space:pre-line;">{{supplier_address}}</div>
          </div>
        </div>

        <div style="margin-top:20px;border:1px solid #e1ece7;border-radius:20px;overflow:hidden;background:#fff;">
          <table>
            <thead>
              <tr style="background:#f3faf7;">
                <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#4b7a70;text-align:left;">Ordered Item</th>
                <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#4b7a70;text-align:left;">Qty</th>
                <th style="padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#4b7a70;text-align:right;">Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {{{lineItemRows line_items}}}
            </tbody>
          </table>
        </div>

        <div style="display:grid;grid-template-columns:1.05fr 0.95fr;gap:18px;margin-top:20px;align-items:start;">
          <div style="padding:20px;border-radius:20px;background:#f5fbf8;border:1px solid #e1ece7;">
            <div style="font-size:13px;font-weight:700;color:#1f3b37;margin-bottom:8px;">Delivery and Payment</div>
            <div style="font-size:13px;line-height:1.85;color:#4f6661;"><strong style="color:#1f3b37;">Deliver to:</strong></div>
            <div style="font-size:13px;line-height:1.85;color:#4f6661;white-space:pre-line;">{{delivery_location}}</div>
            <div style="margin-top:10px;font-size:13px;line-height:1.85;color:#4f6661;"><strong style="color:#1f3b37;">Payment terms:</strong> {{payment_terms}}</div>
          </div>
          <div style="padding:20px 22px;border-radius:20px;background:linear-gradient(180deg,#1f3b37 0%,#295048 100%);color:#eef8f6;">
            <div style="display:flex;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>Subtotal</span><strong>{{money subtotal currency}}</strong></div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;"><span>Tax</span><strong>{{money (mul subtotal (div tax_rate 100)) currency}}</strong></div>
            <div style="display:flex;justify-content:space-between;padding-top:12px;font-size:20px;font-weight:800;"><span>Total</span><span>{{money (mul subtotal (add 1 (div tax_rate 100))) currency}}</span></div>
          </div>
        </div>

        <div style="margin-top:20px;padding:18px 20px;border-radius:18px;background:#f7fcfa;border:1px solid #e1ece7;display:grid;grid-template-columns:1fr 1fr;gap:18px;">
          <div style="font-size:13px;line-height:1.85;color:#5f7d75;">
            <div style="font-weight:700;color:#1f3b37;">Buyer Approval</div>
            <div style="margin-top:14px;">Signature: ____________________</div>
            <div>Name: {{approver_name}}</div>
          </div>
          <div style="font-size:13px;line-height:1.85;color:#5f7d75;">
            <div style="font-weight:700;color:#1f3b37;">Supplier Acknowledgement</div>
            <div style="margin-top:14px;">Signature: ____________________</div>
            <div>Name: {{supplier_name}}</div>
          </div>
        </div>
      </section>
    `
  },
  {
    id: "performance_review",
    name: "Performance Review",
    description: "A polished quarterly or annual review template aligned to standard people-operations review structures.",
    category: "HR",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "employee_name", label: "Employee Name", type: "text", required: true, placeholder: "Rahul Nair" },
      { key: "role_title", label: "Role Title", type: "text", required: true, placeholder: "Senior Product Designer" },
      { key: "review_period", label: "Review Period", type: "text", required: true, placeholder: "Q1 2026" },
      { key: "manager_name", label: "Manager Name", type: "text", required: true, placeholder: "Asha Menon" },
      { key: "overall_rating", label: "Overall Rating", type: "text", required: true, placeholder: "Exceeds Expectations" },
      { key: "role_summary", label: "Role Summary", type: "textarea", required: true, placeholder: "Led product discovery and shipped the new onboarding experience." },
      { key: "key_achievements", label: "Key Achievements", type: "textarea", required: true, placeholder: "Launched onboarding redesign\nReduced drop-off by 18%\nMentored two junior designers" },
      { key: "strengths", label: "Strengths", type: "textarea", required: true, placeholder: "Strategic thinking\nStakeholder communication\nDelivery discipline" },
      { key: "growth_areas", label: "Growth Areas", type: "textarea", required: true, placeholder: "Delegation across cross-functional teams\nMore proactive roadmap visibility" },
      { key: "next_period_goals", label: "Next Period Goals", type: "textarea", required: true, placeholder: "Own the design system rollout\nImprove experimentation cadence" },
      { key: "employee_comments", label: "Employee Comments (optional)", type: "textarea", required: false, placeholder: "I would like to deepen my people-management experience." }
    ],
    clauses: [
      {
        id: "development_plan",
        title: "Development Plan",
        description: "Adds a development commitment for the next cycle.",
        category: "Growth",
        defaultEnabled: true,
        editable: true,
        content: "Manager and employee agree to review progress against the stated goals monthly and align on any coaching, training, or support needed during the next review cycle."
      }
    ],
    content: `
      <section>
        <div style="padding:30px;border-radius:28px;background:linear-gradient(135deg,#f6f8fb 0%,#ffffff 58%,#eef4f7 100%);border:1px solid #dde7ea;">
          <div style="display:grid;grid-template-columns:1fr 220px;gap:22px;align-items:start;">
            <div>
              <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#607d85;">People Review</div>
              <div style="margin-top:10px;font-size:34px;font-weight:800;letter-spacing:-0.05em;color:#22343b;">Performance Review</div>
              <div style="margin-top:10px;font-size:15px;color:#6a7e84;">{{employee_name}} · {{role_title}}</div>
            </div>
            <div style="padding:18px;border-radius:20px;background:#22343b;color:#edf6f7;text-align:center;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#abc5cb;">Overall Rating</div>
              <div style="margin-top:12px;font-size:22px;font-weight:800;line-height:1.3;">{{overall_rating}}</div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:240px 1fr;gap:20px;margin-top:22px;align-items:start;">
          <div style="padding:20px;border-radius:20px;background:#22343b;color:#edf6f7;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#abc5cb;margin-bottom:10px;">Review Details</div>
            <div style="font-size:13px;line-height:2;color:#d8e7ea;">
              <div><strong style="color:#ffffff;">Period:</strong> {{review_period}}</div>
              <div><strong style="color:#ffffff;">Manager:</strong> {{manager_name}}</div>
              <div><strong style="color:#ffffff;">Employee:</strong> {{employee_name}}</div>
              <div><strong style="color:#ffffff;">Role:</strong> {{role_title}}</div>
            </div>
          </div>

          <div>
            <div style="padding:22px;border-radius:20px;background:#fff;border:1px solid #dde7ea;">
              <div style="font-size:13px;font-weight:700;color:#22343b;margin-bottom:8px;">Role Summary</div>
              <div style="font-size:14px;line-height:1.85;color:#52656c;">{{role_summary}}</div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;">
              <div style="padding:20px;border-radius:18px;background:#fff;border:1px solid #dde7ea;">
                <div style="font-size:13px;font-weight:700;color:#22343b;margin-bottom:10px;">Key Achievements</div>
                <div style="font-size:13px;line-height:1.85;color:#52656c;white-space:pre-line;">{{key_achievements}}</div>
              </div>
              <div style="padding:20px;border-radius:18px;background:#f3faf8;border:1px solid #d5e7e1;">
                <div style="font-size:13px;font-weight:700;color:#2f6c5d;margin-bottom:10px;">Strengths</div>
                <div style="font-size:13px;line-height:1.85;color:#52656c;white-space:pre-line;">{{strengths}}</div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;">
          <div style="padding:20px;border-radius:18px;background:#fff8f2;border:1px solid #f0dac4;">
            <div style="font-size:13px;font-weight:700;color:#9b5521;margin-bottom:10px;">Growth Areas</div>
            <div style="font-size:13px;line-height:1.85;color:#5b5047;white-space:pre-line;">{{growth_areas}}</div>
          </div>
          <div style="padding:20px;border-radius:18px;background:#f4fbf5;border:1px solid #d5e9d8;">
            <div style="font-size:13px;font-weight:700;color:#2f6c3b;margin-bottom:10px;">Next Period Goals</div>
            <div style="font-size:13px;line-height:1.85;color:#4f6354;white-space:pre-line;">{{next_period_goals}}</div>
          </div>
        </div>

        {{#if employee_comments}}
        <div style="margin-top:20px;padding:18px 20px;border-radius:18px;background:#ffffff;border:1px solid #dde7ea;">
          <div style="font-size:13px;font-weight:700;color:#22343b;margin-bottom:8px;">Employee Comments</div>
          <div style="font-size:13px;line-height:1.8;color:#52656c;white-space:pre-line;">{{employee_comments}}</div>
        </div>
        {{/if}}
      </section>
    `
  },
  {
    id: "press_release",
    name: "Press Release",
    description: "A modern press release layout following standard media format with headline, subhead, dateline, and boilerplate.",
    category: "Communication",
    supportedOutputs: ["html", "pdf"],
    fields: [
      { key: "headline", label: "Headline", type: "text", required: true, placeholder: "Acme Labs Launches AI Document Studio for Enterprise Teams" },
      { key: "subheadline", label: "Subheadline", type: "text", required: true, placeholder: "New platform reduces document turnaround time and improves compliance consistency." },
      { key: "city", label: "City", type: "text", required: true, placeholder: "London" },
      { key: "release_date", label: "Release Date", type: "date", required: true },
      { key: "company_name", label: "Company Name", type: "text", required: true, placeholder: "Acme Labs" },
      { key: "announcement_body", label: "Announcement Body", type: "textarea", required: true, placeholder: "Acme Labs today announced..." },
      { key: "quote_text", label: "Executive Quote", type: "textarea", required: true, placeholder: "We built this product to help teams scale document operations without losing quality." },
      { key: "quote_author", label: "Quote Author", type: "text", required: true, placeholder: "Rahul Nair, Founder and CEO" },
      { key: "product_details", label: "Product or Company Details", type: "textarea", required: true, placeholder: "The platform includes template automation, approvals, and audit-ready controls." },
      { key: "boilerplate", label: "Company Boilerplate", type: "textarea", required: true, placeholder: "Acme Labs builds enterprise software for document and workflow operations." },
      { key: "media_contact", label: "Media Contact", type: "textarea", required: true, placeholder: "Priya Kapoor\npress@acmelabs.io\n+44 20 1234 5678" }
    ],
    content: `
      <section>
        <div style="text-align:center;padding-bottom:22px;border-bottom:3px double #d9d3ca;">
          <div style="font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#646b72;">For Immediate Release</div>
          <div style="margin-top:16px;font-size:42px;line-height:1.08;font-weight:800;letter-spacing:-0.05em;color:#1f2328;">{{headline}}</div>
          <div style="margin:14px auto 0;max-width:720px;font-size:18px;line-height:1.55;color:#5d646c;">{{subheadline}}</div>
        </div>

        <div style="display:grid;grid-template-columns:1.18fr 0.82fr;gap:24px;margin-top:24px;align-items:start;">
          <div>
            <div style="font-size:15px;line-height:1.95;color:#2f343a;">
              <p style="margin:0 0 18px;"><strong style="color:#1f2328;">{{city}}, {{release_date}}</strong> - {{announcement_body}}</p>
            </div>

            <blockquote style="margin:0;padding:20px 24px;border-radius:18px;background:#f5f6f8;border-left:5px solid #7d8793;font-size:20px;line-height:1.65;color:#1f2328;font-style:italic;">"{{quote_text}}"<div style="margin-top:12px;font-size:13px;font-style:normal;color:#616b74;">- {{quote_author}}</div></blockquote>

            <div style="margin-top:22px;font-size:15px;line-height:1.95;color:#2f343a;">
              <p style="margin:0;">{{product_details}}</p>
            </div>
          </div>

          <div>
            <div style="padding:20px;border-radius:20px;background:#1f2328;color:#eef1f4;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#aab5c0;margin-bottom:10px;">Media Contact</div>
              <div style="font-size:13px;line-height:1.9;white-space:pre-line;">{{media_contact}}</div>
            </div>

            <div style="margin-top:18px;padding:20px;border-radius:20px;background:#ffffff;border:1px solid #e4e7ea;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#646b72;margin-bottom:10px;">About {{company_name}}</div>
              <div style="font-size:13px;line-height:1.9;color:#4f565d;">{{boilerplate}}</div>
            </div>
          </div>
        </div>
      </section>
    `
  }
];

export function getBuiltinTemplate(id: string) {
  return builtinTemplates.find((template) => template.id === id);
}
