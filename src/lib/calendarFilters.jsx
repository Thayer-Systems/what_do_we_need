import { createContext, useContext, useState } from "react";

// Calendar member/category filters, plus the view/navigation controls
// (3day/week/day/month, prev/today/next, add), live here instead of on
// CalendarPage so the top nav can host a single consolidated set of
// controls (Filters + a hamburger nav menu) instead of a toolbar row
// competing for space above the calendar grid.
const CalendarFiltersCtx = createContext(null);

export function CalendarFiltersProvider({ children }) {
  const [memberFilter, setMemberFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(new Date());
  // Bumped to signal CalendarPage to open the "new event" modal for the
  // current cursor date — the modal itself needs members/onAdd, which only
  // CalendarPage has, so the nav button can't open it directly.
  const [addRequestToken, setAddRequestToken] = useState(0);
  const requestAddEvent = () => setAddRequestToken((t) => t + 1);

  return (
    <CalendarFiltersCtx.Provider value={{
      memberFilter, setMemberFilter, catFilter, setCatFilter,
      view, setView, cursor, setCursor, addRequestToken, requestAddEvent,
    }}>
      {children}
    </CalendarFiltersCtx.Provider>
  );
}

export function useCalendarFilters() {
  return useContext(CalendarFiltersCtx);
}
