import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "./components/Shell.jsx";
import { CelebrationProvider, useCelebrate } from "./components/Celebration.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Family from "./pages/Family.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import Meals from "./pages/Meals.jsx";
import Grocery from "./pages/Grocery.jsx";
import Settings from "./pages/Settings.jsx";
import { get, post, patch, del } from "./lib/db.js";
import { interpretMessage } from "./lib/ai.js";

const DAY_MS = 86400000;

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

// Turns recurring family activities into read-only calendar entries
// for the surrounding ~4 months, without writing a DB row per occurrence.
function buildActivityEvents(activities, members) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - 30 * DAY_MS);
  for (let i = 0; i < 120; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const dow = d.getDay();
    activities.forEach((a) => {
      if (!a.active) return;
      if (!(a.days || []).includes(dow)) return;
      const member = members.find((m) => m.id === a.member_id);
      const [h, m] = (a.start_time || "17:00:00").split(":");
      const startAt = new Date(d);
      startAt.setHours(Number(h), Number(m), 0, 0);
      out.push({
        id: `activity-${a.id}-${d.toISOString().slice(0, 10)}`,
        title: `${member ? member.name + ": " : ""}${a.name}`,
        category: "activity",
        start_at: startAt.toISOString(),
        end_at: null,
        location: a.location,
        travel_minutes: null,
        member_ids: [a.member_id],
        notes: null,
        source: "activity",
      });
    });
  }
  return out;
}

