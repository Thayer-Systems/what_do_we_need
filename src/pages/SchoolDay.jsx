import { useEffect, useState } from "react";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, hardShadow } from "../lib/theme.js";
import { schoolKidsForDate } from "../lib/schoolDay.js";
import { coinBalance } from "../lib/coins.js";

function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

function TodayScheduleBlock({ events }) {
  const today = new Date();
  const todays = (events || []).filter((e) => sameDay(new Date(e.start_at), today)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  return (
    <div style={{ background: "#fff", border: `1px solid ${BASE.border}`, borderRadius: 14, boxShadow: hardShadow(BASE.ink, 4, 4), padding: 16 }}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, marginBottom: 10 }}>Today's Schedule</div>
      {todays.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>Nothing on the calendar today.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {todays.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, background: BASE.muted, borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 13, minWidth: 66 }}>{new Date(e.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>{e.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KidsCoinsBlock({ kids, coinLedger }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BASE.border}`, borderRadius: 14, boxShadow: hardShadow(BASE.ink, 4, 4), padding: 16 }}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, marginBottom: 10 }}>Kids' Coins</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {kids.map((k) => (
          <div key={k.id} style={{ background: k.color, border: `1px solid ${BASE.border}`, borderRadius: 10, padding: "8px 14px", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <IconBadge icon={k.icon} bg="#fff" size={24} radius={7} />
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>{coinBalance(coinLedger || [], k.id)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <div style={{ background: kid.color, border: `1px solid ${BASE.border}`, borderRadius: 14, boxShadow: hardShadow(BASE.ink, 4, 4), padding: 16, color: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
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
                  border: `1px solid ${BASE.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", opacity: done ? 0.55 : 1,
                }}
              >
                <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{item.icon || "⭐"}</span>
                <span style={{ flex: 1, fontFamily: F.ui, fontWeight: 700, fontSize: 15, textDecoration: done ? "line-through" : "none" }}>{item.title}</span>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${BASE.border}`, background: done ? BASE.green : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {done && <Icon name="check" size={14} color="#fff" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SchoolDay({ members, morningRoutine, schedule, events, coinLedger }) {
  const weather = useTodayWeather();
  const [checked, setChecked] = useState(new Set());
  const kids = schoolKidsForDate(members);
  const showWeather = schedule?.show_weather ?? true;
  const showRoutines = schedule?.show_routines ?? true;
  const showSchedule = schedule?.show_schedule ?? false;
  const showCoins = schedule?.show_coins ?? false;

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
        {showWeather && (
          <div style={{ background: BASE.teal, border: `1px solid ${BASE.border}`, borderRadius: 12, boxShadow: hardShadow(BASE.ink, 3, 3), padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name={weather?.icon || "sun"} size={28} />
            <div>
              <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22 }}>{weather ? `${weather.temperatureF}°F` : "—"}</div>
              <div style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 700 }}>{weather ? weather.summary : "Weather unavailable"}</div>
            </div>
          </div>
        )}
      </div>

      {showRoutines && (
        kids.length === 0 ? (
          <div style={{ fontFamily: F.ui, fontSize: 14, color: BASE.t2, fontWeight: 700, marginBottom: 16 }}>No school routine for today — enjoy the day off!</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`, gap: 14, marginBottom: 16 }}>
            {kids.map((k) => <KidRoutineBox key={k.id} kid={k} items={morningRoutine} checked={checked} onToggle={onToggle} />)}
          </div>
        )
      )}

      {(showSchedule || showCoins) && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`, gap: 14 }}>
          {showSchedule && <TodayScheduleBlock events={events} />}
          {showCoins && <KidsCoinsBlock kids={members.filter((m) => m.role !== "parent")} coinLedger={coinLedger} />}
        </div>
      )}
    </div>
  );
}
