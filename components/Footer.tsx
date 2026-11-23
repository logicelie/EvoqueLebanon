import Link from "next/link";
import site from "@/data/site.json";
import Newsletter from "./Newsletter";

export default function Footer() {
  const f = site.footer;
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <h4>Navigation</h4>
          {f.navigation.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </div>
        <div>
          <h4>Information</h4>
          {f.information.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </div>
        <div>
          <h4>Contact</h4>
          <a href={`https://wa.me/${site.contact.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp {site.contact.phone}</a>
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          <span>{site.contact.address}</span>
          <a href={site.contact.instagram} target="_blank" rel="noreferrer">Instagram</a>
        </div>
        <div>
          <h4>{f.newsletter.title}</h4>
          <p>{f.newsletter.text}</p>
          <Newsletter />
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {site.name}. Official Evoque Professional distributor in Lebanon.</span>
      </div>
    </footer>
  );
}
