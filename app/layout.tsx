import type { Metadata } from "next";
import "./globals.css";
import site from "@/data/site.json";
import Header, { Announcement } from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/Cart";
import { img } from "@/lib/img";

export const metadata: Metadata = {
  title: { default: `${site.name} | Professional Salon Hair Care`, template: `%s | ${site.name}` },
  description: "Official Evoque Professional hair care in Lebanon. Salon-grade, sulfate free shampoos, masks, leave-ins and styling, delivered across Lebanon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <CartProvider>
          <Announcement messages={site.announcements} />
          <Header logo={img(site.logo)} name={site.name} nav={site.nav} />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
