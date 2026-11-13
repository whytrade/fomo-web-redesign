import { useEffect, useMemo, useRef, useState } from "react";
import { animate, AnimatePresence, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { Search, X } from "lucide-react";
import { cn, FOCUS } from "./lib/cn";
import { count, useNow } from "./lib/format";
import { SPRING, SWAP } from "./lib/motion";
import { PerpHeads, PerpRow, sorted, TokenHeads, tokenFigure, TokenRow, type PerpKey, type Sort, type TokenKey } from "./ColumnWide";
import { Feed } from "./Feed";
import { Leaderboard } from "./Leaderboard";
import { Face, Logo, ON, Tabs } from "./parts";
import type { BoardSpan, Perp, Person, Post, Ranked, Token } from "./types";

/*
  FOMO's top bar and discovery panel folded into one slim column on the left: the wordmark, one search for tokens
  and traders, and four faces (Tokens, Perps, Leaderboard, Feed). Its right edge is a handle with three rests:
  - drag it left and the column folds to a rail of pictures, so the chart gets the room;
  - drag it right and the Tokens or Perps list grows across the sheet into FOMO's Discover table, the same rows
    gaining columns as the width allows, while the chart's sheet slides out to the right by as much;
  - let go past halfway and it springs the rest of the way; before halfway it springs back.
  The word at the end of the list's strip does the same widening by click: "Discover", and "Close" when wide.
*/

type Tab = "tokens" | "perps" | "ranks" | "feed";
type Size = "folded" | "open" | "wide";
const OPEN = 296;
const RAIL = 64;
const SCROLL = "no-scrollbar min-h-0 flex-1 overflow-y-auto pb-5 [mask-image:linear-gradient(to_bottom,#000_calc(100%-28px),transparent)]";

export type ColumnProps = {
  /** token lists, in FOMO's order; the first is the one Discover opens on */
  lists: { id: string; name: string; tokens: Token[] }[];
  perps?: Perp[];
  board: Record<BoardSpan, Ranked[]>;
  feed: Post[];
  /** who search can find */
  people: Person[];
  /** the token on the chart, lit in the list */
  current?: string;
  /** whether a token can be opened; the others show the same and don't press */
  opens?: (t: Token) => boolean;
  /** open a token, or one thesis on it (its words) */
  onToken?: (t: Token, thesisText?: string) => void;
  onPerson?: (p: Person, from: HTMLElement) => void;
  /** perps press only if this is given */
  onPerp?: (p: Perp) => void;
  /** set to how far the column is pulled past its own width, for the sheet beside it to slide out by */
  pull?: MotionValue<number>;
};

export function Column(props: ColumnProps) {
  const { lists, perps = [], board, feed, people, current, opens = () => true, onToken, onPerson, onPerp, pull } = props;
  const now = useNow();
  const [tab, setTab] = useState<Tab>("tokens");
  const [list, setList] = useState(lists[0]?.id ?? "");
  const [q, setQ] = useState("");
  const field = useRef<HTMLInputElement>(null);

  // the column's width: held by the hand while its edge is dragged, settled by a spring after
  const [size, setSize] = useState<Size>("open");
  const [max, setMax] = useState(() => window.innerWidth - 24);
  useEffect(() => {
    const on = () => setMax(window.innerWidth - 24);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const w = useMotionValue(OPEN);
  // in the page's flow the column is never wider than open: past that it lies over the room, and the sheet slides
  // out by as much
  const slot = useTransform(w, (v) => Math.min(v, OPEN));
  const inner = useTransform(w, (v) => Math.max(v, OPEN));
  useMotionValueEvent(w, "change", (v) => pull?.set(Math.max(0, v - OPEN)));
  const along = (v: number) => Math.min(1, Math.max(0, (v - RAIL) / (OPEN - RAIL)));
  const words = useTransform(w, (v) => Math.min(1, Math.max(0, (along(v) - 0.2) / 0.5)));
  const pics = useTransform(w, (v) => Math.min(1, Math.max(0, (0.8 - along(v)) / 0.5)));
  const wordsBlur = useTransform(w, (v) => `blur(${((1 - along(v)) * 4).toFixed(1)}px)`);
  const picsBlur = useTransform(w, (v) => `blur(${(along(v) * 4).toFixed(1)}px)`);
  const widthOf = (s: Size) => (s === "folded" ? RAIL : s === "wide" ? max : OPEN);

  const term = q.trim().toLowerCase();
  const found = useMemo(() => {
    if (term.length < 2) return null;
    const all = new Map(lists.flatMap((l) => l.tokens).map((t) => [t.id, t]));
    return {
      tokens: [...all.values()].filter((t) => t.symbol.toLowerCase().includes(term) || t.name?.toLowerCase().includes(term) || t.address === q.trim()).slice(0, 8),
      traders: people
        .filter((p) => p.handle.toLowerCase().includes(term) || p.name.toLowerCase().includes(term))
        .sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0))
        .slice(0, 8),
    };
  }, [term, q, lists, people]);
  // Discover is the Tokens or Perps list pulled wide; nothing else in the column widens
  const canWide = !found && (tab === "tokens" || tab === "perps");

  /** Go to a rest: folded, open or wide. Widening the Tokens list turns it to the first list (Trending). */
  const settle = (to: Size) => {
    if (to === "wide" && tab === "tokens") setList(lists[0]?.id ?? list);
    setSize(to);
    animate(w, widthOf(to), SPRING.glide);
  };
  useEffect(() => {
    // a new window width moves a wide column's edge with it
    if (size === "wide") w.set(max);
  }, [max, size, w]);

  const grip = useRef<{ x: number; from: number; moved: boolean; last: { x: number; t: number } } | null>(null);
  const seam = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      w.stop();
      grip.current = { x: e.clientX, from: w.get(), moved: false, last: { x: e.clientX, t: e.timeStamp } };
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const g = grip.current;
      if (!g || (!g.moved && Math.abs(e.clientX - g.x) < 3)) return;
      if (!g.moved && e.clientX > g.x && size !== "wide" && canWide && tab === "tokens") setList(lists[0]?.id ?? list);
      g.moved = true;
      const raw = g.from + e.clientX - g.x;
      const hi = canWide ? max : OPEN;
      // past either end it gives a little, as a held edge does
      w.set(raw < RAIL ? RAIL - (RAIL - raw) * 0.2 : raw > hi ? hi + (raw - hi) * 0.2 : raw);
      if (e.timeStamp - g.last.t > 60) g.last = { x: e.clientX, t: e.timeStamp };
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      const g = grip.current;
      grip.current = null;
      if (!g) return;
      if (!g.moved) return settle(size === "open" ? "folded" : "open");
      // a flick goes the way it was thrown; a slow drag goes to the nearer rest
      const v = ((e.clientX - g.last.x) / Math.max(1, e.timeStamp - g.last.t)) * 1000;
      const at = w.get();
      if (canWide && at > OPEN + 2) settle(Math.abs(v) > 300 ? (v > 0 ? "wide" : "open") : at > (OPEN + max) / 2 ? "wide" : "open");
      else settle(Math.abs(v) > 300 ? (v < 0 ? "folded" : "open") : at < (RAIL + OPEN) / 2 ? "folded" : "open");
    },
  };

  // the list's order by a column's head, per list; null is FOMO's own order
  const [tokenSort, setTokenSort] = useState<{ list: string; sort: Sort<TokenKey> }>({ list, sort: null });
  const [perpSort, setPerpSort] = useState<Sort<PerpKey>>(null);
  const sort = tokenSort.list === list ? tokenSort.sort : null;
  const tokens = sorted(lists.find((l) => l.id === list)?.tokens ?? [], sort, (t, k) => tokenFigure(t, k, now));
  const markets = sorted(perps, perpSort, (p, k) => p[k]);

  /** Open a token; from Discover the column springs back to its own width as the chart comes in. */
  const pick = (t: Token, thesisText?: string) => {
    onToken?.(t, thesisText);
    if (size === "wide") settle("open");
  };

  const traderRow = (p: Person) => (
    <button key={p.id} type="button" onClick={(e) => onPerson?.(p, e.currentTarget)} className={cn("flex h-12 w-full items-center gap-2.5 rounded-[12px] px-2.5 text-left hover:bg-white/5", FOCUS)}>
      <Face person={p} size={30} />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-chip font-bold">{p.name || p.handle}</b>
        <span className="block truncate text-caption font-medium text-ink-3">@{p.handle}</span>
      </span>
      {p.followers != null && (
        <span className="shrink-0 text-right">
          <b className="block text-chip font-bold tnum">{count(p.followers)}</b>
          <span className="block text-caption font-medium text-ink-3">followers</span>
        </span>
      )}
    </button>
  );
  const tokenRow = (t: Token) => <TokenRow key={t.id} t={t} on={t.id === current} can={opens(t)} now={now} onOpen={() => pick(t)} onThesis={() => pick(t, t.said?.text)} />;

  // folded, the rail: the face that's open, as its pictures
  const railItems =
    tab === "tokens"
      ? tokens.slice(0, 14).map((t) => ({ key: t.id, on: t.id === current, can: opens(t), pic: <Logo token={t} size={32} />, go: () => pick(t) }))
      : tab === "perps"
        ? []
        : (tab === "ranks" ? board["24h"].map((r) => r.person) : feed.flatMap((p) => (p.kind === "recap" ? [] : [p.person]))).slice(0, 14).map((p, i) => ({ key: `${p.id}${i}`, on: false, can: true, pic: <Face person={p} size={32} />, go: (from: HTMLElement) => onPerson?.(p, from) }));

  const wide = size === "wide";
  const discoverWord = (
    <button type="button" aria-expanded={wide} onClick={() => settle(wide ? "open" : "wide")} className={cn("grid h-10 w-[84px] shrink-0 place-items-center rounded-[12px] text-chip font-bold hover:bg-white/5", wide ? "text-ink" : "text-ink-3 hover:text-ink", FOCUS)}>
      {wide ? "Close" : "Discover"}
    </button>
  );

  return (
    <motion.aside style={{ width: slot }} className="relative z-[5] shrink-0 select-none">
      <motion.div style={{ width: w }} className="absolute inset-y-0 left-0">
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={size === "folded" ? "Drag or press to open the column" : "Drag left to fold the column, right to pull it wide"}
          {...seam}
          onPointerCancel={seam.onPointerUp}
          className="group absolute inset-y-0 -right-3.5 z-[3] w-4 cursor-ew-resize touch-none"
        >
          <i className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2 bg-white/6 group-hover:bg-white/25" />
        </div>
        <div className="relative h-full overflow-hidden">
          <motion.div style={{ opacity: pics, filter: picsBlur }} inert={size !== "folded"} className={cn("absolute inset-y-0 left-0 flex flex-col items-center gap-2 pt-2", size !== "folded" && "pointer-events-none")}>
            <button type="button" aria-label="Search" onClick={() => (settle("open"), window.setTimeout(() => field.current?.focus(), 80))} className={cn("grid size-10 place-items-center rounded-[12px] bg-white/6 text-ink-3 hover:text-ink", FOCUS)}>
              <Search size={16} />
            </button>
            <div className="no-scrollbar flex flex-col items-center gap-1.5 overflow-y-auto pt-2" style={{ width: RAIL }}>
              {railItems.map((it) => (
                <button key={it.key} type="button" disabled={!it.can} onClick={(e) => it.go(e.currentTarget)} className={cn("grid size-11 shrink-0 place-items-center rounded-[12px]", it.on ? ON : it.can && "hover:bg-white/6", FOCUS)}>
                  {it.pic}
                </button>
              ))}
            </div>
          </motion.div>

          {/* open, the column at its own width, and wider as it's pulled: a container its rows read their columns from */}
          <motion.div inert={size === "folded"} style={{ width: inner, opacity: words, filter: wordsBlur }} className={cn("@container flex h-full flex-col gap-3 pt-2", size === "folded" && "pointer-events-none")}>
            {/* a plain text wordmark: this concept isn't FOMO's own */}
            <div className="flex h-10 shrink-0 items-center pl-2 text-[26px] leading-none font-bold tracking-[-0.04em] text-[#CBD0EB]">fomo</div>
            <label className="flex h-10 w-[296px] shrink-0 items-center gap-2 rounded-[12px] bg-white/6 pr-1.5 pl-3.5 text-ink-3 shadow-[inset_0_0_0_1px_rgb(203_208_235/0.08)] focus-within:shadow-[inset_0_0_0_1px_rgb(203_208_235/0.22)]">
              <Search size={16} className="shrink-0" />
              <input
                ref={field}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  // what search finds isn't Discover: the column goes back to its own width
                  if (wide && e.target.value.trim()) settle("open");
                }}
                onKeyDown={(e) => e.key === "Escape" && setQ("")}
                placeholder="Tokens, traders or an address"
                aria-label="Find a token or a trader"
                spellCheck={false}
                className="h-full w-full min-w-0 bg-transparent text-label font-bold text-ink outline-none placeholder:text-chip placeholder:font-medium placeholder:text-ink-3"
              />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label="Clear the search" className={cn("grid size-7 shrink-0 place-items-center rounded-[8px] hover:bg-white/8 hover:text-ink", FOCUS)}>
                  <X size={14} />
                </button>
              )}
            </label>

            <AnimatePresence mode="popLayout" initial={false}>
              {found ? (
                <motion.div key="found" {...SWAP} className={cn(SCROLL, "w-[296px]")}>
                  {found.tokens.length > 0 && <p className="flex h-7 items-end px-2.5 pb-1 text-note font-medium text-ink-3">Tokens</p>}
                  {found.tokens.map(tokenRow)}
                  {found.traders.length > 0 && <p className="flex h-7 items-end px-2.5 pb-1 text-note font-medium text-ink-3">Traders</p>}
                  {found.traders.map(traderRow)}
                  {!found.tokens.length && !found.traders.length && <p className="px-2.5 pt-2 text-chip font-medium text-ink-3">No results</p>}
                </motion.div>
              ) : (
                <motion.div key="faces" {...SWAP} className="flex min-h-0 flex-1 flex-col gap-3">
                  <Tabs
                    options={[
                      { id: "tokens", name: "Tokens" },
                      { id: "perps", name: "Perps" },
                      { id: "ranks", name: "Leaderboard" },
                      { id: "feed", name: "Feed" },
                    ]}
                    value={tab}
                    onChange={(t) => {
                      setTab(t);
                      // only Tokens and Perps pull wide
                      if (wide && t !== "tokens" && t !== "perps") settle("open");
                    }}
                    className="w-[296px]"
                  />
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div key={tab} {...SWAP} className="flex min-h-0 flex-1 flex-col gap-2">
                      {tab === "tokens" && (
                        <>
                          <div className="flex items-center gap-2">
                            <Tabs options={lists.map((l) => ({ id: l.id, name: l.name }))} value={list} onChange={setList} fill className="h-10 w-[204px] shrink-0 rounded-[12px] bg-white/5 px-1" />
                            {discoverWord}
                          </div>
                          <TokenHeads sort={sort} onSort={(s) => setTokenSort({ list, sort: s })} />
                          <div className={SCROLL}>{tokens.map(tokenRow)}</div>
                        </>
                      )}
                      {tab === "perps" && (
                        <>
                          <div className="flex h-10 items-center gap-2">
                            <span className="w-[204px] shrink-0 px-2.5 text-note font-medium text-ink-3">Hyperliquid, by 24H volume</span>
                            {discoverWord}
                          </div>
                          <PerpHeads sort={perpSort} onSort={setPerpSort} />
                          <div className={SCROLL}>
                            {markets.map((p) => (
                              <PerpRow key={p.name} p={p} onOpen={onPerp ? () => onPerp(p) : undefined} />
                            ))}
                          </div>
                        </>
                      )}
                      {tab === "ranks" && <div className="flex min-h-0 w-[296px] flex-1 flex-col"><Leaderboard board={board} onPerson={onPerson} /></div>}
                      {tab === "feed" && <div className="flex min-h-0 w-[296px] flex-1 flex-col"><Feed posts={feed} opens={opens} onToken={onToken} onPerson={onPerson} /></div>}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </motion.aside>
  );
}
