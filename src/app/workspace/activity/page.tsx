import { Suspense } from "react";
import { Header } from "@/components/header";
import { WorkspaceActivity } from "@/components/workspace-activity";

export default async function WorkspaceActivityPage({
  searchParams
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;

  return (
    <main className="pb-12">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <WorkspaceActivity initialSessionToken={s} />
    </main>
  );
}
