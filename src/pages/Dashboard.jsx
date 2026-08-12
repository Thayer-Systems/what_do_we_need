import { useEffect, useMemo, useState } from "react";
import { IconBadge, StarAccent, Squiggle } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, MASCOT, mascotOfDay, CATEGORY_COLORS, DAY_NAMES, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

const DAY_MS = 86400000;

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

function useWeather() {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    fetch("/api/weather").then((r) => r.json()).then((d) => setWeather(d?.available ? d : null)).catch(() => setWeather(null));
  }, []);
  return weather;
}

function fmtCountdown(ms) {
  if (ms <= 0) return "now";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const widgetCard = (bg) => ({
  background: bg, border: `2.5px solid ${BASE.ink}`, borderRadius: 20,
  boxShadow: hardShadow(BASE.ink, 5, 5), padding: 18, position: "relative", overflow: "hidden",
});
const eyebrow = { fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: F.ui };

function greetingForNow(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Coffee & Donuts";
  if (h < 17) return "Sprinkle Break";
  return "Donut O'Clock";
}

function Hero({ birthdayMember, onAssistant }) {
  return (
    <div style={{ ...widgetCard(BASE.yellow), gridColumn: "1 / -1", minHeight: 190 }}>
      <StarAccent color={BASE.lilac} size={36} style={{ position: "absolute", top: 12, right: 152 }} />
      <StarAccent color={BASE.pink} size={24} style={{ position: "absolute", bottom: 10, right: 220 }} />
      <div style={{ maxWidth: "60%" }}>
        <div style={{ ...eyebrow, color: BASE.ink, opacity: 0.7 }}>{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 34, lineHeight: 1.05, margin: "4px 0 6px" }}>{greetingForNow()}</div>
        <Squiggle color={BASE.ink} width={110} height={16} />
        {birthdayMember && (
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "6px 14px", boxShadow: hardShadow(BASE.ink, 3, 3) }}>
            <Icon name="cake" size={18} />
            <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 13 }}>Happy Birthday, {birthdayMember.name}!</span>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <button onClick={onAssistant} style={{ background: "#c5f26b", color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3), display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="sparkle" size={16} /> Ask Mr. Sprinkles
          </button>
        </div>
      </div>
      <img src={mascotOfDay()} alt="" style={{ position: "absolute", right: 6, bottom: 0, width: "42%", maxWidth: 148, height: "auto", objectFit: "contain" }} />
    </div>
  );
}

