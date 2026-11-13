import { useState, type ReactNode } from "react";
import { Check, Copy, Link, Search } from "lucide-react";
import { cn, FOCUS } from "./lib/cn";
import { ago, pct, useNow, usd } from "./lib/format";
import { Logo } from "./parts";
import type { Token } from "./types";

/*
  The token at the top of its chart, said the way FOMO says a token: by what all of it is worth. Then how old it is,
  its address to copy, a search for it on X and a link to it to copy. One row, so the chart keeps the room.
*/

const LINK = "grid size-7 shrink-0 place-items-center rounded-[8px] bg-white/6 text-ink-2 hover:bg-white/12 hover:text-ink";

export function TokenHeader({ token, mcap, right }: { token: Token; /** the market cap now, if newer than the token's */ mcap?: number; right?: ReactNode }) {
  const now = useNow();
  const [copied, setCopied] = useState<"address" | "link" | null>(null);
  const copy = (what: "address" | "link", text: string) =>
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(what);
        window.setTimeout(() => setCopied((c) => (c === what ? null : c)), 1400);
      },
      () => {},
    );
  const a = token.address;
  const ch = token.change;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 shrink-0 items-center gap-2 rounded-[10px] bg-white/7 pr-3.5 pl-1 text-label font-bold">
        <Logo token={token} size={28} />
        <span className="max-w-[12ch] truncate">{token.symbol}</span>
      </span>
      <span className="flex items-baseline gap-2">
        <span className="text-display leading-none font-bold tracking-[-0.01em] tnum">{usd(mcap ?? token.mcap)}</span>
        <span className="text-note font-medium text-ink-3">MC</span>
      </span>
      {ch != null && (
        <span className={cn("rounded-[8px] px-2 py-0.5 text-note font-bold tnum", ch >= 0 ? "bg-up/16 text-up" : "bg-down/16 text-down")} title="Over the last 24 hours">
          {pct(ch)}
        </span>
      )}
      <span className="ml-1 flex min-w-0 items-center gap-1.5">
        <i className="mr-1 h-5 w-px bg-white/10" />
        {token.born && <span className="mr-1 shrink-0 text-note font-medium text-ink-3 tnum">{ago(token.born, now)} old</span>}
        <button
          type="button"
          onClick={() => copy("address", a)}
          title="Copy address"
          className={cn("flex h-7 shrink-0 items-center gap-1.5 rounded-[8px] bg-white/6 px-2 text-note font-medium text-ink-2 tnum hover:bg-white/12 hover:text-ink", FOCUS)}
        >
          {copied === "address" ? "Copied" : `${a.slice(0, 5)}...${a.slice(-5)}`}
          {copied === "address" ? <Check size={13} className="text-up" /> : <Copy size={13} />}
        </button>
        {token.launchpad && <span className="shrink-0 px-1 text-note font-medium text-ink-3">{token.launchpad}</span>}
        <a href={`https://x.com/search?q=${encodeURIComponent(a)}`} target="_blank" rel="noopener noreferrer" title={`Search X for ${token.symbol}`} className={cn(LINK, FOCUS)}>
          <Search size={14} />
        </a>
        <button type="button" onClick={() => copy("link", `https://fomo.family/tokens/${token.chain}/${a}`)} title={copied === "link" ? "Copied" : "Copy link"} className={cn(LINK, FOCUS)}>
          {copied === "link" ? <Check size={14} className="text-up" /> : <Link size={14} />}
        </button>
      </span>
      {right && <span className="ml-auto shrink-0">{right}</span>}
    </div>
  );
}
