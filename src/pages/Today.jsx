import { useEffect, useMemo, useState } from "react";
import { IconBadge } from "../components/Deco.jsx";
import { ProgressBar } from "../components/Charts.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, CATEGORY_COLORS, DAY_NAMES, hardShadow, MASCOT, mascotOfDay } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";
import { coinBalance } from "../lib/coins.js";
import { choreAppliesToday } from "../lib/tasks.js";
import { effectiveGoalValue } from "../lib/goals.js";

function useWeather() {
  const [weather, setWeather] = useState(null);
  const [week, setWeek] = useState([]);
  useEffect(() => {
    fetch("/api/weather").then((r) => r.json()).then((d) => setWeather(d?.available ? d : null)).catch(() => setWeather(null));
    fetch("/api/weather?range=week").then((r) => r.json()).then((d) => setWeek(d?.available ? d.days || [] : [])).catch(() => setWeek([]));
  }, []);
  return { weather, week };
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
  background: bg, border: `2.5px solid ${BASE.ink}`, borderRadius: 12,
  boxShadow: hardShadow(BASE.ink, 4, 4), padding: 14, position: "relative", overflow: "hidden",
  display: "flex", flexDirection: "column",
});
const eyebrow = { fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: F.ui };

function estClock(now) {
  return now.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }) + " EST";
}

function WeatherCard({ weather, week, navigate }) {
  const today = new Date();
  const todayForecast = week.find((d) => sameDay(new Date(d.date), today));
  const restOfWeek = week.filter((d) => !sameDay(new Date(d.date), today)).slice(0, 6);
  return (
    <div style={{ ...widgetCard(BASE.teal), cursor: "pointer", justifyContent: "space-between" }} onClick={() => navigate("/settings/tools/weather")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={eyebrow}>Weather</div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 40, marginTop: 4 }}>{weather ? `${weather.temperatureF}°F` : "—"}</div>
          <div style={{ fontFamily: F.ui, fontSize: 14, fontWeight: 700 }}>{weather ? weather.summary : "Not connected"}</div>
          {todayForecast && (
            <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, opacity: 0.85, marginTop: 4 }}>H:{todayForecast.highF}° L:{todayForecast.lowF}°</div>
          )}
        </div>
        <Icon name={weather?.icon || "sun"} size={56} />
      </div>
      {restOfWeek.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, overflowX: "auto" }}>
          {restOfWeek.map((d) => (
            <div key={d.date} style={{ background: "#fff", border: `1.5px solid ${BASE.ink}`, borderRadius: 10, padding: "8px 10px", textAlign: "center", flexShrink: 0, minWidth: 56 }}>
              <div style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 800, color: BASE.t2, textTransform: "uppercase" }}>{new Date(d.date).toLocaleDateString([], { weekday: "short" })}</div>
              <Icon name={d.icon} size={22} />
              <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 800 }}>{d.highF}°</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TodaysEventsCard({ events, now, navigate }) {
  const todays = events.filter((e) => sameDay(new Date(e.start_at), now)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
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

function DepartureCard({ events, now }) {
  const next = events.filter((e) => e.location && new Date(e.start_at) > now).sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0];

  // Synthetic activity-based events (recurring activities) never carry a
  // stored travel_minutes since they aren't real DB rows — look it up
  // client-side instead of leaving the card blank.
  const [lookedUp, setLookedUp] = useState({});
  useEffect(() => {
    if (!next || next.travel_minutes != null) return;
    if (lookedUp[next.location] !== undefined) return;
    fetch(`/api/travel-time?destination=${encodeURIComponent(next.location)}`)
      .then((r) => r.json())
      .then((d) => setLookedUp((p) => ({ ...p, [next.location]: d.available ? d.minutes : null })))
      .catch(() => setLookedUp((p) => ({ ...p, [next.location]: null })));
  }, [next?.location, next?.travel_minutes]);

  if (!next) {
    return (
      <div style={widgetCard(BASE.orange)}>
        <div style={eyebrow}>Next Up</div>
        <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13, marginTop: 8 }}>Nothing with a location scheduled</div>
      </div>
    );
  }
  const start = new Date(next.start_at);
  const travelMin = next.travel_minutes != null ? next.travel_minutes : lookedUp[next.location];
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
        <div style={{ fontFamily: F.ui, fontSize: 12, fontStyle: "italic" }}>
          {lookedUp[next.location] === null ? "Couldn't look up travel time — set a household address in Settings, or enter it manually on this event." : "Looking up travel time…"}
        </div>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[["Lunch", slot("Lunch")], ["Dinner", slot("Dinner")]].map(([lbl, s]) => (
          <div key={lbl} style={{ background: BASE.muted, border: `1.5px solid ${BASE.ink}`, borderRadius: 10, padding: 10, aspectRatio: "1 / 1", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: BASE.t2, fontFamily: F.ui, textTransform: "uppercase" }}>{lbl}</span>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: F.ui }}>{s ? s.recipe_name : "Not planned"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mr. Sprinkles' own square box, sitting in-flow as the third box on this
// row (rather than a floating overlay) — tapping it opens the same
// assistant popover as the nav button.
function MascotBox() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("sprinkles-open-assistant"))}
      style={{
        ...widgetCard("#fff"), cursor: "pointer", border: "none", boxShadow: "none",
        alignItems: "center", justifyContent: "center", padding: 0,
      }}
      aria-label="Ask Mr. Sprinkles"
    >
      <img src={mascotOfDay()} alt="" style={{ width: "70%", maxWidth: 96, objectFit: "contain", pointerEvents: "none" }} />
    </button>
  );
}

