import site from "@/data/site.json";
import Header, { Announcement } from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/Cart";
import { img } from "@/lib/img";

/** Storefront header, footer and cart. The portal under /admin does not use it. */
export default function ShopChrome({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Announcement messages={site.announcements} />
      <Header logo={img(site.logo)} name={site.name} nav={site.nav} />
      <main>{children}</main>
      <Footer />
    </CartProvider>
  );
}
