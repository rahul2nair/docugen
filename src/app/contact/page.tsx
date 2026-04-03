import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

export default function ContactPage() {
  return (
    <main className="page-shell py-8">
      <section className="glass-panel p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Contact Us</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Use this form for support requests, billing questions, partnership inquiries, and data privacy requests.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <ContactForm />

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Helpful links</h2>
            <ul className="mt-3 space-y-2">
              <li><Link href="/terms" className="text-blue-700 hover:underline">Terms of service</Link></li>
              <li><Link href="/privacy" className="text-blue-700 hover:underline">Privacy policy</Link></li>
              <li><Link href="/api-limits" className="text-blue-700 hover:underline">API limits</Link></li>
              <li><Link href="/data-retention" className="text-blue-700 hover:underline">Data retention</Link></li>
              <li><Link href="/acceptable-use" className="text-blue-700 hover:underline">Acceptable use</Link></li>
              <li><Link href="/support" className="text-blue-700 hover:underline">Support & service levels</Link></li>
              <li><Link href="/refunds" className="text-blue-700 hover:underline">Refund & cancellation</Link></li>
              <li><Link href="/subprocessors" className="text-blue-700 hover:underline">Subprocessors</Link></li>
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
