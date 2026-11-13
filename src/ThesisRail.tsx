import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ChevronRight } from "lucide-react";
import { cn, FOCUS } from "./lib/cn";
import { ago, useNow, usd } from "./lib/format";
import { SPRING, TWEEN } from "./lib/motion";
import { Face, Heart, RankTag, Stake, TeamTag } from "./parts";
import type { Person, Room, Thesis } from "./types";

/*
  What people say about the token, beside its chart: newest first, read like a chat. Each trader's latest thesis
  stands for them, with what they said before one press away ("2 earlier"). The team's are pinned at the top. A
  thesis says who wrote it, where they stand on the leaderboard, what they hold now and whether it's up or down.
  Pressing the words opens the thesis on its candle. Yours is written in the box at the top and sits above it.
*/

type Said = { last: Thesis; before: Thesis[] };

export function ThesisRail({
  room,
  open,
  onOpen,
  onPerson,
  you,
}: {
  room: Room;
  open: string | null;
  onOpen: (id: string | null) => void;
  onPerson?: (p: Person, from: HTMLElement) => void;
  /** who "you" are: your picture beside the box */
  you: Pick<Person, "id" | "avatar" | "name">;
}) {
  const [liked, setLiked] = useState<ReadonlySet<string>>(new Set());
  const [threads, setThreads] = useState<ReadonlySet<string>>(new Set());
  const [mine, setMine] = useState<{ text: string; at: number } | null>(null);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const toggle = (set: ReadonlySet<string>, k: string) => new Set(set.has(k) ? [...set].filter((x) => x !== k) : [...set, k]);

  const { pinned, lines, most } = useMemo(() => {
    const by = new Map<string, Said>();
    for (const t of [...room.theses].sort((a, b) => a.at - b.at)) {
      const was = by.get(t.author.id);
      by.set(t.author.id, was ? { last: t, before: [...was.before, was.last] } : { last: t, before: [] });
    }
    const said = [...by.values()].sort((a, b) => b.last.at - a.last.at);
    return { pinned: said.filter((s) => s.last.team), lines: said.filter((s) => !s.last.team).slice(0, 80), most: Math.max(1, ...said.map((s) => s.last.holds ?? 0)) };
  }, [room.theses]);

  // opened from its face on the chart, a thesis scrolls into view here
  useEffect(() => {
    if (open) scroller.current?.querySelector(`[data-thesis="${CSS.escape(open)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [open]);

  const post = () => {
    const text = draft.trim();
    if (!text) return;
    setMine((m) => ({ text, at: m?.at ?? Date.now() }));
    setDraft("");
  };
  const card = (s: Said, team = false) => (
    <Card
      key={s.last.author.id}
      said={s}
      team={team}
      most={most}
      liked={liked.has(s.last.id)}
      onLike={() => setLiked((l) => toggle(l, s.last.id))}
      open={open}
      shown={threads.has(s.last.author.id) || s.before.some((b) => b.id === open)}
      onThread={() => setThreads((t) => toggle(t, s.last.author.id))}
      onOpen={onOpen}
      onPerson={onPerson}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          post();
        }}
        className="shrink-0 px-3 pb-3"
      >
        <AnimatePresence initial={false}>
          {mine && (
            <motion.article key="mine" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: TWEEN.exit }} transition={SPRING.arrive} className="pb-3">
              <div className="flex h-7 items-center gap-2">
                <Face person={you} size={24} />
                <b className="text-chip font-bold">You</b>
                <span className="ml-auto flex items-center gap-0.5">
                  <button type="button" onClick={() => setDraft(mine.text)} className={cn("h-7 rounded-[8px] px-1.5 text-note font-bold text-ink-2 hover:bg-white/6 hover:text-ink", FOCUS)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => setMine(null)} className={cn("-mr-1 h-7 rounded-[8px] px-1.5 text-note font-bold text-ink-2 hover:bg-white/6 hover:text-down", FOCUS)}>
                    Remove
                  </button>
                </span>
              </div>
              <p className="mt-1 rounded-[10px] bg-fomo/12 px-2 py-1.5 text-label leading-[21px] font-medium [overflow-wrap:anywhere]">{mine.text}</p>
            </motion.article>
          )}
        </AnimatePresence>
        <div className="flex items-end gap-2">
          <Face person={you} size={32} className="mb-1" />
          <textarea
            value={draft}
            rows={Math.min(5, Math.max(1, draft.split("\n").length, Math.ceil(draft.length / 32)))}
            maxLength={500}
            aria-label="Your thesis"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                post();
              }
            }}
            placeholder={mine ? "Change your thesis" : `Your thesis on ${room.token.symbol}`}
            className="min-h-10 flex-1 resize-none rounded-[12px] bg-white/6 px-3 py-2.5 text-label leading-5 font-medium shadow-[inset_0_0_0_1px_rgb(203_208_235/0.08)] outline-none placeholder:text-ink-3 focus:shadow-[inset_0_0_0_1px_rgb(203_208_235/0.28)]"
          />
          <button type="submit" disabled={!draft.trim()} aria-label="Post your thesis" className={cn("grid size-10 shrink-0 place-items-center rounded-[12px] bg-fomo text-white hover:bg-[#6079ff] disabled:bg-white/6 disabled:text-ink-3", FOCUS)}>
            <ArrowDown size={17} strokeWidth={2.4} />
          </button>
        </div>
      </form>
      {pinned.length > 0 && <div className="flex shrink-0 flex-col gap-2 border-t border-white/8 px-3 pt-3 pb-1">{pinned.slice(0, 2).map((s) => card(s, true))}</div>}
      <div ref={scroller} className="no-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-white/8 px-3 pb-4 [mask-image:linear-gradient(to_bottom,transparent,#000_18px,#000_calc(100%-24px),transparent)]">
        {!lines.length && !pinned.length && <p className="px-2 pt-4 text-chip font-medium text-ink-3">Nobody has written a thesis on {room.token.symbol} yet</p>}
        {lines.map((s) => card(s))}
      </div>
    </div>
  );
}

function Card({ said, team, most, liked, onLike, open, shown, onThread, onOpen, onPerson }: { said: Said; team: boolean; most: number; liked: boolean; onLike: () => void; open: string | null; shown: boolean; onThread: () => void; onOpen: (id: string | null) => void; onPerson?: (p: Person, from: HTMLElement) => void }) {
  const now = useNow();
  const { last: t, before } = said;
  const p = t.author;
  return (
    <article className={cn("py-3", team ? "-mx-1 rounded-[12px] bg-fomo/10 px-1 shadow-[inset_0_0_0_1px_rgb(81_106_246/0.3)]" : "border-b border-white/6")}>
      <div className="flex h-7 items-center gap-2">
        <button type="button" onClick={(e) => onPerson?.(p, e.currentTarget)} aria-label={`Open ${p.name}'s page`} className={cn("group -ml-1 flex h-7 min-w-0 items-center gap-2 rounded-[8px] pr-1.5 pl-1 hover:bg-white/6", FOCUS)}>
          <Face person={p} size={24} />
          <b className="truncate text-chip font-bold group-hover:text-sky">{p.name || p.handle}</b>
          <ChevronRight size={12} className="-ml-1 shrink-0 text-ink-3 group-hover:text-sky" />
        </button>
        {team && <TeamTag />}
        <RankTag rank={p.rank} />
        {!t.undated && <span className="shrink-0 text-caption font-medium text-ink-3 tnum">{ago(t.at, now)}</span>}
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <Stake holds={t.holds} pnl={t.pnl} most={most} />
          <Heart likes={t.likes} liked={liked} onToggle={onLike} />
        </span>
      </div>
      <Words t={t} open={open} clamp={team ? 2 : 4} onOpen={onOpen} />
      {before.length > 0 && (
        <button type="button" aria-expanded={shown} onClick={onThread} className={cn("-mb-1.5 ml-1 block h-5 rounded-[5px] px-1 text-micro font-medium text-ink-3 hover:bg-white/6 hover:text-ink", FOCUS)}>
          {shown ? "Hide earlier" : `${before.length} earlier`}
        </button>
      )}
      <AnimatePresence initial={false}>
        {shown && (
          <motion.div key="earlier" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0, transition: TWEEN.exit }} transition={SPRING.glide} className="overflow-hidden">
            <div className="ml-3 flex flex-col gap-0.5 border-l-2 border-white/10 pt-1 pl-2">
              {[...before].reverse().map((b) => (
                <Words key={b.id} t={b} open={open} clamp={2} earlier onOpen={onOpen} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

/** The words, the thing on the card. A press opens the thesis on its candle and says where it was written. */
function Words({ t, open, clamp, earlier, onOpen }: { t: Thesis; open: string | null; clamp: 2 | 4; earlier?: boolean; onOpen: (id: string | null) => void }) {
  const now = useNow();
  const on = open === t.id;
  return (
    <button
      type="button"
      data-thesis={t.id}
      aria-expanded={on}
      onClick={() => onOpen(on ? null : t.id)}
      className={cn("mt-1 block w-full rounded-[10px] px-2 py-1.5 text-left transition-[background-color,box-shadow]", on ? "bg-fomo/16 shadow-[inset_0_0_0_1px_rgb(81_106_246/0.6)]" : "hover:bg-white/5", FOCUS)}
    >
      {earlier && <span className="mr-1.5 text-caption font-medium text-ink-3 tnum">{ago(t.at, now)}</span>}
      <span className={cn("font-medium whitespace-pre-line [overflow-wrap:anywhere]", earlier ? "text-chip leading-[19px] text-ink-2" : "text-label leading-[21px]", on ? !earlier && "block" : clamp === 2 ? "line-clamp-2" : "line-clamp-4")}>{t.text}</span>
      {on && t.mcap != null && <span className="block pt-1 text-caption font-medium text-ink-3 tnum">Written at {usd(t.mcap)} MC</span>}
    </button>
  );
}
