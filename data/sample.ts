import type { BoardSpan, Holder, Perp, Person, Post, Profile, Ranked, Room, Thesis, Token } from "../src/types";
import { SPANS } from "../src/types";
import raw from "./fomo-sample.json";

/*
  The sample: one capture of FOMO's public data, kept as JSON, turned here into the plain shapes the components take.
  People are kept once by id in the file and put back into each thesis, holder and post.
*/

type RawThesis = Omit<Thesis, "author"> & { who: string };
type RawRoom = {
  interval: "1h" | "5m";
  candles: Room["candles"];
  fomoHolders: number | null;
  theses: RawThesis[];
  holders: (Omit<Holder, "person" | "thesis"> & { who: string; thesis: string | null })[];
  swaps: { id: string; who: string; buy: boolean; at: number; usd: number; mcap: number; price: number }[];
};
type RawPost =
  | { id: string; kind: "recap"; at: number; title: string; text: string }
  | { id: string; kind: "buy" | "sell" | "thesis" | "out" | "in"; at: number; who: string; token: string; usd: number | null; mcap: number | null; pnl: number | null; text: string | null; likes: number };
type Raw = {
  capturedAt: number;
  source: string;
  tokens: Record<string, Omit<Token, "said"> & { said?: { who: string; text: string; at: number | null } }>;
  people: Record<string, Person>;
  lists: { trending: string[]; held: string[] };
  rooms: Record<string, RawRoom>;
  board: Record<BoardSpan, { rank: number; who: string; pnl: number | null; holdings: Ranked["holdings"] }[]>;
  feed: RawPost[];
  perps: { at: number; source: string; markets: Perp[] };
};

const R = raw as unknown as Raw;

// each person's best place on any span, for the rank tag beside their name
for (const s of SPANS)
  for (const r of R.board[s.id]) {
    const p = R.people[r.who];
    if (p && (!p.rank || r.rank < p.rank.place)) p.rank = { place: r.rank, span: s.name };
  }

const someone = (id: string): Person => R.people[id] ?? { id, handle: "", name: "Someone" };

// each token with its newest thesis's writer put back in
const tokens: Record<string, Token> = Object.fromEntries(Object.entries(R.tokens).map(([id, { said, ...t }]) => [id, { ...t, said: said ? { person: someone(said.who), text: said.text, at: said.at } : null }]));
const MS = { "1h": 3_600_000, "5m": 300_000 };

const rooms: Record<string, Room> = {};
for (const [id, r] of Object.entries(R.rooms)) {
  const theses = r.theses.map(({ who, ...t }) => ({ ...t, author: someone(who) }));
  const byId = new Map(theses.map((t) => [t.id, t]));
  rooms[id] = {
    token: tokens[id],
    interval: MS[r.interval],
    candles: r.candles,
    fomoHolders: r.fomoHolders,
    theses,
    holders: r.holders.map(({ who, thesis, ...h }) => ({ ...h, person: someone(who), thesis: thesis ? (byId.get(thesis) ?? null) : null })),
    swaps: r.swaps.map(({ who, ...s }) => ({ ...s, person: someone(who) })),
  };
}

const board = Object.fromEntries(SPANS.map((s) => [s.id, R.board[s.id].map(({ who, ...r }) => ({ ...r, person: someone(who) }))])) as Record<BoardSpan, Ranked[]>;

const feed: Post[] = R.feed.map((p) => (p.kind === "recap" ? p : { ...p, person: someone(p.who), token: tokens[p.token] ?? null }));

function profile(id: string): Profile {
  const made: Profile["made"] = {};
  let holdings: Profile["holdings"] = [];
  for (const s of SPANS) {
    const row = board[s.id].find((r) => r.person.id === id);
    if (row?.pnl != null) made[s.id] = row.pnl;
    if (row && row.holdings.length > holdings.length) holdings = row.holdings;
  }
  const theses = Object.values(rooms).flatMap((room) => room.theses.filter((t) => t.author.id === id).map((thesis) => ({ token: room.token, thesis })));
  return { person: someone(id), made, holdings, theses: theses.sort((a, b) => b.thesis.at - a.thesis.at), posts: feed.filter((p) => p.kind !== "recap" && p.person.id === id) };
}

export const sample = {
  /** when the capture was read: every "2h ago" is against this */
  at: R.capturedAt,
  source: R.source,
  tokens,
  people: Object.values(R.people),
  lists: { trending: R.lists.trending.map((id) => tokens[id]).filter(Boolean), held: R.lists.held.map((id) => tokens[id]).filter(Boolean) },
  /** the top perps by a day's volume, read from Hyperliquid once, at `perps.at` */
  perps: R.perps,
  rooms,
  board,
  feed,
  profile,
};
