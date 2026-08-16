import { useEffect, useState } from "react";

// Wide-but-short viewport (TVs, kiosk displays) — collapse chrome and
// switch pages that need it to a single-screen, no-scroll layout.
// Automatic detection is a best guess: many smart-TV browsers report a
// full-size viewport (e.g. 1920x1080) rather than a small one, so it won't
// always fire. A forced override (below) covers those.
export const TV_QUERY = "(min-width: 1000px) and (max-height: 820px)";
const TV_FORCE_KEY = "sprinkles-tv-mode";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export function getForcedTVMode() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("tv")) {
      const on = params.get("tv") !== "0";
      localStorage.setItem(TV_FORCE_KEY, on ? "1" : "0");
      return on;
    }
    const stored = localStorage.getItem(TV_FORCE_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall through.
  }
  return null;
}

const TV_FORCE_EVENT = "sprinkles-tv-mode-change";

export function setForcedTVMode(on) {
  try {
    localStorage.setItem(TV_FORCE_KEY, on ? "1" : "0");
  } catch {
    // ignore — nothing to persist to.
  }
  window.dispatchEvent(new Event(TV_FORCE_EVENT));
}

export function clearForcedTVMode() {
  try {
    localStorage.removeItem(TV_FORCE_KEY);
  } catch {
    // ignore — nothing to clear.
  }
  window.dispatchEvent(new Event(TV_FORCE_EVENT));
}

// Combines the automatic viewport-based guess with a per-device override
// (set via ?tv=1 in the URL once, or the toggle in Settings) so a TV whose
// browser doesn't match TV_QUERY can still be switched into TV mode.
export function useIsTVMode() {
  const auto = useMediaQuery(TV_QUERY);
  const [forced, setForced] = useState(getForcedTVMode);
  useEffect(() => {
    const refresh = () => setForced(getForcedTVMode());
    window.addEventListener("storage", refresh);
    window.addEventListener(TV_FORCE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(TV_FORCE_EVENT, refresh);
    };
  }, []);
  if (forced === true) return true;
  if (forced === false) return false;
  return auto;
}
