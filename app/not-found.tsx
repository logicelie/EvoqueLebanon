import Link from "next/link";
import ShopChrome from "@/components/ShopChrome";

export default function NotFound() {
  return (
    <ShopChrome>
      <div className="page center">
        <h1>Page not found</h1>
        <p className="muted">The page you were looking for doesn’t exist.</p>
        <Link href="/collections/all" className="btn btn-dark">Shop all products</Link>
      </div>
    </ShopChrome>
  );
}
