import { NextResponse } from "next/server";
import { getBuiltinTemplate } from "@/server/templates";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  const template = getBuiltinTemplate(templateId);

  if (!template) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Template not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json(template);
}
