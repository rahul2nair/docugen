"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Server, Lock, CheckCircle, AlertCircle, Eye, EyeOff, Send, Trash2 } from "lucide-react";
import { MetallicButton, SecondaryButton } from "@/components/buttons";
import {
  deletePersistedSmtpSettings,
  loadPersistedSmtpSettings,
  savePersistedSmtpSettings,
  sendPersistedSmtpTest,
  type PersistedSmtpSettings
} from "@/lib/persisted-user-data-client";

interface SmtpConfig extends PersistedSmtpSettings {}

const defaultConfig: SmtpConfig = {
  host: "",
  port: "587",
  secure: false,
  username: "",
  password: "",
  fromName: "",
  fromEmail: ""
};

const PRESETS: Record<string, Partial<SmtpConfig>> = {
  custom: {},
  gmail: { host: "smtp.gmail.com", port: "587", secure: false },
  outlook: { host: "smtp-mail.outlook.com", port: "587", secure: false },
  ses: { host: "email-smtp.eu-west-1.amazonaws.com", port: "587", secure: false },
  mailgun: { host: "smtp.mailgun.org", port: "587", secure: false },
  sendgrid: { host: "smtp.sendgrid.net", port: "587", secure: false }
};

function InputField({
  label, id, value, onChange, type = "text", placeholder, hint
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-800">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={isPassword ? (show ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={isPassword ? "new-password" : "off"}
          className="w-full rounded-2xl border border-[#e4d9ca] bg-white px-4 py-2.5 pr-10 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-[#b8926a]/40"
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

export function SmtpSettings({
  sessionToken = "",
  sessionReady = false
}: {
  sessionToken?: string;
  sessionReady?: boolean;
}) {
  const [config, setConfig] = useState<SmtpConfig>(defaultConfig);
  const [preset, setPreset] = useState("custom");
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [testRecipient, setTestRecipient] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function hydrateSmtp() {
      const nextConfig = await loadPersistedSmtpSettings(sessionToken, defaultConfig);

      if (!cancelled) {
        setConfig(nextConfig);
      }
    }

    void hydrateSmtp();

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  const set = useCallback((key: keyof SmtpConfig, value: string | boolean) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setSaveMessage("");
    setTestStatus("idle");
    setTestError("");
  }, []);

  function applyPreset(name: string) {
    setPreset(name);
    const patch = PRESETS[name] ?? {};
    setConfig((current) => ({ ...current, ...patch }));
    setSaved(false);
    setSaveMessage("");
  }

  async function handleSave() {
    const result = await savePersistedSmtpSettings(sessionToken, config);
    setSaved(true);
    setSaveMessage(result.synced ? "Saved to this workspace session" : "Saved locally only");
    window.setTimeout(() => setSaved(false), 3000);
  }

  async function handleDelete() {
    const result = await deletePersistedSmtpSettings(sessionToken, defaultConfig);
    setConfig(defaultConfig);
    setSaved(false);
    setTestStatus("idle");
    setTestError("");
    setSaveMessage(result.synced ? "Removed from this workspace session" : "Cleared local SMTP settings");
  }

  async function handleTestSend() {
    if (!testRecipient.trim()) {
      return;
    }

    setTestStatus("sending");
    setTestError("");

    const result = await sendPersistedSmtpTest(sessionToken, testRecipient.trim());
    if (result.ok) {
      setTestStatus("ok");
      return;
    }

    setTestError(result.message);
    setTestStatus("error");
  }

  const isConfigured = config.host && config.username && config.fromEmail && config.password;

  return (
    <section className="page-shell pt-8">
      <div className="glass-panel mb-6 p-8">
        <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#8f6a44]">Email delivery</div>
        <h1 className="mt-2 text-3xl font-semibold text-ink-900">Send documents from your own email</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
          Only set this up if you want Templify to send finished documents on your behalf.
          If you only download documents manually, you can skip this section.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel space-y-6 p-8">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Server size={15} className="text-[#8f6a44]" /> Provider
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map((item) => (
                <button
                  key={item}
                  onClick={() => applyPreset(item)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    preset === item
                      ? "border-[#8f6a44] bg-[#8f6a44] text-white"
                      : "border-[#e4d9ca] bg-white text-ink-700 hover:border-[#8f6a44]"
                  }`}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Server size={15} className="text-[#8f6a44]" /> Server
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <InputField
                label="SMTP Host"
                id="smtp-host"
                value={config.host}
                onChange={(value) => set("host", value)}
                placeholder="smtp.example.com"
              />
              <div>
                <label htmlFor="smtp-port" className="mb-1 block text-sm font-medium text-ink-800">Port</label>
                <input
                  id="smtp-port"
                  type="number"
                  value={config.port}
                  onChange={(e) => set("port", e.target.value)}
                  className="w-24 rounded-2xl border border-[#e4d9ca] bg-white px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-[#b8926a]/40"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                id="smtp-secure"
                type="checkbox"
                checked={config.secure}
                onChange={(e) => set("secure", e.target.checked)}
                className="h-4 w-4 rounded border-[#e4d9ca] accent-[#8f6a44]"
              />
              <label htmlFor="smtp-secure" className="text-sm text-ink-700">
                Use SSL/TLS (port 465)
              </label>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Lock size={15} className="text-[#8f6a44]" /> Authentication
            </div>
            <div className="grid gap-4">
              <InputField
                label="Username / Email"
                id="smtp-user"
                value={config.username}
                onChange={(value) => set("username", value)}
                placeholder="you@example.com"
              />
              <InputField
                label="Password / App Password"
                id="smtp-pass"
                value={config.password}
                onChange={(value) => set("password", value)}
                type="password"
                hint="For Gmail, use an App Password, not your Google account password."
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Mail size={15} className="text-[#8f6a44]" /> Sender Identity
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="From Name"
                id="smtp-from-name"
                value={config.fromName}
                onChange={(value) => set("fromName", value)}
                placeholder="Acme Labs"
              />
              <InputField
                label="From Email"
                id="smtp-from-email"
                value={config.fromEmail}
                onChange={(value) => set("fromEmail", value)}
                type="email"
                placeholder="billing@acmelabs.io"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <MetallicButton
              onClick={handleSave}
              disabled={!sessionReady}
              className="px-6 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Settings
            </MetallicButton>
            <SecondaryButton onClick={handleDelete} className="px-5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2">
                <Trash2 size={14} /> Clear
              </span>
            </SecondaryButton>
            {saved ? (
              <span className="flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle size={14} /> {saveMessage || "Saved"}
              </span>
            ) : null}
            {!saved && saveMessage ? <span className="text-sm text-ink-600">{saveMessage}</span> : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel p-6">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Send size={14} className="text-[#8f6a44]" /> Send a test email
            </div>
            <p className="mb-4 text-xs text-ink-600">
              Verify the saved SMTP settings by sending a test message. Save your settings first.
            </p>
            <InputField
              label="Send test to"
              id="test-recipient"
              value={testRecipient}
              onChange={setTestRecipient}
              type="email"
              placeholder="you@example.com"
            />
            <button
              onClick={handleTestSend}
              disabled={!sessionReady || !isConfigured || testStatus === "sending" || !testRecipient.trim()}
              className="mt-3 w-full rounded-2xl border border-[#e4d9ca] bg-[#fcf8f2] px-4 py-2.5 text-sm font-medium text-ink-800 transition-colors hover:bg-[#f5ece0] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {testStatus === "sending" ? "Sending…" : "Send Test Email"}
            </button>
            {testStatus === "ok" ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle size={14} /> Test email sent successfully.
              </div>
            ) : null}
            {testStatus === "error" ? (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{testError || "Could not connect to SMTP server."}</span>
              </div>
            ) : null}
          </div>

          <div className="glass-panel p-6">
            <div className="mb-3 text-sm font-semibold text-ink-900">What email delivery enables</div>
            <ul className="space-y-2 text-sm text-ink-700">
              {[
                "Send generated invoices directly to clients",
                "Dispatch welcome emails on new sign-ups",
                "Automated payment reminders for overdue invoices",
                "Deliver project reports to stakeholders",
                "Batch-generate and email multiple recipients"
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle size={13} className="mt-0.5 shrink-0 text-[#8f6a44]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[20px] border border-[#eadfce] bg-[#fcf8f2] p-4 text-xs leading-6 text-ink-600">
            <strong className="text-ink-800">Privacy:</strong> SMTP credentials are stored per workspace session and the password is encrypted on the server before it is written to Supabase. This is user-configured mail transport for sending generated documents from the app on the user&apos;s behalf.
          </div>
        </div>
      </div>
    </section>
  );
}
