import { BASE, F, cardStyle, hardShadow, SPRINKLE_SETS } from "../lib/theme.js";
import { IconBadge, HeaderSprinkles } from "./Deco.jsx";
import { Icon } from "./Icons.jsx";

export function PageHeader({ title, right, back, sprinkles }) {
  return (
    <div
      style={{
        padding: "calc(env(safe-area-inset-top, 0px) + 20px) 20px 16px",
        background: BASE.surface,
        borderBottom: `1px solid ${BASE.border}`,
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        overflow: "hidden",
      }}
    >
      {sprinkles !== false && <HeaderSprinkles colors={SPRINKLE_SETS[sprinkles] || SPRINKLE_SETS.default} />}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, position: "relative" }}>
        {back && (
          <button
            onClick={back}
            aria-label="Back"
            style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${BASE.border}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: hardShadow(BASE.ink, 2, 2) }}
          >
            <Icon name="chevronLeft" size={18} />
          </button>
        )}
        <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 26, margin: 0, letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
      </div>
      <div style={{ position: "relative" }}>{right}</div>
    </div>
  );
}

export function EmptyState({ icon = "donut", text, action, onAction }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: 14, textAlign: "center" }}>
      <IconBadge icon={icon} bg={BASE.yellow} size={64} radius={18} rotate={-4} />
      <div style={{ fontFamily: F.display, fontSize: 19, fontWeight: 700, color: BASE.ink }}>{text}</div>
      {action && (
        <button onClick={onAction} style={{ ...pillFrom(BASE.pink), marginTop: 4 }}>
          {action}
        </button>
      )}
    </div>
  );
}

function pillFrom(bg) {
  return {
    background: bg,
    color: BASE.ink,
    border: `1px solid ${BASE.border}`,
    borderRadius: 999,
    padding: "10px 22px",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: F.ui,
    boxShadow: hardShadow(BASE.ink, 3, 3),
  };
}

export function Modal({ onClose, children, maxWidth = 460 }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,15,10,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16, boxSizing: "border-box" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: BASE.surface,
          borderRadius: 22,
          border: `1px solid ${BASE.border}`,
          width: "100%",
          maxWidth,
          maxHeight: "88vh",
          overflowY: "auto",
          padding: "22px 20px 28px",
          boxShadow: hardShadow(BASE.ink, 5, 5),
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Chip({ active, onClick, children, color = BASE.yellow }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        border: `1px solid ${BASE.border}`,
        background: active ? color : "transparent",
        color: BASE.ink,
        fontSize: 12,
        fontWeight: active ? 800 : 600,
        cursor: "pointer",
        fontFamily: F.ui,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export const Card = ({ children, bg, style, ...rest }) => (
  <div style={{ ...cardStyle(bg), padding: 16, ...style }} {...rest}>
    {children}
  </div>
);
