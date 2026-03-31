import { Suspense } from "react";
import { Header } from "@/components/header";
import { AuthPanel } from "@/components/auth-panel";

export default function AuthPage() {
  return (
    <main className="pb-16">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <Suspense fallback={null}>
        <AuthPanel />
      </Suspense>
    </main>
  );
}