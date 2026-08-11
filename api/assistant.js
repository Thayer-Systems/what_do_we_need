// Server-side proxy for the Mr. Sprinkles text assistant. Keeps the
// Anthropic key off the client — the browser only ever talks to this
// endpoint, never to api.anthropic.com directly.

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
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: "user", content: `Today is ${new Date().toISOString()}.\nMessage: "${text}"` }],
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
