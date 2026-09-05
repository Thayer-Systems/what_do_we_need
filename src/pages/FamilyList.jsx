import { IconBadge } from "../components/Deco.jsx";
import { BASE, F, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

export default function FamilyList({ members }) {
  const { navigate } = useRouter();
  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 20px) 16px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/family/${m.id}`)}
            style={{
              background: m.color,
              color: "#fff",
              border: `1px solid ${BASE.border}`,
              borderRadius: 12,
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
            <div style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 800, textTransform: "uppercase", opacity: 0.85 }}>{m.role === "parent" ? "Parent" : "Kid"}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
