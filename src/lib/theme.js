// ─── MR. SPRINKLES DESIGN SYSTEM ──────────────────────────────
// Playful neobrutalism: bold black outlines, hard offset shadows,
// bright color blocks, chunky rounded corners.

export const F = {
  ui: "'Plus Jakarta Sans', system-ui, sans-serif",
  display: "'Fredoka', 'Plus Jakarta Sans', system-ui, sans-serif",
};

// App-wide base (used for parents / chrome, not kid-specific screens)
export const BASE = {
  bg: "#fdf6ec",
  surface: "#ffffff",
  ink: "#181410",
  border: "#181410",
  pink: "#ff6fa5",
  teal: "#3fc9c1",
  yellow: "#ffcb3d",
  lilac: "#b98cf2",
  orange: "#ff8a3d",
  green: "#5fbf6b",
  red: "#ef5350",
  muted: "#f0ece2",
  t2: "#5c5348",
  t3: "#948a7c",
  navy: "#4a6fa5",
};

// Hard offset "neobrutalism" shadow — no blur, just an offset block.
export const hardShadow = (color = BASE.ink, x = 4, y = 4) => `${x}px ${y}px 0 0 ${color}`;

// Squared-off corners everywhere except the calendar grid, which keeps a
// slightly softer radius so the month grid doesn't read as a spreadsheet.
export const cardStyle = (bg = BASE.surface, opts = {}) => ({
  background: bg,
  border: `2.5px solid ${BASE.ink}`,
  borderRadius: opts.radius ?? 12,
  boxShadow: hardShadow(BASE.ink, opts.sx ?? 4, opts.sy ?? 4),
});

// Repeating sprinkle-dot pattern used as the page background so white/cream
// surfaces don't read as bare — tiled behind every screen.
function svgDataUri(svg) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
const SPRINKLE_DOTS = [
  [16, 22, 24], [64, 10, -20], [104, 46, 60], [30, 78, -45],
  [86, 96, 15], [128, 74, 75], [8, 118, 35], [110, 130, -10],
];
export function sprinklesBackground({ colors = [BASE.pink, BASE.teal, BASE.yellow, BASE.lilac, BASE.orange, BASE.green], opacity = 0.55 } = {}) {
  const shapes = SPRINKLE_DOTS.map(([x, y, r], i) => {
    const c = colors[i % colors.length];
    const cx = x + 7, cy = y + 2.5;
    return `<rect x="${x}" y="${y}" width="14" height="5" rx="2.5" fill="${c}" stroke="${BASE.ink}" stroke-width="1" opacity="${opacity}" transform="rotate(${r} ${cx} ${cy})"/>`;
  }).join("");
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140">${shapes}</svg>`);
}
export const SPRINKLE_BG_STYLE = {
  backgroundImage: sprinklesBackground(),
  backgroundSize: "140px 140px",
  backgroundRepeat: "repeat",
};

export const pillBtn = (bg = BASE.pink, fg = "#181410") => ({
  background: bg,
  color: fg,
  border: `2.5px solid ${BASE.ink}`,
  borderRadius: 999,
  padding: "10px 20px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: F.ui,
  boxShadow: hardShadow(BASE.ink, 3, 3),
  transition: "transform 0.08s, box-shadow 0.08s",
});

export const inputStyle = {
  background: "#fff",
  border: `2.5px solid ${BASE.ink}`,
  borderRadius: 12,
  padding: "11px 14px",
  fontSize: 15,
  fontFamily: F.ui,
  color: BASE.ink,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

// ─── KID THEMES ────────────────────────────────────────────────
// Each family member gets a themed palette + icon set applied to
// their profile page and anything scoped to them (chores, events).
export const THEMES = {
  default: {
    label: "Classic Sprinkles",
    bg: "#fdf6ec",
    primary: BASE.pink,
    secondary: BASE.teal,
    accent: BASE.yellow,
    emoji: ["🍩", "✨", "🍬"],
  },
  unicorns_mermaids_princesses: {
    label: "Unicorns, Mermaids & Princesses",
    bg: "#fdf1fb",
    primary: "#e774d1",
    secondary: "#7fd9e8",
    accent: "#ffd977",
    emoji: ["🦄", "🧜‍♀️", "👑", "✨", "🐚"],
  },
  animals_pokemon_drawing: {
    label: "Animals, Pokémon & Drawing",
    bg: "#f2fbf0",
    primary: "#5fbf6b",
    secondary: "#ffcb3d",
    accent: "#ff8a3d",
    emoji: ["🐾", "🎨", "⚡", "🐢", "🖍️"],
  },
  pokemon_ninjas_tech: {
    label: "Pokémon, Ninjas & Tech",
    bg: "#eef4fb",
    primary: "#3a7bd5",
    secondary: "#2b2b3d",
    accent: "#ffcb3d",
    emoji: ["🥷", "🤖", "⚡", "🎮", "🛠️"],
  },
};

export const themeFor = (member) => THEMES[member?.theme] || THEMES.default;

// Mr. Sprinkles is always the pink icing character now — no more
// day-of-week color cycling.
export const MASCOT = {
  main: "/mascot/01_pink_turquoise_yellow_lilac.png",
  peeking: "/mascot/08_peeking.png",
  celebrating: "/mascot/09_celebrating.png",
  pointing: "/mascot/10_pointing.png",
};

// Sprinkle accent color sets per page — used to decorate header bars
// (background stays white) so each section reads distinctly.
export const SPRINKLE_SETS = {
  calendar: [BASE.teal, BASE.pink, BASE.yellow],
  meals: [BASE.lilac, BASE.orange, BASE.teal],
  grocery: [BASE.orange, BASE.green, BASE.pink],
  settings: [BASE.green, BASE.lilac, BASE.yellow],
  family: [BASE.pink, BASE.teal, BASE.orange],
  default: [BASE.pink, BASE.yellow, BASE.teal],
};

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const CATEGORY_COLORS = {
  event: BASE.pink,
  appointment: BASE.red,
  activity: BASE.teal,
  meal: BASE.yellow,
  chore: BASE.green,
  work: BASE.navy,
  other: BASE.lilac,
};

// Calendar events are colored by the person they're assigned to; this is
// only the fallback for events with nobody (or more than one person)
// assigned.
export function eventColor(event, members) {
  const ids = event.member_ids || [];
  if (ids.length === 1) {
    const m = members.find((x) => x.id === ids[0]);
    if (m?.color) return m.color;
  }
  return CATEGORY_COLORS[event.category] || BASE.pink;
}
