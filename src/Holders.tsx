import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownToLine, ChevronRight } from "lucide-react";
import { cn, FOCUS } from "./lib/cn";
import { ago, cents, count, pct, price, span, useNow, usd } from "./lib/format";
import { SPRING, SWAP, TWEEN } from "./lib/motion";
import { Face, Tabs, TeamTag } from "./parts";
import type { Holder, Person, Room } from "./types";

/*
  Under the chart: who holds the token and what's trading now. A holder's row reads like FOMO's (a figure with what
  it's made of under it) and keeps their thesis beside their numbers, so what they hold and why are read together.
  The token's own team is pinned at the top as one group that folds.
*/

type Tab = "holders" | "swaps";
const HEAD = "grid h-8 shrink-0 items-center px-5 text-note font-medium text-ink-3";
const ROW = "grid w-full items-center rounded-[10px] px-3 text-left hover:bg-white/5";
const HOLD = "grid-cols-[220px_120px_116px_120px_minmax(0,1fr)] gap-x-7";
const SWAPS = "grid-cols-[220px_64px_116px_120px_minmax(0,1fr)] gap-x-7";
const SCROLL = "no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-4 [mask-image:linear-gradient(to_bottom,#000_calc(100%-24px),transparent)]";

/** A figure over what it's made of. */
function Two({ top, under, tone }: { top: ReactNode; under: ReactNode; tone?: string }) {
  return (
    <span className="block text-right tnum">
      <b className={cn("block text-chip font-bold", tone ?? "text-ink")}>{top}</b>
      <span className={cn("block text-caption font-medium", tone ? cn(tone, "opacity-80") : "text-ink-3")}>{under}</span>
    </span>
  );
}

function Who({ p, sub, mark }: { p: Person; sub: ReactNode; mark?: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Face person={p} size={32} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <b className="truncate text-chip font-bold group-hover:text-sky">{p.name || p.handle}</b>
          {mark}
        </span>
        <span className="block truncate text-caption font-medium text-ink-3">{sub}</span>
      </span>
    </span>
  );
}

export function Holders({ room, open, onOpen, onPerson }: { room: Room; open: string | null; onOpen: (id: string | null) => void; onPerson?: (p: Person, from: HTMLElement) => void }) {
  const now = useNow();
  const [tab, setTab] = useState<Tab>("holders");
  const [teamShown, setTeamShown] = useState(true);
  const { token } = room;
  const team = room.holders.filter((h) => h.team);

  const row = (h: Holder) => {
    const up = h.pnl >= 0;
    const share = h.cost > 0 ? h.pnl / h.cost : null;
    const t = h.thesis;
    const on = !!t && open === t.id;
    const held = span(h.held);
    return (
      <div key={h.person.id} className={cn(ROW, HOLD, "h-14")}>
        <button type="button" onClick={(e) => onPerson?.(h.person, e.currentTarget)} className={cn("group min-w-0 rounded-[10px] text-left", FOCUS)}>
          <Who
            p={h.person}
            sub={`@${h.person.handle}${held ? ` · avg hold ${held}` : ""}`}
            mark={
              h.received && (
                <span title="Transferred in" className="grid size-4 shrink-0 place-items-center rounded-[5px] bg-white/10 text-ink-2">
                  <ArrowDownToLine size={11} />
                </span>
              )
            }
          />
        </button>
        <Two top={cents(h.value)} under={`${count(Math.round(h.amount))} ${token.symbol}`} />
        <Two top={`${up ? "+" : "-"}${cents(Math.abs(h.pnl))}`} under={share != null ? pct(share) : up ? "up" : "down"} tone={up ? "text-up" : "text-down"} />
        <Two top={token.supply ? `${usd(h.entry * token.supply)} MC` : "-"} under={price(h.entry)} />
        {t ? (
          <button type="button" data-thesis={t.id} aria-pressed={on} onClick={() => onOpen(on ? null : t.id)} className={cn("group min-w-0 rounded-[10px] text-left", FOCUS)}>
            <span className={cn("line-clamp-2 text-chip leading-[18px] font-medium whitespace-pre-line [overflow-wrap:anywhere] group-hover:text-ink", on ? "text-ink" : "text-ink-2")}>{t.text}</span>
          </button>
        ) : (
          <span className="text-chip font-medium text-ink-3">No thesis</span>
        )}
      </div>
    );
  };

  return (
    <section className="flex h-[300px] shrink-0 flex-col border-t border-white/8 select-none">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Tabs
          options={[
            { id: "holders", name: "Holders", n: room.fomoHolders != null ? count(room.fomoHolders) : undefined },
            { id: "swaps", name: "Swaps" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        {tab === "holders" ? (
          <motion.div key="holders" {...SWAP} className="flex min-h-0 flex-1 flex-col">
            <div className={cn(HEAD, HOLD)}>
              <span>Trader</span>
              <span className="text-right">Position</span>
              <span className="text-right">PnL</span>
              <span className="text-right">Entry</span>
              <span>Thesis</span>
            </div>
            <div className={SCROLL}>
              {team.length > 0 && (
                <div className="mb-1 rounded-[12px] bg-fomo/10 shadow-[inset_0_0_0_1px_rgb(81_106_246/0.3)]">
                  <button type="button" aria-expanded={teamShown} onClick={() => setTeamShown(!teamShown)} className={cn("flex h-9 w-full items-center gap-2 rounded-[12px] px-3 text-left hover:bg-white/5", FOCUS)}>
                    <TeamTag />
                    <span className="text-note font-medium text-ink-2 tnum">
                      {team.length === 1 ? "1 holder" : `${team.length} holders`} · {cents(team.reduce((n, h) => n + h.value, 0))}
                    </span>
                    <ChevronRight size={14} className={cn("ml-auto text-ink-3 transition-transform", teamShown && "rotate-90")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {teamShown && (
                      <motion.div key="team" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0, transition: TWEEN.exit }} transition={SPRING.glide} className="overflow-hidden">
                        {team.map(row)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {room.holders.filter((h) => !h.team).map(row)}
            </div>
          </motion.div>
        ) : (
          <motion.div key="swaps" {...SWAP} className="flex min-h-0 flex-1 flex-col">
            <div className={cn(HEAD, SWAPS)}>
              <span>Trader</span>
              <span />
              <span className="text-right">Size</span>
              <span className="text-right">MC</span>
              <span className="text-right">Time</span>
            </div>
            <div className={SCROLL}>
              {room.swaps.map((s) => (
                <div key={s.id} className={cn(ROW, SWAPS, "h-12")}>
                  <button type="button" onClick={(e) => onPerson?.(s.person, e.currentTarget)} className={cn("group min-w-0 rounded-[10px] text-left", FOCUS)}>
                    <Who p={s.person} sub={`@${s.person.handle}`} />
                  </button>
                  <b className={cn("text-chip font-bold", s.buy ? "text-up" : "text-down")}>{s.buy ? "Buy" : "Sell"}</b>
                  <b className="text-right text-chip font-bold tnum">{cents(s.usd)}</b>
                  <Two top={usd(s.mcap)} under={price(s.price)} />
                  <span className="text-right text-chip font-medium text-ink-3 tnum">{ago(s.at, now)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
