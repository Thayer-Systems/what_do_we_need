import { useEffect, useState } from "react";
import { PageHeader, Card, EmptyState } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";
import { pushSupported, getPushSubscriptionStatus, enablePush, disablePush, getDeviceMemberId, setDeviceMemberId } from "../lib/push.js";
import { useIsTVMode, getForcedTVMode, setForcedTVMode, clearForcedTVMode } from "../lib/useMediaQuery.js";

function Field({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BASE.border}`, fontFamily: F.ui, fontSize: 13, gap: 12 }}>
      <span style={{ color: BASE.t2, fontWeight: 700 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const HOUSEHOLD_LINKS = [
  ["sparkle", "Integrations", BASE.lilac, "/settings/integrations"],
  ["question", "FAQ", BASE.orange, "/settings/faq"],
  ["book", "Instructions", BASE.green, "/settings/instructions"],
  ["cloudSun", "Weather", BASE.teal, "/settings/tools/weather"],
  ["sun", "School Day Display", BASE.yellow, "/school-day"],
];

export function HouseholdPage({ settings }) {
  const { navigate } = useRouter();
  return (
    <div>
      <PageHeader title="Household" sprinkles="settings" back={() => navigate("/settings")} />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <Field label="Address" value={settings?.household_address || "—"} />
          <Field label="Calendar attendees" value={(settings?.attendee_emails || []).join(", ")} />
          <Field label="Timezone" value={settings?.timezone || "—"} />
        </Card>
        {HOUSEHOLD_LINKS.map(([icon, label, color, path]) => (
          <Card key={path} onClick={() => navigate(path)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <IconBadge icon={icon} bg={color} size={40} />
            <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 15, flex: 1 }}>{label}</span>
            <Icon name="chevronRight" size={18} />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function IntegrationsPage({ settings }) {
  const { navigate } = useRouter();
  const [status, setStatus] = useState(null);
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
  }, []);
  const s = (ok, onText, offText) => (ok ? `Connected — ${onText}` : `Not connected — ${offText}`);
  return (
    <div>
      <PageHeader title="Integrations" sprinkles="settings" back={() => navigate("/settings")} />
      <div style={{ padding: "18px 16px 40px" }}>
        <Card>
          <Field label="AI assistant" value={status ? s(status.assistant, "ready", "add ANTHROPIC_API_KEY") : "Checking..."} />
          <Field label="Weather" value={status ? s(status.weather, "ready", "add TOMORROW_IO_API_KEY") : "Checking..."} />
          <Field
            label="Google Maps"
            value={
              !status ? "Checking..."
                : !status.googleMapsConfigured ? "Not connected — add GOOGLE_MAPS_KEY"
                : !status.googleMapsOriginConfigured ? "Key set, but no household address — add one in Household so travel time has an origin"
                : "Connected — ready"
            }
          />
          <Field
            label="Google Calendar"
            value={settings?.google_calendar_connected ? "Connected" : status?.googleCalendarConfigured ? "Configured, not connected yet" : "Not configured"}
          />
          <Field label="SMS" value="On hold — awaiting Twilio approval, use the assistant instead" />
        </Card>
        {!settings?.google_calendar_connected && status?.googleCalendarConfigured && (
          <a href="/api/integrations/google/authorize" style={{ display: "block", marginTop: 14 }}>
            <button style={{ width: "100%", background: BASE.teal, color: BASE.ink, border: `1px solid ${BASE.border}`, borderRadius: 999, padding: "12px", fontWeight: 800, fontFamily: F.ui, cursor: "pointer" }}>
              Connect Google Calendar
            </button>
          </a>
        )}
      </div>
    </div>
  );
}

const FAQS = [
  { q: "How do we add an event?", a: "Go to Calendar → + Event. Set a location and travel time fills in automatically from Google Maps." },
  { q: "How do events get shared between us?", a: "Every event includes both of you as attendees. Once Google Calendar is connected, events push there automatically." },
  { q: "How does the assistant work?", a: "Tap the mascot icon anywhere in the app. Type things like \"need milk\" or \"am I free Friday at 6?\" — it reads the message and acts on it." },
  { q: "How do kid themes work?", a: "Each kid's Family profile has a Theme picker that changes the look of their own profile page." },
  { q: "What happens when a task is completed?", a: "Tap it on the Home screen for a sprinkle-explosion celebration." },
];

export function FaqPage() {
  const { navigate } = useRouter();
  const [open, setOpen] = useState(null);
  return (
    <div>
      <PageHeader title="FAQ" sprinkles="settings" back={() => navigate("/settings")} />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 8 }}>
        {FAQS.map((f, i) => (
          <div key={i} style={{ border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: "hidden" }}>
            <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", textAlign: "left", padding: "12px 14px", background: open === i ? BASE.yellow : "#fff", border: "none", cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>
              {f.q}
            </button>
            {open === i && <div style={{ padding: "10px 14px", fontFamily: F.ui, fontSize: 13, color: BASE.t2, background: "#fff" }}>{f.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

const inp = { background: "#fff", border: `1px solid ${BASE.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const fieldLabel = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };
const saveBtn = { background: BASE.green, color: BASE.ink, border: `1px solid ${BASE.border}`, borderRadius: 999, padding: "10px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: F.ui };

export function PreferencesPage({ settings, onUpdateSettings, members = [] }) {
  const { navigate } = useRouter();
  const [address, setAddress] = useState(settings?.household_address || "");
  const [timezone, setTimezone] = useState(settings?.timezone || "");
  const [emails, setEmails] = useState((settings?.attendee_emails || []).join(", "));
  const [deviceMemberId, setDeviceMemberIdState] = useState(getDeviceMemberId());
  const [pushStatus, setPushStatus] = useState("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState(null);
  const isTVNow = useIsTVMode();
  const [tvForced, setTvForced] = useState(getForcedTVMode());

  useEffect(() => {
    pushSupported().then((ok) => {
      if (!ok) { setPushStatus("unsupported"); return; }
      getPushSubscriptionStatus().then(setPushStatus);
    });
  }, []);

  const save = () => {
    onUpdateSettings({
      household_address: address.trim() || null,
      timezone: timezone.trim() || null,
      attendee_emails: emails.split(",").map((s) => s.trim()).filter(Boolean),
    });
  };

  const handleEnable = async () => {
    if (!deviceMemberId) { setPushError("Pick who this device belongs to first."); return; }
    setPushBusy(true);
    setPushError(null);
    try {
      const result = await enablePush(deviceMemberId);
      if (result.ok) setPushStatus("subscribed");
      else if (result.reason === "not_configured") setPushError("Push isn't set up on the server yet (missing VAPID keys).");
      else setPushError(result.permission === "denied" ? "Notifications blocked — enable them in your browser settings." : "Couldn't enable notifications.");
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisable = async () => {
    setPushBusy(true);
    await disablePush();
    setPushStatus("unsubscribed");
    setPushBusy(false);
  };

  return (
    <div>
      <PageHeader title="Settings" sprinkles="settings" back={() => navigate("/settings")} />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Household</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><span style={fieldLabel}>Address</span><input style={inp} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" /></div>
            <div><span style={fieldLabel}>Timezone</span><input style={inp} value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/New_York" /></div>
            <div><span style={fieldLabel}>Calendar attendee emails</span><input style={inp} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="you@email.com, partner@email.com" /></div>
            <button onClick={save} style={saveBtn}>Save</button>
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Notifications</div>
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, marginBottom: 12 }}>
            Turn on push notifications so this device alerts you when someone assigns you a task, project, or event. Works best once you've added Mr. Sprinkles to your home screen.
          </div>
          {pushStatus === "unsupported" ? (
            <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t3 }}>Not supported in this browser.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <span style={fieldLabel}>This device belongs to</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setDeviceMemberIdState(m.id); setDeviceMemberId(m.id); }}
                      style={{
                        background: deviceMemberId === m.id ? m.color : "#fff", color: deviceMemberId === m.id ? "#fff" : BASE.ink,
                        border: `1px solid ${BASE.border}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: F.ui,
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      <Icon name={m.icon} size={14} color={deviceMemberId === m.id ? "#fff" : BASE.ink} /> {m.name}
                    </button>
                  ))}
                </div>
              </div>
              {pushStatus === "subscribed" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 800, color: BASE.green }}>✓ Notifications enabled on this device</span>
                  <button onClick={handleDisable} disabled={pushBusy} style={{ ...saveBtn, background: "#fff" }}>Turn off</button>
                </div>
              ) : (
                <button onClick={handleEnable} disabled={pushBusy} style={saveBtn}>{pushBusy ? "..." : "Enable Notifications"}</button>
              )}
              {pushError && <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.red }}>{pushError}</div>}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Display</div>
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, marginBottom: 12 }}>
            On a TV, the app tries to detect a wide-but-short screen automatically and switch to a single-screen layout. Some TV browsers report a full-size viewport instead, so if it isn't switching on its own, force it here — this only affects this device/browser.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 800, color: isTVNow ? BASE.green : BASE.t2 }}>
              {isTVNow ? "✓ TV layout active on this device" : "Currently using the regular layout"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => { setForcedTVMode(true); setTvForced(true); }}
              style={{ ...saveBtn, background: tvForced === true ? BASE.yellow : "#fff" }}
            >
              Force TV Layout On
            </button>
            <button
              onClick={() => { setForcedTVMode(false); setTvForced(false); }}
              style={{ ...saveBtn, background: tvForced === false ? BASE.yellow : "#fff" }}
            >
              Force It Off
            </button>
            {tvForced !== null && (
              <button
                onClick={() => { clearForcedTVMode(); setTvForced(null); }}
                style={{ ...saveBtn, background: "#fff" }}
              >
                Reset to Auto
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function GamesPage() {
  const { navigate } = useRouter();
  return (
    <div>
      <PageHeader title="Games" sprinkles="settings" back={() => navigate("/settings")} />
      <div style={{ padding: "18px 16px 40px" }}>
        <EmptyState icon="star" text="Coming soon — nothing to play here yet." />
      </div>
    </div>
  );
}

export function InstructionsPage() {
  const { navigate } = useRouter();
  return (
    <div>
      <PageHeader title="Instructions" sprinkles="settings" back={() => navigate("/settings")} />
      <div style={{ padding: "18px 16px 40px" }}>
        <Card>
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, lineHeight: 1.7 }}>
            1. Add family members' profiles under Settings → Family — contacts, activities, medications, food preferences, links, birthdays, chores, and goals.<br />
            2. Recurring activities you add on a kid's profile show up automatically on the shared Calendar.<br />
            3. Tap the mascot icon anywhere for the assistant — quick asks like "need milk" or availability questions.<br />
            4. Tap a chore on Home when it's done for the sprinkle celebration.<br />
            5. Add this app to your iPhone home screen (Share → Add to Home Screen) for the best experience.
          </div>
        </Card>
      </div>
    </div>
  );
}
