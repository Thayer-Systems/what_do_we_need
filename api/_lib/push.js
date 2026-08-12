// Shared web-push sender. VAPID keys and the Supabase service-role key are
// server-only env vars — never shipped to the client.
const webpush = require("web-push");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://jjzhxxzvtufopemmexdp.supabase.co";

function configured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function headers() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" };
}

async function subscriptionsForMembers(memberIds) {
  if (!memberIds?.length) return [];
  const filter = `in.(${memberIds.join(",")})`;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/sprinkles_push_subscriptions?member_id=${filter}`, { headers: headers() });
  if (!r.ok) return [];
  return r.json();
}

async function removeSubscription(endpoint) {
  await fetch(`${SUPABASE_URL}/rest/v1/sprinkles_push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: "DELETE",
    headers: headers(),
  }).catch(() => {});
}

// Sends a push notification to every device registered to the given
// family member ids. Silently no-ops if VAPID isn't configured yet, or a
// stale/expired subscription is pruned on 404/410.
async function notifyMembers(memberIds, payload) {
  if (!configured()) return { sent: 0, reason: "not_configured" };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  const subs = await subscriptionsForMembers(memberIds);
  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await removeSubscription(s.endpoint);
    }
  }));
  return { sent };
}

module.exports = { notifyMembers, configured };
