import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { CandleChart } from "./CandleChart";
import { Column, type ColumnProps } from "./Column";
import { Holders } from "./Holders";
import { ProfilePage, ProfileSheet } from "./Profile";
import { ThesisRail } from "./ThesisRail";
import { TokenHeader } from "./TokenHeader";
import type { Person, Profile, Room as RoomData, Thesis, Token } from "./types";

/*
  The whole concept on one screen. The left column is what there is to open; pulled wide it is FOMO's Discover, and
  the sheet slides out to the right by however far it's pulled. The sheet is one pane of glass: the token's chart
  with its traders on the candles, the theses beside it, the holders under it. A trader opens as a sheet over the
  room and can expand to a full page inside it.

  Every part is also usable on its own. This is how they fit together.
*/

export type RoomProps = Omit<ColumnProps, "current" | "onPerson" | "onToken" | "pull"> & {
  room: RoomData;
  /** a trader's page, from whatever data you have on them */
  profileOf: (person: Person) => Profile;
  you: Pick<Person, "id" | "avatar" | "name">;
  /** open a token's room, and optionally one of its theses (by id, or by its words from the feed or Discover) */
  onToken: (t: Token, thesis?: { id?: string; text?: string }) => void;
  /** the thesis to open when the room first shows */
  initialThesis?: string | null;
};

export function Room({ room, profileOf, you, onToken, initialThesis = null, ...column }: RoomProps) {
  const [open, setOpen] = useState<string | null>(initialThesis);
  const [sheet, setSheet] = useState<{ profile: Profile; from: DOMRect } | null>(null);
  const [page, setPage] = useState<Profile | null>(null);
  // how far the column is pulled past its own width: the sheet slides out by as much
  const pull = useMotionValue(0);
  useEffect(() => {
    setOpen(initialThesis);
    setPage(null);
  }, [room.token.id, initialThesis]);

  const onPerson = useCallback((p: Person, from: HTMLElement) => setSheet({ profile: profileOf(p), from: from.getBoundingClientRect() }), [profileOf]);
  const onThesis = (token: Token, thesis: Thesis) => {
    setSheet(null);
    setPage(null);
    if (token.id === room.token.id) setOpen(thesis.id);
    else onToken(token, { id: thesis.id });
  };
  const last = room.candles.at(-1)?.c;

  return (
    <div className="fomo-backdrop flex h-dvh min-h-0 gap-3 overflow-hidden p-3 text-ink">
      <Column {...column} pull={pull} current={room.token.id} onPerson={onPerson} onToken={(t, text) => onToken(t, text ? { text } : undefined)} />
      <motion.main style={{ x: pull }} className="glass relative flex min-h-0 min-w-0 flex-1 overflow-clip">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="px-4 pt-4">
            <TokenHeader token={room.token} mcap={last && room.token.supply ? last * room.token.supply : undefined} />
          </div>
          <CandleChart room={room} open={open} onOpen={setOpen} onPerson={onPerson} />
          <Holders room={room} open={open} onOpen={setOpen} onPerson={onPerson} />
        </div>
        <aside className="flex w-[400px] shrink-0 flex-col border-l border-white/8 pt-4">
          <h2 className="px-4 pb-3 text-label font-bold">
            Theses <span className="font-medium text-ink-3 tnum">{room.theses.length}</span>
          </h2>
          <ThesisRail room={room} open={open} onOpen={setOpen} onPerson={onPerson} you={you} />
        </aside>
        <AnimatePresence>
          {page && (
            <ProfilePage
              key={page.person.id}
              profile={page}
              back={room.token.symbol}
              onBack={() => setPage(null)}
              onCollapse={(from) => {
                setSheet({ profile: page, from });
                setPage(null);
              }}
              onThesis={onThesis}
            />
          )}
        </AnimatePresence>
      </motion.main>
      <AnimatePresence>
        {sheet && (
          <ProfileSheet
            key={sheet.profile.person.id}
            profile={sheet.profile}
            from={sheet.from}
            onExpand={() => {
              setPage(sheet.profile);
              setSheet(null);
            }}
            onClose={() => setSheet(null)}
            onThesis={onThesis}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
