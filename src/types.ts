/*
  The shapes every component takes. They are plain data: a person, a token, a thesis with its author already in it.
  Nothing here reads from anywhere.
*/

export type Person = {
  id: string;
  handle: string;
  name: string;
  avatar?: string | null;
  cover?: string | null;
  bio?: string;
  followers?: number | null;
  following?: number | null;
  trades?: number | null;
  volume?: number | null;
  joined?: string | null;
  clan?: { name: string; icon: string | null } | null;
  /** their best place on the leaderboard, if they are on it */
  rank?: { place: number; span: string } | null;
};

export type Token = {
  id: string;
  address: string;
  chain: string;
  symbol: string;
  name?: string;
  logo?: string | null;
  /** market cap in dollars */
  mcap?: number;
  /** over the last day, as a fraction */
  change?: number;
  volume?: number;
  /** all holders */
  holders?: number;
  /** holders on FOMO */
  fomoHolders?: number;
  supply?: number;
  /** when it was made, ms */
  born?: number;
  /** how old, as FOMO's Discover says it ("19h", "3mo"), where it said it */
  age?: string;
  launchpad?: string;
  about?: string;
  /** price per token, dollars */
  price?: number;
  /** the newest thesis on it, for the Discover table */
  said?: { person: Person; text: string; at: number | null } | null;
};

/** A perp market, as Discover lists it. */
export type Perp = {
  name: string;
  maxLeverage: number;
  price: number | null;
  /** over the last day, as a fraction */
  change: number | null;
  /** a day's volume, dollars */
  volume: number | null;
  /** open interest, dollars */
  oi: number | null;
  /** funding an hour, as a fraction: above zero, longs pay shorts */
  funding: number | null;
};

export type Candle = { t: number; o: number; h: number; l: number; c: number };

export type Thesis = {
  id: string;
  author: Person;
  at: number;
  text: string;
  /** the price and market cap when it was written */
  price: number | null;
  mcap: number | null;
  likes: number;
  /** what the author holds now, in dollars, and what that is up or down */
  holds: number | null;
  pnl: number | null;
  /** written by the token's own team */
  team?: boolean;
  /** when it was written isn't known (a thesis known only from a Discover row): no time is shown for it */
  undated?: boolean;
};

export type Holder = {
  person: Person;
  value: number;
  amount: number;
  pnl: number;
  cost: number;
  /** average entry price */
  entry: number;
  /** average hold, seconds */
  held: number | null;
  /** transferred in rather than bought */
  received?: boolean;
  thesis: Thesis | null;
  team?: boolean;
};

export type Swap = { id: string; person: Person; buy: boolean; at: number; usd: number; mcap: number; price: number };

/** Everything one token's page shows. */
export type Room = {
  token: Token;
  /** candle width, ms */
  interval: number;
  candles: Candle[];
  /** how many FOMO users hold it */
  fomoHolders: number | null;
  theses: Thesis[];
  holders: Holder[];
  swaps: Swap[];
};

export type BoardSpan = "24h" | "7d" | "30d" | "all-time";
export const SPANS: { id: BoardSpan; name: string }[] = [
  { id: "24h", name: "24H" },
  { id: "7d", name: "1W" },
  { id: "30d", name: "1M" },
  { id: "all-time", name: "All" },
];

export type Ranked = {
  rank: number;
  person: Person;
  /** made over the span */
  pnl: number | null;
  /** their biggest holdings */
  holdings: { symbol: string; logo: string | null; value: number; pnl: number }[];
};

export type Post =
  | { id: string; kind: "recap"; at: number; title: string; text: string }
  | { id: string; kind: "buy" | "sell" | "thesis" | "out" | "in"; at: number; person: Person; token: Token | null; usd: number | null; mcap: number | null; pnl: number | null; text: string | null; likes: number };

/** A trader's page: who they are and what the rest of the data says of them. */
export type Profile = {
  person: Person;
  /** made on each leaderboard span they're on */
  made: Partial<Record<BoardSpan, number>>;
  holdings: Ranked["holdings"];
  theses: { token: Token; thesis: Thesis }[];
  posts: Post[];
};
