import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "./components/Shell.jsx";
import AssistantPopover from "./components/AssistantPopover.jsx";
import { CelebrationProvider, useCelebrate } from "./components/Celebration.jsx";
import { RouterProvider, useRouter } from "./lib/router.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import FamilyList from "./pages/FamilyList.jsx";
import FamilyMember from "./pages/FamilyMember.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import { FoodHub, MealsPage, RecipeLibraryPage, TrendsPage } from "./pages/Food.jsx";
import Grocery from "./pages/Grocery.jsx";
import Tasks from "./pages/Tasks.jsx";
import Settings from "./pages/Settings.jsx";
import WeatherPage from "./pages/WeatherPage.jsx";
import Privacy from "./pages/Privacy.jsx";
import { HouseholdPage, IntegrationsPage, FaqPage, InstructionsPage, PreferencesPage } from "./pages/SettingsPages.jsx";
import { get, post, patch, del } from "./lib/db.js";
import { interpretMessage } from "./lib/ai.js";
import { notifyAssignment } from "./lib/push.js";

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
  const { path, navigate } = useRouter();
  const celebrate = useCelebrate();
  const weekStart = getWeekStart();

  if (path === "/privacy") return <Privacy />;

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
  const [stats, setStats] = useState([]);
  const [projects, setProjects] = useState([]);

  const loadAll = useCallback(async () => {
    const [mem, con, act, med, fp, lnk, chr, comp, evt, set, rec, mp, shop, sta, proj] = await Promise.all([
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
      get("sprinkles_member_stats?order=sort_order.asc"),
      get("sprinkles_projects?order=created_at.desc"),
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
    setStats(sta || []);
    setProjects(proj || []);
  }, [weekStart]);

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allEvents = useMemo(() => [...events, ...buildActivityEvents(activities, members)], [events, activities, members]);

  // ── Family handlers ──
  const onUpdateMember = async (id, ch) => {
    setMembers((p) => p.map((m) => (m.id === id ? { ...m, ...ch } : m)));
    await patch("sprinkles_family_members", id, ch);
  };
  const SETTERS = {
    sprinkles_contacts: setContacts, sprinkles_activities: setActivities, sprinkles_medications: setMedications,
    sprinkles_links: setLinks, sprinkles_chores: setChores, sprinkles_events: setEvents,
  };
  const onAdd = async (table, body) => {
    const d = await post(table, body);
    if (d?.[0] && SETTERS[table]) SETTERS[table]((p) => [...p, d[0]]);
    return d?.[0];
  };
  const onDelete = async (table, id) => {
    SETTERS[table]?.((p) => p.filter((x) => x.id !== id));
    await del(table, id);
  };
  const onAddChore = async (body) => {
    const d = await onAdd("sprinkles_chores", { active: true, ...body });
    if (d && body.member_id) notifyAssignment([body.member_id], "New task assigned", d.title, "/tasks");
    return d;
  };
  const onUpdateChore = async (id, ch) => {
    const before = chores.find((c) => c.id === id);
    setChores((p) => p.map((c) => (c.id === id ? { ...c, ...ch } : c)));
    await patch("sprinkles_chores", id, ch);
    if (ch.member_id && before && ch.member_id !== before.member_id) {
      notifyAssignment([ch.member_id], "Task assigned to you", ch.title || before.title, "/tasks");
    }
  };
  const onUpdateSettings = async (ch) => {
    setSettings((p) => ({ ...p, ...ch }));
    await patch("sprinkles_settings", 1, ch);
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

  // ── Member stats (wins/goals) ──
  const onAddStat = async (memberId, body) => {
    const d = await post("sprinkles_member_stats", { member_id: memberId, active: true, ...body });
    if (d?.[0]) setStats((p) => [...p, d[0]]);
  };
  const onUpdateStat = async (id, ch) => {
    const before = stats.find((s) => s.id === id);
    setStats((p) => p.map((s) => (s.id === id ? { ...s, ...ch } : s)));
    await patch("sprinkles_member_stats", id, ch);
    const after = { ...before, ...ch };
    if (before && ch.value != null && after.value >= after.target && before.value < before.target) celebrate("Goal reached!");
  };
  const onDeleteStat = async (id) => {
    setStats((p) => p.filter((s) => s.id !== id));
    await del("sprinkles_member_stats", id);
  };

  // ── Projects ──
  const onAddProject = async (body) => {
    const d = await post("sprinkles_projects", body);
    if (d?.[0]) {
      setProjects((p) => [d[0], ...p]);
      if (body.member_id) notifyAssignment([body.member_id], "New project assigned", d[0].title, "/tasks");
    }
  };
  const onUpdateProject = async (id, ch) => {
    const before = projects.find((x) => x.id === id);
    setProjects((p) => p.map((x) => (x.id === id ? { ...x, ...ch } : x)));
    await patch("sprinkles_projects", id, ch);
    if (ch.progress === 100 || ch.status === "done") celebrate("Project done!");
    if (ch.member_id && before && ch.member_id !== before.member_id) {
      notifyAssignment([ch.member_id], "Project assigned to you", ch.title || before.title, "/tasks");
    }
  };
  const onDeleteProject = async (id) => {
    setProjects((p) => p.filter((x) => x.id !== id));
    await del("sprinkles_projects", id);
  };

  // ── Chores / celebration ──
  const onToggleChore = async (chore) => {
    const date = new Date().toISOString().slice(0, 10);
    const once = chore.frequency === "once";
    const existing = once
      ? completions.find((c) => c.chore_id === chore.id)
      : completions.find((c) => c.chore_id === chore.id && c.date === date);
    if (existing) {
      setCompletions((p) => p.filter((c) => c.id !== existing.id));
      await del("sprinkles_chore_completions", existing.id);
      if (once) {
        setChores((p) => p.map((c) => (c.id === chore.id ? { ...c, active: true } : c)));
        await patch("sprinkles_chores", chore.id, { active: true });
      }
      return;
    }
    const d = await post("sprinkles_chore_completions", { chore_id: chore.id, date });
    if (d?.[0]) setCompletions((p) => [...p, d[0]]);
    if (once) {
      setChores((p) => p.map((c) => (c.id === chore.id ? { ...c, active: false } : c)));
      await patch("sprinkles_chores", chore.id, { active: false });
    }
    celebrate("Good Job!");
  };

  // ── Calendar ──
  const onAddEvent = async (body) => {
    const saved = await onAdd("sprinkles_events", body);
    if (saved) {
      if (saved.member_ids?.length) notifyAssignment(saved.member_ids, "Added to an event", `${saved.title} · ${new Date(saved.start_at).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`, "/calendar");
      fetch("/api/calendar/create-event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(saved) })
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
  const onUpdateEvent = async (id, ch) => {
    const before = events.find((e) => e.id === id);
    setEvents((p) => p.map((e) => (e.id === id ? { ...e, ...ch } : e)));
    await patch("sprinkles_events", id, ch);
    if (ch.member_ids && before) {
      const newlyAdded = ch.member_ids.filter((mid) => !(before.member_ids || []).includes(mid));
      if (newlyAdded.length) {
        const title = ch.title || before.title;
        const startAt = ch.start_at || before.start_at;
        notifyAssignment(newlyAdded, "Added to an event", `${title} · ${new Date(startAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`, "/calendar");
      }
    }
  };
  const onSyncEventToGoogle = async (event) => {
    const r = await fetch("/api/calendar/create-event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(event) });
    const d = await r.json().catch(() => null);
    if (d?.ok && d.googleEventId) {
      setEvents((p) => p.map((e) => (e.id === event.id ? { ...e, google_event_id: d.googleEventId } : e)));
      patch("sprinkles_events", event.id, { google_event_id: d.googleEventId });
    }
    return d;
  };

  // ── Meals ──
  const onSaveRecipe = async (r) => {
    const body = { name: r.name, ingredients: r.ingredients, tags: r.tags, equipment: r.equipment, est_time: r.est_time, notes: r.notes };
    if (r.id) {
      await patch("recipes", r.id, body);
      const updated = { ...r, ...body };
      setRecipes((p) => p.map((x) => (x.id === r.id ? updated : x)));
      return updated;
    }
    const d = await post("recipes", body);
    if (d?.[0]) {
      setRecipes((p) => [...p, d[0]].sort((a, b) => a.name.localeCompare(b.name)));
      return d[0];
    }
    return null;
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
    celebrate("Got it!");
  };

  // ── Assistant ──
  const onAssistantSend = async (text, history) => {
    const result = await interpretMessage(text, history);
    const actions = Array.isArray(result.actions) ? result.actions : [];
    for (const action of actions) {
      if (action.type === "grocery") {
        await Promise.all((action.items || []).map((item) => onAddGrocery(item)));
      } else if (action.type === "chore") {
        const member = members.find((m) => m.name.toLowerCase() === (action.member || "").toLowerCase());
        if (member) await onAdd("sprinkles_chores", { member_id: member.id, title: action.title, frequency: action.frequency || "once", active: true });
      } else if (action.type === "event") {
        const member = members.find((m) => m.name.toLowerCase() === (action.member || "").toLowerCase());
        await onAddEvent({
          title: action.title,
          category: action.category || "event",
          start_at: new Date(action.start).toISOString(),
          location: action.location || null,
          member_ids: member ? [member.id] : [],
          source: "manual",
        });
      } else if (action.type === "meal") {
        const d = await post("meal_plan", { day: action.day, meal: action.meal, recipe_id: null, recipe_name: action.name, week_start: weekStart, eat_out: false });
        if (d?.[0]) setMealPlan((p) => [...p, d[0]]);
      }
      // "call" actions: not supported yet, no-op — the model's reply already says so.
    }
    return result.reply || "Not sure what to do with that yet — try rephrasing.";
  };

  const memberFromPath = (p) => {
    const m = p.match(/^\/settings\/family\/(\d+)$/);
    return m ? members.find((x) => x.id === Number(m[1])) : null;
  };

  let page;
  if (path === "/") {
    page = <Dashboard members={members} events={allEvents} chores={chores} completions={completions} mealPlan={mealPlan} shopping={shopping} stats={stats} projects={projects} onToggleChore={onToggleChore} onOpenAssistant={() => window.dispatchEvent(new Event("sprinkles-open-assistant"))} />;
  } else if (path === "/calendar") {
    page = <CalendarPage members={members} events={allEvents} settings={settings} onAdd={onAddEvent} onUpdate={onUpdateEvent} onDelete={onDeleteEvent} onSyncGoogle={onSyncEventToGoogle} />;
  } else if (path === "/food") {
    page = <FoodHub />;
  } else if (path === "/food/meals") {
    page = <MealsPage recipes={recipes} mealPlan={mealPlan} onSaveRecipe={onSaveRecipe} onDeleteRecipe={onDeleteRecipe} onScheduleRecipe={onScheduleRecipe} onMoveSlot={onMoveSlot} onRemoveSlot={onRemoveSlot} />;
  } else if (path === "/food/grocery") {
    page = <Grocery shopping={shopping} onAssistantSend={onAssistantSend} onAdd={onAddGrocery} onRemove={onRemoveGrocery} />;
  } else if (path === "/food/recipes") {
    page = <RecipeLibraryPage recipes={recipes} onSaveRecipe={onSaveRecipe} onDeleteRecipe={onDeleteRecipe} />;
  } else if (path === "/food/trends") {
    page = <TrendsPage recipes={recipes} mealPlan={mealPlan} shopping={shopping} />;
  } else if (path === "/tasks") {
    page = (
      <Tasks
        members={members} chores={chores} completions={completions} projects={projects}
        onAddChore={onAddChore}
        onUpdateChore={onUpdateChore}
        onDeleteChore={(id) => onDelete("sprinkles_chores", id)}
        onToggleChore={onToggleChore}
        onAddProject={onAddProject} onUpdateProject={onUpdateProject} onDeleteProject={onDeleteProject}
      />
    );
  } else if (path === "/settings/family") {
    page = <FamilyList members={members} />;
  } else if (memberFromPath(path)) {
    page = (
      <FamilyMember
        member={memberFromPath(path)} contacts={contacts} activities={activities} medications={medications}
        foodPrefs={foodPrefs} links={links} chores={chores} completions={completions} stats={stats}
        onUpdateMember={onUpdateMember} onAdd={onAdd} onDelete={onDelete} onUpdateFoodPrefs={onUpdateFoodPrefs}
        onAddStat={onAddStat} onUpdateStat={onUpdateStat} onDeleteStat={onDeleteStat}
      />
    );
  } else if (path === "/settings/tools/weather") {
    page = <WeatherPage />;
  } else if (path === "/settings/household") {
    page = <HouseholdPage settings={settings} />;
  } else if (path === "/settings/integrations") {
    page = <IntegrationsPage settings={settings} />;
  } else if (path === "/settings/faq") {
    page = <FaqPage />;
  } else if (path === "/settings/instructions") {
    page = <InstructionsPage />;
  } else if (path === "/settings/preferences") {
    page = <PreferencesPage settings={settings} onUpdateSettings={onUpdateSettings} members={members} />;
  } else if (path === "/settings") {
    page = <Settings />;
  } else {
    page = <Dashboard members={members} events={allEvents} chores={chores} completions={completions} mealPlan={mealPlan} shopping={shopping} stats={stats} projects={projects} onToggleChore={onToggleChore} onOpenAssistant={() => window.dispatchEvent(new Event("sprinkles-open-assistant"))} />;
  }

  return (
    <Shell>
      {page}
      <AssistantPopover onSend={onAssistantSend} />
    </Shell>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <CelebrationProvider>
        <AppInner />
      </CelebrationProvider>
    </RouterProvider>
  );
}
