import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dipaste Admin — Panel Kontrol",
  description: "Panel admin Dipaste: maintenance, user, repository, verifikasi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
