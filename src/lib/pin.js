// Simple PIN lock for the Tools tab — not real security, just enough to
// keep kids (or guests) from wandering into settings/integrations. Unlock
// state is per-tab (sessionStorage) so it re-locks on a fresh session.
const PIN = "0722";
const KEY = "sprinkles-tools-unlocked";

export function isToolsUnlocked() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function tryUnlockTools(code) {
  const ok = code === PIN;
  if (ok) {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // ignore — nothing to persist to, gate just won't stick across reloads.
    }
  }
  return ok;
}

export function lockTools() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
