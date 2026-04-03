import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { CookieConsent } from "@/components/cookie-consent";
import { Footer } from "@/components/footer";
import { getBillingAccountByOwnerKey, isActiveSubscriptionStatus } from "@/server/billing-store";
import { userOwnerKey } from "@/server/user-data-store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Templify",
  description: "Premium queue-based document generation platform"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const hasPaidAccess = user
    ? isActiveSubscriptionStatus((await getBillingAccountByOwnerKey(userOwnerKey(user.id)))?.subscriptionStatus)
    : false;

  return (
    <html lang="en">
      <body>
        <AppShell hasPaidAccess={hasPaidAccess}>
          {children}
          <Suspense fallback={null}>
            <Footer hasPaidAccess={hasPaidAccess} />
          </Suspense>
          <CookieConsent />
        </AppShell>
      </body>
    </html>
  );
}
