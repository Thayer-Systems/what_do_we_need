// Pushes a Mr. Sprinkles event to the connected Google Calendar using the
// refresh token stored by the OAuth callback. Never touches the client.

async function supaRead(path) {
  const url = process.env.SUPABASE_URL || "https://jjzhxxzvtufopemmexdp.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0] || null;
}

function resolveCalendarId() {
  const id = process.env.GOOGLE_FAMILY_CALENDAR_ID;
  // A real calendar ID is either "primary" or an email-shaped string
  // (name@gmail.com or hash@group.calendar.google.com). Guard against a
  // misconfigured value (e.g. an API hostname) silently breaking sync.
  if (id && id.includes("@")) return id;
  return "primary";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, reason: "method_not_allowed" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clientId || !clientSecret || !serviceKey) {
    console.error("create-event: not_configured", { hasClientId: !!clientId, hasClientSecret: !!clientSecret, hasServiceKey: !!serviceKey });
    res.status(200).json({ ok: false, reason: "not_configured" });
    return;
  }

  const tokenRow = await supaRead("oauth_tokens?id=eq.google_calendar&select=refresh_token");
  if (!tokenRow) {
    console.error("create-event: not_connected (no oauth_tokens row)");
    res.status(200).json({ ok: false, reason: "not_connected" });
    return;
  }

  try {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenRow.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const refreshData = await refreshRes.json();
    if (!refreshRes.ok || !refreshData.access_token) {
      console.error("create-event: refresh_failed", refreshData);
      res.status(200).json({ ok: false, reason: "refresh_failed", detail: refreshData.error_description || refreshData.error });
      return;
    }

    const { title, start_at, end_at, location, notes, attendee_emails } = req.body || {};
    if (!title || !start_at) {
      res.status(400).json({ ok: false, reason: "missing_fields" });
      return;
    }
    // Prefer the household's configured attendee emails (Preferences page)
    // over the GOOGLE_CALENDAR_ATTENDEES env var, so parents can manage who
    // gets invited without a redeploy.
    const emailSource = Array.isArray(attendee_emails) && attendee_emails.length
      ? attendee_emails
      : (process.env.GOOGLE_CALENDAR_ATTENDEES || "").split(",");
    const attendees = emailSource
      .map((e) => (e || "").trim())
      .filter(Boolean)
      .map((email) => ({ email }));
    const timeZone = process.env.GOOGLE_CALENDAR_TIME_ZONE || "America/New_York";
    const end = end_at || new Date(new Date(start_at).getTime() + 60 * 60000).toISOString();

    const calendarId = resolveCalendarId();
    const evRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${refreshData.access_token}`, "content-type": "application/json" },
        body: JSON.stringify({
          summary: title,
          location: location || undefined,
          description: notes || undefined,
          start: { dateTime: start_at, timeZone },
          end: { dateTime: end, timeZone },
          attendees,
        }),
      }
    );
    const evData = await evRes.json();
    if (!evRes.ok) {
      console.error("create-event: create_failed", { status: evRes.status, calendarId, error: evData.error });
      res.status(200).json({ ok: false, reason: "create_failed", detail: evData.error?.message });
      return;
    }
    res.status(200).json({ ok: true, googleEventId: evData.id });
  } catch (e) {
    console.error("create-event: exception", e);
    res.status(200).json({ ok: false, reason: "exception", detail: e.message });
  }
};
