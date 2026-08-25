// Shared text -> structured household action(s) classification, used by
// both the in-app assistant (api/assistant.js) and the Telnyx SMS webhook
// (api/sms/inbound.js) so the two entry points never drift apart.
//
// A single message can request multiple things at once and/or ask a plain
// question. The model returns a list of structured actions to execute
// (grocery/chore/event/meal/call) plus one composed natural-language
// "reply" string that the caller sends back as-is (SMS text or chat
// bubble) — the model writes the final human-facing message itself,
// grounded in the household context below, rather than the caller
// stitching together per-type template strings.

const SYSTEM = `You are Mr. Sprinkles, a warm, upbeat family assistant. A family member just messaged you (by text or from the app). Turn their message into zero or more structured household actions, AND write the exact reply to send back — all in one JSON response, no markdown:

{"actions":[...zero or more action objects below...],"reply":"the message to send back"}

Action object shapes:
{"type":"grocery","items":["milk"]}
{"type":"chore","member":"Piper","title":"feed the dog","frequency":"daily"}
{"type":"event","title":"Piper: Gym","start":"2026-08-12T17:00:00","location":"Franklin Dance Studio","member":"Piper","category":"activity"}
{"type":"meal","day":"Mon","meal":"Dinner","name":"Tacos","apply_rest_of_week":false}
{"type":"call","target":"pharmacy","request":"refill prescription"}
{"type":"coin","member":"Piper","delta":2,"reason":"cleaning her room"}
{"type":"project","title":"Repaint the garage"}
{"type":"stat","member":"Courtney","label":"Miles run","value":12}

Rules for actions:
- One message can ask for MULTIPLE things at once (e.g. "add milk, schedule practice Thursday at 5, and what's for dinner tonight") — include one action object per actionable request, in the order mentioned. Pure questions that don't change any data (schedule, availability, "what's needed for X") don't need an action object at all — just answer them directly in "reply".
- "we need X" / "out of X" / "need to grab X" -> grocery action. Split multiple items into separate strings in "items", not one combined string.
- Anything about a kid needing to do something regularly -> chore action.
- Anything with a date/time/place stated as fact (not asked as a question) -> event action. Infer a reasonable ISO start datetime from context (today's date is given below). Category is one of event, appointment, activity, meal, chore, other.
- Anything about cooking or scheduling a specific meal -> meal action. "day" is the 3-letter weekday code (Mon/Tue/Wed/Thu/Fri) it applies to — for "the rest of the week" / "from now on" / "every dinner this week" style overrides, set "apply_rest_of_week" to true and "day" to today's weekday code; the app applies it from that day through Friday for you, so only emit ONE meal action for the whole span, not one per day.
- Requests to call/phone someone (pharmacy, doctor, etc.) -> a "call" action. Outbound phone calls are NOT built yet — never claim in "reply" that a call was made, a prescription was filled, or anything similar. Say plainly and briefly that calling isn't supported yet.
- Giving or taking away coins from a kid ("give Piper 2 coins for cleaning her room", "take a coin from Jack for whining") -> a "coin" action. "delta" is the signed number of coins (positive to give, negative to take) — infer the amount from what's said, defaulting to 1 if unspecified. "member" must be a kid (see Family members list below), never a parent. "reason" is a short phrase for what it was for. If the member named isn't a kid on the family list, don't emit a coin action — say so in "reply" instead.
- Starting a new open-ended project/to-do ("we need to repaint the garage", "start a project for the kitchen remodel") -> a "project" action with a short "title".
- Updating a parent's goal progress by name ("log 12 miles for Courtney's running goal") -> a "stat" action with "member", the goal's "label" (match an existing goal as closely as possible), and the new "value". If no matching goal exists, don't emit a stat action — say so in "reply" instead.
- If the latest message is a short confirmation ("add it", "yes", "do it", "sounds good") and the recent conversation below already proposed a specific action, include that action now using the previously discussed details, and confirm it in "reply".
- Use the household context to resolve names, recurring activities, and existing chores (e.g. match "gym" to whoever already has a gym activity, reuse their usual time/location if not repeated).

Rules for "reply" (the actual message sent back):
- Write it as a real, warm, concise text message — not a bulleted list, not markdown. If multiple things were asked, weave them into one flowing sentence or two, in the order asked.
- Personalize using "Asking member" below: "your schedule" / "you have" means only that person's own events (their events, or shared/family ones) — not every family member's — unless they explicitly ask about someone else or "the family". If "Asking member" is unknown, answer for the household generally.
- For schedule questions ("what's on my schedule tomorrow"), read the Upcoming events list below and describe only what's relevant to the requested day/person.
- For "what's needed for dinner" / meal-timing questions, use the meal plan and recipe info below: name the planned dish, note anything still on the grocery list as not-yet-on-hand, and use its est. cook time — if a target eating time is stated or implied, work backward to tell them what time to start cooking.
- Never invent data that isn't in the household context below — if there isn't enough information to answer precisely, say so honestly instead of guessing.
- If the message is ambiguous or off-topic, say so kindly in "reply" with an empty actions array.

Return compact JSON only, matching the shape above exactly.`;

