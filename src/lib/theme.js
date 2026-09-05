// ─── MR. SPRINKLES DESIGN SYSTEM ──────────────────────────────
// Warm command-center: soft white cards on a cream ground, thin
// hairline borders, gentle drop shadows, muted pastel accents.
// Mr. Sprinkles (mascot + playful display font) still lives here —
// only the surrounding chrome traded its bold outlines for calm.

export const F = {
  ui: "'Plus Jakarta Sans', system-ui, sans-serif",
  display: "'Fredoka', 'Plus Jakarta Sans', system-ui, sans-serif",
};

// App-wide base (used for parents / chrome, not kid-specific screens)
export const BASE = {
  bg: "#f5efe3",
  surface: "#ffffff",
  ink: "#2f2a22",
  border: "#e7ddc9",
  pink: "#eeb4a4",
  teal: "#93c7c1",
  yellow: "#f0cd82",
  lilac: "#c4b3e2",
  orange: "#eeab77",
  green: "#a3c9a0",
  red: "#dd8f85",
  muted: "#f1ece0",
  t2: "#6b6255",
  t3: "#a49a89",
  navy: "#8ca0bd",
};

// Soft ambient shadow — signature of the new look, replacing the old
// hard offset "neobrutalism" block shadow. Kept as `hardShadow` (and its
// (color, x, y) signature) so every existing call site works unchanged;
// the color/offset args are accepted but no longer change the result,
// since a soft, uniform shadow reads calmer than a colored offset one.
export const hardShadow = () => "0 1px 2px rgba(47,42,34,0.05), 0 8px 20px rgba(47,42,34,0.07)";
export const softShadow = hardShadow;

// Generously rounded, thin-bordered, softly shadowed card — the base
// surface treatment for the whole app now.
export const cardStyle = (bg = BASE.surface, opts = {}) => ({
  background: bg,
  border: `1px solid ${BASE.border}`,
  borderRadius: opts.radius ?? 20,
  boxShadow: hardShadow(),
});

// The old sprinkle-dot tiled background read as busy against soft white
// cards, so pages now sit on a flat warm ground instead. Kept as a
// no-op export so every existing `...SPRINKLE_BG_STYLE` spread stays valid.
function svgDataUri(svg) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
export function sprinklesBackground() {
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>`);
}
export const SPRINKLE_BG_STYLE = {};

export const pillBtn = (bg = BASE.pink, fg = BASE.ink) => ({
  background: bg,
  color: fg,
  border: "none",
  borderRadius: 999,
  padding: "11px 22px",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: F.ui,
  boxShadow: hardShadow(),
  transition: "transform 0.08s, box-shadow 0.08s",
});

export const inputStyle = {
  background: "#fff",
  border: `1px solid ${BASE.border}`,
  borderRadius: 14,
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
    bg: "#f5efe3",
    primary: BASE.pink,
    secondary: BASE.teal,
    accent: BASE.yellow,
    emoji: ["🍩", "✨", "🍬"],
  },
  unicorns_mermaids_princesses: {
    label: "Unicorns, Mermaids & Princesses",
    bg: "#f9f0f7",
    primary: "#dd9ecb",
    secondary: "#9dd3dd",
    accent: "#f0d896",
    emoji: ["🦄", "🧜‍♀️", "👑", "✨", "🐚"],
  },
  animals_pokemon_drawing: {
    label: "Animals, Pokémon & Drawing",
    bg: "#f1f6ee",
    primary: "#a3c9a0",
    secondary: "#f0cd82",
    accent: "#eeab77",
    emoji: ["🐾", "🎨", "⚡", "🐢", "🖍️"],
  },
  pokemon_ninjas_tech: {
    label: "Pokémon, Ninjas & Tech",
    bg: "#eef2f6",
    primary: "#8ca0bd",
    secondary: "#4a4a5a",
    accent: "#f0cd82",
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
