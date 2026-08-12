// Server-side proxy for the Mr. Sprinkles text assistant. Keeps the
// Anthropic key off the client — the browser only ever talks to this
// endpoint, never to api.anthropic.com directly. Classification logic
// lives in api/_lib/classify.js, shared with the Telnyx SMS webhook.

const { classify } = require("./_lib/classify.js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { text, history } = req.body || {};
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing text" });
    return;
  }

  const result = await classify(text, history);
  res.status(200).json(result);
};
