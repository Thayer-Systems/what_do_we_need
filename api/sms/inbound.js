// Telnyx inbound-SMS webhook target (called by the n8n "Telnyx Inbound"
// workflow, not directly by Telnyx). Classifies the text the same way the
// in-app assistant does — identifying the sender by phone number so
// replies can be personalized — executes the resulting action(s) directly
// against the household's data, and returns the model-composed {reply}
// for n8n to text back.

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

// Executes one classified action against the household's data. "call"
// actions are intentionally a no-op — outbound phone calls aren't built
// yet, and the model is instructed to say so in its reply rather than
// claim one happened.
async function applyAction(action, members, req) {
  const findMember = (name) => members.find((m) => m.name.toLowerCase() === (name || "").toLowerCase());

  if (action.type === "grocery") {
    await Promise.all((action.items || []).map((item) => supaInsert("shopping_list", { name: item, category: "Other", status: "pending" })));
    return;
  }

  if (action.type === "chore") {
    const member = findMember(action.member);
    if (!member) return;
    await supaInsert("sprinkles_chores", { member_id: member.id, title: action.title, frequency: action.frequency || "daily", active: true });
    return;
  }

  if (action.type === "event") {
    const member = findMember(action.member);
    const saved = await supaInsert("sprinkles_events", {
      title: action.title,
      category: action.category || "event",
      start_at: new Date(action.start).toISOString(),
      location: action.location || null,
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
    return;
  }

  if (action.type === "meal") {
    await supaInsert("meal_plan", { day: action.day, meal: action.meal, recipe_id: null, recipe_name: action.name, week_start: getWeekStart(), eat_out: false });
    return;
  }

  // action.type === "call" (or anything unrecognized): no-op by design.
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { text, from } = req.body || {};
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing text" });
    return;
  }

  const result = await classify(text, null, from);
  const actions = Array.isArray(result.actions) ? result.actions : [];

  if (actions.length) {
    const members = await supaGet("sprinkles_family_members?select=id,name");
    for (const action of actions) {
      try {
        await applyAction(action, members, req);
      } catch (e) {
        // One bad action shouldn't take down the whole reply.
      }
    }
  }

  res.status(200).json({ reply: result.reply || "Got it." });
};
