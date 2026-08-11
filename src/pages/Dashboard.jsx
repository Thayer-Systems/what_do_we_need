import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card, EmptyState } from "../components/ui.jsx";
import { BASE, F, MASCOT, CATEGORY_COLORS } from "../lib/theme.js";

function isTodayBirthday(bday) {
  if (!bday) return false;
  const b = new Date(bday + "T00:00:00");
  const now = new Date();
  return b.getMonth() === now.getMonth() && b.getDate() === now.getDate();
}

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function fmtCountdown(ms) {
  if (ms <= 0) return "now";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DepartureWidget({ events, members }) {
  const now = useNow();
  const next = useMemo(() => {
    return events
      .filter((e) => e.location && new Date(e.start_at) > now)
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0];
  }, [events, now]);

  if (!next) {
    return (
      <Card style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 26 }}>🗺️</span>
        <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>No upcoming events with a location yet</div>
      </Card>
    );
  }

  const start = new Date(next.start_at);
  const travelMin = next.travel_minutes;
  const leaveBy = travelMin != null ? new Date(start.getTime() - travelMin * 60000) : null;
  const msUntilLeave = leaveBy ? leaveBy - now : null;
  const attendees = (next.member_ids || []).map((id) => members.find((m) => m.id === id)?.name).filter(Boolean);

  return (
    <Card bg={BASE.teal} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: F.ui }}>Next up</div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 19, marginTop: 2 }}>{next.title}</div>
        </div>
        <span style={{ fontSize: 26 }}>🚗</span>
      </div>
      <div style={{ fontSize: 13, fontFamily: F.ui, fontWeight: 600 }}>
        {start.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })} · 📍 {next.location}
        {attendees.length > 0 && ` · ${attendees.join(" & ")}`}
      </div>
      {leaveBy ? (
        <div
          style={{
            marginTop: 4,
            background: "#fff",
            border: `2.5px solid ${BASE.ink}`,
            borderRadius: 14,
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>
            Leave by <b>{leaveBy.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</b>
          </div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>
            {msUntilLeave > 0 ? `${fmtCountdown(msUntilLeave)} left` : "Time to go!"}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, fontFamily: F.ui, fontStyle: "italic" }}>
          Add a travel-time estimate on this event (or connect Google Maps in Settings) to get a leave-by countdown.
        </div>
      )}
    </Card>
  );
}

export default function Dashboard({ members, events, chores, completions, weather, onToggleChore, onNavigate }) {
  const birthdayMember = members.find((m) => isTodayBirthday(m.birthday));
  const upcoming = events
    .filter((e) => new Date(e.start_at) > new Date())
    .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
    .slice(0, 5);

  const todayStr = new Date().toISOString().slice(0, 10);
  const dow = new Date().getDay();
  const todaysChores = chores.filter((c) => c.active && (c.frequency === "daily" || (c.days || []).includes(dow)));
  const doneToday = new Set(completions.filter((c) => c.date === todayStr).map((c) => c.chore_id));
  const progress = todaysChores.length ? Math.round((doneToday.size / todaysChores.length) * 100) : 0;

  return (
    <div>
      <PageHeader title="Home" />
      <div style={{ padding: "20px 16px 32px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={MASCOT.main} alt="" style={{ width: 56, height: 56, objectFit: "contain" }} />
          <div>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22 }}>
              {new Date().getHours() < 12 ? "Good morning!" : new Date().getHours() < 18 ? "Good afternoon!" : "Good evening!"}
            </div>
            {weather && <div style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 600, color: BASE.t2 }}>{weather}</div>}
          </div>
        </div>

        {birthdayMember && (
          <Card bg={BASE.yellow} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 30 }}>🎂</span>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 17 }}>Happy Birthday, {birthdayMember.name}!</div>
          </Card>
        )}

        <DepartureWidget events={events} members={members} />

        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, fontFamily: F.ui }}>
            Today's chores — {progress}%
          </div>
          {todaysChores.length === 0 ? (
            <Card style={{ fontFamily: F.ui, fontSize: 13 }}>No chores scheduled today.</Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todaysChores.map((c) => {
                const done = doneToday.has(c.id);
                const member = members.find((m) => m.id === c.member_id);
                return (
                  <Card
                    key={c.id}
                    bg={done ? BASE.green : BASE.surface}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                    onClick={() => !done && onToggleChore(c)}
                  >
                    <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>
                      {member?.avatar_emoji || "🍩"} {c.title} <span style={{ opacity: 0.6, fontWeight: 500 }}>· {member?.name}</span>
                    </div>
                    <span style={{ fontSize: 18 }}>{done ? "✅" : "⬜"}</span>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, fontFamily: F.ui }}>
            Upcoming
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon="📅" text="Nothing on the calendar yet" action="Add an event" onAction={() => onNavigate("calendar")} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upcoming.map((e) => (
                <Card key={e.id} onClick={() => onNavigate("calendar")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: CATEGORY_COLORS[e.category] || BASE.pink, flexShrink: 0, border: `1.5px solid ${BASE.ink}` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>{e.title}</div>
                    <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2 }}>
                      {new Date(e.start_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
