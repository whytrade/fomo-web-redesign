import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { sample } from "../data/sample";
import { NowContext, Room, type Thesis } from "../src";
import "../src/styles.css";

/*
  A small page that renders the kit from the sample data, so you can look at it. It is not the point of the repo:
  the components are. Nothing here reads from anywhere; times are read against when the sample was captured.
*/

const YOU = { id: "you", name: "You", avatar: null };
const FIRST = Object.keys(sample.rooms)[0];

function Preview() {
  // a thesis pressed in Discover that the room's own capture doesn't have is shown in the rail as Discover read it
  const [at, setAt] = useState<{ id: string; thesis: string | null; told?: Thesis }>({ id: FIRST, thesis: null });
  const room = at.told ? { ...sample.rooms[at.id], theses: [at.told, ...sample.rooms[at.id].theses] } : sample.rooms[at.id];
  return (
    <NowContext.Provider value={sample.at}>
      <Room
        room={room}
        initialThesis={at.thesis}
        lists={[
          { id: "trending", name: "Trending", tokens: sample.lists.trending },
          { id: "held", name: "Most held", tokens: sample.lists.held },
        ]}
        perps={sample.perps.markets}
        board={sample.board}
        feed={sample.feed}
        people={sample.people}
        opens={(t) => !!sample.rooms[t.id]}
        onToken={(t, thesis) => {
          const next = sample.rooms[t.id];
          if (!next) return;
          const words = (s: string) => s.replace(/\s+/g, " ").trim();
          const found = thesis?.id ?? (thesis?.text ? next.theses.find((x) => words(x.text) === words(thesis.text!))?.id : undefined);
          if (found || !thesis?.text || !t.said) return setAt({ id: t.id, thesis: found ?? null });
          const told: Thesis = { id: `said:${t.id}`, author: t.said.person, at: t.said.at ?? sample.at, text: t.said.text, price: null, mcap: null, likes: 0, holds: null, pnl: null, undated: !t.said.at };
          setAt({ id: t.id, thesis: told.id, told });
        }}
        profileOf={(p) => sample.profile(p.id)}
        you={YOU}
      />
    </NowContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
