"use client";
import Link from "next/link";
import { useState } from "react";

type Rec = { name: string; href: string; why: string };
const RECS: Record<string, Rec> = {
  scalp: { name: "Scalp Recovery", href: "/collections/evoque-anti-hair-loss-dandruff", why: "Purifies the scalp and helps reduce shedding and flaking." },
  plex: { name: "Plex", href: "/collections/plex-line", why: "Bond-building repair for bleached and very processed hair." },
  blonde: { name: "Flawless Blonde", href: "/collections/evoque-flawless-blonde-purple-shampoo-hair-care-series", why: "Purple pigments neutralise brassiness in blonde, silver and platinum hair." },
  color: { name: "Healthy Care (Non-Ammonia)", href: "/collections/evoque-non-ammonia", why: "Gentle care that helps colour last longer." },
  keratin: { name: "Smart Keratin", href: "/collections/evoque-smart-keratin", why: "Keratin smoothing for frizz control and shine." },
  milk: { name: "Milk Therapy", href: "/collections/evoque-milk-therapy", why: "Deep hydration for dry, thirsty hair." },
  macadamia: { name: "Macadamia", href: "/collections/macademia-series", why: "Rich oils and masks for thick, curly hair." },
  miracle: { name: "Miracle Touch", href: "/collections/miracle-touch", why: "All-in-one leave-ins for every hair type." },
};

const QUESTIONS: { q: string; a: [string, string][] }[] = [
  { q: "What is your main hair concern?", a: [["Hair loss or dandruff", "scalp"], ["Breakage from bleaching", "plex"], ["Frizz", "keratin"], ["Dryness", "milk"], ["Dull colour", "color"]] },
  { q: "How would you describe your hair?", a: [["Fine / straight", "miracle"], ["Wavy", "keratin"], ["Thick / curly", "macadamia"], ["Blonde, silver or platinum", "blonde"]] },
  { q: "Is your hair colour-treated?", a: [["Yes, bleached", "plex"], ["Yes, dyed", "color"], ["No", "miracle"]] },
  { q: "How does your scalp feel?", a: [["Oily or itchy", "scalp"], ["Dry", "milk"], ["Balanced", "miracle"]] },
];

export default function HairQuiz() {
  const [step, setStep] = useState(0);
  const [votes, setVotes] = useState<string[]>([]);
  const done = step >= QUESTIONS.length;
  const pick = (k: string) => { setVotes([...votes, k]); setStep(step + 1); };
  const tally = votes.reduce<Record<string, number>>((a, k, i) => ({ ...a, [k]: (a[k] ?? 0) + (i === 0 ? 2 : 1) }), {});
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => RECS[k]);

  return (
    <div className="page">
      <h1>Find your routine</h1>
      <p className="muted">Answer a few questions and we’ll match you with your Evoque routine.</p>
      <div className="quiz-card">
        <div className="progress"><div style={{ width: `${(Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100}%` }} /></div>
        {!done ? (
          <>
            <span className="muted small">Question {step + 1} of {QUESTIONS.length}</span>
            <h3 style={{ marginTop: 8 }}>{QUESTIONS[step].q}</h3>
            <div className="quiz-opts">
              {QUESTIONS[step].a.map(([label, key]) => <button key={label} onClick={() => pick(key)}>{label}</button>)}
            </div>
          </>
        ) : (
          <>
            <h3>Your Evoque routine</h3>
            {top.map((r) => (
              <div key={r.name} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
                <strong>{r.name}</strong>
                <p className="muted small" style={{ margin: "4px 0 10px" }}>{r.why}</p>
                <Link href={r.href} className="btn btn-dark btn-sm">Shop {r.name}</Link>
              </div>
            ))}
            <button className="link" onClick={() => { setStep(0); setVotes([]); }}>Retake the quiz</button>
          </>
        )}
      </div>
    </div>
  );
}
