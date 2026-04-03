import type { BuiltinTemplate, BuiltinTemplatePreview } from "@/server/templates";

function toTitleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export function TemplateShowcase({
  templates,
  previews
}: {
  templates: BuiltinTemplate[];
  previews: BuiltinTemplatePreview[];
}) {
  const previewMap = new Map(previews.map((preview) => [preview.id, preview.html]));
  const familyCounts = templates.reduce<Map<string, number>>((accumulator, template) => {
    if (!template.family) {
      return accumulator;
    }

    accumulator.set(template.family, (accumulator.get(template.family) || 0) + 1);
    return accumulator;
  }, new Map());
  const categoryGroups = templates.reduce<Map<string, BuiltinTemplate[]>>((accumulator, template) => {
    const group = accumulator.get(template.category) || [];
    group.push(template);
    accumulator.set(template.category, group);
    return accumulator;
  }, new Map());
  const orderedCategories = Array.from(categoryGroups.entries()).sort(([left], [right]) => left.localeCompare(right));

  return (
    <section id="templates" className="page-shell pt-10 pb-14">
      <div className="glass-panel p-6">
        <div className="mb-5">
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-blue-700">Built-in templates</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            Ready-made document types — pick one and fill in the details.
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            These are Templify&apos;s built-in templates. They cover common use cases across HR, Finance, Legal, and more. Your own saved templates are available inside the workspace.
          </p>
        </div>

        <div className="grid gap-8">
          {orderedCategories.map(([category, categoryTemplates]) => (
            <section key={category} className="grid gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{category}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{categoryTemplates.length} templates</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categoryTemplates.map((template) => {
                  const familyCount = template.family ? familyCounts.get(template.family) || 0 : 0;

                  return (
                    <div key={template.id} className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
                      <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
                        <iframe
                          title={`${template.name} preview`}
                          srcDoc={previewMap.get(template.id) || ""}
                          className="h-[220px] w-full border-0 bg-white"
                          sandbox=""
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-blue-700">
                        <span>{template.category}</span>
                        {template.family && familyCount > 1 ? (
                          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            {toTitleCase(template.family)} variant
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 text-lg font-semibold text-slate-900">{template.name}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{template.description}</div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {template.fields.slice(0, 4).map((field) => (
                          <span
                            key={field.key}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                          >
                            {field.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
