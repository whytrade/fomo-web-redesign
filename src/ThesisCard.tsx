import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { cn, FOCUS } from "./lib/cn";
import { ago, cents, count, pct, useNow, usd } from "./lib/format";
import { SPRING, TWEEN } from "./lib/motion";
import { Face } from "./parts";
import type { Candle, Holder, Person, Swap, Thesis, Token } from "./types";

/*
  What a face on the chart opens into. Who wrote it, what they said (cut near four lines, "more" for the rest), a
  small line of the price with where they got in, where they wrote it and where it is now, and the figures under
  it. It grows out of the face, can be dragged anywhere, and a press outside puts it away.
*/

const W = 328;

export function ThesisCard({
  anchor,
  token,
  thesis,
  holder,
  candles,
  swaps,
  onClose,
  onPerson,
}: {
  /** where the face is on screen */
  anchor: { x: number; y: number; size: number };
  token: Token;
  thesis: Thesis;
  holder: Holder | null;
  candles: Candle[];
  swaps: Swap[];
  onClose: () => void;
  onPerson?: (p: Person, from: HTMLElement) => void;
}) {
  const now = useNow();
  const card = useRef<HTMLElement>(null);
  const dragged = useRef(false);
  const [spot, setSpot] = useState<{ left: number; top?: number; bottom?: number; origin: string } | null>(null);

  // beside the face on whichever side has room, opening up or down so all of it stays on screen
  useLayoutEffect(() => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const gap = anchor.size / 2 + 12;
    const right = anchor.x + gap + W < vw - 16;
    const left = Math.max(12, right ? anchor.x + gap : anchor.x - gap - W);
    const ox = `${right ? -gap : W + gap}px`;
    setSpot(anchor.y < vh * 0.55 ? { left, top: Math.max(12, anchor.y - 36), origin: `${ox} 36px` } : { left, bottom: Math.max(12, vh - anchor.y - 36), origin: `${ox} calc(100% - 36px)` });
  }, [anchor.x, anchor.y, anchor.size]);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      const on = e.target as Element | null;
      if (card.current?.contains(on) || on?.closest?.("[data-face],[data-thesis]")) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const last = candles.at(-1)?.c ?? null;
  const since = last && thesis.price ? last / thesis.price - 1 : null;
  const holds = holder?.value ?? thesis.holds;
  const pnl = holder?.pnl ?? thesis.pnl;
  // their average entry: the holders list says it; otherwise what they paid against what they hold now
  const entry = holder?.entry ?? (last && holds != null && pnl != null && holds >= 1 && holds - pnl > 0 ? (last * (holds - pnl)) / holds : null);
  const trades = useMemo(() => swaps.filter((s) => s.person.id === thesis.author.id && s.price > 0).map((s) => ({ t: s.at, price: s.price, buy: s.buy })), [swaps, thesis.author.id]);

  const facts: [string, ReactNode, string?][] = [];
  if (holder) facts.push(["Holds", `${count(Math.round(holder.amount))} ${token.symbol}`]);
  if (holds != null && holds >= 1) facts.push(["Position", cents(holds)]);
  if (pnl != null && Math.abs(pnl) >= 1) {
    const paid = holds != null ? holds - pnl : 0;
    facts.push(["PnL", `${pnl >= 0 ? "+" : "-"}${cents(Math.abs(pnl))}${paid >= 1 ? ` (${pct(pnl / paid)})` : ""}`, pnl >= 0 ? "text-up" : "text-down"]);
  }
  const wrote = ago(thesis.at, now);
  facts.push(["Written", wrote === "now" ? "just now" : `${wrote} ago`]);
  if (thesis.likes > 0)
    facts.push([
      "Liked",
      <span key="l" className="inline-flex items-center gap-1">
        <Heart size={12} strokeWidth={2.2} />
        {thesis.likes}
      </span>,
    ]);

  if (!spot) return null;
  const p = thesis.author;
  const cap = (price: number) => (token.supply ? usd(price * token.supply) : null);
  return createPortal(
    <motion.article
      ref={card}
      className="glass-pop no-scrollbar fixed z-50 flex max-h-[min(70vh,540px)] flex-col gap-3 overflow-y-auto rounded-[14px] p-4 text-ink"
      style={{ left: spot.left, top: spot.top, bottom: spot.bottom, width: W, transformOrigin: spot.origin }}
      drag
      dragMomentum={false}
      dragElastic={0}
      onPointerDownCapture={() => (dragged.current = false)}
      onDragStart={() => (dragged.current = true)}
      onClickCapture={(e) => {
        if (!dragged.current) return;
        e.preventDefault();
        e.stopPropagation();
        dragged.current = false;
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: TWEEN.exit }}
      transition={SPRING.arrive}
    >
      <button type="button" onClick={(e) => onPerson?.(p, e.currentTarget)} className={cn("flex shrink-0 items-center gap-2.5 rounded-[10px] text-left", FOCUS)}>
        <Face person={p} size={36} />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-label font-bold">{p.name || p.handle}</b>
          <span className="block truncate text-note font-medium text-ink-3">
            @{p.handle}
            {p.clan && ` · ${p.clan.name}`}
          </span>
        </span>
        {since != null && Math.abs(since) >= 0.0005 && (
          <span className={cn("shrink-0 rounded-[8px] px-2 py-0.5 text-note font-bold tnum", since >= 0 ? "bg-up/16 text-up" : "bg-down/16 text-down")}>{pct(since)} since</span>
        )}
      </button>
      <Words key={thesis.id} text={thesis.text} />
      {last != null && (
        <div className="shrink-0">
          <Trace candles={candles} entry={entry} trades={trades} thesis={thesis} up={since == null ? null : since >= 0} />
          <div className="mt-1.5 flex justify-between text-caption font-medium text-ink-3 tnum">
            <span>
              {entry && cap(entry) && (
                <>
                  <i className="mr-1 inline-block w-3 border-t border-dashed border-ink-3 align-middle" />
                  Entry <b className="font-bold text-ink-2">{cap(entry)}</b>
                </>
              )}
            </span>
            <span>
              {thesis.mcap != null && (
                <>
                  <i className="mr-1 inline-block size-2 rounded-full border-2 border-fomo align-middle" />
                  Thesis <b className="font-bold text-ink-2">{usd(thesis.mcap)}</b>
                </>
              )}
            </span>
            <span>
              {cap(last) && (
                <>
                  <i className={cn("mr-1 inline-block size-2 rounded-full align-middle", since == null ? "bg-ink-2" : since >= 0 ? "bg-up" : "bg-down")} />
                  Now <b className="font-bold text-ink-2">{cap(last)}</b>
                </>
              )}
            </span>
          </div>
        </div>
      )}
      <dl className="grid shrink-0 grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-white/8 pt-3 text-note font-medium text-ink-3">
        {facts.map(([k, v, tone]) => (
          <div key={k} className="contents">
            <dt>{k}</dt>
            <dd className={cn("text-right font-bold tnum", tone ?? "text-ink")}>{v}</dd>
          </div>
        ))}
      </dl>
    </motion.article>,
    document.body,
  );
}