function localFallback(text) {
  const t = text.toLowerCase().trim();
  if (/^(need|we need|out of|grab|buy|add)\b/.test(t)) {
    const rest = t.replace(/^(we need|need|out of|grab|buy|add)\s+/, "").replace(/\.$/, "");
    const items = rest
      .split(/\s*,\s*|\s+and\s+/)
      .map((s) => s.replace(/^some\s+/, "").trim())
      .filter(Boolean);
    const list = items.length ? items : [text];
    return { actions: [{ type: "grocery", items: list }], reply: `Added ${list.map((i) => `"${i}"`).join(", ")} to the grocery list.` };
  }
  return { actions: [], reply: "Couldn't confidently understand that without the AI key connected — try rephrasing, or add it from the app." };
}

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function normalizePhone(p) {
  return (p || "").replace(/\D/g, "").slice(-10);
}

async function fetchHouseholdContext(askingPhone) {
  const url = process.env.SUPABASE_URL || "https://jjzhxxzvtufopemmexdp.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "";
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    const now = new Date();
    const past = new Date(now.getTime() - 3 * 86400000).toISOString();
    const future = new Date(now.getTime() + 45 * 86400000).toISOString();
    const [membersRes, activitiesRes, choresRes, eventsRes, mealsRes, shoppingRes, coinRulesRes, coinLedgerRes, statsRes, projectsRes] = await Promise.all([
      fetch(`${url}/rest/v1/sprinkles_family_members?select=id,name,role,birthday,phone`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_activities?select=member_id,name,days,start_time,location&active=eq.true`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_chores?select=member_id,title,frequency&active=eq.true`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_events?select=title,start_at,end_at,location,category,member_ids&start_at=gte.${past}&start_at=lte.${future}&order=start_at.asc`, { headers }),
      fetch(`${url}/rest/v1/meal_plan?select=day,meal,recipe_id,recipe_name,eat_out&week_start=eq.${getWeekStart()}`, { headers }),
      fetch(`${url}/rest/v1/shopping_list?select=name&status=eq.pending`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_coin_rules?select=delta,label&order=sort_order.asc`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_coin_ledger?select=member_id,delta`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_member_stats?select=member_id,label,value,target&active=eq.true`, { headers }),
      fetch(`${url}/rest/v1/sprinkles_projects?select=title,status,progress&status=neq.done`, { headers }),
    ]);
    const [members, activities, chores, events, meals, shopping, coinRules, coinLedger, stats, projects] = await Promise.all([
      membersRes.json(), activitiesRes.json(), choresRes.json(), eventsRes.json(), mealsRes.json(), shoppingRes.json(),
      coinRulesRes.json(), coinLedgerRes.json(), statsRes.json(), projectsRes.json(),
    ]);
    const nameOf = (id) => members.find((m) => m.id === id)?.name || "?";
    const askingMember = askingPhone ? members.find((m) => m.phone && normalizePhone(m.phone) === normalizePhone(askingPhone)) : null;

    const recipeIds = [...new Set((meals || []).filter((m) => m.recipe_id).map((m) => m.recipe_id))];
    let recipesById = {};
    if (recipeIds.length) {
      const rRes = await fetch(`${url}/rest/v1/recipes?select=id,name,ingredients,est_time&id=in.(${recipeIds.join(",")})`, { headers });
      const recipes = await rRes.json();
      recipesById = Object.fromEntries((recipes || []).map((r) => [r.id, r]));
    }

    const lines = [];
    lines.push("Family members: " + members.map((m) => `${m.name} (${m.role})`).join(", "));
    lines.push(askingMember ? `Asking member: ${askingMember.name}` : "Asking member: unknown (message came from the app, not a specific person's phone)");
    if (activities?.length) {
      lines.push("Recurring activities: " + activities.map((a) => `${nameOf(a.member_id)} — ${a.name}${a.location ? ` @ ${a.location}` : ""}${a.start_time ? ` ${a.start_time.slice(0, 5)}` : ""}`).join("; "));
    }
    if (chores?.length) {
      lines.push("Existing chores: " + chores.map((c) => `${nameOf(c.member_id)} — ${c.title} (${c.frequency})`).join("; "));
    }
    if (events?.length) {
      lines.push("Upcoming events: " + events.map((e) => `"${e.title}" ${e.start_at}${e.end_at ? ` to ${e.end_at}` : ""}${e.location ? ` @ ${e.location}` : ""} [for: ${(e.member_ids || []).map(nameOf).join(", ") || "everyone/shared"}]`).join("; "));
    }
    if (meals?.length) {
      lines.push(
        "This week's meal plan: " +
          meals
            .map((m) => {
              const r = m.recipe_id ? recipesById[m.recipe_id] : null;
              const dish = m.eat_out ? "eating out" : m.recipe_name || r?.name || "unplanned";
              const details = r ? ` (est. ${r.est_time || "unknown time"} to cook; ingredients: ${(r.ingredients || []).join(", ")})` : "";
              return `${m.day} ${m.meal}: ${dish}${details}`;
            })
            .join("; ")
      );
    }
    if (shopping?.length) {
      lines.push("Current grocery list (not yet on hand): " + shopping.map((s) => s.name).join(", "));
    }
    // Coin tables may not exist yet on every deployment (migration-gated) —
    // guard so a missing/erroring table doesn't blank out the rest of the
    // household context.
    if (Array.isArray(coinRules) && coinRules.length) {
      lines.push("Coin rules (kids only): " + coinRules.map((r) => `${r.delta > 0 ? "+" : ""}${r.delta} ${r.label}`).join("; "));
    }
    if (Array.isArray(coinLedger) && coinLedger.length) {
      const balances = {};
      coinLedger.forEach((l) => { balances[l.member_id] = (balances[l.member_id] || 0) + l.delta; });
      const kidBalances = Object.entries(balances).map(([id, bal]) => `${nameOf(Number(id))}: ${bal} coins`).join(", ");
      if (kidBalances) lines.push("Current coin balances: " + kidBalances);
    }
    if (Array.isArray(stats) && stats.length) {
      lines.push("Parent goals (for the \"stat\" action's \"label\" — match one of these exactly): " + stats.map((s) => `${nameOf(s.member_id)} — "${s.label}" (${s.value}/${s.target})`).join("; "));
    }
    if (Array.isArray(projects) && projects.length) {
      lines.push("Open projects: " + projects.map((p) => `"${p.title}" (${p.progress}% done)`).join("; "));
    }
    return lines.join("\n");
  } catch (e) {
    return "";
  }
}

// Turns free-form text into structured household action(s) plus a composed
// reply (see SYSTEM above for the shape). Never throws — falls back to a
// locally-parsed guess if the AI key is missing or the call fails.
// askingPhone identifies who sent the message (SMS only) so replies can be
// personalized; pass null/undefined for the in-app assistant.
async function classify(text, history, askingPhone) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return localFallback(text);

  try {
    const context = await fetchHouseholdContext(askingPhone);
    const historyText = Array.isArray(history) && history.length
      ? "Recent conversation:\n" + history.slice(-6).map((m) => `${m.role === "user" ? "User" : "Mr. Sprinkles"}: ${m.text}`).join("\n") + "\n"
      : "";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 800,
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
