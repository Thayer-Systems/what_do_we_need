import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { ProgressBar } from "../components/Charts.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, CATEGORY_COLORS, DAY_NAMES, hardShadow, mascotOfDay } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";
import { coinBalance } from "../lib/coins.js";

function useWeather() {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    fetch("/api/weather").then((r) => r.json()).then((d) => setWeather(d?.available ? d : null)).catch(() => setWeather(null));
  }, []);
  return weather;
}

function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

function fmtCountdown(ms) {
  if (ms <= 0) return "now";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const widgetCard = (bg) => ({
  background: bg, border: `2.5px solid ${BASE.ink}`, borderRadius: 18,
  boxShadow: hardShadow(BASE.ink, 4, 4), padding: 16, position: "relative", overflow: "hidden",
});
const eyebrow = { fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: F.ui };

function greetingForNow(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function WeatherCard({ weather, navigate }) {
  return (
    <div style={{ ...widgetCard(BASE.teal), cursor: "pointer" }} onClick={() => navigate("/settings/tools/weather")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={eyebrow}>Weather</div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 30, marginTop: 2 }}>{weather ? `${weather.temperatureF}°F` : "—"}</div>
          <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>{weather ? weather.summary : "Not connected"}</div>
        </div>
        <Icon name={weather?.icon || "sun"} size={34} />
      </div>
    </div>
  );
}

function TodaysEventsCard({ events, navigate }) {
  const today = new Date();
  const todays = events.filter((e) => sameDay(new Date(e.start_at), today)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  return (
    <div style={{ ...widgetCard("#fff"), cursor: "pointer" }} onClick={() => navigate("/calendar")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Today's Schedule</span>
        <IconBadge icon="calendar" bg={BASE.teal} size={32} />
      </div>
      {todays.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>Nothing on the calendar today</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {todays.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, background: BASE.muted, borderRadius: 10, padding: "8px 12px" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: CATEGORY_COLORS[e.category] || BASE.pink, border: `1.5px solid ${BASE.ink}`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>{e.title}</div>
                <div style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t2 }}>
                  {new Date(e.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  {e.location ? ` · ${e.location}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DepartureCard({ events }) {
  const now = new Date();
  const next = events.filter((e) => e.location && new Date(e.start_at) > now).sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0];
  if (!next) {
    return (
      <div style={widgetCard(BASE.orange)}>
        <div style={eyebrow}>Next Up</div>
        <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13, marginTop: 8 }}>Nothing with a location scheduled</div>
      </div>
    );
  }
  const start = new Date(next.start_at);
  const travelMin = next.travel_minutes;
  const leaveBy = travelMin != null ? new Date(start.getTime() - travelMin * 60000) : null;
  const msUntilLeave = leaveBy ? leaveBy - now : null;
  return (
    <div style={widgetCard(BASE.orange)}>
      <div style={eyebrow}>Next Event</div>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, margin: "4px 0 6px" }}>{next.title}</div>
      <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
        {start.toLocaleString([], { hour: "numeric", minute: "2-digit" })} · <Icon name="pin" size={12} /> {next.location}
      </div>
      {leaveBy ? (
        <div style={{ background: BASE.ink, color: "#fff", borderRadius: 999, padding: "8px 14px", fontFamily: F.ui, fontSize: 12, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
          <span>Leave by {leaveBy.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          <span>{msUntilLeave > 0 ? `${fmtCountdown(msUntilLeave)} left` : "Go now!"}</span>
        </div>
      ) : (
        <div style={{ fontFamily: F.ui, fontSize: 12, fontStyle: "italic" }}>Add a location so travel time can be calculated.</div>
      )}
    </div>
  );
}

function MealsCard({ mealPlan, navigate }) {
  const today = DAY_NAMES[new Date().getDay()];
  const slot = (meal) => mealPlan.find((s) => s.day === today && s.meal === meal);
  return (
    <div style={{ ...widgetCard("#fff"), cursor: "pointer" }} onClick={() => navigate("/food")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Today's Meals</span>
        <IconBadge icon="meals" bg={BASE.lilac} size={32} />
      </div>
      {[["Lunch", slot("Lunch")], ["Dinner", slot("Dinner")]].map(([lbl, s]) => (
        <div key={lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: `1.5px solid ${BASE.muted}` }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: BASE.t2, fontFamily: F.ui, textTransform: "uppercase" }}>{lbl}</span>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: F.ui }}>{s ? s.recipe_name : "Not planned"}</span>
        </div>
      ))}
    </div>
  );
}

function TasksAndProjectsCard({ members, chores, completions, projects, onToggleChore, navigate }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dow = new Date().getDay();
  const doneToday = new Set(completions.filter((c) => c.date === todayStr).map((c) => c.chore_id));
  const remainingChores = chores.filter((c) => c.active && (c.frequency === "daily" || (c.days || []).includes(dow)) && !doneToday.has(c.id));
  const openProjects = projects.filter((p) => (p.visibility || "public") === "public" && p.status !== "done");

  return (
    <div style={{ ...widgetCard(BASE.pink), gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }} className="sprinkles-today-tasks-split">
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Today's Tasks</span>
            <button onClick={() => navigate("/tasks")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
              <IconBadge icon="check" bg="#fff" size={32} />
            </button>
          </div>
          {remainingChores.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 700 }}>All done today!</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {remainingChores.map((c) => {
                const member = members.find((m) => m.id === c.member_id);
                return (
                  <div key={c.id} onClick={() => onToggleChore(c)} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: "8px 12px", cursor: "pointer" }}>
                    <IconBadge icon={member?.icon || "donut"} bg={member?.color || BASE.yellow} size={26} radius={8} iconColor="#fff" />
                    <span style={{ flex: 1, fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>{c.title}</span>
                    <Icon name="close" size={16} style={{ opacity: 0.25 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ width: 2, background: BASE.ink, opacity: 0.15, alignSelf: "stretch" }} className="sprinkles-today-tasks-divider" />

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Open Projects</span>
            <button onClick={() => navigate("/tasks")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
              <IconBadge icon="grid" bg="#fff" size={32} />
            </button>
          </div>
          {openProjects.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 700 }}>Nothing in progress.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {openProjects.map((p) => (
                <div key={p.id} onClick={() => navigate("/tasks")} style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: "8px 12px", cursor: "pointer" }}>
                  <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{p.title}</div>
                  <ProgressBar pct={p.progress} color={BASE.pink} height={10} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KidCoinsCard({ kids, coinLedger, navigate }) {
  if (!kids.length) return null;
  return (
    <div style={{ ...widgetCard("#fff"), cursor: "pointer" }} onClick={() => navigate("/goals/kids")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Kids' Coins</span>
        <IconBadge icon="star" bg={BASE.yellow} size={32} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
        {kids.map((k) => (
          <div key={k.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
            <IconBadge icon={k.icon} bg={k.color} size={34} radius={999} iconColor="#fff" />
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>{coinBalance(coinLedger, k.id)}</span>
            <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 10, color: BASE.t2 }}>{k.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParentsGoalsCard({ parents, stats, navigate }) {
  if (!parents.length) return null;
  return (
    <div style={{ ...widgetCard("#fff"), cursor: "pointer" }} onClick={() => navigate("/goals/parents")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Parents' Goals</span>
        <IconBadge icon="users" bg={BASE.orange} size={32} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {parents.map((p) => {
          const goal = stats.find((s) => s.member_id === p.id);
          const pct = goal?.target ? Math.round((goal.value / goal.target) * 100) : 0;
          return (
            <div key={p.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: goal ? 4 : 0 }}>
                <IconBadge icon={p.icon} bg={p.color} size={24} radius={8} iconColor="#fff" />
                <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 12, flex: 1 }}>{p.name}</span>
                {goal && <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 11, color: BASE.t2 }}>{goal.value}{goal.unit}/{goal.target}{goal.unit}</span>}
              </div>
              {goal ? <ProgressBar pct={pct} color={p.color} height={8} /> : <span style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t3 }}>No goals set</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Today({ members, events, chores, completions, mealPlan, projects, stats, coinLedger, onToggleChore }) {
  const { navigate } = useRouter();
  const weather = useWeather();
  const kids = useMemo(() => members.filter((m) => m.role !== "parent"), [members]);
  const parents = useMemo(() => members.filter((m) => m.role === "parent"), [members]);

  return (
    <div style={{ padding: "16px 16px 40px" }}>
      <PageHeader
        title="Today"
        sprinkles="default"
        right={<span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13, color: BASE.t2 }}>{greetingForNow()}</span>}
      />
      <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, margin: "14px 0 4px" }}>{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 10 }} className="sprinkles-today-grid">
        <TodaysEventsCard events={events} navigate={navigate} />
        <DepartureCard events={events} />
        <WeatherCard weather={weather} navigate={navigate} />
        <MealsCard mealPlan={mealPlan} navigate={navigate} />
        <KidCoinsCard kids={kids} coinLedger={coinLedger} navigate={navigate} />
        <ParentsGoalsCard parents={parents} stats={stats} navigate={navigate} />
        <TasksAndProjectsCard members={members} chores={chores} completions={completions} projects={projects} onToggleChore={onToggleChore} navigate={navigate} />
      </div>

      <img
        src={mascotOfDay()}
        alt=""
        style={{ position: "fixed", right: 14, bottom: 14, width: 64, height: 64, objectFit: "contain", pointerEvents: "none", filter: `drop-shadow(2px 2px 0 ${BASE.ink})` }}
      />

      <style>{`
        @media (max-width: 640px) {
          .sprinkles-today-grid { grid-template-columns: 1fr !important; }
          .sprinkles-today-grid > * { grid-column: 1 / -1 !important; }
          .sprinkles-today-tasks-divider { display: none !important; }
        }
        @media (min-width: 1000px) {
          .sprinkles-today-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