function AppInner() {
  const [tab, setTab] = useState("home");
  const [selectedMember, setSelectedMember] = useState(null);
  const celebrate = useCelebrate();
  const weekStart = getWeekStart();

  const [members, setMembers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [medications, setMedications] = useState([]);
  const [foodPrefs, setFoodPrefs] = useState([]);
  const [links, setLinks] = useState([]);
  const [chores, setChores] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [events, setEvents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [shopping, setShopping] = useState([]);

  const loadAll = useCallback(async () => {
    const [
      mem, con, act, med, fp, lnk, chr, comp, evt, set, rec, mp, shop,
    ] = await Promise.all([
      get("sprinkles_family_members?order=sort_order.asc"),
      get("sprinkles_contacts"),
      get("sprinkles_activities"),
      get("sprinkles_medications"),
      get("sprinkles_food_prefs"),
      get("sprinkles_links"),
      get("sprinkles_chores"),
      get("sprinkles_chore_completions"),
      get("sprinkles_events?order=start_at.asc"),
      get("sprinkles_settings?id=eq.1"),
      get("recipes?order=name.asc"),
      get(`meal_plan?week_start=eq.${weekStart}`),
      get("shopping_list?status=eq.pending&order=name.asc"),
    ]);
    setMembers(mem || []);
    setContacts(con || []);
    setActivities(act || []);
    setMedications(med || []);
    setFoodPrefs(fp || []);
    setLinks(lnk || []);
    setChores(chr || []);
    setCompletions(comp || []);
    setEvents(evt || []);
    setSettings((set || [])[0] || null);
    setRecipes(rec || []);
    setMealPlan(mp || []);
    setShopping(shop || []);
    if (mem?.length && selectedMember == null) setSelectedMember(mem[0].id);
  }, [weekStart, selectedMember]);

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allEvents = useMemo(() => [...events, ...buildActivityEvents(activities, members)], [events, activities, members]);

  // ── Family handlers ──
  const onUpdateMember = async (id, ch) => {
    setMembers((p) => p.map((m) => (m.id === id ? { ...m, ...ch } : m)));
    await patch("sprinkles_family_members", id, ch);
  };
  const onAdd = async (table, body) => {
    const d = await post(table, body);
    const setters = {
      sprinkles_contacts: setContacts, sprinkles_activities: setActivities, sprinkles_medications: setMedications,
      sprinkles_links: setLinks, sprinkles_chores: setChores, sprinkles_events: setEvents,
    };
    if (d?.[0] && setters[table]) setters[table]((p) => [...p, d[0]]);
    return d?.[0];
  };
  const onDelete = async (table, id) => {
    const setters = {
      sprinkles_contacts: setContacts, sprinkles_activities: setActivities, sprinkles_medications: setMedications,
      sprinkles_links: setLinks, sprinkles_chores: setChores, sprinkles_events: setEvents,
    };
    setters[table]?.((p) => p.filter((x) => x.id !== id));
    await del(table, id);
  };
  const onUpdateFoodPrefs = async (memberId, prefs) => {
    const existing = foodPrefs.find((f) => f.member_id === memberId);
    if (existing) {
      setFoodPrefs((p) => p.map((f) => (f.member_id === memberId ? { ...f, ...prefs } : f)));
      await patch("sprinkles_food_prefs", existing.id, prefs);
    } else {
      const d = await post("sprinkles_food_prefs", { member_id: memberId, ...prefs });
      if (d?.[0]) setFoodPrefs((p) => [...p, d[0]]);
    }
  };

  // ── Chores / celebration ──
  const onToggleChore = async (chore) => {
    const date = new Date().toISOString().slice(0, 10);
    const d = await post("sprinkles_chore_completions", { chore_id: chore.id, date });
    if (d?.[0]) setCompletions((p) => [...p, d[0]]);
    celebrate("Good Job!");
  };

  // ── Calendar ──
  const onAddEvent = async (body) => {
    const saved = await onAdd("sprinkles_events", body);
    if (saved) {
      // Best-effort push to Google Calendar; silently no-ops if not connected.
      fetch("/api/calendar/create-event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(saved),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.ok && d.googleEventId) {
            setEvents((p) => p.map((e) => (e.id === saved.id ? { ...e, google_event_id: d.googleEventId } : e)));
            patch("sprinkles_events", saved.id, { google_event_id: d.googleEventId });
          }
        })
        .catch(() => {});
    }
    return saved;
  };
  const onDeleteEvent = (id) => onDelete("sprinkles_events", id);

  // ── Meals ──
  const onSaveRecipe = async (r) => {
    const body = { name: r.name, ingredients: r.ingredients, tags: r.tags, notes: r.notes };
    if (r.id) {
      await patch("recipes", r.id, body);
      setRecipes((p) => p.map((x) => (x.id === r.id ? { ...x, ...body } : x)));
    } else {
      const d = await post("recipes", body);
      if (d?.[0]) setRecipes((p) => [...p, d[0]].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };
  const onDeleteRecipe = async (id) => {
    setRecipes((p) => p.filter((r) => r.id !== id));
    await del("recipes", id);
  };
  const onScheduleRecipe = async (day, meal, recipe) => {
    const d = await post("meal_plan", { day, meal, recipe_id: recipe.id, recipe_name: recipe.name, week_start: weekStart, eat_out: false });
    if (d?.[0]) setMealPlan((p) => [...p, d[0]]);
  };
  const onMoveSlot = async (id, day, meal) => {
    setMealPlan((p) => p.map((s) => (s.id === id ? { ...s, day, meal } : s)));
    await patch("meal_plan", id, { day, meal });
  };
  const onRemoveSlot = async (id) => {
    setMealPlan((p) => p.filter((s) => s.id !== id));
    await del("meal_plan", id);
  };

  // ── Grocery ──
  const onAddGrocery = async (name) => {
    const d = await post("shopping_list", { name, category: "Other", status: "pending" });
    if (d?.[0]) setShopping((p) => [...p, d[0]]);
  };
  const onRemoveGrocery = async (id) => {
    setShopping((p) => p.filter((s) => s.id !== id));
    await del("shopping_list", id);
  };

  // ── Assistant ──
  const onAssistantSend = async (text) => {
    const result = await interpretMessage(text);
    if (result.type === "grocery") {
      await onAddGrocery(result.item);
      return `Added "${result.item}" to the grocery list.`;
    }
    if (result.type === "chore") {
      const member = members.find((m) => m.name.toLowerCase() === (result.member || "").toLowerCase());
      if (!member) return `Couldn't match "${result.member}" to a family member — add the chore from their Family profile.`;
      await onAdd("sprinkles_chores", { member_id: member.id, title: result.title, frequency: result.frequency || "daily", active: true });
      return `Added chore "${result.title}" for ${member.name}.`;
    }
    if (result.type === "event") {
      const member = members.find((m) => m.name.toLowerCase() === (result.member || "").toLowerCase());
      await onAddEvent({
        title: result.title,
        category: result.category || "event",
        start_at: new Date(result.start).toISOString(),
        location: result.location || null,
        member_ids: member ? [member.id] : [],
        source: "manual",
      });
      return `Added "${result.title}" to the calendar.`;
    }
    if (result.type === "meal") {
      const d = await post("meal_plan", { day: result.day, meal: result.meal, recipe_id: null, recipe_name: result.name, week_start: weekStart, eat_out: false });
      if (d?.[0]) setMealPlan((p) => [...p, d[0]]);
      return `Scheduled "${result.name}" for ${result.day} ${result.meal}.`;
    }
    return result.reason || "Not sure what to do with that yet — try rephrasing.";
  };

  const PAGES = {
    home: <Dashboard members={members} events={allEvents} chores={chores} completions={completions} onToggleChore={onToggleChore} onNavigate={setTab} />,
    family: (
      <Family
        members={members} contacts={contacts} activities={activities} medications={medications}
        foodPrefs={foodPrefs} links={links} chores={chores}
        selected={selectedMember} setSelected={setSelectedMember}
        onUpdateMember={onUpdateMember} onAdd={onAdd} onDelete={onDelete} onUpdateFoodPrefs={onUpdateFoodPrefs}
      />
    ),
    calendar: <CalendarPage members={members} events={allEvents} settings={settings} onAdd={onAddEvent} onDelete={onDeleteEvent} />,
    meals: <Meals recipes={recipes} mealPlan={mealPlan} onSaveRecipe={onSaveRecipe} onDeleteRecipe={onDeleteRecipe} onScheduleRecipe={onScheduleRecipe} onMoveSlot={onMoveSlot} onRemoveSlot={onRemoveSlot} />,
    grocery: <Grocery shopping={shopping} onAssistantSend={onAssistantSend} onAdd={onAddGrocery} onRemove={onRemoveGrocery} />,
    settings: <Settings settings={settings} />,
  };

  return (
    <Shell tab={tab} setTab={setTab}>
      {PAGES[tab]}
    </Shell>
  );
}

export default function App() {
  return (
    <CelebrationProvider>
      <AppInner />
    </CelebrationProvider>
  );
}
