"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitMessage(null);
    setSubmitError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          company: company.trim() || undefined,
          subject,
          message
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const fallback = response.status === 503
          ? "Contact service is not configured yet. Please try again later."
          : "Unable to send your message right now. Please try again shortly.";
        throw new Error(payload?.error?.message || fallback);
      }

      setSubmitMessage("Message sent. We will get back to you by email.");
      setName("");
      setEmail("");
      setCompany("");
      setSubject("");
      setMessage("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to send your message right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Name
          <input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm text-slate-700">
          Email
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
      </div>

      <label className="block text-sm text-slate-700">
        Company (optional)
        <input value={company} onChange={(event) => setCompany(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>

      <label className="block text-sm text-slate-700">
        Subject
        <input required value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>

      <label className="block text-sm text-slate-700">
        Message
        <textarea required rows={6} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>

      {submitMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {submitMessage}
        </p>
      ) : null}

      {submitError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {submitError}
        </p>
      ) : null}

      <button disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
        {submitting ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
