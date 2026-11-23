"use client";
import { useEffect, useState } from "react";

export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(to).getTime() - (now ?? 0));
  const parts = now == null ? [0, 0, 0, 0] : [86400000, 3600000, 60000, 1000].map((u, i, a) => Math.floor((diff % (a[i - 1] ?? Infinity)) / u));
  if (now != null && diff === 0) return null;
  return (
    <div className="countdown">
      {["Days", "Hours", "Min", "Sec"].map((l, i) => (
        <div key={l}><strong>{String(parts[i]).padStart(2, "0")}</strong><span>{l}</span></div>
      ))}
    </div>
  );
}

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="gallery-main" />;
  return (
    <div className="gallery">
      <div className="gallery-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={title} />
      </div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((src, k) => (
            <button key={src} className={k === i ? "on" : ""} onClick={() => setI(k)} aria-label={`Image ${k + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