const CUT = 150;
const LINES = 4;

/** What they wrote. A long one is cut at a word near four lines; "more" opens the rest in place. */
function Words({ text }: { text: string }) {
  const [all, setAll] = useState(false);
  const long = text.length > CUT + 20 || text.split("\n").length > LINES;
  const short = useMemo(() => {
    if (!long) return text;
    const head = text.split("\n").slice(0, LINES).join("\n").slice(0, CUT);
    const at = Math.max(head.lastIndexOf(" "), head.lastIndexOf("\n"));
    return (at > head.length * 0.6 ? head.slice(0, at) : head).replace(/[\s.,;:!?-]+$/, "");
  }, [text, long]);
  return (
    <p className="shrink-0 text-label leading-[21px] font-medium whitespace-pre-line [overflow-wrap:anywhere]">
      {long && !all ? `${short}... ` : text}
      {long && (
        <button type="button" aria-expanded={all} onPointerDown={(e) => e.stopPropagation()} onClick={() => setAll(!all)} className={cn("rounded-[5px] font-bold text-ink-3 hover:text-ink", all && "ml-1.5", FOCUS)}>
          {all ? "less" : "more"}
        </button>
      )}
    </p>
  );
}

const TW = 296;
const TH = 96;

/**
 * The price as one line, from a little before their first trade or thesis to now. Their entry is a dashed level,
 * their buys and sells are B and S bubbles, the thesis is a ring where they wrote it, and the line after it takes
 * the colour of how it has gone since. Prices sit on a log scale, so an entry far below still shows.
 */
