import Link from "next/link";
import { notFound } from "next/navigation";
import content from "@/data/content.json";

type P = { params: Promise<{ handle: string }> };
const find = (h: string) => content.articles.find((a) => a.handle === h);

export function generateStaticParams() {
  return content.articles.map((a) => ({ handle: a.handle }));
}

export async function generateMetadata({ params }: P) {
  const a = find((await params).handle);
  return a ? { title: a.title, description: a.excerpt } : {};
}

export default async function Article({ params }: P) {
  const a = find((await params).handle);
  if (!a) notFound();
  const date = new Date(a.date + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  return (
    <article className="page page-wide">
      <p className="small muted caps"><Link href="/blogs/hair-care-guide">Hair Care Guide</Link> / {date}</p>
      <h1>{a.title}</h1>
      <div className="rte" dangerouslySetInnerHTML={{ __html: a.html }} />
    </article>
  );
}
