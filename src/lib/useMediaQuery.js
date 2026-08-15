import { useEffect, useState } from "react";

// Wide-but-short viewport (TVs, kiosk displays) — collapse chrome and
// switch pages that need it to a single-screen, no-scroll layout.
export const TV_QUERY = "(min-width: 1000px) and (max-height: 820px)";

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
