const SUPABASE_URL = "https://dzqciagcyekqxborbats.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cWNpYWdjeWVrcXhib3JiYXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjUzNTIsImV4cCI6MjA5MjAwMTM1Mn0.MfOw6ci5lRgzMhXGLavztjrQHgP3GCLieYuvsuNDHoM";

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
export const post = (table, body) => api(table, { method: "POST", body: JSON.stringify(body) });
export const patch = (table, id, body) =>
  api(`${table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body), prefer: "return=representation" });
export const del = (table, id) => api(`${table}?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
