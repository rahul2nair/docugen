import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteGeneratedFileForOwner } from "@/server/my-files-store";
import { userOwnerKey } from "@/server/user-data-store";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in to manage My Files." } },
      { status: 401 }
    );
  }

  const deleted = await deleteGeneratedFileForOwner(userOwnerKey(user.id), fileId);

  if (!deleted) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "File not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ deletedId: deleted.id });
}