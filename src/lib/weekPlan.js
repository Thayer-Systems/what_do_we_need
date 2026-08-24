// Recipe library folders + the week-of-month rotation used to auto-populate
// "This Week's Dinners". Week 5 of a month (when it occurs) cycles back to
// week 1's meals rather than leaving a blank week.
export const WEEKLY_FOLDERS = ["week-1", "week-2", "week-3", "week-4"];
export const FOLDERS = [...WEEKLY_FOLDERS, "alternative-meals", "fall-winter"];
export const FOLDER_LABELS = {
  "week-1": "Week 1",
  "week-2": "Week 2",
  "week-3": "Week 3",
  "week-4": "Week 4",
  "alternative-meals": "Alternative Meals",
  "fall-winter": "Fall / Winter",
};
export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Sunday-based week_start used to key the meal_plan table (matches the
// getWeekStart used server-side). offsetWeeks lets callers look at past/
// future weeks — 0 is this week, 1 is next week, -1 is last week, etc.
export function getWeekStart(offsetWeeks = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export function getWeekOfMonth(date = new Date()) {
  return Math.ceil(date.getDate() / 7);
}

export function getActiveWeekTag(date = new Date()) {
  const w = getWeekOfMonth(date);
  return w > 4 ? w - 4 : w;
}

export function folderForWeekTag(weekTag) {
  return `week-${weekTag}`;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
