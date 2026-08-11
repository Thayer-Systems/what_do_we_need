// OAuth callback: exchanges the auth code for tokens and stores the
// refresh token server-side only (oauth_tokens table has no anon/authenticated
// RLS policies — only this function's service-role key can reach it).

async function supaWrite(path, body) {
  const url = process.env.SUPABASE_URL || "https://jjzhxxzvtufopemmexdp.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${url}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(body),
  });
}

async function supaPatch(path, body) {
  const url = process.env.SUPABASE_URL || "https://jjzhxxzvtufopemmexdp.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

module.exports = async function handler(req, res) {
  const { code, error } = req.query || {};
  if (error) {
    res.status(400).send(`Google declined the connection: ${error}`);
    return;
  }
  if (!code) {
    res.status(400).send("Missing authorization code.");
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clientId || !clientSecret || !redirectUri || !serviceKey) {
    res.status(500).send("Server is missing Google OAuth or Supabase service-role configuration.");
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.refresh_token) {
      res
        .status(400)
        .send(
          `Google didn't return a refresh token (${tokenData.error_description || tokenData.error || "unknown reason"}). ` +
            `This usually means the app was already authorized once before — remove it at https://myaccount.google.com/permissions and try connecting again.`
        );
      return;
    }

    await supaWrite("oauth_tokens", { id: "google_calendar", refresh_token: tokenData.refresh_token, updated_at: new Date().toISOString() });
    await supaPatch("sprinkles_settings?id=eq.1", { google_calendar_connected: true });

    res.writeHead(302, { Location: "/?google_connected=1" });
    res.end();
  } catch (e) {
    res.status(500).send("Failed to connect Google Calendar: " + e.message);
  }
};
