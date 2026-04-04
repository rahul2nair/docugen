import { NextResponse } from "next/server";
import { GET as getByToken, POST as postByToken, DELETE as deleteByToken } from "@/app/api/v1/sessions/[token]/api-keys/route";
import { readWorkspaceSessionTokenFromRequest } from "@/server/workspace-session-cookie";

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

  return getByToken(request, { params: Promise.resolve({ token }) });
}

export async function POST(request: Request) {
  const token = readWorkspaceSessionTokenFromRequest(request, { allowQueryParam: true });

  if (!token) {
    return missingSessionTokenResponse();
  }

  return postByToken(request, { params: Promise.resolve({ token }) });
}

export async function DELETE(request: Request) {
  const token = readWorkspaceSessionTokenFromRequest(request, { allowQueryParam: true });

  if (!token) {
    return missingSessionTokenResponse();
  }

  return deleteByToken(request, { params: Promise.resolve({ token }) });
}
