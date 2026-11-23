import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page center">
      <h1>Page not found</h1>
      <p className="muted">The page you were looking for doesn’t exist.</p>
      <Link href="/collections/all" className="btn btn-dark">Shop all products</Link>
    </div>
  );
}
