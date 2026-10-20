import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "rooms-platform",
  description:
    "Gestión de alquiler por habitaciones: candidatos, selección e inquilinos en un solo sitio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
