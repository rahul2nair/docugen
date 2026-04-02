import { Suspense } from "react";
import { BatchGenerator } from "@/components/batch-generator";
import { PaidFeatureNotice } from "@/components/paid-feature-notice";
import { getAuthenticatedAccountAccess } from "@/server/account-access";
import { builtinTemplates } from "@/server/templates";
import { renderBuiltinTemplatePreview } from "@/server/template-preview";

export default async function BatchPage({
  searchParams
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const { hasPaidAccess } = await getAuthenticatedAccountAccess("/workspace/batch");
  const templatePreviews = builtinTemplates.map((template) => ({
    id: template.id,
    html: renderBuiltinTemplatePreview(template)
  }));

  return (
    <main className="pb-12">
      {hasPaidAccess ? (
        <BatchGenerator templates={builtinTemplates} templatePreviews={templatePreviews} initialSessionToken={s} hasPaidAccess={hasPaidAccess} />
      ) : (
        <PaidFeatureNotice
          feature="Batch generation"
          title="Run high-volume document jobs with Pro."
          description="Batch generation is where document ops starts to create real queue, storage, and support cost, so it is now tied to the active Stripe-backed plan instead of being open by default."
          highlights={[
            "Generate many documents from one structured input set.",
            "Use the queue-backed workflow for repeated finance, HR, or operations jobs.",
            "Keep bulk processing isolated to signed-in accounts with paid access."
          ]}
        />
      )}
    </main>
  );
}
