// Shared logic for chore/task scheduling — "once" tasks are due every day
// until completed (then deactivated), "daily" tasks are due every day
// forever, and "custom" tasks are due on their chosen weekdays.
export function isChoreDue(chore, dow) {
  if (!chore.active) return false;
  if (chore.frequency === "custom") return (chore.days || []).includes(dow);
  return true;
}

// "once" tasks track completion for all time (no specific date); recurring
// tasks track completion per calendar day.
export function isChoreDone(chore, completions, todayStr) {
  if (chore.frequency === "once") return completions.some((c) => c.chore_id === chore.id);
  return completions.some((c) => c.chore_id === chore.id && c.date === todayStr);
}

export function choreScheduleLabel(chore) {
  if (chore.frequency === "once") return "One-time";
  if (chore.frequency === "daily") return "Every day";
  return "Custom";
}
