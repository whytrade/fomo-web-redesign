import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Heart as HeartIcon } from "lucide-react";
import { cn, FOCUS } from "./lib/cn";
import { usd } from "./lib/format";
import { SPRING, TWEEN } from "./lib/motion";
import type { Person, Token } from "./types";

/*
  Small parts the bigger components share: a trader's face, a token's logo, tabs with a sliding marker, the heart,
  the rank tag and the stake chip.
*/

const GROUNDS = ["#FF4E51", "#73CCFF", "#45FE82", "#FF6FE9", "#516AF6", "#4356FF", "#FF8649"];
const groundOf = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GROUNDS[h % GROUNDS.length];
};

/** A trader's own picture. Someone with none gets a plain disc of their own colour. */
export function Face({ person, size, className }: { person: Pick<Person, "id" | "avatar"> | null; size: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = !broken ? person?.avatar : null;
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(203_208_235/0.16)]", className)}
      style={{ width: size, height: size, background: src ? "rgb(255 255 255 / 0.08)" : groundOf(person?.id ?? "") }}
    >
      {src && <img src={src} alt="" width={size} height={size} draggable={false} onError={() => setBroken(true)} className="size-full object-cover" />}
    </span>
  );
}

/** A token's logo. One with none is a dim disc. Never a trader's face, never a letter. */
export function Logo({ token, size, className }: { token: Pick<Token, "symbol" | "logo"> | null | undefined; size: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = !broken ? token?.logo : null;
  return (
    <span
      className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full", className)}
      style={{ width: size, height: size, background: src ? "rgb(255 255 255 / 0.08)" : `color-mix(in srgb, ${groundOf(token?.symbol ?? "")} 38%, #1b1a2e)` }}
    >
      {src && <img src={src} alt="" width={size} height={size} draggable={false} onError={() => setBroken(true)} className="size-full object-cover" />}
    </span>
  );
}

export const ON = "bg-white/8 shadow-[inset_0_0_0_1px_rgb(203_208_235/0.1),inset_0_1px_0_rgb(255_255_255/0.06)]";

/** A few choices side by side, with a marker that slides to the one picked. */
export function Tabs<T extends string>({ options, value, onChange, fill, className }: { options: { id: T; name: string; n?: string }[]; value: T; onChange: (v: T) => void; fill?: boolean; className?: string }) {
  const id = useId();
  return (
    <div role="tablist" className={cn("flex items-center gap-0.5", className)}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.id)}
            className={cn("relative h-8 rounded-[10px] px-3 text-chip font-bold whitespace-nowrap", fill && "flex-1", on ? "text-ink" : "text-ink-3 hover:text-ink-2", FOCUS)}
          >
            {on && <motion.i layoutId={`tab-${id}`} className={cn("absolute inset-0 rounded-[10px]", ON)} transition={SPRING.snap} />}
            <span className="relative">
              {o.name}
              {o.n && <span className="ml-1.5 font-medium text-ink-3 tnum">{o.n}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const ROLL = {
  enter: (up: boolean) => ({ y: up ? 12 : -12, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  leave: (up: boolean) => ({ y: up ? -12 : 12, opacity: 0, transition: TWEEN.exit }),
};

/** The heart: fills when pressed and the count rolls with it; a second press takes it back. */
export function Heart({ likes, liked, onToggle }: { likes: number; liked: boolean; onToggle: () => void }) {
  const n = likes + (liked ? 1 : 0);
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      onClick={onToggle}
      className={cn("-mr-1 flex h-7 min-w-10 items-center justify-center gap-1 rounded-[8px] px-1.5 text-note font-bold transition-colors", liked ? "bg-down/12 text-down" : "text-ink-3 hover:bg-white/6 hover:text-ink", FOCUS)}
    >
      <motion.span key={String(liked)} initial={liked ? { scale: 0.7 } : false} animate={{ scale: 1 }} transition={SPRING.pop} className="grid">
        <HeartIcon size={15} strokeWidth={2.2} fill={liked ? "currentColor" : "none"} />
      </motion.span>
      <span className="relative inline-grid overflow-hidden tnum">
        <AnimatePresence mode="popLayout" initial={false} custom={liked}>
          <motion.span key={n} custom={liked} variants={ROLL} initial="enter" animate="center" exit="leave" transition={SPRING.snap} className="col-start-1 row-start-1">
            {n > 0 ? n : ""}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}

/** Gold, silver and bronze for the top three. */
export const METAL = {
  1: { rim: "conic-gradient(from 210deg, #fff4c2, #f2c24b 18%, #9a6a12 38%, #ffe28a 56%, #c8922a 76%, #fff4c2)", tint: "rgb(242 194 75)", ink: "#2a1d02" },
  2: { rim: "conic-gradient(from 210deg, #ffffff, #c9cfdc 20%, #6f7789 40%, #eef1f7 58%, #9aa2b3 78%, #ffffff)", tint: "rgb(201 207 220)", ink: "#1b1e26" },
  3: { rim: "conic-gradient(from 210deg, #ffd9b5, #d48b4f 20%, #7c4519 40%, #f3b47d 58%, #a8642f 78%, #ffd9b5)", tint: "rgb(212 139 79)", ink: "#2b1404" },
} as const;

/** "#4 24H": where someone stands on the leaderboard, beside their name. */
export function RankTag({ rank }: { rank: Person["rank"] }) {
  if (!rank) return null;
  const m = rank.place <= 3 ? METAL[rank.place as 1 | 2 | 3] : null;
  return (
    <b
      title={`#${rank.place} on the ${rank.span} leaderboard`}
      className={cn("shrink-0 rounded-[6px] px-1.5 py-0.5 text-micro font-bold whitespace-nowrap tnum", !m && "bg-white/10 text-ink shadow-[inset_0_0_0_1px_rgb(203_208_235/0.14)]")}
      style={m ? { background: m.rim, color: m.ink } : undefined}
    >
      #{rank.place} <span className={m ? "opacity-70" : "text-ink-3"}>{rank.span}</span>
    </b>
  );
}

export const TeamTag = () => <b className="shrink-0 rounded-[6px] bg-fomo px-1.5 py-0.5 text-micro font-bold text-white">Team</b>;

/**
 * What the writer holds now and what that is up or down. A bigger stake sits on a stronger ground, weighed against
 * the biggest in the room. Someone who sold out says so.
 */
export function Stake({ holds, pnl, most }: { holds: number | null; pnl: number | null; most: number }) {
  const gain = pnl != null && Math.abs(pnl) >= 1 ? pnl : null;
  const tone = gain == null ? "" : gain >= 0 ? "text-up" : "text-down";
  if (holds != null && holds >= 1) {
    const w = Math.max(0, Math.min(1, Math.log10(1 + holds) / Math.log10(1 + most)));
    return (
      <span className="flex h-6 items-center gap-1.5 rounded-[7px] px-1.5 text-caption tnum" style={{ background: `rgb(203 208 235 / ${0.05 + w * 0.09})` }}>
        <span>
          <span className="font-medium text-ink-3">holds </span>
          <b className="font-bold text-ink">{usd(holds)}</b>
        </span>
        {gain != null && <b className={cn("font-bold", tone)}>{gain >= 0 ? "up" : "down"} {usd(Math.abs(gain))}</b>}
      </span>
    );
  }
  if (holds === 0)
    return (
      <span className="flex h-6 items-center gap-1.5 rounded-[7px] bg-white/5 px-1.5 text-caption tnum">
        <b className="font-bold text-ink-3">sold</b>
        {gain != null && <b className={cn("font-bold", tone)}>{gain >= 0 ? "made" : "lost"} {usd(Math.abs(gain))}</b>}
      </span>
    );
  return null;
}
