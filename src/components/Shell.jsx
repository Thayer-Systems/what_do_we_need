import { BASE, F, MASCOT, hardShadow } from "../lib/theme.js";
import { IconBadge, StarAccent } from "./Deco.jsx";
import { useRouter } from "../lib/router.jsx";

export const TABS = [
  ["/", "home", "Home", BASE.yellow],
  ["/calendar", "calendar", "Calendar", BASE.teal],
  ["/meals", "meals", "Meals", BASE.lilac],
  ["/grocery", "cart", "Grocery", BASE.orange],
  ["/settings", "settings", "Settings", BASE.green],
];

export default function Shell({ children }) {
  const { path, navigate } = useRouter();
  const active = (p) => (p === "/" ? path === "/" : path.startsWith(p));

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
        {TABS.map(([p, icon, label, color]) => (
          <button
            key={p}
            onClick={() => navigate(p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 10px",
              borderRadius: 14,
              border: active(p) ? `2.5px solid ${BASE.ink}` : "2.5px solid transparent",
              background: active(p) ? color : "transparent",
              boxShadow: active(p) ? hardShadow(BASE.ink, 3, 3) : "none",
              cursor: "pointer",
              fontFamily: F.ui,
              fontWeight: active(p) ? 800 : 600,
              fontSize: 14,
              color: BASE.ink,
              textAlign: "left",
            }}
          >
            <IconBadge icon={icon} bg={color} size={32} radius={10} style={{ boxShadow: hardShadow(BASE.ink, 2, 2) }} />
            {label}
          </button>
        ))}
        <button
          onClick={() => window.dispatchEvent(new Event("sprinkles-open-assistant"))}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 14, border: `2.5px solid ${BASE.ink}`, background: "transparent", cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 14, color: BASE.ink, textAlign: "left", marginTop: 8 }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fff", border: `2px solid ${BASE.ink}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: hardShadow(BASE.ink, 2, 2) }}>
            <img src={MASCOT.main} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
          </div>
          Ask Mr. Sprinkles
        </button>
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
        {TABS.slice(0, 3).map(([p, icon, label, color]) => (
          <button
            key={p}
            onClick={() => navigate(p)}
            style={{
              flex: 1, padding: "8px 0 7px", border: "none", background: "transparent", color: BASE.ink, fontSize: 10,
              fontWeight: active(p) ? 800 : 500, cursor: "pointer", fontFamily: F.ui, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3, opacity: active(p) ? 1 : 0.7,
            }}
          >
            <IconBadge icon={icon} bg={color} size={28} radius={9} style={{ border: `2px solid ${BASE.ink}`, boxShadow: hardShadow(BASE.ink, active(p) ? 2 : 1.5, active(p) ? 2 : 1.5) }} />
            <span>{label}</span>
          </button>
        ))}
        <button
          onClick={() => window.dispatchEvent(new Event("sprinkles-open-assistant"))}
          style={{ flex: 1, padding: "6px 0 7px", border: "none", background: "transparent", cursor: "pointer", fontFamily: F.ui, fontSize: 10, fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "#fff", border: `2px solid ${BASE.ink}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: hardShadow(BASE.ink, 2, 2) }}>
            <img src={MASCOT.main} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
          </div>
          <span>Sprinkles</span>
        </button>
        {TABS.slice(3).map(([p, icon, label, color]) => (
          <button
            key={p}
            onClick={() => navigate(p)}
            style={{
              flex: 1, padding: "8px 0 7px", border: "none", background: "transparent", color: BASE.ink, fontSize: 10,
              fontWeight: active(p) ? 800 : 500, cursor: "pointer", fontFamily: F.ui, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3, opacity: active(p) ? 1 : 0.7,
            }}
          >
            <IconBadge icon={icon} bg={color} size={28} radius={9} style={{ border: `2px solid ${BASE.ink}`, boxShadow: hardShadow(BASE.ink, active(p) ? 2 : 1.5, active(p) ? 2 : 1.5) }} />
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
