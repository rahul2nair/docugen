import { Suspense } from "react";
import { TemplateShowcase } from "@/components/template-showcase";
import { builtinTemplates } from "@/server/templates";
import { renderBuiltinTemplatePreview } from "@/server/template-preview";

export default function TemplatesPage() {
  const previews = builtinTemplates.map((template) => ({
    id: template.id,
    html: renderBuiltinTemplatePreview(template)
  }));

  return (
    <main className="pb-12">
      <TemplateShowcase templates={builtinTemplates} previews={previews} />
    </main>
  );
}
