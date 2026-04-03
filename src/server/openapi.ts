// ─── Endpoint reference ───────────────────────────────────────────────────────

export interface EndpointDoc {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  summary: string;
  description: string;
  requestBody?: object;
  queryParams?: Array<{ name: string; type: string; required: boolean; description: string }>;
  pathParams?: Array<{ name: string; type: string; description: string }>;
  responses: Record<string, { description: string; body?: object }>;
}

export const endpoints: EndpointDoc[] = [
  // ── Templates ──────────────────────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/templates",
    summary: "List all templates",
    description: "Returns the full catalogue of built-in templates including their fields, clauses, and supported output formats. Use the `id` value from each template as `templateId` when starting a generation.",
    responses: {
      "200": {
        description: "Array of template descriptors",
        body: [
          {
            id: "invoice",
            name: "Invoice",
            description: "Itemised client invoice with line items, tax, and payment instructions.",
            category: "Finance",
            supportedOutputs: ["html", "pdf"],
            fields: [
              { key: "seller_name",    label: "Your Name / Company", type: "text",   required: true  },
              { key: "invoice_number", label: "Invoice Number",      type: "text",   required: true  },
              { key: "subtotal",       label: "Subtotal",            type: "number", required: true  },
              { key: "tax_rate",       label: "Tax Rate (%)",        type: "number", required: true  },
              { key: "currency",       label: "Currency (ISO)",      type: "text",   required: true  }
            ]
          }
        ]
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/templates/:templateId",
    summary: "Get a single template",
    description: "Returns a single template with its full field schema, optional clauses, and the raw Handlebars content string. Inspect this to understand exactly which data keys are expected before generating a document.",
    pathParams: [
      { name: "templateId", type: "string", description: "The slug id of the template, e.g. `invoice`, `offer_letter`" }
    ],
    responses: {
      "200": { description: "Full template descriptor including `content`" },
      "404": { description: "Template not found" }
    }
  },

  // ── Generate from built-in template ───────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/generations",
    summary: "Start a generation job",
    description: "Enqueues a document generation job. Requires an account API key in the `Authorization: Bearer <api-key>` or `x-api-key` header with the `generations:create` scope. Account API access is available only on active paid plans. Returns a `jobId` immediately — poll `GET /api/v1/generations/:jobId` to track completion and retrieve output URLs.",
    requestBody: {
      mode: "template_fill",
      templateSource: {
        type: "builtin",
        templateId: "invoice"
      },
      saveToMyFiles: true,
      data: {
        seller_name: "Acme Labs",
        seller_address: "12 Main St, Dublin, D01 AB12",
        seller_email: "billing@acmelabs.io",
        client_name: "Northstar Systems",
        client_address: "99 River Rd, London, EC1A 1BB",
        invoice_number: "INV-2048",
        invoice_date: "2026-03-27",
        due_date: "2026-04-10",
        line_items: "Web Design · 1 · 3500\nDevelopment · 40 hrs · 95",
        subtotal: 7300,
        tax_rate: 23,
        currency: "EUR",
        bank_details: "IBAN: IE12 AIBK 9311 5212 3456 78 · BIC: AIBKIE2D"
      },
      outputs: ["html", "pdf"],
      options: {
        branding: {
          companyName: "Acme Labs",
          primaryColor: "#1a56db"
        }
      }
    },
    responses: {
      "200": {
        description: "Job queued",
        body: { jobId: "7f3c91a2-...", status: "queued" }
      },
      "400": {
        description: "Validation error",
        body: { error: { code: "VALIDATION_ERROR", message: "Invalid generation request", details: {} } }
      },
      "401": {
        description: "Missing or invalid account API key"
      },
      "403": {
        description: "The provided API key does not have the required scope"
      },
      "402": {
        description: "The account tied to the API key does not have an active paid plan"
      },
      "429": {
        description: "Rate limit reached"
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/generations/from-template",
    summary: "Generate from an inline template",
    description: "Generate a document from a custom Handlebars template string without saving it first. This endpoint requires an account API key via `Authorization: Bearer <api-key>` or `x-api-key` with the `generations:create:inline` scope. Account API access is limited to active paid plans.",
    requestBody: {
      mode: "template_fill",
      templateSource: {
        type: "inline",
        syntax: "handlebars",
        content: "<section><h1>Hello {{name}}</h1><p>Your order {{order_id}} is confirmed.</p></section>"
      },
      data: {
        name: "Rahul Nair",
        order_id: "ORD-9912"
      },
      outputs: ["html", "pdf"]
    },
    responses: {
      "200": {
        description: "Job queued",
        body: { jobId: "8a1d22b3-...", status: "queued" }
      },
      "401": {
        description: "Missing or invalid account API key"
      },
      "403": {
        description: "The provided API key does not have the required scope"
      },
      "402": {
        description: "The account tied to the API key does not have an active paid plan"
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/generations/batch",
    summary: "Queue a batch of generation jobs",
    description: "Queues up to 25 generation requests in one call. Requires an account API key with the `generations:create:batch` scope. Account API access is available only on active paid plans.",
    requestBody: {
      saveToMyFiles: true,
      requests: [
        {
          mode: "template_fill",
          templateSource: { type: "builtin", templateId: "invoice" },
          data: {
            client_name: "Northstar Systems",
            invoice_number: "INV-5001",
            subtotal: 1200,
            tax_rate: 20,
            currency: "EUR"
          },
          outputs: ["html", "pdf"]
        }
      ]
    },
    responses: {
      "200": {
        description: "Batch queued",
        body: { queued: 1, jobIds: ["9d4f22c1-..."] }
      },
      "400": { description: "Validation error" },
      "401": { description: "Missing or invalid account API key" },
      "403": { description: "The provided API key does not have the required scope" },
      "402": { description: "The account tied to the API key does not have an active paid plan" },
      "429": { description: "Rate limit reached" }
    }
  },
  {
    method: "POST",
    path: "/api/v1/generations/preview",
    summary: "Render an HTML preview",
    description: "Renders HTML preview output for a generation payload without queueing a persisted output file. Requires an account API key with the `generations:create` scope. Account API access is available only on active paid plans.",
    requestBody: {
      mode: "template_fill",
      templateSource: {
        type: "builtin",
        templateId: "proposal"
      },
      data: {
        client_name: "Northstar Systems",
        project_name: "Operations Redesign"
      },
      outputs: ["html"]
    },
    responses: {
      "200": { description: "Rendered HTML" },
      "400": { description: "Validation error" },
      "401": { description: "Missing or invalid account API key" },
      "403": { description: "The provided API key does not have the required scope" },
      "402": { description: "The account tied to the API key does not have an active paid plan" },
      "429": { description: "Rate limit reached" }
    }
  },

  // ── Job status ─────────────────────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/generations/:jobId",
    summary: "Get job status",
    description: "Poll this endpoint to know when generation is complete. Requires the same account API key owner that created the job, with the `generations:read` scope. Account API access is limited to active paid plans. When `status` is `completed` the `outputs` map will contain download URLs for each requested format.",
    pathParams: [
      { name: "jobId", type: "string", description: "The job ID returned from the generation request" }
    ],
    responses: {
      "200": {
        description: "Job status and output URLs",
        body: {
          jobId: "7f3c91a2-...",
          status: "completed",
          result: {
            outputs: [
              {
                format: "html",
                downloadUrl: "https://your-domain.com/api/v1/generations/7f3c91a2/outputs/html",
                expiresAt: "2026-03-27T18:12:04Z"
              },
              {
                format: "pdf",
                downloadUrl: "https://your-domain.com/api/v1/generations/7f3c91a2/outputs/pdf",
                expiresAt: "2026-03-27T18:12:04Z"
              }
            ]
          }
        }
      },
      "401": { description: "Missing or invalid account API key for an API-key-owned job" },
      "403": { description: "The provided API key does not own this job or lacks the required scope" },
      "402": { description: "The account tied to the API key does not have an active paid plan" },
      "404": { description: "Job not found" }
    }
  },

  // ── Outputs ────────────────────────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/generations/:jobId/outputs",
    summary: "List outputs for a job",
    description: "Returns all generated output files for the given job with format labels and download URLs. Requires the same account API key owner that created the job, with the `generations:read` scope. Account API access is limited to active paid plans.",
    pathParams: [
      { name: "jobId", type: "string", description: "The generation job ID" }
    ],
    responses: {
      "200": {
        description: "Array of output descriptors",
        body: [
          {
            format: "html",
            downloadUrl: "https://your-domain.com/api/v1/generations/7f3c91a2/outputs/html",
            expiresAt: "2026-03-27T18:12:04Z"
          },
          {
            format: "pdf",
            downloadUrl: "https://your-domain.com/api/v1/generations/7f3c91a2/outputs/pdf",
            expiresAt: "2026-03-27T18:12:04Z"
          }
        ]
      },
      "401": { description: "Missing or invalid account API key for an API-key-owned job" },
      "403": { description: "The provided API key does not own this job or lacks the required scope" },
      "402": { description: "The account tied to the API key does not have an active paid plan" }
    }
  },
  {
    method: "GET",
    path: "/api/v1/generations/:jobId/outputs/:format",
    summary: "Download a specific output",
    description: "Streams or redirects to the generated file for the specified format. Supported formats: `html`, `pdf`. API-key-owned jobs require the same account API key used to create them, with the `generations:read` scope. Account API access is limited to active paid plans.",
    pathParams: [
      { name: "jobId",  type: "string", description: "The generation job ID" },
      { name: "format", type: "string", description: "`html` or `pdf`" }
    ],
    responses: {
      "200": { description: "File content stream (or redirect to signed URL)" },
      "401": { description: "Missing or invalid account API key for an API-key-owned job" },
      "403": { description: "The provided API key does not own this job or lacks the required scope" },
      "402": { description: "The account tied to the API key does not have an active paid plan" },
      "404": { description: "Output not found or job not yet completed" }
    }
  }
];

// ─── Quick-start examples ─────────────────────────────────────────────────────

export const apiExamples = {
  // Classic generation request (used in earlier overview)
  generationRequest: {
    mode: "template_fill",
    templateSource: {
      type: "builtin",
      templateId: "offer_letter"
    },
    data: {
      candidate_name: "Rahul Nair",
      company_name: "Acme Labs",
      job_title: "Solution Architect",
      salary: "€120,000",
      start_date: "2026-04-01",
      manager_name: "Asha Menon"
    },
    outputs: ["html", "pdf"]
  },

  // Invoice generation
  invoiceRequest: {
    mode: "template_fill",
    templateSource: { type: "builtin", templateId: "invoice" },
    saveToMyFiles: true,
    data: {
      seller_name: "Acme Labs",
      seller_address: "12 Main St, Dublin, D01 AB12",
      seller_email: "billing@acmelabs.io",
      client_name: "Northstar Systems",
      client_address: "99 River Rd, London, EC1A 1BB",
      invoice_number: "INV-2048",
      invoice_date: "2026-03-27",
      due_date: "2026-04-10",
      line_items: "Web Design · 1 · 3500\nDevelopment · 40 hrs · 95",
      subtotal: 7300,
      tax_rate: 23,
      currency: "EUR",
      bank_details: "IBAN: IE12 AIBK 9311 5212 3456 78 · BIC: AIBKIE2D"
    },
    outputs: ["html", "pdf"]
  },

  // Inline template example
  inlineRequest: {
    mode: "template_fill",
    templateSource: {
      type: "inline",
      syntax: "handlebars",
      content: "<section><h1>Hello {{name}}</h1><p>Order {{order_id}} confirmed.</p></section>"
    },
    data: { name: "Rahul Nair", order_id: "ORD-9912" },
    outputs: ["html"]
  },

  // Completed job response shape
  jobCompletedResponse: {
    jobId: "7f3c91a2-1234-4bcd-abcd-1234567890ab",
    status: "completed",
    result: {
      outputs: [
        {
          format: "html",
          downloadUrl: "https://your-domain.com/api/v1/generations/7f3c91a2/outputs/html",
          expiresAt: "2026-03-27T18:12:04Z"
        },
        {
          format: "pdf",
          downloadUrl: "https://your-domain.com/api/v1/generations/7f3c91a2/outputs/pdf",
          expiresAt: "2026-03-27T18:12:04Z"
        }
      ]
    }
  }
};
