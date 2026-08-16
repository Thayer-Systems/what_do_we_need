import { BASE, F, MASCOT, hardShadow } from "../lib/theme.js";
import { IconBadge } from "./Deco.jsx";
import { Icon } from "./Icons.jsx";
import { useRouter } from "../lib/router.jsx";
import { isToolsUnlocked } from "../lib/pin.js";

export const TABS = [
  ["/", "home", "Today", BASE.yellow],
  ["/calendar", "calendar", "Calendar", BASE.teal],
  ["/food", "meals", "Food", BASE.lilac],
  ["/goals/kids", "star", "Kids Goals", BASE.pink],
  ["/goals/parents", "users", "Parents Goals", BASE.orange],
  ["/tasks", "check", "Tasks", BASE.green],
  ["/settings", "settings", "Tools", "#cfd8e3"],
];

export default function Shell({ children }) {
  const { path, navigate } = useRouter();
  const active = (p) => (p === "/" ? path === "/" : path.startsWith(p));
  const toolsLocked = !isToolsUnlocked();

  return (
    <div style={{ minHeight: "100vh", background: BASE.bg, fontFamily: F.ui, color: BASE.ink, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "calc(env(safe-area-inset-top, 0px) + 8px) 10px 8px",
          background: BASE.surface,
          borderBottom: `2.5px solid ${BASE.ink}`,
          position: "sticky",
          top: 0,
          zIndex: 30,
          overflowX: "auto",
        }}
      >
        <img src={MASCOT.main} alt="" style={{ width: 30, height: 30, objectFit: "contain", flexShrink: 0, marginRight: 6 }} />
        {TABS.map(([p, icon, label, color]) => (
          <button
            key={p}
            onClick={() => navigate(p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 12,
              border: active(p) ? `2.5px solid ${BASE.ink}` : "2.5px solid transparent",
              background: active(p) ? color : "transparent",
              boxShadow: active(p) ? hardShadow(BASE.ink, 2.5, 2.5) : "none",
              cursor: "pointer",
              fontFamily: F.ui,
              fontWeight: active(p) ? 800 : 600,
              fontSize: 13,
              color: BASE.ink,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <IconBadge icon={icon} bg={active(p) ? "#fff" : color} size={24} radius={8} style={{ boxShadow: "none" }} />
            {label}
            {p === "/settings" && toolsLocked && <Icon name="pin" size={12} style={{ opacity: 0.6 }} />}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => window.dispatchEvent(new Event("sprinkles-open-assistant"))}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12, border: `2px solid ${BASE.ink}`, background: "#c5f26b", cursor: "pointer", fontFamily: F.ui, fontWeight: 800, fontSize: 12, flexShrink: 0 }}
        >
          <Icon name="sparkle" size={14} /> Ask Mr. Sprinkles
        </button>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
