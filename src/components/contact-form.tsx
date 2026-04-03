"use client";

import { FormEvent, useState } from "react";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const bodyLines = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      "",
      message,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");

    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines)}`;
    window.location.href = mailto;
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

      <p className="text-xs text-slate-500">
        Clicking &ldquo;Send message&rdquo; will open your email client with the message pre-filled.
      </p>

      <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">
        Send message
      </button>
    </form>
  );
}
