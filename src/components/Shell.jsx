import { BASE, F, MASCOT, hardShadow } from "../lib/theme.js";
import { IconBadge, StarAccent } from "./Deco.jsx";

export const TABS = [
  ["home", "🏠", "Home", BASE.yellow],
  ["family", "👨‍👩‍👧‍👦", "Family", BASE.pink],
  ["calendar", "📅", "Calendar", BASE.teal],
  ["meals", "🍽️", "Meals", BASE.lilac],
  ["grocery", "🛒", "Grocery", BASE.orange],
  ["settings", "⚙️", "Settings", BASE.green],
];

export default function Shell({ tab, setTab, children }) {
  return (
    <div style={{ minHeight: "100vh", background: BASE.bg, fontFamily: F.ui, color: BASE.ink, display: "flex" }}>
      {/* Desktop sidebar */}
      <div
        className="sprinkles-sidebar"
        style={{
          width: 232,
          flexShrink: 0,
          borderRight: `2.5px solid ${BASE.ink}`,
          background: BASE.surface,
          padding: "24px 14px",
          display: "none",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 22px", position: "relative" }}>
          <img src={MASCOT.main} alt="" style={{ width: 42, height: 42, objectFit: "contain" }} />
          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18 }}>Mr. Sprinkles</span>
          <StarAccent color={BASE.pink} size={16} style={{ position: "absolute", top: -2, right: 6 }} />
        </div>
        {TABS.map(([t, emoji, label, color]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 10px",
              borderRadius: 14,
              border: tab === t ? `2.5px solid ${BASE.ink}` : "2.5px solid transparent",
              background: tab === t ? color : "transparent",
              boxShadow: tab === t ? hardShadow(BASE.ink, 3, 3) : "none",
              cursor: "pointer",
              fontFamily: F.ui,
              fontWeight: tab === t ? 800 : 600,
              fontSize: 14,
              color: BASE.ink,
              textAlign: "left",
            }}
          >
            <IconBadge emoji={emoji} bg={tab === t ? "#fff" : BASE.muted} size={32} radius={10} style={{ boxShadow: tab === t ? hardShadow(BASE.ink, 2, 2) : "none" }} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingBottom: 84 }} className="sprinkles-main">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <div
        className="sprinkles-bottomnav"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: BASE.surface,
          borderTop: `2.5px solid ${BASE.ink}`,
          display: "flex",
          zIndex: 20,
          paddingBottom: "env(safe-area-inset-bottom,0px)",
        }}
      >
        {TABS.map(([t, emoji, label, color]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "8px 0 7px",
              border: "none",
              background: "transparent",
              color: BASE.ink,
              fontSize: 10,
              fontWeight: tab === t ? 800 : 500,
              cursor: "pointer",
              fontFamily: F.ui,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              opacity: tab === t ? 1 : 0.55,
            }}
          >
            <IconBadge emoji={emoji} bg={tab === t ? color : "transparent"} size={28} radius={9} style={{ border: tab === t ? `2px solid ${BASE.ink}` : "2px solid transparent", boxShadow: tab === t ? hardShadow(BASE.ink, 2, 2) : "none" }} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <style>{`
        @media (min-width: 900px) {
          .sprinkles-sidebar { display: flex !important; }
          .sprinkles-bottomnav { display: none !important; }
          .sprinkles-main { padding-bottom: 24px !important; }
        }
      `}</style>
    </div>
  );
}
