"use client";
import site from "@/data/site.json";

export default function Contact() {
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const msg = `Hello ${site.name},\n\n${f.get("message")}\n\n— ${f.get("name")} (${f.get("email")}${f.get("phone") ? ", " + f.get("phone") : ""})`;
    window.open(`https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  }
  return (
    <div className="page">
      <h1>Contact us</h1>
      <p className="muted">Connect with us for support, orders and salon enquiries.</p>
      <p>WhatsApp: <a className="link" href={`https://wa.me/${site.contact.whatsapp}`}>{site.contact.phone}</a><br />
        Email: <a className="link" href={`mailto:${site.contact.email}`}>{site.contact.email}</a><br />
        {site.contact.address}</p>
      <form onSubmit={submit} style={{ marginTop: 28 }}>
        <label className="field">Name *<input name="name" required /></label>
        <label className="field">Email *<input name="email" type="email" required /></label>
        <label className="field">Phone number<input name="phone" type="tel" /></label>
        <label className="field">Message<textarea name="message" rows={5} required /></label>
        <button className="btn btn-dark">Send</button>
      </form>
    </div>
  );
}
