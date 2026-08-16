// Dedicated Mr. Sprinkles Supabase project (mr_sprinkles_os). The anon key
// is safe to ship client-side by design; it only has access RLS policies
// explicitly grant it. Both must be set as Vercel env vars — no fallback
// is checked into source so a key-shaped literal never lands in git history.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // eslint-disable-next-line no-console
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — set them in Vercel project settings.");
}

export async function api(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const get = (path) => api(path);

// Same as get(), but never throws — resolves to [] on any failure (missing
// table because a migration hasn't been run yet, network hiccup, etc).
// Used for the initial bulk data load so one bad table doesn't take the
// whole app down to a blank screen; write paths still use get/post/patch/del
// directly so callers can react to real failures.
export const getSafe = (path) =>
  api(path).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`Failed to load ${path}:`, err);
    return [];
  });
export const post = (table, body) => api(table, { method: "POST", body: JSON.stringify(body) });
export const patch = (table, id, body) =>
  api(`${table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body), prefer: "return=representation" });
export const del = (table, id) => api(`${table}?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
