"use client";

import { useEffect, useState } from "react";
import { apiKeyScopeLabels, apiKeyScopes, defaultApiKeyScopes, type ApiKeyScope } from "@/lib/api-key-scopes";
import { Copy, History, KeyRound, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { MetallicButton, SecondaryButton } from "@/components/buttons";
import {
  createPersistedApiKey,
  deletePersistedApiKey,
  loadPersistedApiKeys,
  type PersistedApiKey
} from "@/lib/persisted-user-data-client";

interface Props {
  sessionToken: string;
  sessionReady: boolean;
  sessionError: string;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function ApiKeySettings({ sessionToken, sessionReady, sessionError }: Props) {
  const [storedKeys, setStoredKeys] = useState<PersistedApiKey[]>([]);
  const [revokedKeys, setRevokedKeys] = useState<PersistedApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [generatedKey, setGeneratedKey] = useState<{ id: string; apiKey: string } | null>(null);
  const [label, setLabel] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([...defaultApiKeyScopes]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateApiKeys() {
      if (!sessionToken.trim()) {
        setStoredKeys([]);
        return;
      }

      setIsLoading(true);
      const nextKeys = await loadPersistedApiKeys(sessionToken);

      if (!cancelled) {
        setStoredKeys(nextKeys.apiKeys);
        setRevokedKeys(nextKeys.revokedApiKeys);
        setIsLoading(false);
      }
    }

    void hydrateApiKeys();

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  async function handleGenerate() {
    setIsSaving(true);
    setMessage("");
    setGeneratedKey(null);

    const result = await createPersistedApiKey(sessionToken, selectedScopes, label.trim() || undefined);
    const nextKeys = await loadPersistedApiKeys(sessionToken);

    setStoredKeys(nextKeys.apiKeys);
    setRevokedKeys(nextKeys.revokedApiKeys);
    setIsSaving(false);

    if (result.synced && result.apiKey) {
      setGeneratedKey({ id: result.apiKey.id, apiKey: result.apiKey.apiKey });
      setLabel("");
      setMessage("Generated a new account API key. Copy it now because it will not be shown again.");
      return;
    }

    setMessage("Unable to generate an account API key.");
  }

  async function handleDelete(keyId: string) {
    setDeletingKeyId(keyId);
    setMessage("");

    const result = await deletePersistedApiKey(sessionToken, keyId);

    if (result.synced) {
      const nextKeys = await loadPersistedApiKeys(sessionToken);
      setStoredKeys(nextKeys.apiKeys);
      setRevokedKeys(nextKeys.revokedApiKeys);
      setMessage(`Revoked API key ${keyId}.`);
    } else {
      setMessage(`Unable to revoke API key ${keyId}.`);
    }

    setDeletingKeyId(null);
  }

  function toggleScope(scope: ApiKeyScope) {
    setSelectedScopes((current) => {
      if (current.includes(scope)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((item) => item !== scope);
      }

      return [...current, scope];
    });
  }

  async function handleCopyGeneratedKey() {
    if (!generatedKey?.apiKey || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(generatedKey.apiKey);
    setMessage(`Copied ${generatedKey.id} to clipboard.`);
  }

  const activeKeyCount = storedKeys.length;
  const revokedKeyCount = revokedKeys.length;
  const recentlyUsedCount = storedKeys.filter((item) => item.lastUsedAt).length;
  const selectedScopeLabels = selectedScopes.map((scope) => apiKeyScopeLabels[scope].title);

  function AuditDetails({ item }: { item: PersistedApiKey }) {
    return (
      <details className="mt-3 rounded-2xl border border-[#dbe4f0] bg-[#f8fafc] px-4 py-3">
        <summary className="cursor-pointer list-none text-sm font-medium text-slate-800">
          <span className="inline-flex items-center gap-2"><History size={14} /> Audit details</span>
        </summary>
        <div className="mt-3 space-y-2 text-xs leading-6 text-slate-600">
          {item.createdBy ? <div>Created by: <span className="font-medium text-slate-800">{item.createdBy}</span></div> : null}
          <div>Last used IP: <span className="font-medium text-slate-800">{item.lastUsedIp || "Unknown"}</span></div>
          <div>Last used agent: <span className="font-medium text-slate-800">{item.lastUsedUserAgent || "Unknown"}</span></div>
          {item.revokedAt ? <div>Revoked at: <span className="font-medium text-slate-800">{formatUpdatedAt(item.revokedAt)}</span></div> : null}
          <div className="pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Ownership history</div>
          <div className="space-y-2">
            {item.ownershipHistory.length === 0 ? (
              <div>No ownership history recorded.</div>
            ) : (
              item.ownershipHistory.map((entry, index) => (
                <div key={`${item.id}-${entry.changedAt}-${index}`} className="rounded-xl border border-[#e4d9ca] bg-white px-3 py-2">
                  <div className="font-medium capitalize text-slate-800">{entry.action}</div>
                  <div>Owner: {entry.ownerKey}</div>
                  {entry.actor ? <div>Actor: {entry.actor}</div> : null}
                  <div>When: {formatUpdatedAt(entry.changedAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </details>
    );
  }

  return (
    <section className="page-shell pt-6">
      <div className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(150deg,#ffffff_0%,#f4f8ff_55%,#eef4fb_100%)] p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] lg:p-8">
        <div className="absolute inset-x-10 top-0 h-36 rounded-b-[120px] bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.62),transparent_74%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#2563eb]">Integrations</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">API key control room</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Issue keys for backend services, automation flows, and partner systems. Scope each key tightly,
                inspect its audit trail, and revoke it as soon as the integration changes hands.
              </p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/85 px-4 py-3 text-xs text-slate-600 shadow-sm">
              Workspace status: {sessionReady ? "ready" : "preparing..."}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-white/90 px-5 py-4 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Active keys</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{activeKeyCount}</div>
              <div className="mt-1 text-sm text-slate-500">Keys currently allowed to access your account.</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white/90 px-5 py-4 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Recently used</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{recentlyUsedCount}</div>
              <div className="mt-1 text-sm text-slate-500">Keys with recorded usage activity.</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white/90 px-5 py-4 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Revoked archive</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{revokedKeyCount}</div>
              <div className="mt-1 text-sm text-slate-500">Retained for audit visibility after removal.</div>
            </div>
          </div>

          {sessionError ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {sessionError}
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-slate-950 px-5 py-5 text-sm leading-7 text-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200">
                  <ShieldCheck size={14} /> Integration note
                </div>
                <div className="mt-3">
                  Use the generated key with the <strong>Authorization</strong> header as <strong>Bearer &lt;api-key&gt;</strong>
                  or the <strong>x-api-key</strong> header. Keep scopes narrow and issue separate keys for production,
                  staging, and one-off partner access.
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Issue new key</div>
                    <div className="mt-2 text-xl font-semibold text-slate-950">Create a tightly-scoped credential</div>
                    <div className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                      Label the integration, choose only the scopes it needs, generate once, and hand it off securely.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    Selected scopes: {selectedScopeLabels.length ? selectedScopeLabels.join(", ") : "None"}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="mb-1 block text-sm font-medium text-slate-800" htmlFor="api-key-label">Label</label>
                  <input
                    id="api-key-label"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="Backend worker, staging integration, finance service"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="mt-2 text-xs text-slate-500">Optional. Useful for ownership and audit history when multiple integrations exist.</p>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Scope matrix</div>
                <div className="mt-2 text-xs leading-6 text-slate-500">Grant the smallest set of permissions your integration needs.</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {apiKeyScopes.map((scope) => {
                    const isSelected = selectedScopes.includes(scope);

                    return (
                      <label
                        key={scope}
                        className={`flex items-start gap-3 rounded-[22px] border px-4 py-4 transition ${
                          isSelected
                            ? "border-blue-200 bg-blue-50/80 shadow-sm"
                            : "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white"
                        }`}
                      >
                        <input
                          checked={isSelected}
                          className="mt-1"
                          onChange={() => toggleScope(scope)}
                          type="checkbox"
                        />
                        <span>
                          <span className="block text-sm font-medium text-slate-900">{apiKeyScopeLabels[scope].title}</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">{apiKeyScopeLabels[scope].description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {generatedKey ? (
                <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/60 px-5 py-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">New API key created</div>
                  <div className="mt-1 text-xs text-slate-500">Copy this value now. For security reasons it will not be shown again.</div>
                  <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-emerald-100 break-all">
                    {generatedKey.apiKey}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <SecondaryButton onClick={handleCopyGeneratedKey} className="px-4 py-2 text-sm">
                      <span className="inline-flex items-center gap-2"><Copy size={14} /> Copy key</span>
                    </SecondaryButton>
                    <span className="text-xs text-slate-500">Key ID: {generatedKey.id}</span>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <MetallicButton
                  onClick={handleGenerate}
                  disabled={!sessionReady || isSaving || selectedScopes.length === 0}
                  className="px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Generating key..." : "Generate API key"}
                </MetallicButton>
                {message ? <span className="text-sm text-slate-600">{message}</span> : null}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white/92 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck size={16} className="text-[#2563eb]" /> Key ledger
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                  {activeKeyCount} active / {revokedKeyCount} revoked
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <LoaderCircle size={15} className="animate-spin" /> Loading saved keys...
                  </div>
                ) : null}

                {!isLoading && storedKeys.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                    No account API keys generated yet.
                  </div>
                ) : null}

                {storedKeys.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <KeyRound size={14} className="text-[#2563eb]" /> {item.id}
                        </div>
                        {item.label ? <div className="mt-1 text-sm text-slate-700">{item.label}</div> : null}
                        <div className="mt-1 text-sm text-slate-600">{item.keyHint}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.scopes.map((scope) => (
                            <span key={scope} className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
                              {scope}
                            </span>
                          ))}
                        </div>
                        {item.createdBy ? <div className="mt-2 text-xs text-slate-500">Created by {item.createdBy}</div> : null}
                        <div className="mt-1 text-xs text-slate-500">Created {formatUpdatedAt(item.createdAt)}</div>
                        <div className="mt-1 text-xs text-slate-500">Updated {formatUpdatedAt(item.updatedAt)}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.lastUsedAt ? `Last used ${formatUpdatedAt(item.lastUsedAt)}` : "Last used: never"}</div>
                        <AuditDetails item={item} />
                      </div>
                      <SecondaryButton
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingKeyId === item.id}
                        className="px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Trash2 size={14} />
                          {deletingKeyId === item.id ? "Revoking..." : "Revoke"}
                        </span>
                      </SecondaryButton>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <History size={16} className="text-[#2563eb]" /> Revoked API keys
                </div>
                <div className="mt-4 space-y-3">
                  {!isLoading && revokedKeys.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                      No revoked API keys yet.
                    </div>
                  ) : null}

                  {revokedKeys.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white/70 px-4 py-4 opacity-85">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <KeyRound size={14} className="text-[#2563eb]" /> {item.id}
                          </div>
                          {item.label ? <div className="mt-1 text-sm text-slate-700">{item.label}</div> : null}
                          <div className="mt-1 text-sm text-slate-600">{item.keyHint}</div>
                          <div className="mt-1 text-xs text-slate-500">Revoked {item.revokedAt ? formatUpdatedAt(item.revokedAt) : ""}</div>
                          <AuditDetails item={item} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}