function TasksCard({ members, chores, completions, onToggleChore, navigate }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const doneToday = new Set(completions.filter((c) => c.date === todayStr).map((c) => c.chore_id));
  const remainingChores = chores.filter((c) => c.active && (c.visibility || "public") === "public" && choreAppliesToday(c) && !doneToday.has(c.id));

  return (
    <div style={widgetCard(BASE.pink)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>Today's Tasks</span>
        <button onClick={() => navigate("/tasks")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
          <IconBadge icon="check" bg="#fff" size={28} radius={8} />
        </button>
      </div>
      {remainingChores.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>All done today!</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 168, overflowY: "auto" }}>
          {remainingChores.map((c) => {
            const member = members.find((m) => m.id === c.member_id);
            return (
              <div key={c.id} onClick={() => onToggleChore(c)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}>
                <IconBadge icon={member?.icon || "donut"} bg={member?.color || BASE.yellow} size={22} radius={7} iconColor="#fff" />
                <span style={{ flex: 1, fontFamily: F.ui, fontWeight: 700, fontSize: 12 }}>{c.title}</span>
                <Icon name="close" size={14} style={{ opacity: 0.25 }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectsCard({ projects, navigate }) {
  const openProjects = projects.filter((p) => (p.visibility || "public") === "public" && p.status !== "done");

  return (
    <div style={{ ...widgetCard("#fff"), cursor: "pointer" }} onClick={() => navigate("/tasks")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>Open Projects</span>
        <IconBadge icon="grid" bg={BASE.lilac} size={28} radius={8} />
      </div>
      {openProjects.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>Nothing in progress.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 168, overflowY: "auto" }}>
          {openProjects.map((p) => (
            <div key={p.id} style={{ background: BASE.muted, border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "6px 10px" }}>
              <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 12, marginBottom: 5 }}>{p.title}</div>
              <ProgressBar pct={p.progress} color={BASE.pink} height={8} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KidCoinsCard({ kids, coinLedger, coinRewards, navigate }) {
  if (!kids.length) return null;
  const tiers = useMemo(() => [...new Set(coinRewards.map((r) => r.coin_cost))].sort((a, b) => a - b), [coinRewards]);
  const nextTier = tiers[0];
  return (
    <div style={{ ...widgetCard("#fff") }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Kids' Coins</span>
        <IconBadge icon="star" bg={BASE.yellow} size={32} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${kids.length}, 1fr)`, gap: 10, flex: 1 }}>
        {kids.map((k) => {
          const balance = coinBalance(coinLedger, k.id);
          const target = tiers.find((t) => t > balance) || nextTier || 1;
          const pct = Math.min(100, Math.round((balance / target) * 100));
          return (
            <div
              key={k.id}
              onClick={() => navigate(`/goals/kids/trends/${k.id}`)}
              style={{ background: BASE.muted, border: `1.5px solid ${BASE.ink}`, borderRadius: 10, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", height: "100%" }}
            >
              <IconBadge icon={k.icon} bg={k.color} size={46} radius={999} iconColor="#fff" />
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22 }}>{balance}</span>
              <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 12, color: BASE.t2 }}>{k.name}</span>
              {tiers.length > 0 && <div style={{ width: "100%" }}><ProgressBar pct={pct} color={k.color} height={8} /></div>}
            </div>
          );
        })}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "center" }}>
        {parents.map((p) => {
          const goals = stats.filter((s) => s.member_id === p.id);
          return (
            <div key={p.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: goals.length ? 6 : 0 }}>
                <IconBadge icon={p.icon} bg={p.color} size={28} radius={9} iconColor="#fff" />
                <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13, flex: 1 }}>{p.name}</span>
              </div>
              {goals.length === 0 ? (
                <span style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t3 }}>No goals set</span>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {goals.map((goal) => {
                    const value = effectiveGoalValue(goal);
                    const pct = goal.target ? Math.round((value / goal.target) * 100) : 0;
                    const readout = goal.goal_type === "count" ? `${value}/${goal.target} this ${goal.period}` : `${goal.value}${goal.unit}/${goal.target}${goal.unit}`;
                    return (
                      <div key={goal.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.ui, fontSize: 11, fontWeight: 700, color: BASE.t2, marginBottom: 3 }}>
                          <span>{goal.label}</span>
                          <span>{readout}</span>
                        </div>
                        <ProgressBar pct={pct} color={p.color} height={8} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Today({ members, events, chores, completions, mealPlan, projects, stats, coinLedger, coinRewards, onToggleChore }) {
  const { navigate } = useRouter();
  const { weather, week } = useWeather();
  const kids = useMemo(() => members.filter((m) => m.role !== "parent"), [members]);
  const parents = useMemo(() => members.filter((m) => m.role === "parent"), [members]);

  // A ticking clock so "Next Event" / countdowns and the header time stay
  // correct without needing to leave and revisit the page.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ padding: "16px 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: "calc(env(safe-area-inset-top, 0px) + 6px)" }}>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22 }}>{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div>
        <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13, color: BASE.t2 }}>{estClock(now)}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 10 }} className="sprinkles-today-grid">
        <TodaysEventsCard events={events} now={now} navigate={navigate} />
        <DepartureCard events={events} now={now} />
        <WeatherCard weather={weather} week={week} navigate={navigate} />
        <MealsCard mealPlan={mealPlan} navigate={navigate} />
        <KidCoinsCard kids={kids} coinLedger={coinLedger} coinRewards={coinRewards} navigate={navigate} />
        <ParentsGoalsCard parents={parents} stats={stats} navigate={navigate} />
        <TasksCard members={members} chores={chores} completions={completions} onToggleChore={onToggleChore} navigate={navigate} />
        <ProjectsCard projects={projects} navigate={navigate} />
        <MascotBox />
      </div>

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
