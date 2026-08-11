import { BASE, F, cardStyle, hardShadow } from "../lib/theme.js";
import { IconBadge } from "./Deco.jsx";

export function PageHeader({ title, right }) {
  return (
    <div
      style={{
        padding: "20px 20px 16px",
        background: BASE.surface,
        borderBottom: `2.5px solid ${BASE.ink}`,
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 26, margin: 0, letterSpacing: "-0.3px" }}>{title}</h1>
      {right}
    </div>
  );
}

export function EmptyState({ icon = "🍩", text, action, onAction }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: 14, textAlign: "center" }}>
      <IconBadge emoji={icon} bg={BASE.yellow} size={64} radius={18} rotate={-4} />
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
    border: `2.5px solid ${BASE.ink}`,
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
      style={{ position: "fixed", inset: 0, background: "rgba(20,15,10,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: BASE.surface,
          borderRadius: "22px 22px 0 0",
          border: `2.5px solid ${BASE.ink}`,
          borderBottom: "none",
          width: "100%",
          maxWidth,
          maxHeight: "88vh",
          overflowY: "auto",
          padding: "22px 20px 36px",
          boxShadow: `0 -4px 0 0 ${BASE.ink}`,
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
        border: `2px solid ${BASE.ink}`,
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
