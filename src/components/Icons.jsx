// Hand-built line-icon set — no emoji, no icon-font dependency. Consistent
// 24x24 stroke grammar (round caps/joins) so every icon in the app reads
// as one designed system instead of borrowed glyphs.
import { BASE } from "../lib/theme.js";

const base = (size, color, strokeWidth) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

const PATHS = {
  home: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.2c2.4.3 4.5 2.4 4.5 5.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  meals: (
    <>
      <path d="M7 2v8a2 2 0 0 0 4 0V2M9 10v12M9 2v3M7 2v3" />
      <path d="M16 2c-1.2 1-2 2.8-2 5s.8 4 2 5v10" />
    </>
  ),
  cart: (
    <>
      <circle cx="10" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.8 1.8 0 0 0 .4 2l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.6v.2a2 2 0 1 1-4 0v-.1a1.8 1.8 0 0 0-1.2-1.7 1.8 1.8 0 0 0-2 .4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1.1H4a2 2 0 1 1 0-4h.1a1.8 1.8 0 0 0 1.7-1.2 1.8 1.8 0 0 0-.4-2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.8 1.8 0 0 0 2 .4H10.5a1.8 1.8 0 0 0 1.1-1.6V4a2 2 0 1 1 4 0v.1a1.8 1.8 0 0 0 1.1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.8 1.8 0 0 0-.4 2v.1a1.8 1.8 0 0 0 1.6 1.1H20a2 2 0 1 1 0 4h-.1a1.8 1.8 0 0 0-1.6 1.1z" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.6 4.8L18.5 9l-4.9 1.6L12 15.5l-1.6-4.9L5.5 9l4.9-1.2z" />
      <path d="M19 15l.8 2.3L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.7z" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4.5 3.5V17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      <path d="M8 9.5h8M8 13h5" />
    </>
  ),
  send: <path d="M3 11l17-8-8 17-2-7-7-2z" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M4 12.5l5 5L20 6" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
      <path d="M6 7l1 13.2A1.8 1.8 0 0 0 8.8 22h6.4a1.8 1.8 0 0 0 1.8-1.8L18 7" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16z" />
      <path d="M13 6l3 3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  chevronDown: <path d="M5 9l7 7 7-7" />,
  pin: (
    <>
      <path d="M12 22s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  car: (
    <>
      <path d="M3.5 15.5 5 10a2 2 0 0 1 2-1.5h10a2 2 0 0 1 2 1.5l1.5 5.5" />
      <path d="M3 15.5h18v3a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V18h-11v.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <circle cx="7" cy="15.5" r="1.4" />
      <circle cx="17" cy="15.5" r="1.4" />
    </>
  ),
  filter: <path d="M4 5h16l-6 8v6l-4-2v-4z" />,
  arrowRight: <path d="M4 12h16M13 5l7 7-7 7" />,
  star: <path d="M12 2l2.6 6.6L22 9.3l-5.4 4.8L18.2 21 12 17.2 5.8 21l1.6-6.9L2 9.3l7.4-.7z" />,
  cake: (
    <>
      <path d="M4 21v-7a2 2 0 0 1 2-1h12a2 2 0 0 1 2 1v7z" />
      <path d="M4 21h16M4 17.5c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0 2-.8 3 0 2 .8 3 0" />
      <path d="M8 13V9M12 13V9M16 13V9" />
      <path d="M8 6.5a1.5 1.5 0 1 0 0-3M12 6.5a1.5 1.5 0 1 0 0-3M16 6.5a1.5 1.5 0 1 0 0-3" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v18H5.5A1.5 1.5 0 0 1 4 19.5z" />
      <path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v18h6.5a1.5 1.5 0 0 0 1.5-1.5z" />
    </>
  ),
  bell: (
    <>
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.8v.1" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.2 1-1.2 1.9" />
      <path d="M12 16.8v.1" />
    </>
  ),
  pause: (
    <>
      <rect x="7" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </>
  ),

  // weather
  sun: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  cloudSun: (
    <>
      <circle cx="7" cy="7" r="3" />
      <path d="M7 1.5v1.6M12.5 7H14M2 7h1.5M3.4 3.4l1 1M10.6 3.4l-1 1" />
      <path d="M8 12.5a4 4 0 0 1 7.8-1.3A3.7 3.7 0 0 1 15 18.5H8a3.5 3.5 0 0 1 0-7z" />
    </>
  ),
  cloud: <path d="M7 18.5a4 4 0 0 1 .3-8 5.5 5.5 0 0 1 10.6 1.3A3.7 3.7 0 0 1 17 18.5z" />,
  cloudRain: (
    <>
      <path d="M7 15.5a4 4 0 0 1 .3-8 5.5 5.5 0 0 1 10.6 1.3A3.7 3.7 0 0 1 17 15.5z" />
      <path d="M8 18.5l-1 3M12 18.5l-1 3M16 18.5l-1 3" />
    </>
  ),
  cloudSnow: (
    <>
      <path d="M7 14.5a4 4 0 0 1 .3-8 5.5 5.5 0 0 1 10.6 1.3A3.7 3.7 0 0 1 17 14.5z" />
      <path d="M8 18v3M12 18v3M16 18v3" strokeDasharray="0.1 3" />
    </>
  ),
  storm: (
    <>
      <path d="M7 13.5a4 4 0 0 1 .3-8 5.5 5.5 0 0 1 10.6 1.3A3.7 3.7 0 0 1 17 13.5z" />
      <path d="M13 14l-3 5h3l-2 4" />
    </>
  ),
  wind: <path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 18h9a2 2 0 1 0-2-2" />,
  droplet: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  thermometer: (
    <>
      <path d="M12 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0z" />
      <path d="M10 8h2" />
    </>
  ),
  sunrise: (
    <>
      <path d="M3 18h18M6 18a6 6 0 0 1 12 0" />
      <path d="M12 4v4M5 11l1.6 1.6M19 11l-1.6 1.6" />
    </>
  ),

  // recipe equipment
  oven: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <circle cx="7" cy="7" r="1" />
      <circle cx="11" cy="7" r="1" />
      <rect x="5.5" y="11" width="13" height="7" rx="1" />
    </>
  ),
  crockpot: (
    <>
      <path d="M4 10h16l-1.4 8.2A2 2 0 0 1 16.6 20H7.4a2 2 0 0 1-2-1.8z" />
      <path d="M2 10h20M8 10V7a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 7v3" />
      <circle cx="12" cy="14.5" r="1" />
    </>
  ),
  airfryer: (
    <>
      <rect x="5" y="7" width="14" height="13" rx="3" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  stovetop: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="2" />
      <circle cx="15.5" cy="9.5" r="2" />
      <circle cx="8.5" cy="15.5" r="2" />
      <circle cx="15.5" cy="15.5" r="2" />
    </>
  ),
  microwave: (
    <>
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <rect x="5" y="8.5" width="10" height="8" rx="1" />
      <path d="M18 11v3M20 11v3" />
    </>
  ),
  grill: (
    <>
      <path d="M4 9h16M4 13h16" />
      <path d="M7 17l-2 4M17 17l2 4M12 13v8" />
      <path d="M6 9c0-3 2.5-5.5 6-5.5S18 6 18 9" />
    </>
  ),

  // member icons
  polarBear: (
    <>
      <circle cx="12" cy="13" r="7" />
      <circle cx="6.5" cy="7" r="2.2" />
      <circle cx="17.5" cy="7" r="2.2" />
      <circle cx="9.7" cy="12" r="1" fill={BASE.ink} stroke="none" />
      <circle cx="14.3" cy="12" r="1" fill={BASE.ink} stroke="none" />
      <path d="M10.5 15.5a2 2 0 0 0 3 0" />
      <ellipse cx="12" cy="14.3" rx="1.1" ry="0.8" fill={BASE.ink} stroke="none" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M6 21c-1.5-1-2.5-3-2.5-5 0-3 1.8-5.5 4-7.5C9.5 6.5 11 4.5 11 3" />
      <path d="M6 21c1.8.5 4-.2 5.5-2 2-2.4 2-5.8 0-8" />
      <circle cx="11" cy="3" r="1.6" />
    </>
  ),
  pokeball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h6.5M14.5 12H21" />
      <circle cx="12" cy="12" r="2.6" fill="#fff" />
    </>
  ),
  fox: (
    <>
      <path d="M12 21c-3.5 0-6-2.6-6-6.3C6 10.5 8.3 5 9.6 3.4a.9.9 0 0 1 1.5.2L12 6l.9-2.4a.9.9 0 0 1 1.5-.2C15.7 5 18 10.5 18 14.7 18 18.4 15.5 21 12 21z" />
      <circle cx="9.6" cy="13" r="1" fill={BASE.ink} stroke="none" />
      <circle cx="14.4" cy="13" r="1" fill={BASE.ink} stroke="none" />
      <path d="M12 14.3v1.6M10.5 16.6a1.7 1.7 0 0 0 3 0" />
    </>
  ),
  unicorn: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M9.5 5.5l-2-2.5 2.6.9" />
      <path d="M9 10c-1.6 1-2.6 2.8-2.6 5 0 3 1.8 6.5 1.8 6.5" />
      <path d="M15 10c1.6 1 2.6 2.8 2.6 5 0 1.6-.5 3.4-1 4.7" />
      <path d="M9 15.5c1.2.8 3 1 4.4.3" strokeDasharray="0.1 3" />
    </>
  ),
  donut: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

