// A task with no schedule and no due date ("no timeline") is treated as
// always open — it shows up until it's marked done or given a schedule.
// A due-dated task only counts as "today" on its due date.
export function choreAppliesToday(chore, date = new Date()) {
  if (chore.frequency === "daily") return true;
  if (chore.frequency === "custom") return (chore.days || []).includes(date.getDay());
  if (chore.due_date) return chore.due_date === date.toISOString().slice(0, 10);
  return true;
}
