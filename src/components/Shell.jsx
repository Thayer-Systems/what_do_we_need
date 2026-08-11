import { BASE, F, MASCOT, hardShadow } from "../lib/theme.js";

export const TABS = [
  ["home", "🏠", "Home"],
  ["family", "👨‍👩‍👧‍👦", "Family"],
  ["calendar", "📅", "Calendar"],
  ["meals", "🍽️", "Meals"],
  ["grocery", "🛒", "Grocery"],
  ["settings", "⚙️", "Settings"],
];

export default function Shell({ tab, setTab, children }) {
  return (
    <div style={{ minHeight: "100vh", background: BASE.bg, fontFamily: F.ui, color: BASE.ink, display: "flex" }}>
      {/* Desktop sidebar */}
      <div
        className="sprinkles-sidebar"
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: `2.5px solid ${BASE.ink}`,
          background: BASE.surface,
          padding: "24px 14px",
          display: "none",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 20px" }}>
          <img src={MASCOT.main} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18 }}>Mr. Sprinkles</span>
        </div>
        {TABS.map(([t, emoji, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 12px",
              borderRadius: 12,
              border: tab === t ? `2.5px solid ${BASE.ink}` : "2.5px solid transparent",
              background: tab === t ? BASE.yellow : "transparent",
              boxShadow: tab === t ? hardShadow(BASE.ink, 3, 3) : "none",
              cursor: "pointer",
              fontFamily: F.ui,
              fontWeight: tab === t ? 800 : 600,
              fontSize: 14,
              color: BASE.ink,
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 18 }}>{emoji}</span> {label}
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
        {TABS.map(([t, emoji, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "9px 0 7px",
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
              gap: 2,
              opacity: tab === t ? 1 : 0.55,
            }}
          >
            <span style={{ fontSize: 19 }}>{emoji}</span>
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
