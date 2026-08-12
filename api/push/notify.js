// Fires a push notification to one or more family members' devices.
// Called client-side right after a task/project/event assignment write —
// e.g. "Courtney assigned you a task" — so the recipient's phone buzzes
// even if Mr. Sprinkles isn't open.
const { notifyMembers } = require("../_lib/push.js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { memberIds, title, body, url } = req.body || {};
  if (!Array.isArray(memberIds) || !memberIds.length || !title) {
    res.status(400).json({ error: "Missing memberIds or title" });
    return;
  }
  const result = await notifyMembers(memberIds, { title, body: body || "", url: url || "/" });
  res.status(200).json(result);
};
