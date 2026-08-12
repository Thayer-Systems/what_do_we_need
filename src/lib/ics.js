// Generates a downloadable .ics file for a calendar event so it can be
// added to Google Calendar / Apple Calendar with both attendees, without
// needing Google OAuth wired up yet.

function toICSDate(d) {
  return new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function downloadICS(event, attendeeEmails = []) {
  const uid = `sprinkles-${event.id}@mrsprinkles.family`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mr Sprinkles//Family OS//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(event.start_at)}`,
    event.end_at ? `DTEND:${toICSDate(event.end_at)}` : "",
    `SUMMARY:${(event.title || "").replace(/\n/g, " ")}`,
    event.location ? `LOCATION:${event.location.replace(/\n/g, " ")}` : "",
    event.notes ? `DESCRIPTION:${event.notes.replace(/\n/g, " ")}` : "",
    ...attendeeEmails.map((e) => `ATTENDEE;CN=${e}:mailto:${e}`),
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(event.title || "event").replace(/[^a-z0-9]+/gi, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
