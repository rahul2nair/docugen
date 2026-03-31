import { NextResponse } from "next/server";
import { builtinTemplates } from "@/server/templates";

export async function GET() {
  return NextResponse.json(
    builtinTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      family: template.family || null,
      fields: template.fields,
      supportedOutputs: template.supportedOutputs
    }))
  );
}