export function Icon({ name, size = 22, color = BASE.ink, strokeWidth = 2.2, style, fallback }) {
  const content = PATHS[name] || PATHS[MEMBER_ICONS[name]] || (fallback && PATHS[fallback]);
  if (!content) return null;
  return (
    <svg {...base(size, color, strokeWidth)} style={style}>
      {content}
    </svg>
  );
}

export const MEMBER_ICONS = {
  polar_bear: "polarBear",
  dumbbell: "dumbbell",
  pokeball: "pokeball",
  fox: "fox",
  unicorn: "unicorn",
  donut: "donut",
};

// Illustrated badge art for member icons — swapped in for the plain line
// icon wherever a matching image exists (see IconBadge in Deco.jsx).
export const MEMBER_ICON_IMAGES = {
  fox: "/member-icons/fox.png",
  pokeball: "/member-icons/pokeball.png",
  unicorn: "/member-icons/unicorn.png",
  polarBear: "/member-icons/polar-bear.png",
  dumbbell: "/member-icons/dumbbell.png",
};

export const EQUIPMENT_ICONS = {
  Oven: "oven",
  Crockpot: "crockpot",
  "Air Fryer": "airfryer",
  Stovetop: "stovetop",
  Microwave: "microwave",
  Grill: "grill",
};
