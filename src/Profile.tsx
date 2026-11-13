import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ArrowLeft, Heart, Maximize2, Minimize2, X } from "lucide-react";
import { cn, FOCUS } from "./lib/cn";
import { ago, count, month, signed, useNow, usd } from "./lib/format";
import { SPRING, TWEEN } from "./lib/motion";
import { Feed } from "./Feed";
import { Face, Logo, RankTag, Tabs } from "./parts";
import { SPANS, type BoardSpan, type Profile, type Thesis, type Token } from "./types";

/*
  A trader's page. It opens as a sheet that grows out of whatever was pressed (a face, a row, a podium place) and
  can expand into a full page over the room; collapse folds it back. Their face travels between the two. A thesis
  of theirs opens on its token's chart.
*/

type Go = (token: Token, thesis: Thesis) => void;

export function ProfileSheet({ profile, from, onExpand, onClose, onThesis }: { profile: Profile; /** what was pressed to open it */ from: DOMRect; onExpand: () => void; onClose: () => void; onThesis?: Go }) {
  const sheet = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<{ left: number; top: number; origin: string } | null>(null);
  useLayoutEffect(() => {
    const W = 440;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const left = from.right + 12 + W < vw - 12 ? from.right + 12 : Math.max(12, from.left - 12 - W);
    const top = Math.min(Math.max(12, from.top - 40), Math.max(12, vh - 640));
    setSpot({ left, top, origin: `${from.left + from.width / 2 - left}px ${from.top + from.height / 2 - top}px` });
  }, [from]);
  useEffect(() => {
    const away = (e: PointerEvent) => !sheet.current?.contains(e.target as Node) && !(e.target as Element)?.closest?.("[data-thesis],[data-face]") && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);
  if (!spot) return null;
  return createPortal(
    <motion.div
      ref={sheet}
      role="dialog"
      aria-label={profile.person.name}
      className="glass-pop no-scrollbar fixed z-40 max-h-[calc(100vh-24px)] w-[440px] overflow-y-auto rounded-[18px] px-5 pb-6 text-ink"
      style={{ left: spot.left, top: spot.top, transformOrigin: spot.origin }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6, transition: TWEEN.exit }}
      transition={SPRING.arrive}
    >
      <div className="sticky top-0 z-10 -mx-5 flex h-14 items-center gap-2 bg-[rgb(27_26_46/0.9)] px-5 backdrop-blur-md">
        <b className="min-w-0 flex-1 truncate text-title font-bold">{profile.person.name || profile.person.handle}</b>
        <button type="button" onClick={onExpand} className={cn("flex h-9 items-center gap-1.5 rounded-[10px] bg-white/6 px-3 text-chip font-bold text-ink-2 hover:bg-white/12 hover:text-ink", FOCUS)}>
          <Maximize2 size={14} />
          Expand
        </button>
        <button type="button" onClick={onClose} aria-label="Close" className={cn("grid size-9 place-items-center rounded-[10px] bg-white/6 text-ink-2 hover:bg-white/12 hover:text-ink", FOCUS)}>
          <X size={16} />
        </button>
      </div>
      <Body profile={profile} onThesis={onThesis} />
    </motion.div>,
    document.body,
  );
}

/** The full page, over the room's sheet. */
export function ProfilePage({ profile, back, onBack, onCollapse, onThesis }: { profile: Profile; /** what "back" returns to, by name */ back: string; onBack: () => void; onCollapse: (from: DOMRect) => void; onThesis?: Go }) {
  return (
    <motion.div
      className="no-scrollbar absolute inset-0 z-20 overflow-y-auto rounded-[20px] bg-[#0e0d1a] px-14 pb-10 text-ink"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: TWEEN.exit }}
      transition={SPRING.glide}
    >
      <div className="flex h-[72px] items-center justify-between">
        <button type="button" onClick={onBack} className={cn("flex h-9 items-center gap-1.5 rounded-[10px] bg-white/6 px-3 text-chip font-bold text-ink-2 hover:bg-white/12 hover:text-ink", FOCUS)}>
          <ArrowLeft size={14} />
          Back to {back}
        </button>
        <button type="button" onClick={(e) => onCollapse(e.currentTarget.getBoundingClientRect())} className={cn("flex h-9 items-center gap-1.5 rounded-[10px] bg-white/6 px-3 text-chip font-bold text-ink-2 hover:bg-white/12 hover:text-ink", FOCUS)}>
          <Minimize2 size={14} />
          Collapse
        </button>
      </div>
      <Body profile={profile} wide onThesis={onThesis} />
    </motion.div>
  );
}

