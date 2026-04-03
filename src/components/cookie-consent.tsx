"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ConsentLevel = "all" | "essential";

const CONSENT_KEY = "templify_cookie_consent_v1";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const existing = window.localStorage.getItem(CONSENT_KEY);
    if (!existing) {
      setVisible(true);
    }

    const openConsent = () => setVisible(true);
    window.addEventListener("templify:open-cookie-consent", openConsent);

    return () => {
      window.removeEventListener("templify:open-cookie-consent", openConsent);
    };
  }, []);

  const setConsent = (level: ConsentLevel) => {
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ level, ts: new Date().toISOString() })
    );
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
        <p className="text-sm leading-6 text-slate-700">
          We use cookies to run Templify securely and keep your session active. You can choose essential cookies only
          or allow all cookies. See our <Link href="/cookies" className="font-semibold text-blue-700 hover:underline">Cookie Policy</Link> for details.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => setConsent("essential")}
            type="button"
          >
            Essential only
          </button>
          <button
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={() => setConsent("all")}
            type="button"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
