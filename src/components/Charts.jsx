import { BASE, F, hardShadow } from "../lib/theme.js";

// Minimal custom SVG bar chart — kept dependency-free and styled to
// match the neobrutalism system rather than a generic chart-lib look.
// showTrend overlays a linear-regression trend line across the bar values
// (e.g. a kid's running coin balance over time).
export function BarChart({ data, color = BASE.pink, height = 120, valueSuffix = "", showTrend = false, trendColor = BASE.ink }) {
  const values = data.map((d) => d.value);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = max - min || 1;
  const barW = 100 / data.length;
  const yFor = (v) => height - 20 - ((v - min) / range) * (height - 24);

  // Ordinary least-squares fit over the bar indices.
  let trendPath = null;
  if (showTrend && data.length > 1) {
    const n = data.length;
    const sumX = values.reduce((s, _, i) => s + i, 0);
    const sumY = values.reduce((s, v) => s + v, 0);
    const sumXY = values.reduce((s, v, i) => s + i * v, 0);
    const sumXX = values.reduce((s, _, i) => s + i * i, 0);
    const denom = n * sumXX - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;
    const x1 = barW * 0.5, x2 = (n - 1) * barW + barW * 0.5;
    const y1 = yFor(intercept), y2 = yFor(intercept + slope * (n - 1));
    trendPath = `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = ((d.value - min) / range) * (height - 24);
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
        {trendPath && (
          <path d={trendPath} fill="none" stroke={trendColor} strokeWidth={1.6} strokeDasharray="3 2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
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

// Minimal dependency-free SVG line chart — used for the weather hourly
// temperature trend. Values are plotted against their index; labels are
// rendered underneath at a thinned-out interval so they stay legible.
export function LineChart({ data, color = BASE.pink, height = 110, labelEvery = 3 }) {
  const values = data.map((d) => d.value).filter((v) => v != null);
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = data.length > 1 ? 100 / (data.length - 1) : 0;
  const pad = 10;
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = d.value == null ? null : pad + (1 - (d.value - min) / range) * (height - pad * 2);
    return { x, y, label: d.label, value: d.value };
  });
  const pathD = points
    .filter((p) => p.y != null)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => p.y != null && (
          <circle key={i} cx={p.x} cy={p.y} r={1.6} fill={color} stroke={BASE.ink} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div style={{ display: "flex" }}>
        {points.map((p, i) => (
          <div key={i} style={{ width: `${stepX || 100 / data.length}%`, textAlign: "center", fontSize: 9, fontFamily: F.ui, fontWeight: 700, color: BASE.t2 }}>
            {i % labelEvery === 0 ? p.label : ""}
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
