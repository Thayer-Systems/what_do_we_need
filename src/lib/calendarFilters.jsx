import { createContext, useContext, useState } from "react";

// Calendar member/category filters live here instead of on CalendarPage so
// the nav bar can host the single consolidated filter control (next to
// "Ask Mr. Sprinkles") and free up the calendar's own vertical space.
const CalendarFiltersCtx = createContext(null);

export function CalendarFiltersProvider({ children }) {
  const [memberFilter, setMemberFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  return (
    <CalendarFiltersCtx.Provider value={{ memberFilter, setMemberFilter, catFilter, setCatFilter }}>
      {children}
    </CalendarFiltersCtx.Provider>
  );
}

export function useCalendarFilters() {
  return useContext(CalendarFiltersCtx);
}
