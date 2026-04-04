import { NextResponse } from "next/server";
import { GET as getByToken, PATCH as patchByToken } from "@/app/api/v1/sessions/[token]/route";
import { readWorkspaceSessionTokenFromRequest, applyWorkspaceSessionCookie } from "@/server/workspace-session-cookie";

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

export async function GET(request: Request) {
  const token = readWorkspaceSessionTokenFromRequest(request, { allowQueryParam: true });

  if (!token) {
    return missingSessionTokenResponse();
  }

  const response = await getByToken(request, { params: Promise.resolve({ token }) });
  if (response.ok) {
    applyWorkspaceSessionCookie(response, token);
  }
  return response;
}

export async function PATCH(request: Request) {
  const token = readWorkspaceSessionTokenFromRequest(request, { allowQueryParam: true });

  if (!token) {
    return missingSessionTokenResponse();
  }

  const response = await patchByToken(request, { params: Promise.resolve({ token }) });
  if (response.ok) {
    applyWorkspaceSessionCookie(response, token);
  }
  return response;
}
