// Runs Saturday 11:59pm ET (see vercel.json — cron times are UTC, so
// this is anchored to EDT; it'll drift an hour during EST since Vercel
// cron doesn't support timezones). Clears out meal-plan rows from
// completed weeks so the board starts clean each week — the app already
// only ever queries the current week's rows, so this is housekeeping
// rather than something the UI depends on.

function getWeekStart(d = new Date()) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  return x.toISOString().slice(0, 10);
}

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ ok: false, reason: "unauthorized" });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(200).json({ ok: false, reason: "not_configured" });
    return;
  }

  const currentWeekStart = getWeekStart();
  try {
    const r = await fetch(`${url}/rest/v1/meal_plan?week_start=lt.${currentWeekStart}`, {
      method: "DELETE",
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "return=minimal" },
    });
    res.status(200).json({ ok: r.ok, currentWeekStart });
  } catch (e) {
    res.status(200).json({ ok: false, reason: e.message });
  }
};
