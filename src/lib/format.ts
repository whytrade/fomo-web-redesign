import { createContext, useContext } from "react";

/** Dollars said short: $16.25M, $1.73B, $865.4K, $412. */
export function usd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "-";
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 999_995_000) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 999_950) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 999.5) return `${sign}$${(a / 1e3).toFixed(1)}K`;
  return `${sign}$${a.toFixed(a < 10 ? 2 : 0)}`;
}

/** Dollars to the cent. */
export const cents = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** "+$1.2K" or "-$300". */
export const signed = (n: number) => (n >= 0 ? "+" : "-") + usd(Math.abs(n));

/** A share as a percent: "+12.4%", "-3%". */
export function pct(f: number) {
  const p = f * 100;
  return `${p >= 0 ? "+" : "-"}${Math.abs(p).toFixed(Math.abs(p) >= 100 ? 0 : 1)}%`;
}

/** A count said short: 8,421, 12.3K, 1.2M. */
export const count = (n: number | null | undefined) =>
  n == null ? "-" : n >= 999_500 ? `${+(n / 1e6).toFixed(1)}M` : n >= 9_950 ? `${+(n / 1e3).toFixed(1)}K` : n.toLocaleString("en-US");

/** A price per coin, as many places as it needs. */
export const price = (p: number) => `$${p < 0.01 ? p.toPrecision(3) : p < 1 ? p.toFixed(4) : p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "now", "3m", "2h", "5d". */
export function ago(t: number, now: number) {
  const s = Math.max(0, (now - t) / 1000);
  return s < 90 ? "now" : s < 3600 ? `${Math.round(s / 60)}m` : s < 86_400 ? `${Math.round(s / 3600)}h` : `${Math.round(s / 86_400)}d`;
}

/** A span of seconds, short: "40m", "6h", "3d". */
export function span(secs: number | null | undefined) {
  if (!secs) return null;
  return secs < 3600 ? `${Math.round(secs / 60)}m` : secs < 86_400 ? `${Math.round(secs / 3600)}h` : `${Math.round(secs / 86_400)}d`;
}

/** "Oct 2026". */
export const month = (t: number | string) => new Date(t).toLocaleDateString("en-US", { month: "short", year: "numeric" });

/**
 * The clock the kit reads times against. A live app leaves it alone; a fixed capture sets it to when the data
 * was read, so "2h" means two hours before the capture.
 */
export const NowContext = createContext<number | null>(null);
export const useNow = () => useContext(NowContext) ?? Date.now();
