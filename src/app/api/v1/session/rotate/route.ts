import { NextResponse } from "next/server";
import { POST as postByToken } from "@/app/api/v1/sessions/[token]/rotate/route";
import { applyWorkspaceSessionCookie, readWorkspaceSessionTokenFromRequest } from "@/server/workspace-session-cookie";

function missingSessionTokenResponse() {
  return NextResponse.json(
    {
      error: {
        code: "UNAUTHORIZED",
        message: "A workspace session token is required"
      }
    },
    { status: 401 }
  );
}

export async function POST(request: Request) {
  const token = readWorkspaceSessionTokenFromRequest(request, { allowQueryParam: true });

  if (!token) {
    return missingSessionTokenResponse();
  }

  const response = await postByToken(request, { params: Promise.resolve({ token }) });

  if (response.ok) {
    const payload = await response.clone().json().catch(() => null) as { token?: string } | null;
    if (payload?.token) {
      applyWorkspaceSessionCookie(response, payload.token);
    }
  }

  return response;
}
