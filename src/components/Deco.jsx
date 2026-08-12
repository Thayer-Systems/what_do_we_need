import { BASE, hardShadow } from "../lib/theme.js";
import { Icon, MEMBER_ICONS, MEMBER_ICON_IMAGES } from "./Icons.jsx";

// A "designed" icon treatment — a custom line icon (or, for member
// badges with matching art, an illustrated PNG) dropped into a
// bordered, shadowed badge instead of floating bare. Boxed like a
// sticker so it carries the neobrutalism language (thick outline +
// hard offset shadow) instead of reading as a random glyph.
export function IconBadge({ icon, emoji, bg = BASE.yellow, iconColor = BASE.ink, size = 40, rotate = 0, radius, style }) {
  const imgSrc = icon && (MEMBER_ICON_IMAGES[icon] || MEMBER_ICON_IMAGES[MEMBER_ICONS[icon]]);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size * 0.28,
        background: bg,
        border: `2.5px solid ${BASE.ink}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.52,
        lineHeight: 1,
        boxShadow: hardShadow(BASE.ink, 3, 3),
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        flexShrink: 0,
        overflow: "hidden",
        ...style,
      }}
    >
      {imgSrc ? (
        <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : icon ? (
        <Icon name={icon} size={size * 0.56} color={iconColor} strokeWidth={2.4} fallback="donut" />
      ) : (
        emoji
      )}
    </div>
  );
}

// Four-point sparkle/star, the recurring accent shape in the reference art.
export function StarAccent({ color = BASE.pink, size = 40, style, outline = BASE.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={style}>
      <path
        d="M20 0 L24 15 L40 20 L24 25 L20 40 L16 25 L0 20 L16 15 Z"
        fill={color}
        stroke={outline}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Squiggle underline/divider accent.
export function Squiggle({ color = BASE.ink, width = 90, height = 18, style }) {
  return (
    <svg width={width} height={height} viewBox="0 0 90 18" style={style} fill="none">
      <path d="M2 9 Q 13 -3, 24 9 T 46 9 T 68 9 T 90 9" stroke={color} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

// A single candy sprinkle — small rounded capsule, rotated.
function SprinkleDot({ color, x, y, rotate, size = 14 }) {
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width: size, height: size * 0.42,
        borderRadius: size, background: color, border: `1.5px solid ${BASE.ink}`,
        transform: `rotate(${rotate}deg)`,
      }}
    />
  );
}

// Scatter of sprinkles for decorating a header bar without touching its
// (white) background — used on every page except the home dashboard,
// with a different color set per section so pages stay distinguishable.
export function HeaderSprinkles({ colors = [BASE.pink, BASE.yellow, BASE.teal] }) {
  const layout = [
    { x: "62%", y: "18%", rotate: 20 }, { x: "70%", y: "55%", rotate: -15 },
    { x: "80%", y: "25%", rotate: 60 }, { x: "88%", y: "60%", rotate: -30 },
    { x: "94%", y: "20%", rotate: 10 }, { x: "56%", y: "70%", rotate: 45 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {layout.map((l, i) => (
        <SprinkleDot key={i} x={l.x} y={l.y} rotate={l.rotate} color={colors[i % colors.length]} />
      ))}
    </div>
  );
}

// CSS-only ring (conic-gradient), used for per-member progress.
export function ProgressRing({ pct, color = BASE.pink, size = 72, thickness = 10, children }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `conic-gradient(${color} ${clamped * 3.6}deg, ${BASE.muted} 0deg)`,
        border: `2.5px solid ${BASE.ink}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: hardShadow(BASE.ink, 3, 3),
      }}
    >
      <div
        style={{
          width: size - thickness * 2,
          height: size - thickness * 2,
          borderRadius: "50%",
          background: "#fff",
          border: `2px solid ${BASE.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
