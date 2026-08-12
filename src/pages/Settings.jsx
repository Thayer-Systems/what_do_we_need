import { useEffect, useState } from "react";
import { PageHeader, Card } from "../components/ui.jsx";
import { BASE, F, MASCOT, hardShadow } from "../lib/theme.js";

const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });

const FAQS = [
  { q: "How do we add an event?", a: "Go to Calendar → + Event. Set a location and, once Google Maps is connected, travel time fills in automatically — for now you can enter it manually." },
  { q: "How do events get shared between us?", a: "Every event includes both of you (mrarick2@gmail.com and courtneyt0627@gmail.com) as attendees. Once Google Calendar is connected below, events push there automatically; you can also tap 'Add to Calendar' on any event to download it directly." },
  { q: "How does the text assistant work?", a: "Type things like \"need milk\" or \"Piper has dance Tuesdays at 5pm\" into the assistant box on the Grocery tab. It reads the message and adds it to the right place — groceries, chores, or the calendar. SMS texting from your phones will be added once Twilio/Retell SMS approval comes through; until then this in-app box does the same job." },
  { q: "How do kid themes work?", a: "Each kid's Family profile page has a Theme picker (unicorns/mermaids/princesses, animals/Pokémon/drawing, or Pokémon/ninjas/tech). It only changes the look of their own profile page for now." },
  { q: "What happens when a chore is completed?", a: "Tap it on the Home screen — Mr. Sprinkles throws a sprinkle explosion and gives you a thumbs up." },
  { q: "Where's the pantry stock tracker?", a: "Retired on purpose — too much upkeep. Instead just tell the assistant \"need milk\" and it lands on the grocery list." },
];

function Field({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BASE.muted}`, fontFamily: F.ui, fontSize: 13, gap: 12 }}>
      <span style={{ color: BASE.t2, fontWeight: 700 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function Settings({ settings }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
  }, []);

  const s = (ok, onText, offText) => (ok ? `✅ ${onText}` : `⚠️ ${offText}`);

  return (
    <div>
      <PageHeader title="Settings" />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src={MASCOT.peeking} alt="" style={{ width: 50, height: 50, objectFit: "contain" }} />
          <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>Mr. Sprinkles — a two-person family command center.</div>
        </Card>

        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Household</div>
          <Field label="Address" value={settings?.household_address || "—"} />
          <Field label="Calendar attendees" value={(settings?.attendee_emails || []).join(", ")} />
          <Field label="Timezone" value={settings?.timezone || "—"} />
        </Card>

        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Integrations</div>
          <Field label="AI assistant" value={status ? s(status.assistant, "Connected", "Not connected — add ANTHROPIC_API_KEY in Vercel") : "Checking..."} />
          <Field label="Weather" value={status ? s(status.weather, "Connected", "Not connected — add TOMORROW_IO_API_KEY in Vercel") : "Checking..."} />
          <Field label="Google Maps travel time" value={status ? s(status.googleMapsConfigured, "Connected", "Not connected — enter travel time manually for now") : "Checking..."} />
          <Field
            label="Google Calendar sync"
            value={
              settings?.google_calendar_connected
                ? "✅ Connected"
                : status?.googleCalendarConfigured
                ? "⚠️ Configured, not connected yet"
                : "⚠️ Not configured"
            }
          />
          {!settings?.google_calendar_connected && status?.googleCalendarConfigured && (
            <a href="/api/integrations/google/authorize" style={{ display: "inline-block", marginTop: 10 }}>
              <button style={btn(BASE.teal)}>Connect Google Calendar</button>
            </a>
          )}
          <Field label="SMS via Twilio/Telegram" value="⏸️ On hold — awaiting SMS approval, use in-app assistant" />
        </Card>

        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>FAQ</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ border: `1.5px solid ${BASE.ink}`, borderRadius: 12, overflow: "hidden" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: openFaq === i ? BASE.yellow : "#fff", border: "none", cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}
                >
                  {f.q}
                </button>
                {openFaq === i && <div style={{ padding: "10px 14px", fontFamily: F.ui, fontSize: 13, color: BASE.t2, background: "#fff" }}>{f.a}</div>}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Instructions</div>
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, lineHeight: 1.6 }}>
            1. Add family members' profiles under Family — contacts, activities, medications, food preferences, links, birthdays, and chores.<br />
            2. Recurring activities you add on a kid's profile show up automatically on the shared Calendar.<br />
            3. Use the Grocery assistant box for quick asks like "need milk" instead of maintaining a pantry inventory.<br />
            4. Tap a chore on Home when it's done for the sprinkle celebration.<br />
            5. Add this app to your iPhone home screen (Share → Add to Home Screen) for the best experience.
          </div>
        </Card>
      </div>
    </div>
  );
}
