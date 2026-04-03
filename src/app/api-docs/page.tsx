import { Suspense } from "react";
import { ApiConsole } from "@/components/api-console";
import { PaidFeatureNotice } from "@/components/paid-feature-notice";
import { getAuthenticatedAccountAccess } from "@/server/account-access";
import { endpoints, apiExamples, EndpointDoc } from "@/server/openapi";

const methodColor: Record<string, string> = {
  GET:    "bg-[#e8f4fd] text-[#1a56db]",
  POST:   "bg-[#ecfdf5] text-[#057a55]",
  PUT:    "bg-[#fff8ec] text-[#b45309]",
  DELETE: "bg-[#fdf2f2] text-[#c81e1e]"
};

function EndpointCard({ ep }: { ep: EndpointDoc }) {
  return (
    <div className="rounded-[20px] border border-[#eadfce] bg-white/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4 border-b border-[#eadfce]">
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tracking-wide ${methodColor[ep.method] ?? "bg-gray-100 text-gray-700"}`}>
          {ep.method}
        </span>
        <div>
          <code className="text-sm font-mono font-semibold text-ink-900">{ep.path}</code>
          <p className="mt-1 text-xs text-ink-600">{ep.description}</p>
        </div>
      </div>

      <div className="px-5 py-4 grid gap-4 md:grid-cols-2">
        {/* Path params */}
        {ep.pathParams && ep.pathParams.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#8f6a44] font-semibold mb-2">Path Parameters</div>
            <div className="space-y-1.5">
              {ep.pathParams.map((p) => (
                <div key={p.name} className="flex items-start gap-2 text-xs">
                  <code className="shrink-0 rounded bg-[#f5ece0] px-1.5 py-0.5 font-mono text-ink-900">{p.name}</code>
                  <span className="text-ink-600">{p.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Responses */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[#8f6a44] font-semibold mb-2">Responses</div>
          <div className="space-y-1.5">
            {Object.entries(ep.responses).map(([code, res]) => (
              <div key={code} className="flex items-start gap-2 text-xs">
                <code className={`shrink-0 rounded px-1.5 py-0.5 font-mono font-semibold ${code.startsWith("2") ? "bg-[#ecfdf5] text-[#057a55]" : "bg-[#fdf2f2] text-[#c81e1e]"}`}>{code}</code>
                <span className="text-ink-600">{res.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Request body */}
      {ep.requestBody && (
        <div className="border-t border-[#eadfce] bg-[#1f1b17] rounded-b-[20px] px-5 py-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[#8f6a44] font-semibold mb-2">Request Body</div>
          <pre className="text-xs text-[#efe5d8] overflow-auto whitespace-pre-wrap leading-5 max-h-72">
            {JSON.stringify(ep.requestBody, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default async function ApiDocsPage() {
  const { hasPaidAccess } = await getAuthenticatedAccountAccess("/api-docs");
  const categories = [
    {
      label: "Generations",
      paths: [
        "/api/v1/generations",
        "/api/v1/generations/from-template",
        "/api/v1/generations/batch",
        "/api/v1/generations/preview",
        "/api/v1/generations/:jobId"
      ]
    },
    { label: "Outputs", paths: ["/api/v1/generations/:jobId/outputs", "/api/v1/generations/:jobId/outputs/:format"] }
  ];

  return (
    <main className="pb-16">
      {!hasPaidAccess ? (
        <PaidFeatureNotice
          feature="API and integrations"
          title="Connect Templify to your stack with Pro."
          description="API access, account API keys, and integration-oriented documentation are now reserved for paying accounts so the operational and support-heavy workflows stay aligned to plan value."
          highlights={[
            "Create scoped API keys from Settings for backend integrations.",
            "Use the queue-backed generation API from your product or automation flow.",
            "Access the full endpoint reference and request examples in the account area."
          ]}
        />
      ) : (
      <section className="page-shell pt-8">

        {/* Hero */}
        <div className="glass-panel p-8 mb-6">
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#8f6a44]">Developer API</div>
          <h1 className="mt-2 text-3xl font-semibold text-ink-900">API Reference</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-700">
            This reference documents paid account API endpoints for queue-backed document generation,
            job polling, and output retrieval.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <div className="rounded-full border border-[#eadfce] bg-white/80 px-4 py-1.5 text-ink-700">
              Base URL: <code className="font-mono font-semibold">https://your-domain.com</code>
            </div>
            <div className="rounded-full border border-[#eadfce] bg-white/80 px-4 py-1.5 text-ink-700">
              Content-Type: <code className="font-mono font-semibold">application/json</code>
            </div>
            <div className="rounded-full border border-[#eadfce] bg-white/80 px-4 py-1.5 text-ink-700">
              Auth: <code className="font-mono font-semibold">Bearer &lt;api-key&gt;</code> or <code className="font-mono font-semibold">x-api-key</code>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-[#eadfce] bg-[#fcf8f2] px-4 py-3 text-sm leading-6 text-ink-700">
            All endpoints shown on this page are intended for server-to-server use with a scoped account API key.
            API key access requires an active paid plan.
          </div>
        </div>

        {/* Quick-start */}
        <div className="glass-panel p-8 mb-6">
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#8f6a44] mb-1">Quick Start</div>
          <h2 className="text-xl font-semibold text-ink-900 mb-4">Generate an invoice in 3 steps</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { step: "1", label: "Start generation", code: `POST /api/v1/generations` },
              { step: "2", label: "Poll for status", code: `GET /api/v1/generations/:jobId` },
              { step: "3", label: "Download output", code: `GET /api/v1/generations/:jobId/outputs/:format` }
            ].map(({ step, label, code }) => (
              <div key={step} className="rounded-2xl border border-[#eadfce] bg-[#fcf8f2] p-4">
                <div className="text-xs text-[#8f6a44] font-semibold mb-1">Step {step}</div>
                <div className="text-sm font-medium text-ink-900 mb-2">{label}</div>
                <code className="text-xs font-mono text-ink-700">{code}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice example */}
        <div className="glass-panel p-8 mb-6">
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#8f6a44] mb-1">Example Requests</div>
          <div className="grid gap-4 lg:grid-cols-2 mt-4">
            <div>
              <div className="text-sm font-semibold text-ink-900 mb-2">Invoice generation</div>
              <div className="rounded-[16px] bg-[#1f1b17] p-4 overflow-auto max-h-80">
                <pre className="text-xs text-[#efe5d8] whitespace-pre-wrap leading-5">
                  {JSON.stringify(apiExamples.invoiceRequest, null, 2)}
                </pre>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-900 mb-2">Completed job response</div>
              <div className="rounded-[16px] bg-[#1f1b17] p-4 overflow-auto max-h-80">
                <pre className="text-xs text-[#efe5d8] whitespace-pre-wrap leading-5">
                  {JSON.stringify(apiExamples.jobCompletedResponse, null, 2)}
                </pre>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm font-semibold text-ink-900 mb-2">Inline / custom template</div>
            <div className="rounded-[16px] bg-[#1f1b17] p-4 overflow-auto max-h-56">
              <pre className="text-xs text-[#efe5d8] whitespace-pre-wrap leading-5">
                {JSON.stringify(apiExamples.inlineRequest, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Endpoint reference */}
        {categories.map((cat) => {
          const catEndpoints = endpoints.filter((ep) => cat.paths.includes(ep.path));
          return (
            <div key={cat.label} className="glass-panel p-8 mb-6">
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#8f6a44] mb-1">{cat.label}</div>
              <div className="mt-4 space-y-4">
                {catEndpoints.map((ep) => (
                  <EndpointCard key={ep.path + ep.method} ep={ep} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Template field types */}
        <div className="glass-panel p-8">
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#8f6a44] mb-1">Field Types</div>
          <h2 className="text-xl font-semibold text-ink-900 mb-4">Template field schema</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { type: "text",     note: "Single-line string input" },
              { type: "textarea", note: "Multi-line string; supports \\n" },
              { type: "number",   note: "Numeric value; used in calculations" },
              { type: "date",     note: "ISO 8601 date string (YYYY-MM-DD)" }
            ].map(({ type, note }) => (
              <div key={type} className="rounded-2xl border border-[#eadfce] bg-[#fcf8f2] p-4">
                <code className="text-sm font-mono font-semibold text-ink-900">{type}</code>
                <p className="mt-1 text-xs text-ink-600">{note}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[16px] bg-[#1f1b17] p-4">
            <div className="text-xs text-[#8f6a44] font-semibold mb-2">Handlebars helpers available in inline templates</div>
            <pre className="text-xs text-[#efe5d8] whitespace-pre-wrap leading-5">{`eq / ne / gt / lt          — comparisons
add / sub / mul / div      — arithmetic
money amount currency      — format as locale currency  (e.g. {{money 1500 "EUR"}} → €1,500.00)
#if / #unless / #each      — standard Handlebars blocks`}</pre>
          </div>
        </div>

        <Suspense fallback={null}>
          <ApiConsole />
        </Suspense>

      </section>
      )}
    </main>
  );
}

