// School Day display logic: which kids it's for on a given weekday, and
// whether "now" falls in the morning window where a TV should auto-switch
// to it. Always computed in America/New_York regardless of the device's
// own timezone, since that's the household's timezone.
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

// The display is "live" (main-display) from 6:45am until 8:30am ET on a
// school morning — outside that window it's just a page you can visit.
export function isSchoolMorningWindow(date = new Date()) {
  const { dow, hour, minute } = partsInTZ(date, TZ);
  if (![1, 2, 3, 4, 5].includes(dow)) return false;
  const mins = hour * 60 + minute;
  return mins >= 6 * 60 + 45 && mins < 8 * 60 + 30;
}