function Body({ profile, wide, onThesis }: { profile: Profile; wide?: boolean; onThesis?: Go }) {
  const p = profile.person;
  const [following, setFollowing] = useState(false);
  // a holding the data can't name is left out rather than shown as a bare number
  const holdings = profile.holdings.filter((h) => h.symbol);
  const ranked = holdings.length > 0 || SPANS.some((s) => profile.made[s.id] != null);
  const head = (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div className={cn("overflow-hidden rounded-[14px] bg-[linear-gradient(120deg,rgb(81_106_246/0.28),rgb(122_82_246/0.12)_55%,rgb(255_255_255/0.03))]", wide ? "h-36" : "-mx-5 h-24 rounded-none")}>
          {p.cover && <img src={p.cover} alt="" className="size-full object-cover" />}
        </div>
        <div className={cn("flex items-end gap-4", wide ? "-mt-12 px-6" : "-mt-9")}>
          <motion.span layoutId={`face-${p.id}`} className="block rounded-full ring-4 ring-[#1e1d32]">
            <Face person={p} size={wide ? 104 : 72} />
          </motion.span>
          <div className={cn("min-w-0 flex-1", wide ? "pb-1" : "hidden")}>
            <b className="block truncate text-display font-bold">{p.name || p.handle}</b>
          </div>
          <button type="button" aria-pressed={following} onClick={() => setFollowing(!following)} className={cn("h-9 w-[100px] shrink-0 rounded-[10px] text-chip font-bold", following ? "bg-white/10 hover:bg-white/14" : "bg-fomo text-white hover:bg-[#6079ff]", FOCUS)}>
            {following ? "Following" : "Follow"}
          </button>
        </div>
      </div>
      <p className={cn("flex items-center gap-2 truncate text-note font-medium text-ink-3", wide && "px-6")}>
        <span className="truncate">
          @{p.handle}
          {p.clan && ` · ${p.clan.name}`}
          {p.joined && ` · Joined ${month(p.joined)}`}
        </span>
        <RankTag rank={p.rank} />
      </p>
      {p.bio && <p className={cn("line-clamp-4 text-label leading-[21px] font-medium whitespace-pre-line text-ink-2", wide && "px-6")}>{p.bio}</p>}
      <p className={cn("flex gap-5 text-label font-medium text-ink-3", wide && "px-6")}>
        <span>
          <b className="text-ink tnum">{count(p.following ?? 0)}</b> Following
        </span>
        <span>
          <b className="text-ink tnum">{count(p.followers ?? 0)}</b> Followers
        </span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {p.trades != null && <Tile k="Trades" v={count(p.trades)} />}
        {p.volume != null && <Tile k="Volume" v={usd(p.volume)} />}
      </div>
    </div>
  );
  const standing = (
    <>
      <Made made={profile.made} />
      {holdings.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="px-1 pb-1 text-chip font-bold text-ink-2">Biggest holdings</h3>
          {holdings.map((h, i) => (
            <div key={i} className="flex h-11 items-center gap-3 rounded-[10px] bg-white/4 px-3">
              <Logo token={h} size={24} />
              <b className="min-w-0 flex-1 truncate text-chip font-bold">{h.symbol}</b>
              <span className="text-right tnum">
                <b className="block text-chip font-bold">{usd(h.value)}</b>
                <span className={cn("block text-caption font-bold", h.pnl >= 0 ? "text-up" : "text-down")}>{signed(h.pnl)}</span>
              </span>
            </div>
          ))}
        </section>
      )}
    </>
  );
  const said = (profile.theses.length > 0 || profile.posts.length > 0) && (
    <>
      {profile.theses.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="px-1 text-chip font-bold text-ink-2">Theses</h3>
          {profile.theses.slice(0, wide ? 12 : 4).map(({ token, thesis }) => (
            <Said key={thesis.id} token={token} thesis={thesis} onThesis={onThesis} />
          ))}
        </section>
      )}
      {profile.posts.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="px-1 pb-1 text-chip font-bold text-ink-2">In the feed</h3>
          <Feed posts={profile.posts} plain />
        </section>
      )}
    </>
  );
  if (!wide)
    return (
      <div className="flex flex-col gap-5">
        {head}
        {standing}
        {said}
      </div>
    );
  return (
    <div className="flex flex-col gap-8">
      {head}
      {ranked && said ? (
        <div className="grid grid-cols-[minmax(0,1fr)_420px] gap-8">
          <div className="flex flex-col gap-6">{standing}</div>
          <div className="flex flex-col gap-6">{said}</div>
        </div>
      ) : (
        <div className="flex max-w-[880px] flex-col gap-6">{ranked ? standing : said}</div>
      )}
    </div>
  );
}

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex h-[58px] flex-col justify-center rounded-[12px] bg-white/4 px-3">
      <b className="text-figure font-bold tnum">{v}</b>
      <span className="text-caption font-medium text-ink-3">{k}</span>
    </div>
  );
}

/** What they made over each span they're on the leaderboard for. */
function Made({ made }: { made: Profile["made"] }) {
  const spans = SPANS.filter((s) => made[s.id] != null);
  const [span, setSpan] = useState<BoardSpan | null>(null);
  if (!spans.length) return null;
  const on = span && made[span] != null ? span : spans[0].id;
  const n = made[on]!;
  return (
    <section className="flex items-center justify-between rounded-[14px] bg-white/4 p-4">
      <div>
        <span className="block text-note font-medium text-ink-3">Made on the leaderboard</span>
        <motion.b key={on} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.glide} className={cn("block text-display font-bold tnum", n >= 0 ? "text-up" : "text-down")}>
          {signed(n)}
        </motion.b>
      </div>
      <Tabs options={spans} value={on} onChange={setSpan} className="rounded-[12px] bg-white/5 p-1" />
    </section>
  );
}

function Said({ token, thesis, onThesis }: { token: Token; thesis: Thesis; onThesis?: Go }) {
  const now = useNow();
  return (
    <button type="button" data-thesis={thesis.id} onClick={() => onThesis?.(token, thesis)} className={cn("flex gap-3 rounded-[12px] px-2 py-2 text-left hover:bg-white/5", FOCUS)}>
      <Logo token={token} size={28} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-3 text-chip leading-[19px] font-medium whitespace-pre-line [overflow-wrap:anywhere]">{thesis.text}</span>
        <span className="mt-1 flex items-center gap-1.5 text-caption font-medium text-ink-3 tnum">
          <b className="text-ink-2">{token.symbol}</b> · {ago(thesis.at, now)}
          {thesis.mcap != null && ` · ${usd(thesis.mcap)} MC`}
          {thesis.likes > 0 && (
            <span className="ml-auto flex items-center gap-1 font-bold text-ink-2">
              <Heart size={11} strokeWidth={2.4} />
              {thesis.likes}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
