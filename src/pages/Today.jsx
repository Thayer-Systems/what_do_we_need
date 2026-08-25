import { useEffect, useMemo, useState } from "react";
import { IconBadge } from "../components/Deco.jsx";
import { ProgressBar } from "../components/Charts.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, CATEGORY_COLORS, DAY_NAMES, hardShadow } from "../lib/theme.js";
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
    <div style={{ ...widgetCard(BASE.teal), cursor: "pointer" }} onClick={() => navigate("/settings/tools/weather")}>
      <div style={eyebrow}>Weather</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name={weather?.icon || "sun"} size={38} />
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 32 }}>{weather ? `${weather.temperatureF}°F` : "—"}</span>
          </div>
          <div style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 700, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{weather ? weather.summary : "Not connected"}</div>
          {todayForecast && (
            <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, opacity: 0.85, marginTop: 2 }}>H:{todayForecast.highF}° L:{todayForecast.lowF}°</div>
          )}
        </div>
        {restOfWeek.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
            {restOfWeek.slice(0, 4).map((d) => (
              <div key={d.date} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1.5px solid ${BASE.ink}`, borderRadius: 8, padding: "3px 9px" }}>
                <span style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", width: 28 }}>{new Date(d.date).toLocaleDateString([], { weekday: "short" })}</span>
                <Icon name={d.icon} size={16} />
                <span style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 800, width: 26, textAlign: "right" }}>{d.highF}°</span>
              </div>
            ))}
          </div>
        )}
      </div>
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
              <div style={{ flex: 1, minWidth: 0, fontFamily: F.ui, fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.title}{e.location ? ` · ${e.location}` : ""}
              </div>
              <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 800, color: BASE.t2, flexShrink: 0 }}>
                {new Date(e.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
          ))}
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Today's Meals</span>
        <IconBadge icon="meals" bg={BASE.lilac} size={32} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
        {[["Lunch", slot("Lunch")], ["Dinner", slot("Dinner")]].map(([lbl, s]) => (
          <div key={lbl} style={{ background: BASE.muted, border: `1.5px solid ${BASE.ink}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: BASE.t2, fontFamily: F.ui, textTransform: "uppercase", flexShrink: 0 }}>{lbl}</span>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: F.display, flex: 1 }}>{s ? s.recipe_name : "Not planned"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tasks and Open Projects share one box now — the "+" jumps straight to
// the Tasks page and pops its Task/Project add menu open (via the same
// global-event pattern the mascot button uses) instead of just landing on
// the page and leaving the user to hunt for how to add a project.
function TasksProjectsCard({ members, chores, completions, projects, onToggleChore, navigate }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const doneToday = new Set(completions.filter((c) => c.date === todayStr).map((c) => c.chore_id));
  const remainingChores = chores.filter((c) => c.active && (c.visibility || "public") === "public" && choreAppliesToday(c) && !doneToday.has(c.id));
  const openProjects = projects.filter((p) => (p.visibility || "public") === "public" && p.status !== "done");

  const openAddMenu = (e) => {
    e.stopPropagation();
    navigate("/tasks");
    window.dispatchEvent(new Event("sprinkles-open-add-menu"));
  };

  return (
    <div style={{ ...widgetCard(BASE.pink), cursor: "pointer" }} onClick={() => navigate("/tasks")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>Tasks &amp; Projects</span>
        <button onClick={openAddMenu} aria-label="Add a task or project" style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 8, cursor: "pointer", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
          <Icon name="plus" size={15} />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 220, overflowY: "auto" }}>
        <div>
          <div style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", marginBottom: 6 }}>Today's Tasks</div>
          {remainingChores.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>All done today!</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {remainingChores.map((c) => {
                const member = members.find((m) => m.id === c.member_id);
                return (
                  <div key={c.id} onClick={(e) => { e.stopPropagation(); onToggleChore(c); }} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}>
                    <IconBadge icon={member?.icon || "donut"} bg={member?.color || BASE.yellow} size={22} radius={7} iconColor="#fff" />
                    <span style={{ flex: 1, fontFamily: F.ui, fontWeight: 700, fontSize: 12 }}>{c.title}</span>
                    <Icon name="close" size={14} style={{ opacity: 0.25 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", marginBottom: 6 }}>Open Projects</div>
          {openProjects.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>Nothing in progress.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {openProjects.map((p) => (
                <div key={p.id} style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "6px 10px" }}>
                  <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 12, marginBottom: 5 }}>{p.title}</div>
                  <ProgressBar pct={p.progress} color={BASE.pink} height={8} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
    <div style={{ ...widgetCard("#fff") }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Parents' Goals</span>
        <IconBadge icon="users" bg={BASE.orange} size={32} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${parents.length}, 1fr)`, gap: 10, flex: 1 }}>
        {parents.map((p) => {
          const goals = stats.filter((s) => s.member_id === p.id);
          return (
            <div
              key={p.id}
              onClick={() => navigate("/goals/parents")}
              style={{ background: BASE.muted, border: `1.5px solid ${BASE.ink}`, borderRadius: 10, padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", height: "100%" }}
            >
              <IconBadge icon={p.icon} bg={p.color} size={40} radius={999} iconColor="#fff" />
              <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 12, color: BASE.t2 }}>{p.name}</span>
              {goals.length === 0 ? (
                <span style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t3 }}>No goals set</span>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                  {goals.map((goal) => {
                    const value = effectiveGoalValue(goal);
                    const pct = goal.target ? Math.round((value / goal.target) * 100) : 0;
                    return (
                      <div key={goal.id} style={{ width: "100%" }}>
                        <div style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 700, color: BASE.t2, marginBottom: 3, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal.label}</div>
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
        <WeatherCard weather={weather} week={week} navigate={navigate} />
        <MealsCard mealPlan={mealPlan} navigate={navigate} />
        <KidCoinsCard kids={kids} coinLedger={coinLedger} coinRewards={coinRewards} navigate={navigate} />
        <ParentsGoalsCard parents={parents} stats={stats} navigate={navigate} />
        <TasksProjectsCard members={members} chores={chores} completions={completions} projects={projects} onToggleChore={onToggleChore} navigate={navigate} />
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
