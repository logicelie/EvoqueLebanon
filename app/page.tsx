import Link from "next/link";
import site from "@/data/site.json";
import { getCollection, getProduct, productsByHandles } from "@/lib/catalog";
import { img } from "@/lib/img";
import ProductCard from "@/components/ProductCard";
import AddToCart from "@/components/AddToCart";
import { Countdown, Gallery } from "@/components/Bits";

export default function Home() {
  const h = site.home;
  const best = getCollection(h.bestSellersCollection)?.products ?? [];
  const featured = getProduct(h.featuredProduct);
  const look = productsByHandles(h.shopTheLook.products);
  const scroll = [...h.scrollingImages, ...h.scrollingImages];

  return (
    <>
      {/* Hero */}
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(h.hero.image)} alt="" />
        <div className="container">
          <div className="hero-inner">
            <div className="eyebrow">{h.hero.eyebrow}</div>
            <h1>{h.hero.title.map((t) => <span key={t} style={{ display: "block" }}>{t}</span>)}</h1>
            <p>{h.hero.text}</p>
            <div className="offers">
              {h.hero.offers.map((o) => <div key={o.big}><strong>{o.big}</strong><span>{o.small}</span></div>)}
            </div>
            <div className="eyebrow">Offer ends in</div>
            <Countdown to={h.hero.countdownTo} />
            <Link href={h.hero.cta.href} className="btn btn-light">{h.hero.cta.label}</Link>
            <div className="hero-foot">{h.hero.footnote}</div>
          </div>
        </div>
      </section>

      {/* Best sellers */}
      {best.length > 0 && (
        <section className="section container">
          <h2 className="sr-only">Best sellers</h2>
          <div className="rail">{best.map((p) => <ProductCard key={p.handle} p={p} showButton />)}</div>
        </section>
      )}

      {/* Hair quiz banner */}
      <section className="quiz">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(h.quizBanner.image)} alt="" />
        <div className="container">
          <div className="quiz-inner">
            <h2>{h.quizBanner.title}<br />{h.quizBanner.subtitle}</h2>
            <p>{h.quizBanner.text}</p>
            <Link href={h.quizBanner.cta.href} className="btn btn-dark">{h.quizBanner.cta.label}</Link>
          </div>
        </div>
      </section>

      {/* Scrolling product shots */}
      <div className="scroller" aria-hidden>
        <div className="scroller-track">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {scroll.map((s, i) => <img key={i} src={img(s, 400)} alt="" loading="lazy" />)}
        </div>
      </div>

      {/* Collection tiles */}
      <section className="section container">
        <div className="tiles">
          {h.collectionGallery.map((t) => (
            <Link key={t.href} href={t.href} className="tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(t.image, 800)} alt={`${t.pre} ${t.label}`} loading="lazy" />
              <div className="tile-text"><small>{t.pre}</small><strong>{t.label}</strong></div>
            </Link>
          ))}
        </div>
      </section>

      {/* Marquee */}
      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[...h.marquee, ...h.marquee, ...h.marquee, ...h.marquee].map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>

      {/* Featured product */}
      {featured && (
        <section className="section container">
          <h2 className="section-title">{h.featuredTitle}</h2>
          <p className="center muted caps small">Featured product</p>
          <div className="pdp" style={{ paddingTop: 16 }}>
            <Gallery images={featured.images.map((i) => img(i.src, 1000))} title={featured.title} />
            <div>
              <h3 style={{ fontSize: 28 }}><Link href={`/products/${featured.handle}`}>{featured.title}</Link></h3>
              <AddToCart handle={featured.handle} title={featured.title} image={img(featured.images[0]?.src, 200)} variants={featured.variants} optionName={featured.options[0]?.name} />
              <p><Link href={`/products/${featured.handle}`} className="link">View full details</Link></p>
            </div>
          </div>
        </section>
      )}

      {/* Shop the look */}
      {look.length > 0 && (
        <section className="section container">
          <h2 className="section-title">{h.shopTheLook.title}</h2>
          <p className="center muted" style={{ marginTop: -20, marginBottom: 32 }}>{h.shopTheLook.subtitle}</p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div className="tile" style={{ aspectRatio: "auto", minHeight: 320 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(h.shopTheLook.image, 900)} alt={h.shopTheLook.subtitle} loading="lazy" />
            </div>
            {look.map((p) => <ProductCard key={p.handle} p={p} showButton />)}
          </div>
        </section>
      )}

      {/* Image with text */}
      <section className="split">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(h.imageWithText.image)} alt="" loading="lazy" />
        <div className="split-text">
          <h2>{h.imageWithText.title}</h2>
          <Link href={h.imageWithText.cta.href} className="link caps small">{h.imageWithText.cta.label}</Link>
        </div>
      </section>

      {/* Instagram */}
      <section className="section container center">
        <h2 className="section-title" style={{ marginBottom: 8 }}>{h.instagram.title}</h2>
        <p className="muted">{h.instagram.text} <a href={site.contact.instagram} target="_blank" rel="noreferrer"><strong>{h.instagram.handle}</strong></a></p>
        <div className="tiles" style={{ marginTop: 28 }}>
          {h.instagram.images.map((s) => (
            <a key={s} href={site.contact.instagram} target="_blank" rel="noreferrer" className="tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(s, 600)} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
