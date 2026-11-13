import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn, FOCUS } from "./lib/cn";
import { pct, price, usd } from "./lib/format";
import { SPRING } from "./lib/motion";
import { Face, Logo, ON } from "./parts";
import type { Perp, Token } from "./types";

/*
  The column pulled wide is FOMO's Discover. The rows are the same rows: the column is a container, and each column
  of figures shows from the width it fits at, so the rows gain columns under the hand. A column's head sorts by it.
*/

/** Token rows, in FOMO's Discover order: token, market cap, age, 24H change, 24H volume, holders, then the newest thesis. */
const TOKEN_GRID =
  "grid-cols-[30px_minmax(0,1fr)_auto] gap-x-2.5 @[544px]:grid-cols-[30px_minmax(0,220px)_112px_96px_112px_minmax(0,1fr)] @[544px]:gap-x-4 @[736px]:grid-cols-[30px_minmax(0,220px)_112px_56px_96px_104px_104px_minmax(0,1fr)] @[1280px]:grid-cols-[30px_minmax(0,240px)_132px_72px_112px_124px_124px_minmax(0,1fr)] @[1280px]:gap-x-6";
/** Perp rows: market, price; then 24H change and volume; then open interest and funding. Wide, they share the width. */
const PERP_GRID =
  "grid-cols-[30px_minmax(0,1fr)_auto] gap-x-2.5 @[544px]:grid-cols-[30px_minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] @[544px]:gap-x-4 @[736px]:grid-cols-[30px_minmax(0,1.6fr)_repeat(5,minmax(0,1fr))] @[1280px]:gap-x-6";
/** Under the main figure only while narrow: the day's move, before it has a column of its own. */
const NARROW_ONLY = "@[544px]:hidden";
/** Cells that show from a width on, fading in as they arrive. */
const SHOWS = {
  mid: "hidden @[544px]:block starting:opacity-0 transition-opacity duration-200",
  more: "hidden @[736px]:block starting:opacity-0 transition-opacity duration-200",
  // set well apart from the figures, so no number reads as the thesis's
  thesis: "hidden @[960px]:flex pl-10 starting:opacity-0 transition-opacity duration-200",
};
const HEAD_SHOWS = { mid: "hidden @[544px]:flex", more: "hidden @[736px]:flex" };
/** The heads take no height while the column is narrow, and open as it gets wide enough for figures. */
const HEADS = "grid h-0 shrink-0 items-center overflow-hidden px-2.5 text-note font-medium text-ink-3 opacity-0 transition-[height,opacity] duration-200 @[544px]:h-8 @[544px]:opacity-100";

/** Which column the rows are sorted by and which way; null is FOMO's own order. */
export type Sort<K extends string> = { key: K; down: boolean } | null;
export type TokenKey = "mcap" | "age" | "change" | "volume" | "holders";
export type PerpKey = "price" | "change" | "volume" | "oi" | "funding";

/** The rows in the sort's order; a row with nothing for that column goes last either way. */
export function sorted<R, K extends string>(rows: R[], sort: Sort<K>, of: (r: R, k: K) => number | null | undefined): R[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const x = of(a, sort.key);
    const y = of(b, sort.key);
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
    return sort.down ? y - x : x - y;
  });
}
export const tokenFigure = (t: Token, k: TokenKey, now: number) => (k === "holders" ? (t.fomoHolders ?? t.holders) : k === "age" ? (t.born ? now - t.born : null) : t[k]);

/** A column's head: press it to sort highest first, again for lowest first, a third time for FOMO's order. Lit when sorted. */
function Head<K extends string>({ k, sort, onSort, className, children }: { k: K; sort: Sort<K>; onSort: (s: Sort<K>) => void; className?: string; children: ReactNode }) {
  const on = sort?.key === k;
  return (
    <button
      type="button"
      onClick={() => onSort(!on ? { key: k, down: true } : sort.down ? { key: k, down: false } : null)}
      aria-sort={on ? (sort.down ? "descending" : "ascending") : undefined}
      title={on ? (sort.down ? "Sorted highest first" : "Sorted lowest first") : "Sort by this"}
      className={cn("-mr-1.5 h-7 min-w-0 items-center justify-end gap-1 rounded-[8px] px-1.5", on ? "bg-white/10 font-bold text-ink shadow-[inset_0_0_0_1px_rgb(203_208_235/0.12)]" : "hover:bg-white/5 hover:text-ink-2", FOCUS, className ?? "flex")}
    >
      <span className="truncate">{children}</span>
      <ChevronRight size={12} className={cn("shrink-0 transition-[transform,opacity]", on ? "opacity-100" : "opacity-0", on && !sort.down ? "-rotate-90" : "rotate-90")} />
    </button>
  );
}

