import { Suspense } from "react";
import { Header } from "@/components/header";
import { Workspace } from "@/components/workspace";
import { builtinTemplates } from "@/server/templates";
import { renderBuiltinTemplatePreview } from "@/server/template-preview";

export default async function WorkspacePage({
  searchParams
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const templatePreviews = builtinTemplates.map((template) => ({
    id: template.id,
    html: renderBuiltinTemplatePreview(template)
  }));

  return (
    <main className="pb-12">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <Workspace templates={builtinTemplates} templatePreviews={templatePreviews} initialSessionToken={s} />
    </main>
  );
}
