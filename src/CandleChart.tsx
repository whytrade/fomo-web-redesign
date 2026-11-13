import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn, FOCUS } from "./lib/cn";
import { TWEEN } from "./lib/motion";
import { usd } from "./lib/format";
import { Face } from "./parts";
import { ThesisCard } from "./ThesisCard";
import type { Person, Room, Thesis } from "./types";

/*
  A token's candles with its traders on them. Each thesis stands on the candle it was written during, stacked up
  from the candle's high: the biggest position nearest the candle, the rest above, past five a count. The ring says
  whether they are up (green) or down (orange). A face opens its thesis as a card; the level it was written at is
  drawn across the chart while it's open. The axis reads market cap, the way FOMO reads a token.

  A plain SVG chart, made for the kit. Swap in your own chart and keep the faces: all they need is a time-to-x and
  a price-to-y.
*/

const PAD = { top: 16, right: 76, bottom: 36, left: 12 };
/** the share of the width kept clear ahead of now */
const AHEAD = 0.12;
const MIN_COL = 7;
const FACE = 24;
const STACK_W = 30;
const STACK_MOST = 5;
/** theses from positions smaller than this don't get a face */
const MIN_STAKE = 100;

type Spot = { thesis: Thesis; x: number; y: number };

export function CandleChart({ room, open, onOpen, onPerson }: { room: Room; open: string | null; onOpen: (id: string | null) => void; onPerson?: (p: Person, from: HTMLElement) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { token, interval, theses } = room;
  const g = useMemo(() => {
    if (!size || size.w < 200 || size.h < 120) return null;
    const plotW = size.w - PAD.left - PAD.right;
    const plotH = size.h - PAD.top - PAD.bottom;
    const fit = Math.max(8, Math.floor((plotW * (1 - AHEAD)) / MIN_COL));
    const candles = room.candles.slice(-fit);
    const col = Math.min(14, (plotW * (1 - AHEAD)) / candles.length);
    let lo = Math.min(...candles.map((c) => c.l));
    let hi = Math.max(...candles.map((c) => c.h));
    const pad = (hi - lo) * 0.08 || hi * 0.05;
    lo -= pad;
    hi += pad * 2.5; // headroom for the faces
    const t0 = candles[0].t;
    const x = (t: number) => PAD.left + ((t - t0) / interval + 0.5) * col;
    const y = (p: number) => PAD.top + (1 - (p - lo) / (hi - lo)) * plotH;
    return { candles, col, x, y, lo, hi, plotW, plotH, t0, tEnd: candles.at(-1)!.t + interval };
  }, [size, room.candles, interval]);

  // the stacks of faces, by column
  const { faces, more } = useMemo(() => {
    const faces: Spot[] = [];
    const more: { x: number; y: number; n: number }[] = [];
    if (!g) return { faces, more };
    const stacks = new Map<number, { top: number; of: Thesis[] }>();
    for (const t of theses) {
      if (!t.price || t.at < g.t0 || t.at > g.tEnd || (t.holds ?? 0) < MIN_STAKE) continue;
      const x = g.x(t.at);
      const c = g.candles[Math.min(g.candles.length - 1, Math.max(0, Math.floor((t.at - g.t0) / interval)))];
      const key = Math.floor((x - PAD.left) / STACK_W);
      const st = stacks.get(key) ?? { top: Infinity, of: [] };
      st.top = Math.min(st.top, g.y(c.h));
      // one face per trader in a stack: their latest
      const same = st.of.findIndex((o) => o.author.id === t.author.id);
      if (same < 0) st.of.push(t);
      else if (t.at > st.of[same].at) st.of[same] = t;
      stacks.set(key, st);
    }
    for (const [key, st] of stacks) {
      const x = PAD.left + (key + 0.5) * STACK_W;
      const room = Math.max(1, Math.min(STACK_MOST, Math.floor((st.top - 10 - PAD.top - 16) / (FACE - 4))));
      const shown = st.of.sort((a, b) => (b.holds ?? 0) - (a.holds ?? 0)).slice(0, room);
      shown.forEach((t, i) => faces.push({ thesis: t, x, y: st.top - 10 - FACE / 2 - i * (FACE - 4) }));
      // the count sits just above the top face
      if (st.of.length > shown.length) more.push({ x, y: st.top - 10 - FACE - (shown.length - 1) * (FACE - 4) - 8, n: st.of.length - shown.length });
    }
    return { faces, more };
  }, [g, theses, interval]);

  const thesis = open ? (theses.find((t) => t.id === open) ?? null) : null;
  // a thesis opened from the rail stands where it was written, even if its face didn't make the cut
  const at: Spot | null = !thesis || !g ? null : (faces.find((f) => f.thesis.id === thesis.id) ?? (thesis.price && thesis.at >= g.t0 ? { thesis, x: g.x(thesis.at), y: Math.min(PAD.top + g.plotH - 12, Math.max(PAD.top + 12, g.y(thesis.price))) } : null));
  const all = at && !faces.includes(at) ? [...faces, at] : faces;
  const rect = box.current?.getBoundingClientRect();

  return (
    <div ref={box} className="relative min-h-0 flex-1 select-none">
      {g && (
        <>
          <svg width={size!.w} height={size!.h} className="absolute inset-0">
            <Axes g={g} supply={token.supply} interval={interval} />
            {g.candles.map((c) => {
              const x = g.x(c.t);
              const up = c.c >= c.o;
              const fill = up ? "var(--color-up)" : "var(--color-down)";
              const top = g.y(Math.max(c.o, c.c));
              return (
                <g key={c.t}>
                  <line x1={x} x2={x} y1={g.y(c.h)} y2={g.y(c.l)} stroke={fill} strokeWidth={1} />
                  <rect x={x - g.col * 0.35} width={Math.max(1, g.col * 0.7)} y={top} height={Math.max(1, g.y(Math.min(c.o, c.c)) - top)} fill={fill} rx={1} />
                </g>
              );
            })}
            <AnimatePresence>
              {thesis?.price && (
                <motion.line key={thesis.id} x1={PAD.left} x2={PAD.left + g.plotW} y1={g.y(thesis.price)} y2={g.y(thesis.price)} stroke="var(--color-ink-3)" strokeDasharray="4 4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: TWEEN.exit }} />
              )}
            </AnimatePresence>
          </svg>
          {more.map((m) => (
            <span key={m.x} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-micro font-bold text-ink-3 tnum" style={{ left: m.x, top: m.y }}>
              +{m.n}
            </span>
          ))}
          {all.map(({ thesis: t, x, y }) => {
            const on = t.id === open;
            const ring = t.pnl == null ? "ring-white/25 hover:ring-white/60" : t.pnl >= 0 ? "ring-up/70 hover:ring-up" : "ring-down/70 hover:ring-down";
            return (
              <button
                key={t.id}
                type="button"
                data-face
                onClick={() => onOpen(on ? null : t.id)}
                aria-label={`${t.author.name || t.author.handle}'s thesis`}
                className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-[1.5px] transition-shadow", ring, on && "z-10 ring-2 ring-fomo", FOCUS)}
                style={{ left: x, top: y, width: FACE, height: FACE }}
              >
                <Face person={t.author} size={FACE} />
              </button>
            );
          })}
        </>
      )}
      <AnimatePresence>
        {/* a thesis with no price can't stand on the chart: it shows only in the rail */}
        {thesis?.price != null && rect && (
          <ThesisCard
            key={thesis!.id}
            anchor={at ? { x: rect.left + at.x, y: rect.top + at.y, size: FACE } : { x: rect.right - 40, y: rect.top + 60, size: 0 }}
            token={token}
            thesis={thesis}
            holder={room.holders.find((h) => h.person.id === thesis.author.id) ?? null}
            candles={room.candles}
            swaps={room.swaps}
            onClose={() => onOpen(null)}
            onPerson={onPerson}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

type Geo = { candles: Room["candles"]; x: (t: number) => number; y: (p: number) => number; lo: number; hi: number; plotW: number; plotH: number; col: number };

/** The grid, the market cap down the right, the times along the bottom, and now. */
function Axes({ g, supply, interval }: { g: Geo; supply?: number; interval: number }) {
  const right = PAD.left + g.plotW;
  const ticks = Array.from({ length: 5 }, (_, i) => g.lo + ((g.hi - g.lo) * (i + 0.5)) / 5);
  const label = (p: number) => (supply ? usd(p * supply) : `$${p.toPrecision(3)}`);
  const step = Math.max(1, Math.round(130 / g.col));
  const last = g.candles.at(-1)!;
  const nowY = g.y(last.c);
  const when = (t: number) => {
    const d = new Date(t);
    if (interval >= 3_600_000 && d.getHours() === 0) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  };
  const bottom = PAD.top + g.plotH;
  return (
    <g className="text-caption font-medium tnum" fill="var(--color-ink-3)">
      {ticks.map((p) => (
        <g key={p}>
          <line x1={PAD.left} x2={right} y1={g.y(p)} y2={g.y(p)} stroke="rgb(203 208 235 / 0.055)" />
          <text x={right + 14} y={g.y(p) + 4}>
            {label(p)}
          </text>
        </g>
      ))}
      <line x1={PAD.left} x2={right} y1={bottom} y2={bottom} stroke="rgb(203 208 235 / 0.1)" />
      {g.candles.map((c, i) =>
        (g.candles.length - 1 - i) % step === 0 && i < g.candles.length - step / 2 ? (
          <text key={c.t} x={g.x(c.t)} y={bottom + 22} textAnchor="middle">
            {when(c.t)}
          </text>
        ) : null,
      )}
      <line x1={g.x(last.t)} x2={right} y1={nowY} y2={nowY} stroke="rgb(247 247 247 / 0.35)" strokeDasharray="2 4" />
      <rect x={right + 6} y={nowY - 10} width={PAD.right - 10} height={20} rx={10} fill="var(--color-ink)" />
      <text x={right + 6 + (PAD.right - 10) / 2} y={nowY + 4} textAnchor="middle" fill="var(--color-paper)" fontWeight={700}>
        {label(last.c)}
      </text>
      <rect x={g.x(last.t) - 18} y={bottom + 9} width={36} height={20} rx={10} fill="var(--color-ink)" />
      <text x={g.x(last.t)} y={bottom + 23} textAnchor="middle" fill="var(--color-paper)" fontWeight={700}>
        now
      </text>
    </g>
  );
}