function MiniCalendar({ events, navigate }) {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const days = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getTime() + i * DAY_MS));
  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  return (
    <div style={{ ...widgetCard("#fff"), gridColumn: "span 2", cursor: "pointer" }} onClick={() => navigate("/calendar")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>{today.toLocaleDateString([], { month: "long", year: "numeric" })}</span>
        <IconBadge icon="calendar" bg={BASE.teal} size={32} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {DAY_NAMES.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 800, color: BASE.t2, fontFamily: F.ui }}>{d[0]}</div>)}
        {days.map((d) => {
          const dayEvents = events.filter((e) => sameDay(new Date(e.start_at), d));
          const inMonth = d.getMonth() === today.getMonth();
          return (
            <div key={d.toISOString()} style={{ aspectRatio: "1", borderRadius: 8, border: `1.5px solid ${sameDay(d, today) ? BASE.ink : BASE.muted}`, background: sameDay(d, today) ? BASE.yellow : "transparent", opacity: inMonth ? 1 : 0.3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: F.ui, fontWeight: sameDay(d, today) ? 800 : 500, gap: 2 }}>
              {d.getDate()}
              {dayEvents.length > 0 && <div style={{ width: 4, height: 4, borderRadius: "50%", background: CATEGORY_COLORS[dayEvents[0].category] || BASE.pink }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingWidget({ events, navigate }) {
  const upcoming = events.filter((e) => new Date(e.start_at) > new Date()).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)).slice(0, 4);
  return (
    <div style={{ ...widgetCard("#fff"), gridColumn: "span 2" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Upcoming</span>
        <IconBadge icon="star" bg={BASE.yellow} size={32} />
      </div>
      {upcoming.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>Nothing on the calendar yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upcoming.map((e) => (
            <div key={e.id} onClick={() => navigate("/calendar")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: BASE.muted, borderRadius: 10, padding: "8px 12px" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: CATEGORY_COLORS[e.category] || BASE.pink, border: `1.5px solid ${BASE.ink}`, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>{e.title}</div>
                <div style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t2 }}>
                  {new Date(e.start_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
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

function WeatherWidget({ weather, navigate }) {
  return (
    <div style={{ ...widgetCard(BASE.teal), color: BASE.ink, cursor: "pointer" }} onClick={() => navigate("/settings/tools/weather")}>
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

function MealsWidget({ mealPlan, navigate }) {
  const today = DAY_NAMES[new Date().getDay()];
  const slot = (meal) => mealPlan.find((s) => s.day === today && s.meal === meal);
  return (
    <div style={{ ...widgetCard("#fff"), cursor: "pointer" }} onClick={() => navigate("/meals")}>
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

function GroceryWidget({ shopping, navigate }) {
  return (
    <div style={{ ...widgetCard(BASE.orange), cursor: "pointer" }} onClick={() => navigate("/grocery")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={eyebrow}>Grocery List</span>
        <IconBadge icon="cart" bg="#fff" size={32} />
      </div>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 30 }}>{shopping.length}</div>
      <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>{shopping.length ? shopping.slice(0, 3).map((s) => s.name).join(", ") : "All stocked up"}</div>
    </div>
  );
}

function ProjectsWidget({ projects, navigate }) {
  const active = projects.filter((p) => p.status !== "done");
  return (
    <div style={{ ...widgetCard(BASE.lilac), cursor: "pointer" }} onClick={() => navigate("/settings/household/projects")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={eyebrow}>Projects</span>
        <IconBadge icon="grid" bg="#fff" size={32} />
      </div>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 30 }}>{active.length}</div>
      <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>{active.length ? active.slice(0, 2).map((p) => p.title).join(", ") : "Nothing in progress"}</div>
    </div>
  );
}

function DepartureWidget({ events, members }) {
  const now = useNow();
  const next = useMemo(() => events.filter((e) => e.location && new Date(e.start_at) > now).sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0], [events, now]);

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
  const attendees = (next.member_ids || []).map((id) => members.find((m) => m.id === id)?.name).filter(Boolean);

  return (
    <div style={widgetCard(BASE.orange)}>
      <div style={eyebrow}>Next Event</div>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, margin: "4px 0 6px" }}>{next.title}</div>
      <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
        {start.toLocaleString([], { hour: "numeric", minute: "2-digit" })} · <Icon name="pin" size={12} /> {next.location}
        {attendees.length > 0 && ` · ${attendees.join(" & ")}`}
      </div>
      {leaveBy ? (
        <>
          <div style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Leave by {leaveBy.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
          <div style={{ background: BASE.ink, color: "#fff", borderRadius: 999, padding: "8px 14px", fontFamily: F.ui, fontSize: 12, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
            <span>Travel time: {travelMin} min</span>
            <span>{msUntilLeave > 0 ? `${fmtCountdown(msUntilLeave)} left` : "Go now!"}</span>
          </div>
        </>
      ) : (
        <div style={{ fontFamily: F.ui, fontSize: 12, fontStyle: "italic" }}>Add a location so travel time can be calculated.</div>
      )}
    </div>
  );
}

function TasksWidget({ members, chores, completions, onToggleChore }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dow = new Date().getDay();
  const todaysChores = chores.filter((c) => c.active && (c.frequency === "daily" || (c.days || []).includes(dow)));
  const doneToday = new Set(completions.filter((c) => c.date === todayStr).map((c) => c.chore_id));

  return (
    <div style={{ ...widgetCard(BASE.pink), gridColumn: "span 2" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Today's Tasks</span>
        <IconBadge icon="check" bg="#fff" size={32} />
      </div>
      {todaysChores.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 700 }}>Nothing scheduled today.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {todaysChores.map((c) => {
            const done = doneToday.has(c.id);
            const member = members.find((m) => m.id === c.member_id);
            return (
              <div key={c.id} onClick={() => !done && onToggleChore(c)} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: "8px 12px", cursor: done ? "default" : "pointer", opacity: done ? 0.6 : 1 }}>
                <IconBadge icon={member?.icon || "donut"} bg={member?.color || BASE.yellow} size={26} radius={8} iconColor="#fff" />
                <span style={{ flex: 1, fontFamily: F.ui, fontWeight: 700, fontSize: 13, textDecoration: done ? "line-through" : "none" }}>{c.title}</span>
                <Icon name={done ? "check" : "close"} size={16} style={{ opacity: done ? 1 : 0.25 }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function pctFor(member, chores, completions, stats) {
  const primary = stats.find((s) => s.member_id === member.id && s.active && !s.paused);
  if (primary) return Math.round((primary.value / primary.target) * 100);
  const todayStr = new Date().toISOString().slice(0, 10);
  const dow = new Date().getDay();
  const mine = chores.filter((c) => c.member_id === member.id && c.active && (c.frequency === "daily" || (c.days || []).includes(dow)));
  const done = mine.filter((c) => completions.some((cm) => cm.chore_id === c.id && cm.date === todayStr)).length;
  return mine.length ? Math.round((done / mine.length) * 100) : 0;
}

// Compact single-row view — all 5 members' progress at a glance, no
// rings or dividers, sized to fit comfortably on a phone screen.
function WinsBox({ members, chores, completions, stats, navigate }) {
  return (
    <div style={{ ...widgetCard("#fff"), gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Today's Wins</span>
        <IconBadge icon="star" bg={BASE.yellow} size={32} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
        {members.map((m) => {
          const pct = pctFor(m, chores, completions, stats);
          return (
            <div key={m.id} onClick={() => navigate(`/settings/family/${m.id}`)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", flex: 1 }}>
              <IconBadge icon={m.icon} bg={m.color} size={34} radius={999} iconColor="#fff" />
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>{pct}%</span>
              <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 10, color: BASE.t2 }}>{m.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({ members, events, chores, completions, mealPlan, shopping, stats, projects = [], onToggleChore, onOpenAssistant }) {
  const { navigate } = useRouter();
  const weather = useWeather();
  const birthdayMember = members.find((m) => isTodayBirthday(m.birthday));

  return (
    <div style={{ padding: "18px 16px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <img src={MASCOT.main} alt="" style={{ width: 44, height: 44, objectFit: "contain", flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 26, lineHeight: 1.1, margin: 0 }}>Mr. Sprinkles</h1>
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, marginTop: 2 }}>
            A private family organizer for the Rarick household — shared calendar, meal plans, tasks, grocery list &amp; household projects, all in one place.
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }} className="sprinkles-dashgrid">
        <Hero birthdayMember={birthdayMember} onAssistant={onOpenAssistant} />
        <MiniCalendar events={events} navigate={navigate} />
        <UpcomingWidget events={events} navigate={navigate} />
        <WeatherWidget weather={weather} navigate={navigate} />
        <MealsWidget mealPlan={mealPlan} navigate={navigate} />
        <GroceryWidget shopping={shopping} navigate={navigate} />
        <ProjectsWidget projects={projects} navigate={navigate} />
        <DepartureWidget events={events} members={members} />
        <TasksWidget members={members} chores={chores} completions={completions} onToggleChore={onToggleChore} />
        <WinsBox members={members} chores={chores} completions={completions} stats={stats} navigate={navigate} />
      </div>

      <style>{`
        @media (max-width: 640px) {
          .sprinkles-dashgrid { grid-template-columns: 1fr !important; }
          .sprinkles-dashgrid > * { grid-column: 1 / -1 !important; }
        }
        @media (min-width: 1000px) {
          .sprinkles-dashgrid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
