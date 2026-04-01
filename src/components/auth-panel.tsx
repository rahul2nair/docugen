"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { MetallicButton, SecondaryButton } from "@/components/buttons";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

function buildSignupEmailMetadata(origin: string, nextPath: string, email: string) {
  const normalizedNextPath = nextPath.startsWith("/") ? nextPath : "/dashboard";

  return {
    app_name: "Templify",
    email_type: "confirm_signup",
    email_heading: "Confirm your signup",
    email_cta_label: "Confirm email",
    next_path: normalizedNextPath,
    dashboard_url: `${origin}${normalizedNextPath}`,
    user_email: email
  };
}

export function AuthPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get("next")?.trim() || "/dashboard";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatus("");

    try {
      const supabase = createClient();

      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (signInError) {
          throw signInError;
        }

        router.replace(nextPath);
        router.refresh();
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;
      const signupEmailMetadata = buildSignupEmailMetadata(
        window.location.origin,
        nextPath,
        email.trim()
      );

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: signupEmailMetadata
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setStatus("Account created. Check your email to confirm your address, then come back and sign in.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to authenticate.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-shell pt-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel relative overflow-hidden p-8 lg:p-10">
          <div className="absolute inset-x-8 top-0 h-36 rounded-b-[100px] bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.65),transparent_72%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-medium text-slate-700">
              <KeyRound size={14} /> Supabase Auth
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">Sign in to start Pro or manage billing.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Create an account or sign in with email and password. Free document creation stays available in the workspace. Sign-in is used when you want to start a Pro trial, subscribe directly, or manage billing.
            </p>
            <div className="mt-8 space-y-3 text-sm text-slate-700">
              <div className="rounded-3xl border border-slate-200 bg-white p-4">Email/password login backed by Supabase cookies.</div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4">Confirmation link support via the auth callback route.</div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4">Pro trial and paid checkout begin after sign-in so saved files and billing stay tied to one account.</div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 lg:p-10">
          <div className="flex gap-2 rounded-full border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setMode("sign-in")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "sign-in" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("sign-up")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "sign-up" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              Create account
            </button>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-slate-800">Email</label>
              <div className="relative">
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-slate-800">Password</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                placeholder="At least 6 characters"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {status ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</div> : null}
            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="flex flex-wrap items-center gap-3">
              <MetallicButton className="px-6 py-3" disabled={submitting}>
                {submitting ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
                <ArrowRight className="ml-2" size={16} />
              </MetallicButton>
              <Link href="/">
                <SecondaryButton type="button">Back home</SecondaryButton>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}