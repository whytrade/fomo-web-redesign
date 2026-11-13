import { useState } from "react";
import { Heart } from "lucide-react";
import { cn, FOCUS } from "./lib/cn";
import { ago, useNow, usd } from "./lib/format";
import { Face, Logo, ON } from "./parts";
import type { Person, Post, Token } from "./types";

/*
  FOMO's feed as one face of the left column. A trade is one line: who, bought or sold, which token, how much, at
  what market cap. A thesis is a message, so the words get the room. FOMO's daily recap sits at the top and opens
  in place.
*/

const SAID = { buy: "bought", sell: "sold", thesis: "on", out: "sent out", in: "brought in" } as const;

export function Feed({ posts, plain, opens, onToken, onPerson }: { posts: Post[]; /** a plain list, for inside a page that scrolls itself */ plain?: boolean; /** whether a token can be opened; posts on others are plain */ opens?: (t: Token) => boolean; onToken?: (t: Token, thesisText?: string) => void; onPerson?: (p: Person, from: HTMLElement) => void }) {
  return (
    <div className={plain ? undefined : "no-scrollbar min-h-0 flex-1 overflow-y-auto pb-5 [mask-image:linear-gradient(to_bottom,#000_calc(100%-28px),transparent)]"}>
      {posts.map((p) => (
        <FeedPost key={p.id} post={p} onToken={onToken} opens={opens} onPerson={onPerson} />
      ))}
    </div>
  );
}

function FeedPost({ post, opens, onToken, onPerson }: { post: Post; opens?: (t: Token) => boolean; onToken?: (t: Token, thesisText?: string) => void; onPerson?: (p: Person, from: HTMLElement) => void }) {
  const now = useNow();
  const [more, setMore] = useState(false);
  if (post.kind === "recap")
    return (
      <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className={cn("mb-2 block w-full rounded-[12px] px-3 py-2.5 text-left", ON, FOCUS)}>
        <span className="flex items-center gap-2">
          <b className="min-w-0 flex-1 truncate text-chip font-bold">{post.title}</b>
          <span className="shrink-0 text-note font-medium text-ink-3">{more ? "Less" : "More"}</span>
        </span>
        <span className={cn("mt-1 text-note leading-[18px] font-medium whitespace-pre-line text-ink-2", more ? "block" : "line-clamp-2")}>{post.text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")}</span>
      </button>
    );
  const p = post.person;
  const t = post.token;
  const face = (size: number) => (
    <button type="button" onClick={(e) => onPerson?.(p, e.currentTarget)} aria-label={`Open ${p.name}'s page`} className={cn("h-fit shrink-0 rounded-full", FOCUS)}>
      <Face person={p} size={size} />
    </button>
  );
  const when = <span className="ml-auto shrink-0 pl-1 text-caption font-medium text-ink-3 tnum">{ago(post.at, now)}</span>;
  const go = t && onToken && (opens?.(t) ?? true) ? () => onToken(t, post.kind === "thesis" ? (post.text ?? undefined) : undefined) : undefined;

  if (post.kind !== "thesis")
    return (
      <div className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-1.5 hover:bg-white/5">
        {face(26)}
        <button type="button" disabled={!go} onClick={go} className={cn("min-w-0 flex-1 rounded-[10px] text-left", FOCUS)}>
          <span className="flex items-center gap-1.5 text-note font-medium text-ink-3">
            <b className="min-w-0 truncate font-bold text-ink-2">{p.name || p.handle}</b>
            <span className={cn("shrink-0", post.kind === "buy" && "text-up", post.kind === "sell" && "text-down")}>{SAID[post.kind]}</span>
            {when}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-note font-medium text-ink-3 tnum">
            <Logo token={t} size={16} />
            <b className="min-w-0 truncate font-bold text-ink">{t?.symbol}</b>
            {post.usd != null && <b className={cn("shrink-0 font-bold", post.kind === "buy" ? "text-up" : post.kind === "sell" ? "text-down" : "text-ink")}>{usd(post.usd)}</b>}
            {post.mcap ? <span className="shrink-0 truncate">at {usd(post.mcap)} MC</span> : null}
          </span>
        </button>
      </div>
    );

  return (
    <article className="flex gap-2.5 px-2.5 py-2">
      {face(30)}
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-note font-medium text-ink-3">
          <b className="min-w-0 truncate font-bold text-ink-2">{p.name || p.handle}</b>
          <span className="shrink-0">on</span>
          <Logo token={t} size={15} />
          <b className="min-w-0 truncate font-bold text-ink">{t?.symbol}</b>
          {when}
        </span>
        <button type="button" disabled={!go} onClick={go} className={cn("mt-1 block w-full rounded-[4px_12px_12px_12px] bg-white/6 px-3 py-2 text-left shadow-[inset_0_0_0_1px_rgb(203_208_235/0.06)] enabled:hover:bg-white/9", FOCUS)}>
          {post.text && <span className="line-clamp-4 text-chip leading-[19px] font-medium whitespace-pre-line [overflow-wrap:anywhere]">{post.text}</span>}
          {((post.pnl != null && Math.abs(post.pnl) >= 1) || post.likes > 0) && (
            <span className="mt-1.5 flex items-center gap-3 text-note font-medium text-ink-3 tnum">
              {post.pnl != null && Math.abs(post.pnl) >= 1 && (
                <span>
                  <b className={cn("font-bold", post.pnl >= 0 ? "text-up" : "text-down")}>
                    {post.pnl >= 0 ? "+" : "-"}
                    {usd(Math.abs(post.pnl))}
                  </b>{" "}
                  PnL
                </span>
              )}
              {post.likes > 0 && (
                <span className="flex items-center gap-1 font-bold text-ink-2">
                  <Heart size={12} strokeWidth={2.2} />
                  {post.likes}
                </span>
              )}
            </span>
          )}
        </button>
      </div>
    </article>
  );
}
