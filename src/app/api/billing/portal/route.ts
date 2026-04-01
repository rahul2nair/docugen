import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBillingAccountByOwnerKey } from "@/server/billing-store";
import { config } from "@/server/config";
import { getStripe, isStripeConfigured } from "@/server/stripe";
import { userOwnerKey } from "@/server/user-data-store";

function resolveAppOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedHost) {
    const protocol = forwardedProto || "https";
    return `${protocol}://${forwardedHost}`;
  }

  const host = request.headers.get("host")?.split(",")[0]?.trim();
  if (host) {
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  try {
    const url = new URL(request.url);
    return url.origin;
  } catch {
    return config.appUrl;
  }
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: { message: "Stripe billing portal is not configured" } }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { message: "Sign in to manage billing" } }, { status: 401 });
  }

  const billing = await getBillingAccountByOwnerKey(userOwnerKey(user.id));

  if (!billing?.stripeCustomerId) {
    return NextResponse.json({ error: { message: "No Stripe customer exists for this account yet" } }, { status: 400 });
  }

  const appOrigin = resolveAppOrigin(request);

  const session = await getStripe().billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: `${appOrigin}/billing`
  });

  return NextResponse.json({ url: session.url });
}