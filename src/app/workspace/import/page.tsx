import { Suspense } from "react";
import { Header } from "@/components/header";
import { PaidFeatureNotice } from "@/components/paid-feature-notice";
import { TemplateImporter } from "@/components/template-importer";
import { getAuthenticatedAccountAccess } from "@/server/account-access";

export default async function ImportTemplatePage({
  searchParams
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const { hasPaidAccess } = await getAuthenticatedAccountAccess("/workspace/import");

  return (
    <main className="pb-12">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      {hasPaidAccess ? (
        <TemplateImporter initialSessionToken={s} />
      ) : (
        <PaidFeatureNotice
          feature="Template import"
          title="Import and save your own templates with Pro."
          description="Custom imports are one of the most reusable parts of the product, so they now sit behind the paid plan rather than in the default free flow."
          highlights={[
            "Convert an existing document into a reusable template.",
            "Keep imported templates in your saved library for repeated use.",
            "Use advanced field detection and cleanup without leaving the account workspace."
          ]}
        />
      )}
    </main>
  );
}
