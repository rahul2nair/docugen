import { NextResponse } from "next/server";
import { POST as postByToken } from "@/app/api/v1/sessions/[token]/snapshots/[snapshotId]/restore/route";
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  const { snapshotId } = await params;
  const token = readWorkspaceSessionTokenFromRequest(request, { allowQueryParam: true });

  if (!token) {
    return missingSessionTokenResponse();
  }

  return postByToken(request, { params: Promise.resolve({ token, snapshotId }) });
}
