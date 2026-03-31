import { Suspense } from "react";
import { Header } from "@/components/header";
import { PaidFeatureNotice } from "@/components/paid-feature-notice";
import { CustomWorkspace } from "@/components/custom-workspace";
import { getAuthenticatedAccountAccess } from "@/server/account-access";

export default async function CustomWorkspacePage({
  searchParams
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const { hasPaidAccess } = await getAuthenticatedAccountAccess("/workspace/custom");

  return (
    <main className="pb-12">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      {hasPaidAccess ? (
        <CustomWorkspace initialSessionToken={s} />
      ) : (
        <PaidFeatureNotice
          feature="Draft from notes"
          title="Turn notes into polished documents with Pro."
          description="Draft from Notes is positioned as a higher-touch workflow with the richer editor, formatting cleanup, and reusable account context that make rough notes usable for final output."
          highlights={[
            "Draft in the full rich text editor instead of the basic template form.",
            "Turn raw notes, meeting summaries, or policy fragments into a finished document.",
            "Keep the advanced writing workflow in the account area instead of the anonymous starter flow."
          ]}
        />
      )}
    </main>
  );
}
