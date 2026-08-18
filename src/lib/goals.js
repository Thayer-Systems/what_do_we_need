// The start date of the period `date` falls in, for a given period length.
// Weeks start Sunday to match the rest of the app (getWeekStart in App.jsx).
export function periodStart(period, date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (period === "day") return d.toISOString().slice(0, 10);
  if (period === "month") { d.setDate(1); return d.toISOString().slice(0, 10); }
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

// A count-type goal's value only counts if it was logged in the current
// period — once "now" has moved into a new day/week/month, an older value
// reads as 0 without needing anything to actively reset it.
export function effectiveGoalValue(goal) {
  if (goal.goal_type !== "count") return goal.value;
  return goal.period_start === periodStart(goal.period) ? goal.value : 0;
}