/** A figure over what it's made of. */
function Two({ top, under, className }: { top: ReactNode; under?: ReactNode; className?: string }) {
  return (
    <span className={cn("min-w-0 text-right tnum", className)}>
      <b className="block truncate text-chip font-bold">{top}</b>
      {under != null && <span className="block truncate text-caption font-medium text-ink-3">{under}</span>}
    </span>
  );
}

const tone = (x: number | null | undefined) => (x == null ? "text-ink-3" : x >= 0 ? "text-up" : "text-down");
const dash = "-";
/** "19h", "4w", "3mo": how old, the way FOMO's Discover says it. */
function age(born: number | undefined, now: number) {
  if (!born) return null;
  const h = (now - born) / 3_600_000;
  return h < 24 ? `${Math.max(1, Math.round(h))}h` : h < 24 * 7 ? `${Math.round(h / 24)}d` : h < 24 * 30 ? `${Math.round(h / 168)}w` : `${Math.round(h / 720)}mo`;
}
/** Holders the way FOMO's Discover says them: 602, 8.8K, 92K, 1.2M. */
const kilo = (n: number | null | undefined) => (n == null ? dash : n >= 999_500 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${+(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
/** funding an hour, short: 0.0013% */
const rate = (f: number) => `${+(Math.abs(f) * 100).toPrecision(2)}%`;

export function TokenHeads({ sort, onSort }: { sort: Sort<TokenKey>; onSort: (s: Sort<TokenKey>) => void }) {
  return (
    <div className={cn(HEADS, TOKEN_GRID)}>
      <span className="col-span-2">Token</span>
      <Head k="mcap" sort={sort} onSort={onSort}>
        Market cap
      </Head>
      <Head k="age" sort={sort} onSort={onSort} className={HEAD_SHOWS.more}>
        Age
      </Head>
      <Head k="change" sort={sort} onSort={onSort} className={HEAD_SHOWS.mid}>
        24H change
      </Head>
      <Head k="volume" sort={sort} onSort={onSort} className={HEAD_SHOWS.mid}>
        24H volume
      </Head>
      <Head k="holders" sort={sort} onSort={onSort} className={HEAD_SHOWS.more}>
        Holders
      </Head>
      <span className={SHOWS.thesis}>Latest thesis</span>
    </div>
  );
}

/** Lit while its token is on the chart. A row the host can't open keeps its look and doesn't press. */
export function TokenRow({ t, on, can, now, onOpen, onThesis }: { t: Token; on: boolean; can: boolean; now: number; onOpen: () => void; onThesis: () => void }) {
  const said = t.said;
  return (
    <motion.div
      layout="position"
      transition={SPRING.glide}
      role={can ? "button" : undefined}
      tabIndex={can ? 0 : undefined}
      aria-label={can ? `Open ${t.symbol}` : undefined}
      aria-current={on || undefined}
      title={can ? undefined : "Not open here: this sample has no chart for it"}
      onClick={can ? onOpen : undefined}
      onKeyDown={can ? (e) => e.key === "Enter" && onOpen() : undefined}
      className={cn("relative grid h-12 items-center rounded-[12px] px-2.5", TOKEN_GRID, on ? ON : can && "hover:bg-white/5", can && FOCUS)}
    >
      {on && <i className="absolute top-3 bottom-3 left-0 w-[3px] rounded-r-[2px] bg-fomo" />}
      {/* a token the host can't open keeps its figures and its look */}
      <Logo token={t} size={30} />
      <span className="min-w-0">
        <b className="block truncate text-chip font-bold">{t.symbol}</b>
        <span className="block truncate text-caption font-medium text-ink-3">{t.name}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <b className="flex items-baseline gap-1 text-chip font-bold whitespace-nowrap tnum">
          {t.mcap != null ? usd(t.mcap) : dash}
          <span className="text-caption text-ink-3">MC</span>
        </b>
        {t.change != null && (
          <span className={cn("flex items-baseline gap-1 text-caption font-bold tnum", NARROW_ONLY, tone(t.change))}>
            {pct(t.change)}
            <span className="font-medium text-ink-3">24H</span>
          </span>
        )}
      </span>
      <Two className={SHOWS.more} top={t.age ?? age(t.born, now) ?? dash} />
      <span className={cn("text-right text-chip font-bold tnum", SHOWS.mid, tone(t.change))}>{t.change != null ? pct(t.change) : dash}</span>
      <Two className={SHOWS.mid} top={t.volume != null ? usd(t.volume) : dash} />
      <Two className={SHOWS.more} top={kilo(t.fomoHolders ?? t.holders)} under={t.fomoHolders != null && t.holders != null ? `${kilo(t.holders)} total` : undefined} />
      {said ? (
        <span className={cn("min-w-0 items-center gap-2", SHOWS.thesis)}>
          <Face person={said.person} size={22} />
          <b className="shrink-0 text-chip font-bold text-ink-2">{said.person.name || said.person.handle}</b>
          <button
            type="button"
            disabled={!can}
            onClick={(e) => {
              e.stopPropagation();
              onThesis();
            }}
            title={said.text}
            className={cn("min-w-0 truncate rounded-[6px] text-left text-chip font-medium text-ink-2", can && "hover:text-ink hover:underline", FOCUS)}
          >
            {said.text.replace(/\s+/g, " ")}
          </button>
        </span>
      ) : (
        <span className={SHOWS.thesis} />
      )}
    </motion.div>
  );
}

export function PerpHeads({ sort, onSort }: { sort: Sort<PerpKey>; onSort: (s: Sort<PerpKey>) => void }) {
  return (
    <div className={cn(HEADS, PERP_GRID)}>
      <span className="col-span-2">Market</span>
      <Head k="price" sort={sort} onSort={onSort}>
        Price
      </Head>
      <Head k="change" sort={sort} onSort={onSort} className={HEAD_SHOWS.mid}>
        24H change
      </Head>
      <Head k="volume" sort={sort} onSort={onSort} className={HEAD_SHOWS.mid}>
        24H volume
      </Head>
      <Head k="oi" sort={sort} onSort={onSort} className={HEAD_SHOWS.more}>
        Open interest
      </Head>
      <Head k="funding" sort={sort} onSort={onSort} className={HEAD_SHOWS.more}>
        Funding an hour
      </Head>
    </div>
  );
}

/** A perp market. It presses only if the host can open perps. */
export function PerpRow({ p, onOpen }: { p: Perp; onOpen?: () => void }) {
  return (
    <motion.div
      layout="position"
      transition={SPRING.glide}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={onOpen ? (e) => e.key === "Enter" && onOpen() : undefined}
      className={cn("grid h-12 items-center rounded-[12px] px-2.5", PERP_GRID, onOpen && cn("hover:bg-white/5", FOCUS))}
    >
      <Logo token={{ symbol: p.name, logo: `https://app.hyperliquid.xyz/coins/${p.name}.svg` }} size={30} />
      <span className="flex min-w-0 items-baseline gap-1.5">
        <b className="truncate text-chip font-bold">{p.name}</b>
        <span className="shrink-0 rounded-[6px] bg-white/7 px-1 text-micro font-bold text-ink-2 tnum" title="Most leverage">
          {p.maxLeverage}x
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <b className="text-chip font-bold tnum">{p.price != null ? price(p.price) : dash}</b>
        {p.change != null && <span className={cn("text-caption font-bold tnum", NARROW_ONLY, tone(p.change))}>{pct(p.change)}</span>}
      </span>
      <span className={cn("text-right text-chip font-bold tnum", SHOWS.mid, tone(p.change))}>{p.change != null ? pct(p.change) : dash}</span>
      <Two className={SHOWS.mid} top={p.volume != null ? usd(p.volume) : dash} />
      <Two className={SHOWS.more} top={p.oi != null ? usd(p.oi) : dash} />
      <Two className={SHOWS.more} top={p.funding != null ? rate(p.funding) : dash} under={p.funding == null ? undefined : p.funding > 0 ? "longs pay shorts" : p.funding < 0 ? "shorts pay longs" : "no one pays"} />
    </motion.div>
  );
}
