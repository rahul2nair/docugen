export default function ApiLimitsPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel max-w-4xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">API Limits</h1>
        <p className="mt-3 text-sm text-slate-600">Last updated: 2026-04-03</p>
        <div className="prose mt-6 max-w-none text-slate-700">
          <p>
            This page documents the rate limits and quotas applied to Templify API calls. Limits help ensure fair
            access and system stability. If limits are insufficient for your use case, contact support.
          </p>

          <h2>API key rate limits</h2>
          <p>
            Authenticated API calls (generation, output retrieval) are governed by the scopes granted to your API key.
          </p>
          <ul>
            <li><strong>Write operations:</strong> 120 per 60 seconds (e.g., POST /api/v1/generations)</li>
            <li><strong>Read operations:</strong> 600 per 60 seconds (e.g., GET /api/v1/generations/&lt;id&gt;/outputs)</li>
          </ul>

          <h2>Batch generation limits</h2>
          <ul>
            <li><strong>Max rows per batch:</strong> Limited by plan and queue capacity</li>
            <li><strong>Cost per row:</strong> One API write consumed per row in the batch</li>
            <li><strong>Concurrent batches:</strong> Limited to prevent queue overflow</li>
          </ul>

          <h2>Session-based limits</h2>
          <p>
            Anonymous and authenticated users working from the web interface operate under session-based quotas.
          </p>
          <ul>
            <li><strong>Free plan:</strong> 10 generations per day</li>
            <li><strong>Paid plan:</strong> 20 generations per day</li>
            <li><strong>Read operations:</strong> 240 per 60 seconds per session</li>
            <li><strong>Write operations:</strong> 30 per 900 seconds per anonymous session</li>
          </ul>

          <h2>Session creation limits</h2>
          <ul>
            <li><strong>Maximum:</strong> 10 new sessions per 15 minutes from a single IP</li>
            <li><strong>Purpose:</strong> Prevents automated session spawning and abuse</li>
          </ul>

          <h2>IP-level safety limits</h2>
          <ul>
            <li><strong>Maximum:</strong> 240 requests per 60 seconds from a single IP</li>
            <li><strong>Note:</strong> This is a safety valve that catches abuse across all protocols</li>
          </ul>

          <h2>Request timeout & size limits</h2>
          <ul>
            <li><strong>Request body:</strong> 10 MB maximum</li>
            <li><strong>HTML rendering:</strong> 45 seconds per document</li>
            <li><strong>PDF generation:</strong> 45 seconds per document</li>
          </ul>

          <h2>Response headers</h2>
          <p>
            Rate limit information is included in response headers so you can track your usage programmatically:
          </p>
          <ul>
            <li><code>X-RateLimit-Limit</code> — Maximum requests in the window</li>
            <li><code>X-RateLimit-Remaining</code> — Remaining requests in the current window</li>
            <li><code>X-RateLimit-Reset</code> — Unix timestamp when the window resets</li>
          </ul>

          <h2>Exceeding limits</h2>
          <p>
            When you exceed a rate limit, you receive a 429 Too Many Requests response. Retry after the window resets
            or implement exponential backoff in your client code. Persistent abuse may result in API key suspension.
          </p>

          <h2>Higher limits</h2>
          <p>
            If you require higher limits for legitimate use (e.g., high-volume document generation), contact support
            with details about your use case. We may adjust limits on a per-API-key basis.
          </p>
        </div>
      </section>
    </main>
  );
}
