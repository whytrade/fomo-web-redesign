import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { cn, FOCUS } from "./lib/cn";
import { signed } from "./lib/format";
import { SPRING, TWEEN } from "./lib/motion";
import { Face, Logo, METAL, ON, Tabs } from "./parts";
import { SPANS, type BoardSpan, type Person, type Ranked } from "./types";

/*
  FOMO's leaderboard as one face of the left column: the span, Traders or Clans, the top three on a podium (first in
  the middle and tallest), everyone else from fourth down. A clan opens in place to its traders on the board.
*/

const SCROLL = "no-scrollbar min-h-0 flex-1 overflow-y-auto pb-5 [mask-image:linear-gradient(to_bottom,#000_calc(100%-28px),transparent)]";
type Side = "traders" | "clans";
type Clan = { name: string; icon: string | null; rows: Ranked[]; made: number };

function clansOf(rows: Ranked[]): Clan[] {
  const by = new Map<string, Clan>();
  for (const r of rows) {
    const c = r.person.clan;
    if (!c?.name) continue;
    const had = by.get(c.name) ?? { name: c.name, icon: c.icon, rows: [], made: 0 };
    had.rows.push(r);
    had.made += r.pnl ?? 0;
    by.set(c.name, had);
  }
  return [...by.values()].sort((a, b) => b.rows.length - a.rows.length || b.made - a.made);
}

export function Leaderboard({ board, onPerson }: { board: Record<BoardSpan, Ranked[]>; onPerson?: (p: Person, from: HTMLElement) => void }) {
  const [win, setWin] = useState<BoardSpan>("24h");
  const [side, setSide] = useState<Side>("traders");
  const [clanName, setClan] = useState<string | null>(null);
  const rows = board[win];
  const clans = clansOf(rows);
  const clan = clans.find((c) => c.name === clanName) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <Tabs options={SPANS} value={win} onChange={setWin} fill className="h-10 rounded-[12px] bg-white/5 px-1" />
      <Tabs
        options={[
          { id: "traders", name: "Traders" },
          { id: "clans", name: "Clans" },
        ]}
        value={side}
        onChange={(s) => {
          setSide(s);
          setClan(null);
        }}
        fill
        className="h-10 rounded-[12px] bg-white/5 px-1"
      />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div key={`${win}:${side}:${clanName ?? ""}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: TWEEN.exit }} transition={SPRING.glide} className={SCROLL}>
            {side === "traders" ? (
              <>
                {rows.length >= 3 && <Podium rows={rows.slice(0, 3)} onPerson={onPerson} />}
                {rows.slice(rows.length >= 3 ? 3 : 0).map((r) => (
                  <Row key={r.person.id} r={r} onPerson={onPerson} />
                ))}
              </>
            ) : clan ? (
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => setClan(null)} className={cn("flex h-8 w-fit items-center gap-1 rounded-[10px] pr-2.5 pl-1.5 text-note font-bold text-ink-3 hover:text-ink-2", FOCUS)}>
                  <ArrowLeft size={14} />
                  Clans
                </button>
                <div className={cn("mb-1 flex items-center gap-3 rounded-[14px] p-3", ON)}>
                  <ClanIcon clan={clan} size={44} />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-label font-bold">{clan.name}</b>
                    <p className="text-note font-medium text-ink-3">
                      <b className="text-ink-2">{clan.rows.length}</b> in the top {rows.length}
                    </p>
                  </div>
                  <b className={cn("text-label font-bold tnum", clan.made >= 0 ? "text-up" : "text-down")}>{signed(clan.made)}</b>
                </div>
                {clan.rows.map((r) => (
                  <Row key={r.person.id} r={r} onPerson={onPerson} />
                ))}
              </div>
            ) : clans.length ? (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {clans.map((c) => (
                  <button key={c.name} type="button" onClick={() => setClan(c.name)} className={cn("flex min-w-0 flex-col gap-2 rounded-[12px] bg-white/4 p-2 text-left shadow-[inset_0_0_0_1px_rgb(203_208_235/0.06)] hover:bg-white/8", FOCUS)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <ClanIcon clan={c} size={34} />
                      <span className="min-w-0">
                        <b className="block truncate text-note font-bold">{c.name}</b>
                        <span className="block text-caption font-medium text-ink-3 tnum">
                          <b className="text-ink-2">{c.rows.length}</b> {c.rows.length === 1 ? "trader" : "traders"}
                        </span>
                      </span>
                    </span>
                    <b className={cn("self-end text-note font-bold tnum", c.made >= 0 ? "text-up" : "text-down")}>{signed(c.made)}</b>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-2.5 pt-2 text-chip font-medium text-ink-3">No clans on this board</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** First in the middle and tallest, second to its left, third to its right. */
function Podium({ rows, onPerson }: { rows: Ranked[]; onPerson?: (p: Person, from: HTMLElement) => void }) {
  const places = [
    { r: rows[1], step: 52, face: 42 },
    { r: rows[0], step: 70, face: 54 },
    { r: rows[2], step: 44, face: 42 },
  ];
  return (
    <div className="relative mt-1 grid grid-cols-3 items-end gap-1.5 px-0.5 pt-3">
      <i aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(to_right,transparent,rgb(203_208_235/0.18),transparent)]" />
      {places.map(({ r, step, face }, i) => {
        const m = METAL[Math.min(3, Math.max(1, r.rank)) as 1 | 2 | 3];
        const first = r.rank === 1;
        const up = (r.pnl ?? 0) >= 0;
        return (
          <button key={r.person.id} type="button" onClick={(e) => onPerson?.(r.person, e.currentTarget)} aria-label={`${r.person.name}, number ${r.rank}`} className={cn("group flex min-w-0 flex-col items-center rounded-t-[12px] text-center", FOCUS)}>
            <span className="relative">
              <span className="block rounded-full p-[3px]" style={{ background: m.rim }}>
                <span className="block rounded-full bg-[#0b0a16] p-[2px]">
                  <Face person={r.person} size={face} />
                </span>
              </span>
              <b className="absolute -bottom-1.5 left-1/2 grid -translate-x-1/2 place-items-center rounded-full text-caption leading-none font-bold tnum" style={{ background: m.rim, color: m.ink, width: first ? 20 : 18, height: first ? 20 : 18 }}>
                {r.rank}
              </b>
            </span>
            <b className={cn("mt-2.5 mb-1.5 block w-full truncate px-1 font-bold", first ? "text-chip" : "text-note")}>{r.person.name || r.person.handle}</b>
            <motion.span
              initial={{ height: step * 0.9, opacity: 0.6 }}
              animate={{ height: step, opacity: 1 }}
              transition={{ ...SPRING.arrive, delay: [0.06, 0, 0.1][i] }}
              className="flex w-full flex-col items-center rounded-t-[12px] bg-white/5 pt-2.5 group-hover:bg-white/9"
              style={{
                backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, ${m.tint} ${first ? 26 : 16}%, transparent), transparent 85%)`,
                boxShadow: `inset 0 1px 0 color-mix(in srgb, ${m.tint} 70%, transparent)`,
              }}
            >
              <b className={cn("leading-none font-bold tnum", first ? "text-label" : "text-note", up ? "text-up" : "text-down")}>{r.pnl != null ? signed(r.pnl) : ""}</b>
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}

