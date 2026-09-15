/* node_helper.js — server-side data assembly for MMM-NyxOS.
 *
 * Pulls from two systems and hands the frontend one JSON payload. Credentials
 * for both never leave this process:
 *   - Supabase (Mr Sprinkles): meals, kids coins, kids chores, kids checklist
 *   - PocketBase (NyxOS):      open tasks, this week's events, departure rule
 *
 * Design notes:
 *   - Pure Node core modules only (http/https) — no npm install needed for
 *     this module in the MagicMirror docker image.
 *   - One shared node_helper instance serves every MMM-NyxOS module
 *     instance (one per screen region), so the 60s cache and PocketBase
 *     token are naturally shared instead of duplicated per-region.
 *   - Every external call is wrapped so a single failing source (a 404 on
 *     an unconfirmed PocketBase collection, Supabase being briefly down,
 *     etc.) degrades just that region to "coming soon" / empty instead of
 *     taking down the whole payload.
 */

const NodeHelper = require("node_helper");
const http = require("http");
const https = require("https");
const { URL } = require("url");

const CACHE_MS = 60 * 1000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function requestJson(urlStr, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(urlStr);
    } catch (e) {
      reject(new Error(`Invalid URL: ${urlStr}`));
      return;
    }
    const lib = url.protocol === "https:" ? https : http;
    const payload = body ? Buffer.from(typeof body === "string" ? body : JSON.stringify(body)) : null;
    const req = lib.request(
      url,
      {
        method,
        headers: {
          Accept: "application/json",
          ...(payload ? { "Content-Type": "application/json", "Content-Length": payload.length } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          const status = res.statusCode || 0;
          let parsed = null;
          if (raw) {
            try {
              parsed = JSON.parse(raw);
            } catch (e) {
              // Non-JSON body (e.g. an HTML error page) — keep parsed null,
              // callers only care about status for those cases.
            }
          }
          if (status >= 200 && status < 300) {
            resolve(parsed);
          } else {
            const err = new Error(`HTTP ${status} for ${urlStr}`);
            err.status = status;
            err.body = parsed;
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function todayStr(tz) {
  // en-CA gives YYYY-MM-DD directly, which is what both Supabase (date
  // columns) and our own day-key comparisons expect.
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function weekStartSunday(tz) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  now.setDate(now.getDate() - now.getDay());
  now.setHours(0, 0, 0, 0);
  return now.toISOString().split("T")[0];
}

module.exports = NodeHelper.create({
  start: function () {
    this.cache = null;
    this.cacheAt = 0;
    this.pbToken = null;
    this.pbTokenAt = 0;
    this.inFlight = null;
    console.log("[MMM-NyxOS] node_helper started");
  },

  socketNotificationReceived: function (notification) {
    if (notification !== "NYXOS_GET_DATA") return;
    this.getData()
      .then((payload) => this.sendSocketNotification("NYXOS_DATA", payload))
      .catch((err) => {
        console.error("[MMM-NyxOS] fatal error assembling payload:", err.message);
        this.sendSocketNotification("NYXOS_ERROR", { message: err.message });
      });
  },

  getData: async function () {
    const now = Date.now();
    if (this.cache && now - this.cacheAt < CACHE_MS) return this.cache;
    // Multiple regions can ask at nearly the same time on startup — make
    // sure that only triggers one real fetch cycle, not one per region.
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.buildPayload()
      .then((payload) => {
        this.cache = payload;
        this.cacheAt = Date.now();
        return payload;
      })
      .finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  },

  // ── env / config ──────────────────────────────────────────────
  env: function () {
    return {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      PB_URL: process.env.PB_URL,
      PB_ADMIN_EMAIL: process.env.PB_ADMIN_EMAIL,
      PB_ADMIN_PASSWORD: process.env.PB_ADMIN_PASSWORD,
      TZ: process.env.TZ || "America/New_York",
    };
  },

  // ── Supabase (Mr Sprinkles) ───────────────────────────────────
  supabaseGet: async function (path) {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = this.env();
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY not set");
    }
    return requestJson(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
  },

  // Never throws — one bad table shouldn't blank the whole board.
  supabaseGetSafe: async function (path, label) {
    try {
      return (await this.supabaseGet(path)) || [];
    } catch (e) {
      console.warn(`[MMM-NyxOS] Supabase fetch failed (${label || path}):`, e.message);
      return [];
    }
  },

  // ── PocketBase (NyxOS) ────────────────────────────────────────
  pbAuth: async function () {
    const { PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD } = this.env();
    if (!PB_URL || !PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
      throw new Error("PB_URL / PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD not set");
    }
    // Re-used until a request comes back 401 (see pbGet), so we don't
    // re-authenticate on every 60s cycle.
    if (this.pbToken) return this.pbToken;
    const res = await requestJson(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: "POST",
      body: { identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD },
    });
    this.pbToken = res && res.token;
    this.pbTokenAt = Date.now();
    if (!this.pbToken) throw new Error("PocketBase auth returned no token");
    return this.pbToken;
  },

  pbGet: async function (collection, query = "") {
    const { PB_URL } = this.env();
    const token = await this.pbAuth();
    const url = `${PB_URL}/api/collections/${collection}/records${query}`;
    try {
      return await requestJson(url, { headers: { Authorization: token } });
    } catch (e) {
      if (e.status === 401) {
        // Token expired/invalid — re-auth once and retry.
        this.pbToken = null;
        const fresh = await this.pbAuth();
        return requestJson(url, { headers: { Authorization: fresh } });
      }
      throw e;
    }
  },

  // Collections spec'd but not yet confirmed built on the NyxOS side
  // (calendar_events, rules) get this wrapper: a 404 (collection doesn't
  // exist yet) or any other error yields `null` so the caller can render
  // "coming soon" instead of crashing the whole payload.
  pbGetSafe: async function (collection, query, label) {
    try {
      const res = await this.pbGet(collection, query);
      return (res && res.items) || [];
    } catch (e) {
      console.warn(`[MMM-NyxOS] PocketBase fetch failed (${label || collection}):`, e.message);
      return null; // null = "unavailable", distinct from [] = "empty but working"
    }
  },

  // ── assembly ──────────────────────────────────────────────────
  buildPayload: async function () {
    const { TZ } = this.env();
    const today = todayStr(TZ);
    const dayShort = DAY_NAMES[new Date().getDay()];
    const weekStart = weekStartSunday(TZ);

    const [
      members,
      chores,
      choreCompletions,
      coinLedger,
      routines,
      routineItems,
      routineCompletions,
      mealPlan,
      pbTasksRaw,
      pbCalendarRaw,
      pbRulesRaw,
    ] = await Promise.all([
      this.supabaseGetSafe("sprinkles_family_members?order=sort_order.asc", "family_members"),
      this.supabaseGetSafe("sprinkles_chores?active=eq.true", "chores"),
      this.supabaseGetSafe("sprinkles_chore_completions", "chore_completions"),
      this.supabaseGetSafe("sprinkles_coin_ledger?order=created_at.desc", "coin_ledger"),
      this.supabaseGetSafe("sprinkles_routines?active=eq.true", "routines"),
      this.supabaseGetSafe("sprinkles_morning_routine_items?active=eq.true&order=sort_order.asc", "routine_items"),
      this.supabaseGetSafe("sprinkles_routine_completions", "routine_completions"),
      this.supabaseGetSafe(`meal_plan?day=eq.${dayShort}&week_start=eq.${weekStart}`, "meal_plan"),
      this.pbGetSafe("tasks", `?filter=${encodeURIComponent('status!="done"')}&sort=due_date&perPage=5`, "tasks"),
      this.pbGetSafe(
        "calendar_events",
        `?filter=${encodeURIComponent(`start >= "${new Date().toISOString()}" && start <= "${new Date(Date.now() + 7 * 86400000).toISOString()}"`)}&sort=start&perPage=50`,
        "calendar_events"
      ),
      this.pbGetSafe(
        "rules",
        `?filter=${encodeURIComponent('(name ~ "dropoff" || name ~ "school") && active=true')}&perPage=1`,
        "rules"
      ),
    ]);

    return {
      // All active kids, in sprinkles_family_members' own sort order — the
      // checklist region renders one column per kid from this list (not
      // from whichever kids happen to have an item today), so a kid with
      // nothing scheduled still gets a visible, empty column instead of
      // disappearing.
      kids: members.filter((m) => m.role === "kid").map((m) => m.name),
      events: this.buildEvents(pbCalendarRaw),
      meals: this.buildMeals(mealPlan),
      coins: this.buildCoins(members, coinLedger),
      tasks: this.buildTasks(pbTasksRaw),
      departure: this.buildDeparture(pbRulesRaw, TZ),
      checklist: this.buildChecklist(members, routines, routineItems, routineCompletions, today),
      chores: this.buildChores(members, chores, choreCompletions, today),
      generatedAt: new Date().toISOString(),
    };
  },

  buildEvents: function (rawEvents) {
    if (rawEvents === null) return { available: false, items: [] };
    const items = rawEvents.map((e) => ({
      title: e.title || "(untitled)",
      start: e.start,
      end: e.end,
      location: e.location || null,
    }));
    return { available: true, items };
  },

  buildMeals: function (mealPlan) {
    const find = (meal) => {
      const slot = mealPlan.find((s) => s.meal === meal);
      return slot ? slot.recipe_name : null;
    };
    // No Breakfast field: Mr Sprinkles' meal_plan schema has no Breakfast
    // slot and breakfast isn't planned, so it's left out entirely rather
    // than rendered as an always-empty row.
    return {
      lunch: find("Lunch"),
      dinner: find("Dinner"),
    };
  },

  buildCoins: function (members, coinLedger) {
    const kids = members.filter((m) => m.role === "kid");
    return kids
      .map((k) => ({
        kid: k.name,
        coins: coinLedger.filter((l) => l.member_id === k.id).reduce((sum, l) => sum + (l.delta || 0), 0),
      }))
      .sort((a, b) => b.coins - a.coins);
  },

  buildTasks: function (rawTasks) {
    if (rawTasks === null) return { available: false, items: [] };
    const items = rawTasks.slice(0, 5).map((t) => ({
      title: t.title,
      due_date: t.due_date || null,
      domain: t.domain || null,
    }));
    return { available: true, items };
  },

  buildDeparture: function (rules, tz) {
    if (rules === null) return { available: false, label: null, time: null, minutes_until: null };
    const rule = rules[0];
    if (!rule) return { available: true, label: null, time: null, minutes_until: null };

    const days = (rule.days || "").split(",").map((d) => d.trim());
    const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    const todayShort = DAY_NAMES[nowLocal.getDay()];
    if (days.length && !days.includes(todayShort)) {
      return { available: true, label: rule.location_name || rule.name, time: rule.start_time || null, minutes_until: null, todayOff: true };
    }

    const [hh, mm] = (rule.start_time || "").split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) {
      return { available: true, label: rule.location_name || rule.name, time: rule.start_time || null, minutes_until: null };
    }
    const target = new Date(nowLocal);
    target.setHours(hh, mm, 0, 0);
    const minutesUntil = Math.round((target.getTime() - nowLocal.getTime()) / 60000);

    return {
      available: true,
      label: rule.location_name || rule.name,
      time: rule.start_time || null,
      minutes_until: minutesUntil,
    };
  },

  buildChecklist: function (members, routines, routineItems, routineCompletions, today) {
    const nowDow = new Date().getDay();
    const activeRoutines = routines.filter((r) => (r.days || []).includes(nowDow));
    const out = [];
    activeRoutines.forEach((routine) => {
      const items = routineItems.filter((i) => i.routine_id === routine.id);
      items.forEach((item) => {
        const member = members.find((m) => m.id === item.member_id);
        const completion = routineCompletions.find(
          (c) => c.routine_id === routine.id && c.member_id === item.member_id && c.date === today
        );
        const done = !!(completion && (completion.checked_item_ids || []).includes(item.id));
        out.push({ kid: member ? member.name : "Unknown", item: item.title, done });
      });
    });

    // A kid with zero checklist items today is expected if that kid's
    // routine's `days` field genuinely doesn't include today — not a
    // fetch bug. Log it so that distinction is visible in
    // `docker compose logs magicmirror` instead of just "a kid vanished".
    const kidsWithItems = new Set(out.map((i) => i.kid));
    const kidsWithNoItemsToday = members.filter((m) => m.role === "kid" && !kidsWithItems.has(m.name));
    if (kidsWithNoItemsToday.length) {
      const kidRoutineDays = routines
        .filter((r) => routineItems.some((i) => kidsWithNoItemsToday.some((m) => m.id === i.member_id) && i.routine_id === r.id))
        .map((r) => `routine ${r.id} days=[${(r.days || []).join(",")}]`);
      console.warn(
        `[MMM-NyxOS] checklist: no items today (dow=${nowDow}) for: ${kidsWithNoItemsToday.map((m) => m.name).join(", ")}.`,
        `Fetched ${routines.length} active routines, ${routineItems.length} active routine items total.`,
        kidRoutineDays.length ? `Their routines: ${kidRoutineDays.join("; ")}` : "No routine_items rows reference these kids' member_id at all."
      );
    }
    return out;
  },

  buildChores: function (members, chores, completions, today) {
    const kidIds = new Set(members.filter((m) => m.role === "kid").map((m) => m.id));
    const doneToday = new Set(completions.filter((c) => c.date === today).map((c) => c.chore_id));
    const dow = new Date().getDay();
    const appliesToday = (chore) => {
      if (chore.frequency === "daily") return true;
      if (chore.frequency === "custom") return (chore.days || []).includes(dow);
      if (chore.due_date) return chore.due_date === today;
      return true;
    };
    return chores
      .filter((c) => kidIds.has(c.member_id) && (c.visibility || "public") === "public" && appliesToday(c))
      .map((c) => {
        const member = members.find((m) => m.id === c.member_id);
        return { kid: member ? member.name : "Unknown", chore: c.title, done: doneToday.has(c.id) };
      });
  },
});
