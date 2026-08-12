// Telnyx inbound-SMS webhook target (called by the n8n "Telnyx Inbound"
// workflow, not directly by Telnyx). Classifies the text the same way the
// in-app assistant does, applies the resulting action directly to the
// household's data, and returns a short reply string for n8n to text back.

const { classify } = require("../_lib/classify.js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://jjzhxxzvtufopemmexdp.supabase.co";

function headers() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" };
}

async function supaGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers() });
  if (!r.ok) return [];
  return r.json();
}

async function supaInsert(table, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const rows = await r.json().catch(() => null);
  return rows?.[0] || null;
}

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function fmtTime(iso) {
  return new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing text" });
    return;
  }

  const result = await classify(text, null);
  const members = await supaGet("sprinkles_family_members?select=id,name");
  const findMember = (name) => members.find((m) => m.name.toLowerCase() === (name || "").toLowerCase());

  try {
    if (result.type === "grocery") {
      const items = result.items || (result.item ? [result.item] : []);
      await Promise.all(items.map((item) => supaInsert("shopping_list", { name: item, category: "Other", status: "pending" })));
      const reply = items.length > 1
        ? `Added ${items.map((i) => `"${i}"`).join(", ")} to the grocery list.`
        : `Added "${items[0]}" to the grocery list.`;
      res.status(200).json({ reply });
      return;
    }

    if (result.type === "chore") {
      const member = findMember(result.member);
      if (!member) {
        res.status(200).json({ reply: `Couldn't match "${result.member}" to a family member — add that chore from the app instead.` });
        return;
      }
      await supaInsert("sprinkles_chores", { member_id: member.id, title: result.title, frequency: result.frequency || "daily", active: true });
      res.status(200).json({ reply: `Added chore "${result.title}" for ${member.name}.` });
      return;
    }

    if (result.type === "event") {
      const member = findMember(result.member);
      const saved = await supaInsert("sprinkles_events", {
        title: result.title,
        category: result.category || "event",
        start_at: new Date(result.start).toISOString(),
        location: result.location || null,
        member_ids: member ? [member.id] : [],
        source: "manual",
      });
      if (saved) {
        fetch(`https://${req.headers.host}/api/calendar/create-event`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(saved),
        }).catch(() => {});
      }
      res.status(200).json({ reply: `Added "${result.title}" to the calendar for ${fmtTime(result.start)}.` });
      return;
    }

    if (result.type === "meal") {
      await supaInsert("meal_plan", { day: result.day, meal: result.meal, recipe_id: null, recipe_name: result.name, week_start: getWeekStart(), eat_out: false });
      res.status(200).json({ reply: `Scheduled "${result.name}" for ${result.day} ${result.meal}.` });
      return;
    }

    if (result.type === "availability") {
      let msg = result.available ? "Yes, that time looks free!" : `No — that overlaps with ${result.conflict || "something already on the calendar"}.`;
      if (!result.available && result.suggestion) msg += ` ${result.suggestion}`;
      res.status(200).json({ reply: msg });
      return;
    }

    res.status(200).json({ reply: result.reason || "Not sure what to do with that — try texting it differently, or use the app." });
  } catch (e) {
    res.status(200).json({ reply: "Something went wrong adding that — try again from the app." });
  }
};
