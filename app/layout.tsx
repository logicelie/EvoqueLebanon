import type { Metadata, Viewport } from "next";
import "./globals.css";
import site from "@/data/site.json";

export const metadata: Metadata = {
  title: { default: `${site.name} | Professional Salon Hair Care`, template: `%s | ${site.name}` },
  description: "Official Evoque Professional hair care in Lebanon. Salon-grade, sulfate free shampoos, masks, leave-ins and styling, delivered across Lebanon.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
