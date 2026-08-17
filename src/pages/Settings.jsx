import { Card } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

const ITEMS = [
  ["home", "Household", BASE.yellow, "/settings/household"],
  ["settings", "Settings", BASE.green, "/settings/preferences"],
];

export default function Settings() {
  const { navigate } = useRouter();
  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 18px) 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
        {ITEMS.map(([icon, label, color, path]) => (
          <Card key={path} onClick={() => navigate(path)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <IconBadge icon={icon} bg={color} size={40} />
            <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 15, flex: 1 }}>{label}</span>
            <Icon name="chevronRight" size={18} />
          </Card>
        ))}
        <a href="/privacy" style={{ textAlign: "center", marginTop: 8, fontFamily: F.ui, fontSize: 12, color: BASE.t3 }}>
          Privacy Policy
        </a>
      </div>
    </div>
  );
}
