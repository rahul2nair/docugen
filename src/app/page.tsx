import { Suspense } from "react";
import { AccessShowcase } from "@/components/access-showcase";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";

export default function HomePage() {
  return (
    <main className="pb-12">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <Hero />
      <Suspense fallback={null}>
        <AccessShowcase />
      </Suspense>
    </main>
  );
}
