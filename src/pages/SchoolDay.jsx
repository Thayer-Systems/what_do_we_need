import { useEffect, useState } from "react";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, hardShadow } from "../lib/theme.js";
import { schoolKidsForDate } from "../lib/schoolDay.js";

function useTodayWeather() {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    fetch("/api/weather").then((r) => r.json()).then((d) => setWeather(d?.available ? d : null)).catch(() => setWeather(null));
  }, []);
  return weather;
}

function KidRoutineBox({ kid, items, checked, onToggle }) {
  const mine = items.filter((i) => i.member_id === kid.id && i.active);
  const doneCount = mine.filter((i) => checked.has(i.id)).length;
  return (
    <div style={{ background: kid.color, border: `2.5px solid ${BASE.ink}`, borderRadius: 14, boxShadow: hardShadow(BASE.ink, 4, 4), padding: 16, color: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <IconBadge icon={kid.icon} bg="#fff" size={44} radius={12} />
        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20 }}>{kid.name}</div>
          <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, opacity: 0.85 }}>{doneCount}/{mine.length} done</div>
        </div>
      </div>
      {mine.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.85)", color: BASE.ink, borderRadius: 10, padding: "10px 12px", fontFamily: F.ui, fontSize: 13, fontWeight: 700 }}>
          No morning routine set yet — add one from {kid.name}'s profile.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {mine.map((item) => {
            const done = checked.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => onToggle(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, background: "#fff", color: BASE.ink,
                  border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", opacity: done ? 0.55 : 1,
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${BASE.ink}`, background: done ? BASE.green : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {done && <Icon name="check" size={14} color="#fff" />}
                </div>
                <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 15, textDecoration: done ? "line-through" : "none" }}>{item.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SchoolDay({ members, morningRoutine }) {
  const weather = useTodayWeather();
  const [checked, setChecked] = useState(new Set());
  const kids = schoolKidsForDate(members);

  const onToggle = (id) => setChecked((p) => {
    const next = new Set(p);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 16px) 20px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", letterSpacing: "0.06em" }}>School Day</div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 28 }}>{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div>
        </div>
        <div style={{ background: BASE.teal, border: `2.5px solid ${BASE.ink}`, borderRadius: 12, boxShadow: hardShadow(BASE.ink, 3, 3), padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name={weather?.icon || "sun"} size={28} />
          <div>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22 }}>{weather ? `${weather.temperatureF}°F` : "—"}</div>
            <div style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 700 }}>{weather ? weather.summary : "Weather unavailable"}</div>
          </div>
        </div>
      </div>

      {kids.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 14, color: BASE.t2, fontWeight: 700 }}>No school routine for today — enjoy the day off!</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`, gap: 14 }}>
          {kids.map((k) => <KidRoutineBox key={k.id} kid={k} items={morningRoutine} checked={checked} onToggle={onToggle} />)}
        </div>
      )}
    </div>
  );
}
