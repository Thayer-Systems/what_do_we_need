// Saves (or removes) a browser push subscription for a family member's
// device. One row per endpoint — re-subscribing the same device just
// upserts, so toggling notifications on/off doesn't pile up rows.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://jjzhxxzvtufopemmexdp.supabase.co";

function headers() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" };
}

module.exports = async function handler(req, res) {
  if (req.method === "DELETE") {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
    await fetch(`${SUPABASE_URL}/rest/v1/sprinkles_push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
      method: "DELETE",
      headers: headers(),
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { memberId, subscription } = req.body || {};
  if (!memberId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    res.status(400).json({ error: "Missing memberId or subscription" });
    return;
  }

  const r = await fetch(`${SUPABASE_URL}/rest/v1/sprinkles_push_subscriptions?on_conflict=endpoint`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      member_id: memberId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }),
  });
  if (!r.ok) {
    res.status(200).json({ ok: false, error: await r.text() });
    return;
  }
  res.status(200).json({ ok: true });
};
