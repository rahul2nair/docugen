import Link from "next/link";

const showcaseDocuments = [
  {
    title: "Invoice",
    eyebrow: "2026A",
    accent: "from-slate-100 via-slate-50 to-white",
    corner: "bg-blue-600",
    body: "table",
    rotate: "lg:-rotate-6",
    shift: "lg:-translate-x-8 lg:translate-y-8",
    layer: "z-10"
  },
  {
    title: "Contract",
    eyebrow: "2025",
    accent: "from-white via-slate-50 to-slate-100",
    corner: "bg-slate-900",
    body: "paragraph",
    rotate: "lg:-rotate-2",
    shift: "lg:-translate-x-3 lg:translate-y-3",
    layer: "z-20"
  },
  {
    title: "Certificate",
    eyebrow: "Official",
    accent: "from-slate-50 via-white to-slate-100",
    corner: "bg-blue-600",
    body: "certificate",
    rotate: "lg:rotate-2",
    shift: "lg:translate-x-3 lg:-translate-y-1",
    layer: "z-30"
  },
  {
    title: "Letter",
    eyebrow: "Certificate",
    accent: "from-blue-50 via-white to-slate-100",
    corner: "bg-blue-600",
    body: "letter",
    rotate: "lg:rotate-6",
    shift: "lg:translate-x-8 lg:-translate-y-5",
    layer: "z-40"
  }
] as const;

function DocumentMockup({
  title,
  eyebrow,
  accent,
  corner,
  body
}: {
  title: string;
  eyebrow: string;
  accent: string;
  corner: string;
  body: "table" | "paragraph" | "certificate" | "letter";
}) {
  return (
    <div className={`relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br ${accent} p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)]`}>
      <div className="relative h-[300px] overflow-hidden rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.07)] sm:h-[330px]">
        <div className={`absolute right-0 top-0 h-12 w-12 rounded-bl-[24px] ${corner} opacity-95`} />
        <div className="text-center text-[9px] font-semibold uppercase tracking-[0.38em] text-slate-300">{eyebrow}</div>
        <div className="mt-4 text-center text-[28px] font-semibold uppercase tracking-[-0.04em] text-slate-950">{title}</div>

        {body === "table" && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="grid grid-cols-4 gap-2 border-b border-slate-200 pb-2 text-[10px] font-semibold text-slate-500">
              <span>Name</span>
              <span>Hours</span>
              <span>Rate</span>
              <span>Total</span>
            </div>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="mt-2 grid grid-cols-4 gap-2 text-[10px] text-slate-400">
                <div className="h-2 rounded bg-slate-200" />
                <div className="h-2 rounded bg-slate-100" />
                <div className="h-2 rounded bg-slate-100" />
                <div className="h-2 rounded bg-slate-200" />
              </div>
            ))}
            <div className="mt-3 h-2.5 w-24 rounded bg-blue-200" />
          </div>
        )}

        {body === "paragraph" && (
          <div className="mt-7 space-y-3 px-2">
            <div className="h-2.5 w-1/3 rounded bg-slate-300" />
            <div className="h-2 w-1/5 rounded bg-blue-200" />
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={`h-2 rounded bg-slate-100 ${index === 5 ? "w-3/4" : "w-full"}`} />
            ))}
          </div>
        )}

        {body === "certificate" && (
          <div className="mt-6 space-y-3 px-1">
            <div className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-600">Verified</div>
            <div className="h-2.5 w-2/3 rounded bg-slate-300" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`h-2 rounded bg-slate-100 ${index === 3 ? "w-4/5" : "w-full"}`} />
            ))}
            <div className="pt-4">
              <div className="h-8 w-24 rounded-tl-[18px] bg-blue-600" />
            </div>
          </div>
        )}

        {body === "letter" && (
          <div className="mt-5 space-y-3 px-1">
            <div className="h-10 rounded-b-[20px] rounded-tl-[20px] bg-blue-600" />
            <div className="h-2.5 w-1/2 rounded bg-slate-300" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`h-2 rounded bg-slate-100 ${index === 3 ? "w-2/3" : "w-full"}`} />
            ))}
            <div className="h-2 w-16 rounded bg-blue-200" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(244,247,252,0.95)_42%,rgba(236,242,252,0.92)_100%)] pb-14">
      <section className="page-shell py-8 sm:py-10 lg:py-12">
        <div className="overflow-hidden rounded-[40px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.95)_100%)] px-6 py-8 shadow-[0_35px_90px_rgba(15,23,42,0.10)] sm:px-10 sm:py-10 lg:px-14 lg:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.07em] text-slate-950 sm:text-5xl lg:text-[4.4rem] lg:leading-[0.95]">
              Create Professional Documents in Seconds
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Free templates, instant PDF generation, no sign-up needed.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/workspace"
                className="metal-button rounded-2xl px-6 py-4 text-base font-semibold text-white transition hover:brightness-105"
              >
                Start Generating for Free
              </Link>
            </div>
          </div>

          <div className="mt-14">
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:justify-center lg:overflow-visible lg:pb-0">
              {showcaseDocuments.map((document, index) => (
                <div
                  key={document.title}
                  className={`snap-center shrink-0 basis-[86%] sm:basis-[320px] lg:basis-[300px] ${index === 0 ? "" : "lg:-ml-24"} ${document.layer} ${document.rotate} ${document.shift} transition-transform duration-300 hover:-translate-y-1`}
                >
                <DocumentMockup
                  title={document.title}
                  eyebrow={document.eyebrow}
                  accent={document.accent}
                  corner={document.corner}
                  body={document.body}
                />
              </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
