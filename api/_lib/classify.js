// Shared text -> structured household action classification, used by both
// the in-app assistant (api/assistant.js) and the Telnyx SMS webhook
// (api/sms/inbound.js) so the two entry points never drift apart.

const SYSTEM = `You are Mr. Sprinkles, a warm, upbeat family assistant that turns short texts into one structured household action.
Classify the message into exactly one of these types and return ONLY JSON, no markdown:

{"type":"grocery","items":["milk"]}
{"type":"chore","member":"Piper","title":"feed the dog","frequency":"daily"}
{"type":"event","title":"Piper: Gym","start":"2026-08-12T17:00:00","location":"Franklin Dance Studio","member":"Piper","category":"activity"}
{"type":"meal","day":"Mon","meal":"Dinner","name":"Tacos"}
{"type":"availability","available":true,"conflict":null,"suggestion":null,"proposedEvent":{"title":"Dinner","start":"2026-09-04T19:00:00","category":"meal"}}
{"type":"unknown","reason":"..."}

Rules:
- "we need X" / "out of X" / "need to grab X" -> grocery. If the message lists multiple items (e.g. "X and Y", "X, Y, and Z"), split them into separate entries in "items" — one grocery item per string, not one combined string.
- Anything about a kid needing to do something regularly -> chore.
- Anything with a date/time/place that is a statement (not a question) -> event. Infer a reasonable ISO start datetime from context (today is provided). Category is one of event, appointment, activity, meal, chore, other.
- Questions like "am I free X at Y", "can we do X on Y", "does Z work" -> availability. Check the Upcoming events list below for anything overlapping the requested window (assume 1 hour duration unless the message implies otherwise, e.g. "dinner" ~2 hours). Set available=false and describe the conflicting event's title/time in "conflict" if something overlaps; otherwise available=true. Always fill "proposedEvent" with a best-guess event (title, ISO start, category) so it can be added on confirmation. If unavailable, put a suggested alternate time in "suggestion" (e.g. an open slot the same evening or the next day).
- If the latest message is a short confirmation like "add it", "yes", "do it", "sounds good" and the recent conversation (below) proposed an event, respond with that {"type":"event",...} using the previously proposed details.
- Anything about cooking/what's for dinner -> meal.
- Use the household context to resolve names and recurring activities (e.g. match "gym" to the family member who already has a gym activity, and reuse their usual time/location if the message doesn't repeat it).
- If truly ambiguous, use "unknown".
Return compact JSON only.`;

function localFallback(text) {
  const t = text.toLowerCase().trim();
  if (/^(need|we need|out of|grab|buy|add)\b/.test(t)) {
    const rest = t.replace(/^(we need|need|out of|grab|buy|add)\s+/, "").replace(/\.$/, "");
    const items = rest
      .split(/\s*,\s*|\s+and\s+/)
      .map((s) => s.replace(/^some\s+/, "").trim())
      .filter(Boolean);
    return { type: "grocery", items: items.length ? items : [text] };
  }
  return { type: "unknown", reason: "Couldn't confidently parse this without the AI key connected." };
}

async function fetchHouseholdContext() {
  const url = process.env.SUPABASE_URL || "https://jjzhxxzvtufopemmexdp.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "";
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    const now = new Date();
    const past = new Date(now.getTime() - 3 * 86400000).toISOString();
    const future = new Date(now.getTime() + 45 * 86400000).toISOString();
    const [membersRes, activitiesRes, choresRes, eventsRes] = await Promise.all([
      fetch(`${url}/rest/v1/sprinkles_family_members?select=id,name,role,birthday`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_activities?select=member_id,name,days,start_time,location&active=eq.true`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_chores?select=member_id,title,frequency&active=eq.true`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_events?select=title,start_at,end_at,location,category&start_at=gte.${past}&start_at=lte.${future}&order=start_at.asc`, { headers }),
    ]);
    const [members, activities, chores, events] = await Promise.all([membersRes.json(), activitiesRes.json(), choresRes.json(), eventsRes.json()]);
    const nameOf = (id) => members.find((m) => m.id === id)?.name || "?";
    const lines = [];
    lines.push("Family members: " + members.map((m) => `${m.name} (${m.role})`).join(", "));
    if (activities?.length) {
      lines.push("Recurring activities: " + activities.map((a) => `${nameOf(a.member_id)} — ${a.name}${a.location ? ` @ ${a.location}` : ""}${a.start_time ? ` ${a.start_time.slice(0, 5)}` : ""}`).join("; "));
    }
    if (chores?.length) {
      lines.push("Existing chores: " + chores.map((c) => `${nameOf(c.member_id)} — ${c.title} (${c.frequency})`).join("; "));
    }
    if (events?.length) {
      lines.push("Upcoming events: " + events.map((e) => `"${e.title}" ${e.start_at}${e.end_at ? ` to ${e.end_at}` : ""}${e.location ? ` @ ${e.location}` : ""}`).join("; "));
    }
    return lines.join("\n");
  } catch (e) {
    return "";
  }
}

// Turns free-form text into one structured household action (see SYSTEM
// above for the shape). Never throws — falls back to a locally-parsed
// guess (or {type:"unknown"}) if the AI key is missing or the call fails.
async function classify(text, history) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return localFallback(text);

  try {
    const context = await fetchHouseholdContext();
    const historyText = Array.isArray(history) && history.length
      ? "Recent conversation:\n" + history.slice(-6).map((m) => `${m.role === "user" ? "User" : "Mr. Sprinkles"}: ${m.text}`).join("\n") + "\n"
      : "";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 500,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toISOString()}.\n${context ? `Household context:\n${context}\n` : ""}${historyText}Message: "${text}"`,
          },
        ],
      }),
    });
    if (!r.ok) throw new Error("upstream request failed");
    const data = await r.json();
    const raw = data.content[0].text.trim().replace(/```json|```/g, "").trim();
    return JSON.parse(raw);
  } catch (e) {
    return localFallback(text);
  }
}

module.exports = { classify };
