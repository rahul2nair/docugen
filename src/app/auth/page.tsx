import { Suspense } from "react";
import { AuthPanel } from "@/components/auth-panel";

export default function AuthPage() {
  return (
    <main className="pb-16">
      <Suspense fallback={null}>
        <AuthPanel />
      </Suspense>
    </main>
  );
}