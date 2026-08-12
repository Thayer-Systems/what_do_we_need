import { PageHeader, Card } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

const ITEMS = [
  ["users", "Family", BASE.pink, "/settings/family"],
  ["settings", "Tools", BASE.teal, "/settings/tools"],
  ["home", "Household", BASE.yellow, "/settings/household"],
  ["sparkle", "Integrations", BASE.lilac, "/settings/integrations"],
  ["question", "FAQ", BASE.orange, "/settings/faq"],
  ["book", "Instructions", BASE.green, "/settings/instructions"],
];

export default function Settings() {
  const { navigate } = useRouter();
  return (
    <div>
      <PageHeader title="Settings" sprinkles="settings" />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
        {ITEMS.map(([icon, label, color, path]) => (
          <Card key={path} onClick={() => navigate(path)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <IconBadge icon={icon} bg={color} size={40} />
            <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 15, flex: 1 }}>{label}</span>
            <Icon name="chevronRight" size={18} />
          </Card>
        ))}
      </div>
    </div>
  );
}
