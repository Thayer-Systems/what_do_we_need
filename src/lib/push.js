// Client-side web push: registers the service worker, subscribes this
// device to push, and ties the subscription to a family member so
// assignment notifications land on the right person's phone.
const DEVICE_MEMBER_KEY = "sprinkles_device_member_id";

export function getDeviceMemberId() {
  const v = localStorage.getItem(DEVICE_MEMBER_KEY);
  return v ? Number(v) : null;
}

export function setDeviceMemberId(id) {
  if (id == null) localStorage.removeItem(DEVICE_MEMBER_KEY);
  else localStorage.setItem(DEVICE_MEMBER_KEY, String(id));
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
}

export async function getPushSubscriptionStatus() {
  if (!(await pushSupported())) return "unsupported";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "subscribed" : "unsubscribed";
}

export async function enablePush(memberId) {
  if (!(await pushSupported())) throw new Error("Push not supported in this browser");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, permission: perm };

  const keyRes = await fetch("/api/push/vapid-public-key").then((r) => r.json());
  if (!keyRes.available) return { ok: false, reason: "not_configured" };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey),
    });
  }

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ memberId, subscription: sub.toJSON() }),
  });
  setDeviceMemberId(memberId);
  return { ok: true };
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  }
  setDeviceMemberId(null);
}

// Fire-and-forget: called after assignment writes so this doesn't block
// the UI if push isn't configured yet or a send fails.
export function notifyAssignment(memberIds, title, body, url) {
  const ids = (memberIds || []).filter(Boolean);
  if (!ids.length) return;
  fetch("/api/push/notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ memberIds: ids, title, body, url }),
  }).catch(() => {});
}
