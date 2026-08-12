import { PageHeader } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { BASE, F, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

export default function FamilyList({ members }) {
  const { navigate } = useRouter();
  return (
    <div>
      <PageHeader title="Family" sprinkles="family" back={() => navigate("/settings")} />
      <div style={{ padding: "20px 16px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/settings/family/${m.id}`)}
            style={{
              background: m.color,
              color: "#fff",
              border: `2.5px solid ${BASE.ink}`,
              borderRadius: 18,
              boxShadow: hardShadow(BASE.ink, 4, 4),
              fontFamily: F.ui,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: "22px 12px",
              cursor: "pointer",
            }}
          >
            <IconBadge icon={m.icon} bg="#fff" size={54} radius={16} />
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>{m.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
