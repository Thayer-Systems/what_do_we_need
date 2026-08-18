// School Day display logic: which kids it's for on a given weekday, and
// whether "now" falls in the configured main-display window. Always
// computed in America/New_York regardless of the device's own timezone,
// since that's the household's timezone.
const TZ = "America/New_York";

function partsInTZ(date, tz) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday];
  return { dow: weekdayIndex, hour: Number(parts.hour), minute: Number(parts.minute) };
}

// M/W/F: everyone. T/Th: Silas only. Weekends: nobody.
export function schoolKidsForDate(members, date = new Date()) {
  const { dow } = partsInTZ(date, TZ);
  const kids = members.filter((m) => m.role !== "parent");
  if ([1, 3, 5].includes(dow)) return kids;
  if ([2, 4].includes(dow)) return kids.filter((k) => k.name.toLowerCase() === "silas");
  return [];
}

const DEFAULT_SCHEDULE = { days: [1, 2, 3, 4, 5], start_time: "06:45", end_time: "08:30", enabled: true };

// Whether "now" falls inside the configured display window (Tools >
// Routines) — falls back to the original 6:45-8:30am weekday default if no
// schedule has been configured/loaded yet.
export function isInDisplayWindow(schedule, date = new Date()) {
  const s = schedule || DEFAULT_SCHEDULE;
  if (s.enabled === false) return false;
  const { dow, hour, minute } = partsInTZ(date, TZ);
  if (!(s.days || DEFAULT_SCHEDULE.days).includes(dow)) return false;
  const mins = hour * 60 + minute;
  const [sh, sm] = (s.start_time || DEFAULT_SCHEDULE.start_time).split(":").map(Number);
  const [eh, em] = (s.end_time || DEFAULT_SCHEDULE.end_time).split(":").map(Number);
  return mins >= sh * 60 + sm && mins < eh * 60 + em;
}
