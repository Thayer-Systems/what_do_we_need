// Server-side proxy for the Mr. Sprinkles text assistant. Keeps the
// Anthropic key off the client — the browser only ever talks to this
// endpoint, never to api.anthropic.com directly. Also grounds the model
// in the real household — who's in the family and what their recurring
// activities/chores are — so "Piper has gym" resolves correctly instead
// of guessing.

const SYSTEM = `You are Mr. Sprinkles, a warm, upbeat family assistant that turns short texts into one structured household action.
Classify the message into exactly one of these types and return ONLY JSON, no markdown:

{"type":"grocery","item":"milk"}
{"type":"chore","member":"Piper","title":"feed the dog","frequency":"daily"}
{"type":"event","title":"Piper: Gym","start":"2026-08-12T17:00:00","location":"Franklin Dance Studio","member":"Piper","category":"activity"}
{"type":"meal","day":"Mon","meal":"Dinner","name":"Tacos"}
{"type":"unknown","reason":"..."}

Rules:
- "we need X" / "out of X" / "need to grab X" -> grocery.
- Anything about a kid needing to do something regularly -> chore.
- Anything with a date/time/place -> event. Infer a reasonable ISO start datetime from context (today is provided). Category is one of event, appointment, activity, meal, chore, other.
- Anything about cooking/what's for dinner -> meal.
- Use the household context below to resolve names and recurring activities (e.g. match "gym" to the family member who already has a gym activity, and reuse their usual time/location if the message doesn't repeat it).
- If truly ambiguous, use "unknown".
Return compact JSON only.`;

function localFallback(text) {
  const t = text.toLowerCase().trim();
  if (/^(need|we need|out of|grab|buy|add)\b/.test(t)) {
    const item = t.replace(/^(we need|need|out of|grab|buy|add)\s+/, "").replace(/^some\s+/, "").replace(/\.$/, "");
    return { type: "grocery", item: item || text };
  }
  return { type: "unknown", reason: "Couldn't confidently parse this without the AI key connected." };
}

async function fetchHouseholdContext() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "";
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    const [membersRes, activitiesRes, choresRes] = await Promise.all([
      fetch(`${url}/rest/v1/sprinkles_family_members?select=id,name,role,birthday`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_activities?select=member_id,name,days,start_time,location&active=eq.true`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_chores?select=member_id,title,frequency&active=eq.true`, { headers }),
    ]);
    const [members, activities, chores] = await Promise.all([membersRes.json(), activitiesRes.json(), choresRes.json()]);
    const nameOf = (id) => members.find((m) => m.id === id)?.name || "?";
    const lines = [];
    lines.push("Family members: " + members.map((m) => `${m.name} (${m.role})`).join(", "));
    if (activities?.length) {
      lines.push(
        "Recurring activities: " +
          activities.map((a) => `${nameOf(a.member_id)} — ${a.name}${a.location ? ` @ ${a.location}` : ""}${a.start_time ? ` ${a.start_time.slice(0, 5)}` : ""}`).join("; ")
      );
    }
    if (chores?.length) {
      lines.push("Existing chores: " + chores.map((c) => `${nameOf(c.member_id)} — ${c.title} (${c.frequency})`).join("; "));
    }
    return lines.join("\n");
  } catch (e) {
    return "";
  }
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

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(200).json(localFallback(text));
    return;
  }

  try {
    const context = await fetchHouseholdContext();
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 400,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toISOString()}.\n${context ? `Household context:\n${context}\n` : ""}Message: "${text}"`,
          },
        ],
      }),
    });
    if (!r.ok) throw new Error("upstream request failed");
    const data = await r.json();
    const raw = data.content[0].text.trim().replace(/```json|```/g, "").trim();
    res.status(200).json(JSON.parse(raw));
  } catch (e) {
    res.status(200).json(localFallback(text));
  }
};
