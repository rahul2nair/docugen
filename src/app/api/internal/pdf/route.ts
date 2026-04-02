import { NextResponse } from "next/server";
import { config } from "@/server/config";
import { renderHtmlToPdfLocal } from "@/server/pdf-local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const configuredToken = config.pdfRenderer.authToken.trim();
  if (!configuredToken) {
    return false;
  }

  const tokenHeader = request.headers.get("x-renderer-token")?.trim();
  const authHeader = request.headers.get("authorization")?.trim();
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const suppliedToken = tokenHeader || bearerToken;

  return suppliedToken === configuredToken;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid renderer token"
        }
      },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null) as {
    html?: string;
    options?: { format?: "A4" | "Letter"; margin?: "normal" | "narrow" };
  } | null;

  if (!body?.html || typeof body.html !== "string") {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "html is required"
        }
      },
      { status: 400 }
    );
  }

  try {
    const pdf = await renderHtmlToPdfLocal(body.html, body.options);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "PDF_RENDER_FAILED",
          message: error instanceof Error ? error.message : "Unable to render PDF"
        }
      },
      { status: 500 }
    );
  }
}