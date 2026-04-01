import { Suspense } from "react";
import Link from "next/link";
import { FolderOpen, Sparkles } from "lucide-react";
import { MyFilesLibrary } from "@/components/my-files-library";
import { PaidFeatureNotice } from "@/components/paid-feature-notice";
import { getAuthenticatedAccountAccess } from "@/server/account-access";
import { config } from "@/server/config";
import { listGeneratedFilesByOwnerKey } from "@/server/user-data-store";

export default async function MyFilesPage() {
  const { ownerKey, hasPaidAccess } = await getAuthenticatedAccountAccess("/my-files");

  if (!hasPaidAccess) {
    return (
      <main className="pb-16">
        <PaidFeatureNotice
          feature="Saved files and document history"
          title="Save and reopen generated documents with Pro."
          description="Free use stays ephemeral. Pro and trial accounts can keep generated files in My Files, reopen them later, and download them again during the retention window."
          highlights={[
            `Stored file history for ${config.myFilesRetentionDays} days`,
            "A dedicated My Files library tied to your account",
            "The same saved-output access available during trial and paid Pro"
          ]}
        />
      </main>
    );
  }

  const files = await listGeneratedFilesByOwnerKey(ownerKey, { limit: 100 });

  return (
    <main className="pb-16">
      <section className="page-shell pt-8">
        <div className="glass-panel relative overflow-hidden p-8 lg:p-10">
          <div className="absolute inset-x-8 top-0 h-36 rounded-b-[100px] bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.52),transparent_72%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                <FolderOpen size={14} /> My Files
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">Your saved generated documents.</h1>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Files created while on Pro or trial are stored for {config.myFilesRetentionDays} days so you can reopen and download them again without re-running the workflow.
              </p>
            </div>
            <Link href="/workspace" className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
              <Sparkles size={16} className="mr-2" /> Create another document
            </Link>
          </div>
        </div>

        <MyFilesLibrary initialFiles={files} />
      </section>
    </main>
  );
}