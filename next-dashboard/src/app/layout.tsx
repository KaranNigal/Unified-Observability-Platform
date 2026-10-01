import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Capsule — Multi-Tenant Unified Observability Platform",
  description: "Multi-tenant single-pane-of-glass observability platform for Airflow, PySpark, Microservices, and Kafka Trading pipelines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-text-main antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