function Trace({ candles, entry, trades, thesis, up }: { candles: Candle[]; entry: number | null; trades: { t: number; price: number; buy: boolean }[]; thesis: Thesis; up: boolean | null }) {
  const d = useMemo(() => {
    if (candles.length < 8) return null;
    const first = candles[0].t;
    const end = candles.at(-1)!.t;
    const theirs = Math.max(first, Math.min(thesis.at, ...trades.map((t) => t.t).filter((t) => t >= first)));
    const from = Math.max(first, Math.min(candles[Math.max(0, candles.length - 24)].t, theirs - (end - theirs) * 0.6));
    const pts = candles.filter((c) => c.t >= from);
    const marks = trades.filter((t) => t.t >= from);
    const levels = [...pts.map((p) => p.c), entry, thesis.price, ...marks.map((t) => t.price)].filter((v): v is number => !!v && v > 0);
    const lo = Math.log(Math.min(...levels));
    const hi = Math.log(Math.max(...levels));
    const t0 = pts[0].t;
    const t1 = pts.at(-1)!.t;
    const x = (t: number) => 6 + ((Math.min(t1, Math.max(t0, t)) - t0) / Math.max(1, t1 - t0)) * (TW - 16);
    const y = (p: number) => 10 + (1 - (Math.log(p) - lo) / Math.max(1e-9, hi - lo)) * (TH - 20);
    const path = (ps: Candle[]) => ps.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.c).toFixed(1)}`).join(" ");
    const cutAt = thesis.at <= t0 ? 0 : pts.findIndex((p) => p.t >= thesis.at);
    const cut = cutAt < 0 ? pts.length - 1 : cutAt;
    return {
      before: path(pts.slice(0, cut + 1)),
      after: path(pts.slice(cut)),
      wrote: thesis.at >= t0 ? { x: x(thesis.at), y: y(thesis.price && thesis.price > 0 ? thesis.price : pts[cut].c) } : null,
      end: { x: x(t1), y: y(pts.at(-1)!.c) },
      entryY: entry && entry > 0 ? y(entry) : null,
      marks: marks.map((t) => ({ x: x(t.t), y: y((pts.find((p) => p.t >= t.t) ?? pts.at(-1)!).c), buy: t.buy })),
    };
  }, [candles, entry, trades, thesis.at, thesis.price]);
  if (!d) return null;
  const tone = up == null ? "var(--color-ink-2)" : up ? "var(--color-up)" : "var(--color-down)";
  const onEnd = !!d.wrote && Math.hypot(d.wrote.x - d.end.x, d.wrote.y - d.end.y) < 9;
  return (
    <svg width={TW} height={TH} viewBox={`0 0 ${TW} ${TH}`} className="overflow-visible" role="img" aria-label="The price since they got in: their entry, their buys and sells, where they wrote this, and now">
      {d.entryY != null && <line x1={4} x2={TW - 4} y1={d.entryY} y2={d.entryY} stroke="var(--color-ink-3)" strokeDasharray="3 4" />}
      <path d={d.before} fill="none" stroke="var(--color-ink-3)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <path d={d.after} fill="none" stroke={tone} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {d.marks.map((m, i) => (
        <g key={i}>
          <circle cx={m.x} cy={m.y} r={7} fill={m.buy ? "var(--color-up)" : "var(--color-down)"} stroke="var(--color-card)" strokeWidth={1.5} />
          <text x={m.x} y={m.y + 3} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#06140b">
            {m.buy ? "B" : "S"}
          </text>
        </g>
      ))}
      <circle cx={d.end.x} cy={d.end.y} r={3.5} fill={tone} />
      {d.wrote && <circle cx={onEnd ? d.end.x : d.wrote.x} cy={onEnd ? d.end.y : d.wrote.y} r={onEnd ? 7 : 4} fill={onEnd ? "none" : "var(--color-card)"} stroke="var(--color-fomo)" strokeWidth={2} />}
    </svg>
  );
}
