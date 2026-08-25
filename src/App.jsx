import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "./components/Shell.jsx";
import PinGate from "./components/PinGate.jsx";
import AssistantPopover from "./components/AssistantPopover.jsx";
import { CelebrationProvider, useCelebrate } from "./components/Celebration.jsx";
import { RouterProvider, useRouter } from "./lib/router.jsx";
import { CalendarFiltersProvider } from "./lib/calendarFilters.jsx";
import Today from "./pages/Today.jsx";
import FamilyList from "./pages/FamilyList.jsx";
import FamilyMember from "./pages/FamilyMember.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import { FoodWeekPage, RecipeLibraryPage, TrendsPage } from "./pages/Food.jsx";
import Grocery from "./pages/Grocery.jsx";
import Tasks from "./pages/Tasks.jsx";
import KidsGoals, { KidsGoalsRulesPage, KidCoinTrendsPage, KidsChoresPage } from "./pages/KidsGoals.jsx";
import ParentsGoals from "./pages/ParentsGoals.jsx";
import Settings from "./pages/Settings.jsx";
import WeatherPage from "./pages/WeatherPage.jsx";
import Privacy from "./pages/Privacy.jsx";
import { HouseholdPage, IntegrationsPage, FaqPage, InstructionsPage, PreferencesPage, GamesPage } from "./pages/SettingsPages.jsx";
import SchoolDay from "./pages/SchoolDay.jsx";
import RoutinesTab from "./pages/RoutinesTab.jsx";
import RoutinesPage from "./pages/RoutinesPage.jsx";
import { get, getSafe, post, patch, del } from "./lib/db.js";
import { interpretMessage } from "./lib/ai.js";
import { notifyAssignment } from "./lib/push.js";
import { useIsTVMode } from "./lib/useMediaQuery.js";
import { isInDisplayWindow } from "./lib/schoolDay.js";
import { speak } from "./lib/tts.js";
import { choreAppliesToday } from "./lib/tasks.js";
import { coinAnnouncementFor, randomParentAffirmation } from "./lib/announcements.js";

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
  const [coinRules, setCoinRules] = useState([]);
  const [coinLedger, setCoinLedger] = useState([]);
  const [coinRewards, setCoinRewards] = useState([]);
  const [coinLoadError, setCoinLoadError] = useState(false);
  const [morningRoutine, setMorningRoutine] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [routineCompletions, setRoutineCompletions] = useState([]);
  const [displaySchedule, setDisplaySchedule] = useState(null);

  const loadAll = useCallback(async () => {
    let coinFailed = false;
    const trackCoinFailure = () => { coinFailed = true; };
    const [mem, con, act, med, fp, lnk, chr, comp, evt, set, rec, mp, shop, sta, proj, rules, ledger, rewards, morning, schedule, routineRows, routineCompletionRows] = await Promise.all([
      getSafe("sprinkles_family_members?order=sort_order.asc"),
      getSafe("sprinkles_contacts"),
      getSafe("sprinkles_activities"),
      getSafe("sprinkles_medications"),
      getSafe("sprinkles_food_prefs"),
      getSafe("sprinkles_links"),
      getSafe("sprinkles_chores"),
      getSafe("sprinkles_chore_completions"),
      getSafe("sprinkles_events?order=start_at.asc"),
      getSafe("sprinkles_settings?id=eq.1"),
      getSafe("recipes?order=name.asc"),
      getSafe(`meal_plan?week_start=eq.${weekStart}`),
      getSafe("shopping_list?status=eq.pending&order=name.asc"),
      getSafe("sprinkles_member_stats?order=sort_order.asc"),
      getSafe("sprinkles_projects?order=created_at.desc"),
      getSafe("sprinkles_coin_rules?order=sort_order.asc", trackCoinFailure),
      getSafe("sprinkles_coin_ledger?order=created_at.desc", trackCoinFailure),
      getSafe("sprinkles_coin_rewards?order=sort_order.asc", trackCoinFailure),
      getSafe("sprinkles_morning_routine_items?order=sort_order.asc"),
      getSafe("sprinkles_display_schedule?id=eq.1"),
      getSafe("sprinkles_routines?order=sort_order.asc"),
      getSafe("sprinkles_routine_completions"),
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
    setCoinRules(rules || []);
    setCoinLedger(ledger || []);
    setCoinRewards(rewards || []);
    setCoinLoadError(coinFailed);
    setMorningRoutine(morning || []);
    setDisplaySchedule((schedule || [])[0] || null);
    setRoutines(routineRows || []);
    setRoutineCompletions(routineCompletionRows || []);
  }, [weekStart]);

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Two phones sharing one household means each device's in-memory state
  // goes stale the moment the *other* one saves something — there's no
  // realtime subscription, just a one-time load on mount. Re-pull
  // everything whenever this tab/PWA regains focus (backgrounding and
  // reopening the app is the common mobile case) so a change made on the
  // other phone shows up here without a manual refresh, and this device's
  // own state doesn't silently drift from what's actually in the database.
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState !== "hidden") loadAll(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadAll]);

  // On a TV/kiosk device, the School Day display becomes the main screen
  // during the window configured on Tools > Routines — it only
  // auto-switches away from Today, never interrupts another page, and
  // keeps using that schedule until the user changes it there.
  const isTV = useIsTVMode();
  useEffect(() => {
    if (!isTV) return;
    const check = () => {
      if (isInDisplayWindow(displaySchedule) && window.location.pathname === "/") navigate("/school-day");
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [isTV, displaySchedule]); // eslint-disable-line react-hooks/exhaustive-deps

  const onUpdateDisplaySchedule = async (ch) => {
    setDisplaySchedule((p) => ({ ...p, ...ch }));
    try {
      await patch("sprinkles_display_schedule", 1, ch);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "Request failed." };
    }
  };

  const allEvents = useMemo(() => [...events, ...buildActivityEvents(activities, members)], [events, activities, members]);

  // ── Family handlers ──
  const onUpdateMember = async (id, ch) => {
    const before = members.find((m) => m.id === id);
    setMembers((p) => p.map((m) => (m.id === id ? { ...m, ...ch } : m)));
    try {
      await patch("sprinkles_family_members", id, ch);
      return { ok: true };
    } catch (e) {
      if (before) setMembers((p) => p.map((m) => (m.id === id ? before : m)));
      return { ok: false, error: e.message || "Request failed." };
    }
  };
  const SETTERS = {
    sprinkles_contacts: setContacts, sprinkles_activities: setActivities, sprinkles_medications: setMedications,
    sprinkles_links: setLinks, sprinkles_chores: setChores, sprinkles_events: setEvents,
    sprinkles_morning_routine_items: setMorningRoutine, sprinkles_routines: setRoutines,
  };
  // Returns { ok, error, data } instead of throwing so every modal that
  // calls this can show the failure inline and keep the form open — a bare
  // throw here previously meant "nothing happens, nothing saved, no sign
  // anything went wrong" for chores, projects, morning-routine items, etc.
  const onAdd = async (table, body) => {
    try {
      const d = await post(table, body);
      if (!d?.[0]) return { ok: false, error: "No row was created." };
      if (SETTERS[table]) SETTERS[table]((p) => [...p, d[0]]);
      return { ok: true, data: d[0] };
    } catch (e) {
      return { ok: false, error: e.message || "Request failed." };
    }
  };
  const onDelete = async (table, id) => {
    SETTERS[table]?.((p) => p.filter((x) => x.id !== id));
    try {
      await del(table, id);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "Request failed." };
    }
  };
  const onAddChore = async (body) => {
    const result = await onAdd("sprinkles_chores", { active: true, ...body });
    if (result.ok && body.member_id) notifyAssignment([body.member_id], "New task assigned", result.data.title, "/tasks");
    return result;
  };
  const onUpdateRoutineItem = async (id, ch) => {
    const before = morningRoutine.find((i) => i.id === id);
    setMorningRoutine((p) => p.map((i) => (i.id === id ? { ...i, ...ch } : i)));
    try {
      await patch("sprinkles_morning_routine_items", id, ch);
      return { ok: true };
    } catch (e) {
      if (before) setMorningRoutine((p) => p.map((i) => (i.id === id ? before : i)));
      return { ok: false, error: e.message || "Request failed." };
    }
  };
  const onUpdateRoutine = async (id, ch) => {
    const before = routines.find((r) => r.id === id);
    setRoutines((p) => p.map((r) => (r.id === id ? { ...r, ...ch } : r)));
    try {
      await patch("sprinkles_routines", id, ch);
      return { ok: true };
    } catch (e) {
      if (before) setRoutines((p) => p.map((r) => (r.id === id ? before : r)));
      return { ok: false, error: e.message || "Request failed." };
    }
  };
  // Toggles one checklist item for a kid's routine on a given date, and —
  // if that completes every active item for that kid in that routine —
  // awards the flat 3-coin all-or-none reward exactly once (guarded by
  // coins_awarded so re-checking/unchecking later never pays out twice).
  const onToggleRoutineItem = async (routineId, memberId, itemId, date) => {
    const activeItemIds = morningRoutine.filter((i) => i.routine_id === routineId && i.member_id === memberId && i.active).map((i) => i.id);
    let row = routineCompletions.find((c) => c.routine_id === routineId && c.member_id === memberId && c.date === date);
    const prevChecked = row?.checked_item_ids || [];
    const nextChecked = prevChecked.includes(itemId) ? prevChecked.filter((id) => id !== itemId) : [...prevChecked, itemId];
    const allDone = activeItemIds.length > 0 && activeItemIds.every((id) => nextChecked.includes(id));
    const shouldAward = allDone && !row?.coins_awarded;

    if (row) {
      setRoutineCompletions((p) => p.map((c) => (c.id === row.id ? { ...c, checked_item_ids: nextChecked, coins_awarded: c.coins_awarded || shouldAward } : c)));
      await patch("sprinkles_routine_completions", row.id, { checked_item_ids: nextChecked, ...(shouldAward ? { coins_awarded: true } : {}) });
    } else {
      const d = await post("sprinkles_routine_completions", { routine_id: routineId, member_id: memberId, date, checked_item_ids: nextChecked, coins_awarded: shouldAward });
      if (d?.[0]) setRoutineCompletions((p) => [...p, d[0]]);
    }
    if (shouldAward) await onAddCoinTransaction({ member_id: memberId, delta: 3, reason: "Completed routine", rule_id: null });
  };

  const onUpdateChore = async (id, ch) => {
    const before = chores.find((c) => c.id === id);
    setChores((p) => p.map((c) => (c.id === id ? { ...c, ...ch } : c)));
    try {
      await patch("sprinkles_chores", id, ch);
    } catch (e) {
      if (before) setChores((p) => p.map((c) => (c.id === id ? before : c)));
      return { ok: false, error: e.message || "Request failed." };
    }
    if (ch.member_id && before && ch.member_id !== before.member_id) {
      notifyAssignment([ch.member_id], "Task assigned to you", ch.title || before.title, "/tasks");
    }
    return { ok: true };
  };
  const onUpdateSettings = async (ch) => {
    const before = settings;
    setSettings((p) => ({ ...p, ...ch }));
    try {
      await patch("sprinkles_settings", 1, ch);
      return { ok: true };
    } catch (e) {
      setSettings(before);
      return { ok: false, error: e.message || "Request failed." };
    }
  };
  const onUpdateFoodPrefs = async (memberId, prefs) => {
    const existing = foodPrefs.find((f) => f.member_id === memberId);
    try {
      if (existing) {
        setFoodPrefs((p) => p.map((f) => (f.member_id === memberId ? { ...f, ...prefs } : f)));
        await patch("sprinkles_food_prefs", existing.id, prefs);
      } else {
        const d = await post("sprinkles_food_prefs", { member_id: memberId, ...prefs });
        if (d?.[0]) setFoodPrefs((p) => [...p, d[0]]);
      }
      return { ok: true };
    } catch (e) {
      if (existing) setFoodPrefs((p) => p.map((f) => (f.member_id === memberId ? existing : f)));
      return { ok: false, error: e.message || "Request failed." };
    }
  };

  // ── Member stats (wins/goals) ──
  const onAddStat = async (memberId, body) => {
    try {
      const d = await post("sprinkles_member_stats", { member_id: memberId, active: true, ...body });
      if (!d?.[0]) return { ok: false, error: "No row was created." };
      setStats((p) => [...p, d[0]]);
      return { ok: true, data: d[0] };
    } catch (e) {
      return { ok: false, error: e.message || "Request failed." };
    }
  };
  const onUpdateStat = async (id, ch) => {
    const before = stats.find((s) => s.id === id);
    setStats((p) => p.map((s) => (s.id === id ? { ...s, ...ch } : s)));
    try {
      await patch("sprinkles_member_stats", id, ch);
    } catch (e) {
      if (before) setStats((p) => p.map((s) => (s.id === id ? before : s)));
      return { ok: false, error: e.message || "Request failed." };
    }
    const after = { ...before, ...ch };
    if (before && ch.value != null && after.value >= after.target && before.value < before.target) celebrate("Goal reached!");
    return { ok: true };
  };
  const onDeleteStat = async (id) => {
    const before = stats.find((s) => s.id === id);
    setStats((p) => p.filter((s) => s.id !== id));
    try {
      await del("sprinkles_member_stats", id);
    } catch (e) {
      if (before) setStats((p) => [...p, before]);
    }
  };

  // ── Projects ──
  const onAddProject = async (body) => {
    try {
      const d = await post("sprinkles_projects", body);
      if (!d?.[0]) return { ok: false, error: "No row was created." };
      setProjects((p) => [d[0], ...p]);
      if (body.member_id) notifyAssignment([body.member_id], "New project assigned", d[0].title, "/tasks");
      return { ok: true, data: d[0] };
    } catch (e) {
      return { ok: false, error: e.message || "Request failed." };
    }
  };
  const onUpdateProject = async (id, ch) => {
    const before = projects.find((x) => x.id === id);
    setProjects((p) => p.map((x) => (x.id === id ? { ...x, ...ch } : x)));
    try {
      await patch("sprinkles_projects", id, ch);
    } catch (e) {
      if (before) setProjects((p) => p.map((x) => (x.id === id ? before : x)));
      return { ok: false, error: e.message || "Request failed." };
    }
    const justFinished = (ch.progress === 100 || ch.status === "done") && before && before.progress !== 100 && before.status !== "done";
    if (ch.progress === 100 || ch.status === "done") celebrate("Project done!");
    if (justFinished) {
      const assignee = members.find((m) => m.id === (ch.member_id ?? before.member_id));
      if (assignee?.role === "parent") speak(randomParentAffirmation());
    }
    if (ch.member_id && before && ch.member_id !== before.member_id) {
      notifyAssignment([ch.member_id], "Project assigned to you", ch.title || before.title, "/tasks");
    }
    return { ok: true };
  };
  const onDeleteProject = async (id) => {
    const before = projects.find((x) => x.id === id);
    setProjects((p) => p.filter((x) => x.id !== id));
    try {
      await del("sprinkles_projects", id);
    } catch (e) {
      if (before) setProjects((p) => [before, ...p]);
    }
  };

  // ── Kids Goals (coins) ──
  // Returns { ok, error } instead of throwing so callers (modals) can show
  // the failure inline — a silent throw here previously meant "nothing
  // happens" with no indication anything went wrong.
  // `announcement` lets a caller override what gets said out loud (e.g. the
  // "all chores done" bonus below says "Great Job {name}" instead of the
  // default "coins given" line) — pass an explicit falsy value to say
  // nothing, or omit it to use the default per-delta line.
  const onAddCoinTransaction = async (body, announcement) => {
    try {
      const d = await post("sprinkles_coin_ledger", body);
      if (!d?.[0]) return { ok: false, error: "No row was created." };
      setCoinLedger((p) => [d[0], ...p]);
      if (d[0].delta > 0) celebrate("Coins earned!");
      const line = announcement !== undefined ? announcement : coinAnnouncementFor(d[0], coinLedger, coinRewards);
      if (line) speak(line);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "Request failed." };
    }
  };

  // ── Chores / celebration ──
  const onToggleChore = async (chore) => {
    const date = new Date().toISOString().slice(0, 10);
    try {
      const d = await post("sprinkles_chore_completions", { chore_id: chore.id, date });
      if (d?.[0]) {
        setCompletions((p) => [...p, d[0]]);
        celebrate("Good Job!");
        const member = members.find((m) => m.id === chore.member_id);
        if (member?.role === "parent") {
          speak(randomParentAffirmation());
        } else if (member) {
          // Every active task assigned to this kid that applies today — if
          // this completion is the one that finishes them all off (and
          // wasn't already all done before it), pay the flat 3-coin
          // all-or-none bonus and say so instead of the usual "coins given"
          // line.
          const applicable = chores.filter((c) => c.member_id === member.id && c.active && choreAppliesToday(c));
          if (applicable.length > 0) {
            const doneBefore = new Set(completions.filter((c) => c.date === date).map((c) => c.chore_id));
            const wasAllDone = applicable.every((c) => doneBefore.has(c.id));
            const isAllDoneNow = applicable.every((c) => doneBefore.has(c.id) || c.id === chore.id);
            if (isAllDoneNow && !wasAllDone) {
              await onAddCoinTransaction(
                { member_id: member.id, delta: 3, reason: "Completed all tasks today", rule_id: null },
                `Great job ${member.name}!`
              );
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to record task completion:", e); // eslint-disable-line no-console
    }
  };

  // ── Calendar ──
  const onAddEvent = async (body) => {
    const result = await onAdd("sprinkles_events", body);
    const saved = result.data;
    if (saved) {
      if (saved.member_ids?.length) notifyAssignment(saved.member_ids, "Added to an event", `${saved.title} · ${new Date(saved.start_at).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`, "/calendar");
      fetch("/api/calendar/create-event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...saved, attendee_emails: settings?.attendee_emails }) })
        .then((r) => r.json())
        .then((d) => {
          if (d?.ok && d.googleEventId) {
            setEvents((p) => p.map((e) => (e.id === saved.id ? { ...e, google_event_id: d.googleEventId } : e)));
            patch("sprinkles_events", saved.id, { google_event_id: d.googleEventId });
          } else if (!d?.ok) {
            // Not fatal to the save, but the event silently won't reach
            // Google Calendar (and so won't email attendees) — surface why.
            // eslint-disable-next-line no-console
            console.error("Google Calendar sync failed on create:", d?.reason, d?.detail);
          }
        })
        .catch((e) => console.error("Google Calendar sync request failed on create:", e)); // eslint-disable-line no-console
    }
    return saved;
  };
  const onDeleteEvent = (id) => onDelete("sprinkles_events", id);
  const onUpdateEvent = async (id, ch) => {
    const before = events.find((e) => e.id === id);
    const after = { ...before, ...ch };
    setEvents((p) => p.map((e) => (e.id === id ? after : e)));
    await patch("sprinkles_events", id, ch);
    if (ch.member_ids && before) {
      const newlyAdded = ch.member_ids.filter((mid) => !(before.member_ids || []).includes(mid));
      if (newlyAdded.length) {
        const title = ch.title || before.title;
        const startAt = ch.start_at || before.start_at;
        notifyAssignment(newlyAdded, "Added to an event", `${title} · ${new Date(startAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`, "/calendar");
      }
    }
    // Editing an event re-shares it automatically — hitting Save is the
    // only action a user needs, no separate "sync to Google" click.
    fetch("/api/calendar/create-event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...after, google_event_id: after.google_event_id, attendee_emails: settings?.attendee_emails }) })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.googleEventId) {
          setEvents((p) => p.map((e) => (e.id === id ? { ...e, google_event_id: d.googleEventId } : e)));
          if (d.googleEventId !== after.google_event_id) patch("sprinkles_events", id, { google_event_id: d.googleEventId });
        } else if (!d?.ok) {
          console.error("Google Calendar sync failed on update:", d?.reason, d?.detail); // eslint-disable-line no-console
        }
      })
      .catch((e) => console.error("Google Calendar sync request failed on update:", e)); // eslint-disable-line no-console
  };
  const onSyncEventToGoogle = async (event) => {
    const r = await fetch("/api/calendar/create-event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...event, attendee_emails: settings?.attendee_emails }) });
    const d = await r.json().catch(() => null);
    if (d?.ok && d.googleEventId) {
      setEvents((p) => p.map((e) => (e.id === event.id ? { ...e, google_event_id: d.googleEventId } : e)));
      patch("sprinkles_events", event.id, { google_event_id: d.googleEventId });
    }
    return d;
  };

  // ── Meals ──
  const onSaveRecipe = async (r) => {
    const body = {
      name: r.name, ingredients: r.ingredients, tags: r.tags, equipment: r.equipment, est_time: r.est_time, notes: r.notes,
      folder: r.folder ?? null, day_of_week: r.day_of_week ?? null, week_tag: r.week_tag ?? null,
    };
    try {
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
    } catch (e) {
      console.error("Failed to save recipe:", e); // eslint-disable-line no-console
      return null;
    }
  };
  const onDeleteRecipe = async (id) => {
    const before = recipes.find((r) => r.id === id);
    setRecipes((p) => p.filter((r) => r.id !== id));
    try {
      await del("recipes", id);
    } catch (e) {
      if (before) setRecipes((p) => [...p, before].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };
  const onScheduleRecipe = async (day, meal, recipe) => {
    try {
      const d = await post("meal_plan", { day, meal, recipe_id: recipe.id, recipe_name: recipe.name, week_start: weekStart, eat_out: false });
      if (d?.[0]) setMealPlan((p) => [...p, d[0]]);
    } catch (e) {
      console.error("Failed to schedule meal:", e); // eslint-disable-line no-console
    }
  };
  const onMoveSlot = async (id, day, meal) => {
    const before = mealPlan.find((s) => s.id === id);
    setMealPlan((p) => p.map((s) => (s.id === id ? { ...s, day, meal } : s)));
    try {
      await patch("meal_plan", id, { day, meal });
    } catch (e) {
      if (before) setMealPlan((p) => p.map((s) => (s.id === id ? before : s)));
    }
  };
  const onRemoveSlot = async (id) => {
    const before = mealPlan.find((s) => s.id === id);
    setMealPlan((p) => p.filter((s) => s.id !== id));
    try {
      await del("meal_plan", id);
    } catch (e) {
      if (before) setMealPlan((p) => [...p, before]);
    }
  };

  // ── Grocery ──
  const onAddGrocery = async (name) => {
    try {
      const d = await post("shopping_list", { name, category: "Other", status: "pending" });
      if (d?.[0]) setShopping((p) => [...p, d[0]]);
    } catch (e) {
      console.error("Failed to add grocery item:", e); // eslint-disable-line no-console
    }
  };
  const onRemoveGrocery = async (id) => {
    const before = shopping.find((s) => s.id === id);
    setShopping((p) => p.filter((s) => s.id !== id));
    try {
      await del("shopping_list", id);
      celebrate("Got it!");
    } catch (e) {
      if (before) setShopping((p) => [...p, before]);
    }
  };

  // ── Assistant ──
  const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  // Overwrites whatever's already scheduled for a day/meal (rather than
  // stacking a second row alongside it) — used both for a single-day meal
  // action and for "the rest of the week" overrides below.
  const setMealSlot = async (day, meal, name) => {
    const existing = mealPlan.find((s) => s.day === day && s.meal === meal);
    if (existing) {
      setMealPlan((p) => p.map((s) => (s.id === existing.id ? { ...s, recipe_id: null, recipe_name: name } : s)));
      await patch("meal_plan", existing.id, { recipe_id: null, recipe_name: name });
    } else {
      const d = await post("meal_plan", { day, meal, recipe_id: null, recipe_name: name, week_start: weekStart, eat_out: false });
      if (d?.[0]) setMealPlan((p) => [...p, d[0]]);
    }
  };
  const onAssistantSend = async (text, history) => {
    const result = await interpretMessage(text, history);
    const actions = Array.isArray(result.actions) ? result.actions : [];
    for (const action of actions) {
      if (action.type === "grocery") {
        await Promise.all((action.items || []).map((item) => onAddGrocery(item)));
      } else if (action.type === "chore") {
        const member = members.find((m) => m.name.toLowerCase() === (action.member || "").toLowerCase());
        if (member) await onAdd("sprinkles_chores", { member_id: member.id, title: action.title, frequency: action.frequency || "daily", active: true });
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
        if (action.apply_rest_of_week) {
          const fromIdx = Math.max(0, WEEKDAY_ORDER.indexOf(action.day));
          for (const day of WEEKDAY_ORDER.slice(fromIdx)) {
            await setMealSlot(day, action.meal, action.name);
          }
        } else {
          await setMealSlot(action.day, action.meal, action.name);
        }
      } else if (action.type === "coin") {
        const member = members.find((m) => m.name.toLowerCase() === (action.member || "").toLowerCase() && m.role !== "parent");
        const delta = Number(action.delta);
        if (member && Number.isFinite(delta) && delta !== 0) {
          await onAddCoinTransaction({ member_id: member.id, delta, reason: action.reason || null, rule_id: null });
        }
      } else if (action.type === "project") {
        await onAddProject({ title: action.title, status: "in_progress", progress: 0 });
      } else if (action.type === "stat") {
        const member = members.find((m) => m.name.toLowerCase() === (action.member || "").toLowerCase());
        const stat = member && stats.find((s) => s.member_id === member.id && s.label.toLowerCase() === (action.label || "").toLowerCase());
        if (stat && Number.isFinite(Number(action.value))) await onUpdateStat(stat.id, { value: Number(action.value) });
      }
      // "call" actions: not supported yet, no-op — the model's reply already says so.
    }
    return result.reply || "Not sure what to do with that yet — try rephrasing.";
  };

  const memberFromPath = (p) => {
    const m = p.match(/^\/family\/(\d+)$/);
    return m ? members.find((x) => x.id === Number(m[1])) : null;
  };
  const coinTrendsMemberFromPath = (p) => {
    const m = p.match(/^\/goals\/kids\/trends\/(\d+)$/);
    return m ? members.find((x) => x.id === Number(m[1])) : null;
  };

  let page;
  if (path === "/routines") {
    page = <RoutinesTab members={members} routines={routines} routineItems={morningRoutine} routineCompletions={routineCompletions} onToggleRoutineItem={onToggleRoutineItem} />;
  } else if (path === "/school-day") {
    page = <SchoolDay members={members} morningRoutine={morningRoutine} schedule={displaySchedule} events={allEvents} coinLedger={coinLedger} />;
  } else if (coinTrendsMemberFromPath(path)) {
    page = <KidCoinTrendsPage member={coinTrendsMemberFromPath(path)} coinLedger={coinLedger} coinRewards={coinRewards} onAddCoinTransaction={onAddCoinTransaction} />;
  } else if (path === "/calendar") {
    page = <CalendarPage members={members} events={allEvents} settings={settings} onAdd={onAddEvent} onUpdate={onUpdateEvent} onDelete={onDeleteEvent} onSyncGoogle={onSyncEventToGoogle} />;
  } else if (path === "/food") {
    page = <FoodWeekPage recipes={recipes} mealPlan={mealPlan} shopping={shopping} onSaveRecipe={onSaveRecipe} onDeleteRecipe={onDeleteRecipe} onScheduleRecipe={onScheduleRecipe} onMoveSlot={onMoveSlot} onRemoveSlot={onRemoveSlot} />;
  } else if (path === "/food/grocery") {
    page = <Grocery shopping={shopping} onAssistantSend={onAssistantSend} onAdd={onAddGrocery} onRemove={onRemoveGrocery} />;
  } else if (path === "/food/recipes") {
    page = <RecipeLibraryPage recipes={recipes} onSaveRecipe={onSaveRecipe} onDeleteRecipe={onDeleteRecipe} />;
  } else if (path === "/food/trends") {
    page = <TrendsPage recipes={recipes} mealPlan={mealPlan} shopping={shopping} />;
  } else if (path === "/goals/kids/rules") {
    page = <KidsGoalsRulesPage members={members} coinRules={coinRules} coinLedger={coinLedger} coinLoadError={coinLoadError} onAddCoinTransaction={onAddCoinTransaction} />;
  } else if (path === "/goals/kids/chores") {
    page = <KidsChoresPage members={members} chores={chores} completions={completions} onToggleChore={onToggleChore} />;
  } else if (path === "/goals/kids") {
    page = <KidsGoals members={members} coinLedger={coinLedger} coinRules={coinRules} coinRewards={coinRewards} coinLoadError={coinLoadError} onAddCoinTransaction={onAddCoinTransaction} />;
  } else if (path === "/goals/parents") {
    page = <ParentsGoals members={members} stats={stats} onAddStat={onAddStat} onUpdateStat={onUpdateStat} onDeleteStat={onDeleteStat} />;
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
  } else if (path === "/family") {
    page = <FamilyList members={members} />;
  } else if (memberFromPath(path)) {
    page = (
      <FamilyMember
        member={memberFromPath(path)} contacts={contacts} activities={activities} medications={medications}
        foodPrefs={foodPrefs} links={links} chores={chores} completions={completions} stats={stats} projects={projects}
        morningRoutine={morningRoutine}
        onUpdateMember={onUpdateMember} onAdd={onAdd} onDelete={onDelete} onUpdateFoodPrefs={onUpdateFoodPrefs}
        onAddStat={onAddStat} onUpdateStat={onUpdateStat} onDeleteStat={onDeleteStat}
        onAddProject={onAddProject} onUpdateProject={onUpdateProject} onDeleteProject={onDeleteProject}
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
  } else if (path === "/settings/games") {
    page = <GamesPage />;
  } else if (path === "/settings/routines") {
    page = (
      <RoutinesPage
        members={members} routines={routines} routineItems={morningRoutine}
        onAdd={onAdd} onUpdateRoutine={onUpdateRoutine} onUpdateRoutineItem={onUpdateRoutineItem} onDelete={onDelete}
        schedule={displaySchedule} onUpdateSchedule={onUpdateDisplaySchedule}
      />
    );
  } else if (path === "/settings/preferences") {
    page = <PreferencesPage settings={settings} onUpdateSettings={onUpdateSettings} members={members} />;
  } else if (path === "/settings") {
    page = <Settings />;
  } else {
    page = <Today members={members} events={allEvents} chores={chores} completions={completions} mealPlan={mealPlan} projects={projects} stats={stats} coinLedger={coinLedger} coinRewards={coinRewards} onToggleChore={onToggleChore} />;
  }

  if (path.startsWith("/settings")) page = <PinGate>{page}</PinGate>;

  return (
    <Shell members={members}>
      {page}
      <AssistantPopover onSend={onAssistantSend} />
    </Shell>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <CelebrationProvider>
        <CalendarFiltersProvider>
          <AppInner />
        </CalendarFiltersProvider>
      </CelebrationProvider>
    </RouterProvider>
  );
}
