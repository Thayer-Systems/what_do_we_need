import { useState } from "react";
import { PageHeader, Card } from "../components/ui.jsx";
import { BASE, F, DAY_NAMES, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };

const CONTENT_TOGGLES = [
  ["show_weather", "Weather"],
  ["show_routines", "Kids' morning routines"],
  ["show_schedule", "Today's schedule"],
  ["show_coins", "Kids' coin balances"],
];

export default function RoutinesPage({ schedule, onUpdateSchedule }) {
  const { navigate } = useRouter();
  const [days, setDays] = useState(schedule?.days || [1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState(schedule?.start_time || "06:45");
  const [endTime, setEndTime] = useState(schedule?.end_time || "08:30");
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);
  const [toggles, setToggles] = useState({
    show_weather: schedule?.show_weather ?? true,
    show_routines: schedule?.show_routines ?? true,
    show_schedule: schedule?.show_schedule ?? false,
    show_coins: schedule?.show_coins ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const toggleDay = (i) => setDays((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    const result = await onUpdateSchedule({ days, start_time: startTime, end_time: endTime, enabled, ...toggles });
    setBusy(false);
    if (result?.ok === false) setError(result.error || "Unknown error");
    else setSaved(true);
  };

  return (
    <div>
      <PageHeader title="Routines" sprinkles="settings" back={() => navigate("/settings")} />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2 }}>
          Configure when the School Day screen automatically becomes the main display on a TV, and what it shows. This saves and keeps running on that schedule until you change it here — no need to set it up again.
        </div>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Schedule</div>
            <button onClick={() => setEnabled((e) => !e)} style={btn(enabled ? BASE.green : "#fff")}>{enabled ? "Enabled" : "Disabled"}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <span style={label}>Days</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAY_NAMES.map((d, i) => <button key={d} type="button" onClick={() => toggleDay(i)} style={btn(days.includes(i) ? BASE.teal : "#fff")}>{d}</button>)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><span style={label}>Start time</span><input type="time" style={inp} value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
              <div style={{ flex: 1 }}><span style={label}>End time</span><input type="time" style={inp} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 12 }}>What to show</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CONTENT_TOGGLES.map(([key, lbl]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={toggles[key]} onChange={(e) => setToggles((p) => ({ ...p, [key]: e.target.checked }))} />
                <span style={{ fontFamily: F.ui, fontSize: 14, fontWeight: 700 }}>{lbl}</span>
              </label>
            ))}
          </div>
        </Card>

        <button disabled={busy} style={{ ...btn(BASE.green), opacity: busy ? 0.6 : 1 }} onClick={save}>{busy ? "Saving..." : "Save"}</button>
        {saved && !error && <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, color: BASE.green }}>Saved.</div>}
        {error && <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, color: BASE.red }}>Couldn't save that: {error}</div>}
      </div>
    </div>
  );
}
