import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Templify",
  description: "Premium queue-based document generation platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          {children}
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        </AppShell>
      </body>
    </html>
  );
}
