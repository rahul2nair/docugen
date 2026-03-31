import { NextResponse } from "next/server";
import { rotateSessionToken } from "@/server/session-store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const rotated = await rotateSessionToken(token);

  if (!rotated) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  return NextResponse.json(rotated);
}
