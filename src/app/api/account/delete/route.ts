import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBillingAccountByOwnerKey } from "@/server/billing-store";
import { prisma } from "@/server/prisma";
import { config } from "@/server/config";
import { purgeGeneratedFilesForOwner } from "@/server/my-files-store";
import { getStripe, isStripeConfigured } from "@/server/stripe";
import { getSupabaseAdminClient } from "@/server/supabase";
import { userOwnerKey } from "@/server/user-data-store";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in is required"
        }
      },
      { status: 401 }
    );
  }

  const ownerKey = userOwnerKey(user.id);
  const billing = await getBillingAccountByOwnerKey(ownerKey);

  if (billing?.stripeSubscriptionId && isStripeConfigured() && config.stripe.secretKey) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(billing.stripeSubscriptionId);
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "SUBSCRIPTION_CANCEL_FAILED",
            message: "Unable to cancel active subscription. Please retry or contact support."
          }
        },
        { status: 502 }
      );
    }
  }

  try {
    await purgeGeneratedFilesForOwner(ownerKey);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "FILE_PURGE_FAILED",
          message: "Unable to remove stored files. Please retry account deletion."
        }
      },
      { status: 502 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.userTemplate.deleteMany({ where: { ownerKey } });
    await tx.userApiKey.deleteMany({ where: { ownerKey } });
    await tx.userSmtpSettings.deleteMany({ where: { ownerKey } });
    await tx.userProfile.deleteMany({ where: { ownerKey } });

    await tx.$executeRaw`
      DELETE FROM user_billing_accounts
      WHERE owner_session_id = ${ownerKey}
    `;
  });

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error: {
          code: "SUPABASE_ADMIN_NOT_CONFIGURED",
          message: "Account deletion is not available right now. Contact support."
        }
      },
      { status: 503 }
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json(
      {
        error: {
          code: "USER_DELETE_FAILED",
          message: "Unable to delete authentication profile. Contact support to complete deletion."
        }
      },
      { status: 502 }
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
