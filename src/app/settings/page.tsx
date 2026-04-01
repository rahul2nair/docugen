import { Suspense } from "react";
import { PaidFeatureNotice } from "@/components/paid-feature-notice";
import { SettingsConsole } from "@/components/settings-console";
import { getAuthenticatedAccountAccess } from "@/server/account-access";

export default async function SettingsPage() {
  const { hasPaidAccess } = await getAuthenticatedAccountAccess("/settings");

  return (
    <main className="pb-16">
      {hasPaidAccess ? (
        <Suspense fallback={null}>
          <SettingsConsole />
        </Suspense>
      ) : (
        <PaidFeatureNotice
          feature="Delivery settings and account integrations"
          title="SMTP, API keys, and account delivery settings are part of Pro."
          description="These controls only matter once an account is actively operationalizing document delivery or connecting another system, so they now follow the paid plan instead of the default account tier."
          highlights={[
            "Create and manage account API keys for backend use.",
            "Configure outbound email delivery with SMTP settings.",
            "Keep advanced account configuration tied to active paid workspaces."
          ]}
        />
      )}
    </main>
  );
}
