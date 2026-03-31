import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const redirectUrl = new URL(next, url.origin);

  if (!code) {
    redirectUrl.searchParams.set("auth", "missing-code");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      redirectUrl.searchParams.set("auth", "callback-error");
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.redirect(redirectUrl);
  } catch {
    redirectUrl.searchParams.set("auth", "callback-error");
    return NextResponse.redirect(redirectUrl);
  }
}