// Mr. Sprinkles text assistant — parses free-form family text into a
// structured action (grocery item, chore, calendar event, or meal).
// Uses the same Anthropic key the pantry-scan feature already relies on
// (VITE_ANTHROPIC_KEY). If it isn't set, falls back to a lightweight
// local heuristic so the assistant still does something useful offline.

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

const SYSTEM = `You are Mr. Sprinkles, a warm, upbeat family assistant that turns short texts into one structured household action.
Classify the message into exactly one of these types and return ONLY JSON, no markdown:

{"type":"grocery","item":"milk"}
{"type":"chore","member":"Piper","title":"feed the dog","frequency":"daily"}
{"type":"event","title":"Piper dance class","start":"2026-08-12T17:00:00","location":"Franklin Dance Studio","member":"Piper","category":"activity"}
{"type":"meal","day":"Mon","meal":"Dinner","name":"Tacos"}
{"type":"unknown","reason":"..."}

Rules:
- "we need X" / "out of X" / "need to grab X" -> grocery.
- Anything about a kid needing to do something regularly -> chore.
- Anything with a date/time/place -> event. Infer a reasonable ISO start datetime from context (today is provided). Category is one of event, appointment, activity, meal, chore, other.
- Anything about cooking/what's for dinner -> meal.
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

export async function interpretMessage(text) {
  if (!ANTHROPIC_KEY) return localFallback(text);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: "user", content: `Today is ${new Date().toISOString()}.\nMessage: "${text}"` }],
      }),
    });
    if (!res.ok) throw new Error("assistant request failed");
    const data = await res.json();
    const raw = data.content[0].text.trim().replace(/```json|```/g, "").trim();
    return JSON.parse(raw);
  } catch (e) {
    return localFallback(text);
  }
}
