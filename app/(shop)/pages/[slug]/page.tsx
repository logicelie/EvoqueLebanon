import { notFound } from "next/navigation";
import pages from "@/data/pages.json";
import site from "@/data/site.json";
import content from "@/data/content.json";

type Page = {
  title: string; html?: string; description?: string; body?: string[]; intro?: string;
  sections?: { heading: string; text: string }[];
  stats?: { big: string; small: string }[];
  paths?: { num: string; tag: string; title: string; text: string; cta: string }[];
};
const guides = content.pages as Record<string, { title: string; description: string; html: string }>;
const all: Record<string, Page> = { ...(pages as Record<string, Page>) };
for (const [slug, g] of Object.entries(guides)) all[slug] = { title: g.title.split(" | ")[0], html: g.html, description: g.description };

export function generateStaticParams() {
  return Object.keys(all).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = all[(await params).slug];
  return p ? { title: p.title, description: p.description } : {};
}

export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = all[(await params).slug];
  if (!p) notFound();
  return (
    <div className={p.html ? "page page-wide" : "page"} style={p.paths ? { maxWidth: 1100 } : undefined}>
      <h1>{p.title}</h1>
      {p.html && <div className="rte" dangerouslySetInnerHTML={{ __html: p.html }} />}
      {p.intro && <p className="muted">{p.intro}</p>}
      {p.body?.map((t, i) => <p key={i}>{t}</p>)}
      {p.sections?.map((s) => (
        <div key={s.heading}><h3 style={{ marginTop: 28 }}>{s.heading}</h3><p>{s.text}</p></div>
      ))}
      {p.stats && (
        <div className="stats">{p.stats.map((s) => <div key={s.small}><strong>{s.big}</strong><span className="muted small">{s.small}</span></div>)}</div>
      )}
      {p.paths && (
        <div className="paths">
          {p.paths.map((x) => (
            <div key={x.num} className="path">
              <span className="muted small caps">{x.num} — {x.tag}</span>
              <h3>{x.title}</h3>
              <p>{x.text}</p>
              <a className="btn btn-dark" href={`https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(`Hello, I'm interested in: ${x.title}`)}`} target="_blank" rel="noreferrer">{x.cta}</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
