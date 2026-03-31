import { Suspense } from "react";
import type { Metadata } from "next";
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
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
