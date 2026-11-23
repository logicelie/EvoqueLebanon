"use client";
import { useState } from "react";

/** Front-end only. Hook `onSubmit` up to your email tool (Klaviyo, Mailchimp, a Next.js route…). */
export default function Newsletter() {
  const [done, setDone] = useState(false);
  if (done) return <p>Thanks for subscribing!</p>;
  return (
    <form className="newsletter" onSubmit={(e) => { e.preventDefault(); setDone(true); }}>
      <input type="email" required placeholder="Email" aria-label="Email" />
      <button className="btn btn-light">Subscribe</button>
    </form>
  );
}
