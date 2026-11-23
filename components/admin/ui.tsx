import { PAYMENTS, STATUSES, Status } from "@/lib/shop";

const PATHS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z",
  orders: "M6 2h9l5 5v15H6V2Zm9 0v5h5M9 13h8M9 17h8M9 9h3",
  box: "M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8",
  chart: "M4 20V10M10 20V4M16 20v-7M21 20H3",
  users: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 20v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  user: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  plus: "M12 5v14M5 12h14",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
};

export function Icon({ name, size = 20 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export const StatusPill = ({ s }: { s: Status }) => <span className={`pill ${s}`}>{STATUSES[s]}</span>;
export const PaidPill = ({ paid, method }: { paid: boolean; method: keyof typeof PAYMENTS }) => (
  <span className={`pill ${paid ? "paid" : "unpaid"}`}>{paid ? `Paid · ${PAYMENTS[method]}` : `Not paid · ${PAYMENTS[method]}`}</span>
);

/** Shows ?error= and ?ok= messages that server actions redirect back with. */
export function Flash({ sp }: { sp: { error?: string; ok?: string } }) {
  if (sp.error) return <div className="note err" role="alert">{sp.error}</div>;
  if (sp.ok) return <div className="note good" role="status">{sp.ok}</div>;
  return null;
}

const TZ = "Asia/Beirut";
export const fmtDateTime = (d: Date | string) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
export const fmtDate = (d: Date | string) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
/** Today's date in Lebanon as YYYY-MM-DD. */
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
