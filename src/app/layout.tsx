import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gastos - Tracker de Gastos",
  description: "Trackea tus gastos mensuales automáticamente",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
