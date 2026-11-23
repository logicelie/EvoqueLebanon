import Link from "next/link";
import content from "@/data/content.json";

export const metadata = { title: "Hair Care Guide" };

const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export default function Blog() {
  return (
    <div className="container section">
      <h1 className="section-title">Hair Care Guide</h1>
      <div className="posts">
        {content.articles.map((a) => (
          <article key={a.handle} className="post-card">
            <span className="muted small caps">{fmt(a.date)}</span>
            <h3><Link href={`/blogs/hair-care-guide/${a.handle}`}>{a.title}</Link></h3>
            <p className="muted">{a.excerpt}</p>
            <Link className="link small caps" href={`/blogs/hair-care-guide/${a.handle}`}>Read more</Link>
          </article>
        ))}
      </div>
    </div>
  );
}
