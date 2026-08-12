// Server-side Google Distance Matrix lookup — keeps GOOGLE_MAPS_KEY
// off the client. Given an event location, returns driving minutes from
// the household address.

async function readHouseholdAddress() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/rest/v1/sprinkles_settings?id=eq.1&select=household_address`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const rows = await r.json();
    return rows?.[0]?.household_address || null;
  } catch (e) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) {
    res.status(200).json({ available: false, reason: "not_configured" });
    return;
  }

  const destination = req.method === "POST" ? req.body?.destination : req.query?.destination;
  if (!destination) {
    res.status(400).json({ available: false, reason: "missing_destination" });
    return;
  }

  const origin = (req.method === "POST" ? req.body?.origin : req.query?.origin) || (await readHouseholdAddress());
  if (!origin) {
    res.status(200).json({ available: false, reason: "missing_origin" });
    return;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&departure_time=now&key=${key}`;
    const r = await fetch(url);
    const data = await r.json();
    const el = data?.rows?.[0]?.elements?.[0];
    if (data.status !== "OK" || !el || el.status !== "OK") {
      res.status(200).json({ available: false, reason: "lookup_failed", detail: el?.status || data.status });
      return;
    }
    const seconds = (el.duration_in_traffic || el.duration).value;
    res.status(200).json({
      available: true,
      minutes: Math.round(seconds / 60),
      distanceText: el.distance.text,
      durationText: (el.duration_in_traffic || el.duration).text,
    });
  } catch (e) {
    res.status(200).json({ available: false, reason: "exception", detail: e.message });
  }
};
