import { cache } from "react";
import { Workspace } from "@/components/workspace";
import { builtinTemplates } from "@/server/templates";
import { renderBuiltinTemplatePreview } from "@/server/template-preview";

const getTemplatePreviews = cache(() =>
  builtinTemplates.map((template) => ({
    id: template.id,
    html: renderBuiltinTemplatePreview(template)
  }))
);

export default async function WorkspacePage({
  searchParams
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const templatePreviews = getTemplatePreviews();

  return (
    <main className="pb-12">
      <Workspace templates={builtinTemplates} templatePreviews={templatePreviews} initialSessionToken={s} />
    </main>
  );
}
