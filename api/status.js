// Reports which server-side integrations are configured, without ever
// exposing the underlying secret values to the client.
async function householdAddressConfigured() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  try {
    const r = await fetch(`${url}/rest/v1/sprinkles_settings?id=eq.1&select=household_address`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const rows = await r.json();
    return !!rows?.[0]?.household_address;
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  // Travel-time lookups need both the Maps key *and* a household address
  // (read server-side via SUPABASE_SERVICE_ROLE_KEY) to resolve an origin —
  // report both so a missing address doesn't just look like "not working".
  const [addressConfigured] = await Promise.all([householdAddressConfigured()]);
  res.status(200).json({
    assistant: !!process.env.ANTHROPIC_API_KEY,
    weather: !!process.env.TOMORROW_IO_API_KEY,
    googleMapsConfigured: !!process.env.GOOGLE_MAPS_KEY,
    googleMapsOriginConfigured: addressConfigured,
    googleCalendarConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    pushConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  });
};
