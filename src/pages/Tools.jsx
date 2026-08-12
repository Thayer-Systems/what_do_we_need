import { PageHeader, Card } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

const TOOLS = [
  ["weather", "cloudSun", "Weather", BASE.teal, "/settings/tools/weather"],
];

export default function Tools() {
  const { navigate } = useRouter();
  return (
    <div>
      <PageHeader title="Tools" back={() => navigate("/settings")} />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
        {TOOLS.map(([key, icon, label, color, path]) => (
          <Card key={key} onClick={() => navigate(path)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <IconBadge icon={icon} bg={color} size={40} />
            <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 15, flex: 1 }}>{label}</span>
            <Icon name="chevronRight" size={18} />
          </Card>
        ))}
      </div>
    </div>
  );
}
