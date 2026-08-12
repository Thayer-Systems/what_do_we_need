import { BASE, F, hardShadow } from "../lib/theme.js";

// Minimal custom SVG bar chart — kept dependency-free and styled to
// match the neobrutalism system rather than a generic chart-lib look.
export function BarChart({ data, color = BASE.pink, height = 120, valueSuffix = "" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / data.length;
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 24);
          return (
            <g key={i}>
              <rect
                x={i * barW + barW * 0.18}
                y={height - 20 - h}
                width={barW * 0.64}
                height={Math.max(h, 1)}
                rx={1.5}
                fill={color}
                stroke={BASE.ink}
                strokeWidth={0.6}
              />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex" }}>
        {data.map((d, i) => (
          <div key={i} style={{ width: `${barW}%`, textAlign: "center", fontSize: 10, fontFamily: F.ui, fontWeight: 700, color: BASE.t2 }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressBar({ pct, color = BASE.pink, height = 14 }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ height, borderRadius: height / 2, background: BASE.muted, border: `2px solid ${BASE.ink}`, overflow: "hidden" }}>
      <div style={{ width: `${clamped}%`, height: "100%", background: color, transition: "width 0.25s" }} />
    </div>
  );
}

export function StatCard({ label, value, sub, color = BASE.surface }) {
  return (
    <div style={{ background: color, border: `2.5px solid ${BASE.ink}`, borderRadius: 16, padding: "14px 16px", boxShadow: hardShadow(BASE.ink, 3, 3) }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, opacity: 0.75 }}>{label}</div>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 26, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 600, opacity: 0.75 }}>{sub}</div>}
    </div>
  );
}