function Row({ r, onPerson }: { r: Ranked; onPerson?: (p: Person, from: HTMLElement) => void }) {
  const p = r.person;
  return (
    <button type="button" onClick={(e) => onPerson?.(p, e.currentTarget)} className={cn("flex h-12 w-full items-center gap-2.5 rounded-[12px] px-2 text-left hover:bg-white/5", FOCUS)}>
      <span className="w-6 shrink-0 text-center text-note font-bold text-ink-3 tnum">{r.rank}</span>
      <Face person={p} size={30} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <b className="truncate text-chip font-bold">{p.name || p.handle}</b>
          {p.clan && <ClanIcon clan={p.clan} size={14} />}
        </span>
        <span className="block truncate text-caption font-medium text-ink-3">@{p.handle}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <b className={cn("text-chip font-bold tnum", (r.pnl ?? 0) >= 0 ? "text-up" : "text-down")}>{r.pnl != null ? signed(r.pnl) : ""}</b>
        <span className="flex">
          {r.holdings.slice(0, 3).map((h, k) => (
            <Logo key={k} token={h} size={14} className={k ? "-ml-1 ring-1 ring-card" : undefined} />
          ))}
        </span>
      </span>
    </button>
  );
}

function ClanIcon({ clan, size }: { clan: { name: string; icon: string | null }; size: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span title={clan.name} className="grid shrink-0 place-items-center overflow-hidden bg-white/10" style={{ width: size, height: size, borderRadius: Math.max(3, size * 0.28) }}>
      {clan.icon && !broken && <img src={clan.icon} alt="" width={size} height={size} onError={() => setBroken(true)} className="size-full object-cover" />}
    </span>
  );
}
