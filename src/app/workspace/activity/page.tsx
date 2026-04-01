import { Suspense } from "react";
import { WorkspaceActivity } from "@/components/workspace-activity";

export default async function WorkspaceActivityPage({
  searchParams
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;

  return (
    <main className="pb-12">
      <WorkspaceActivity initialSessionToken={s} />
    </main>
  );
}
