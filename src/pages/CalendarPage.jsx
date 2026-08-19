import { useEffect, useMemo, useState } from "react";
import { Modal } from "../components/ui.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, CATEGORY_COLORS, eventColor, hardShadow } from "../lib/theme.js";
import { downloadICS } from "../lib/ics.js";
import { useCalendarFilters } from "../lib/calendarFilters.jsx";

const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };
const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });

const CATEGORIES = ["event", "appointment", "activity", "meal", "chore", "work", "other"];
const RECURRENCE = ["none", "daily", "weekly", "monthly", "yearly"];
const RECURRENCE_LABEL = { none: "One-time", daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
const DAY_MS = 86400000;

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

function EventDetail({ event, members, settings, onClose, onDelete, onSyncGoogle, onEdit }) {
  const attendees = (event.member_ids || []).map((id) => members.find((m) => m.id === id)?.name).filter(Boolean);
  const [syncState, setSyncState] = useState(event.google_event_id ? "synced" : "idle");
  const [syncError, setSyncError] = useState(null);
  const googleConnected = !!settings?.google_calendar_connected;
  const isEditable = event.source !== "activity";

  const handleAddToCalendar = async () => {
    if (!googleConnected) {
      downloadICS(event, settings?.attendee_emails || []);
      return;
    }
    if (syncState === "synced") return;
    setSyncState("syncing");
    setSyncError(null);
    const d = await onSyncGoogle(event);
    setSyncState(d?.ok ? "synced" : "error");
    if (!d?.ok) setSyncError(d?.detail || d?.reason || "unknown error");
  };

  const btnLabel = !googleConnected
    ? "Add to Calendar"
    : { idle: "Add to Google Calendar", syncing: "Adding…", synced: "✓ On Google Calendar", error: "Couldn't add — retry" }[syncState];

  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, gap: 8 }}>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20 }}>{event.title}</div>
        {isEditable && <button onClick={() => onEdit(event)} style={btn(BASE.yellow)}>Edit</button>}
      </div>
      <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, marginBottom: 14 }}>
        {new Date(event.start_at).toLocaleString([], { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        {event.recurrence && event.recurrence !== "none" && ` · ${RECURRENCE_LABEL[event.recurrence] || event.recurrence}`}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: F.ui, fontSize: 14, marginBottom: 18 }}>
        {event.location && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="pin" size={16} /> {event.location}</div>}
        {event.travel_minutes != null && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="car" size={16} /> {event.travel_minutes} min travel time</div>}
        {attendees.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="users" size={16} /> {attendees.join(", ")}</div>}
        {event.notes && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="info" size={16} /> {event.notes}</div>}
        {!isEditable && <div style={{ fontFamily: F.ui, fontSize: 12, fontStyle: "italic", color: BASE.t3 }}>This is a recurring activity — edit it from the family member's profile.</div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btn(BASE.teal)} disabled={syncState === "syncing" || syncState === "synced"} onClick={handleAddToCalendar}>{btnLabel}</button>
        {isEditable && <button style={btn(BASE.red)} onClick={() => { onDelete(event.id); onClose(); }}>Delete</button>}
      </div>
      {syncError && <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.red, marginTop: 8 }}>{syncError}</div>}
    </Modal>
  );
}

function EventModal({ event, members, defaultDate, onSave, onClose }) {
  const [title, setTitle] = useState(event?.title || "");
  const [category, setCategory] = useState(event?.category || "event");
  const start = event ? new Date(event.start_at) : null;
  const [date, setDate] = useState(start ? start.toISOString().slice(0, 10) : defaultDate);
  const [time, setTime] = useState(start ? start.toTimeString().slice(0, 5) : "17:00");
  const [location, setLocation] = useState(event?.location || "");
  const [travel, setTravel] = useState(event?.travel_minutes != null ? String(event.travel_minutes) : "");
  const [travelLookup, setTravelLookup] = useState("idle");
  const [memberIds, setMemberIds] = useState(event?.member_ids || []);
  const [notes, setNotes] = useState(event?.notes || "");
  const [recurrence, setRecurrence] = useState(event?.recurrence || "none");
  const [recurrenceUntil, setRecurrenceUntil] = useState(event?.recurrence_until || "");

  const toggleMember = (id) => setMemberIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const allSelected = members.length > 0 && members.every((m) => memberIds.includes(m.id));
  const toggleFamily = () => setMemberIds(allSelected ? [] : members.map((m) => m.id));

  // "work" events are always Courtney's — auto-assign her and lock her in
  // as soon as that category is picked.
  const setCategoryAndAssign = (c) => {
    setCategory(c);
    if (c === "work") {
      const courtney = members.find((m) => m.name.toLowerCase() === "courtney");
      if (courtney) setMemberIds((p) => (p.includes(courtney.id) ? p : [...p, courtney.id]));
    }
  };

  const lookupTravel = async () => {
    if (!location.trim()) return;
    setTravelLookup("loading");
    try {
      const r = await fetch(`/api/travel-time?destination=${encodeURIComponent(location.trim())}`);
      const d = await r.json();
      if (d.available) { setTravel(String(d.minutes)); setTravelLookup("done"); } else setTravelLookup(d.reason || "unavailable");
    } catch (e) { setTravelLookup("unavailable"); }
  };

  const save = () => {
    if (!title.trim() || !date) return;
    onSave({
      title: title.trim(), category, start_at: new Date(`${date}T${time}:00`).toISOString(),
      location: location.trim() || null, travel_minutes: travel ? Number(travel) : null,
      member_ids: memberIds, notes: notes.trim() || null, source: "manual",
      recurrence, recurrence_until: recurrence !== "none" ? recurrenceUntil || null : null,
    });
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{event ? "Edit Event" : "New Event"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Title</span><input autoFocus style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Piper's dance recital" /></div>
        <div><span style={label}>Category</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => <button key={c} onClick={() => setCategoryAndAssign(c)} style={btn(category === c ? CATEGORY_COLORS[c] : "#fff")}>{c}</button>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><span style={label}>Date</span><input type="date" style={inp} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div style={{ flex: 1 }}><span style={label}>Time</span><input type="time" style={inp} value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
        <div><span style={label}>Location</span><input style={inp} value={location} onChange={(e) => setLocation(e.target.value)} onBlur={lookupTravel} placeholder="Address or place" /></div>
        <div>
          <span style={label}>Travel time (minutes)</span>
          <input type="number" style={inp} value={travel} onChange={(e) => setTravel(e.target.value)} placeholder="Auto-filled from Google Maps" />
          <div style={{ fontSize: 11, color: BASE.t2, fontFamily: F.ui, marginTop: 4 }}>
            {travelLookup === "loading" && "Looking up drive time…"}
            {travelLookup === "done" && "Auto-filled from Google Maps — edit if needed"}
            {travelLookup === "not_configured" && "Google Maps isn't configured (missing GOOGLE_MAPS_KEY) — enter manually"}
            {travelLookup === "missing_origin" && "Set a household address in Settings so travel time can be looked up"}
            {(travelLookup === "unavailable" || travelLookup === "lookup_failed" || travelLookup === "exception") && "Couldn't look it up — enter manually"}
          </div>
        </div>
        <div><span style={label}>Who</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={toggleFamily} style={{ ...btn(allSelected ? BASE.pink : "#fff"), color: allSelected ? "#fff" : BASE.ink, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="users" size={14} color={allSelected ? "#fff" : BASE.ink} /> Family
            </button>
            {members.map((m) => (
              <button key={m.id} onClick={() => toggleMember(m.id)} style={{ ...btn(memberIds.includes(m.id) ? m.color : "#fff"), color: memberIds.includes(m.id) ? "#fff" : BASE.ink, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name={m.icon} size={14} color={memberIds.includes(m.id) ? "#fff" : BASE.ink} /> {m.name}
              </button>
            ))}
          </div>
        </div>
        <div><span style={label}>Repeats</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RECURRENCE.map((r) => <button key={r} onClick={() => setRecurrence(r)} style={btn(recurrence === r ? BASE.lilac : "#fff")}>{RECURRENCE_LABEL[r]}</button>)}
          </div>
          {recurrence !== "none" && (
            <div style={{ marginTop: 8 }}>
              <span style={label}>Ends (optional)</span>
              <input type="date" style={inp} value={recurrenceUntil} onChange={(e) => setRecurrenceUntil(e.target.value)} />
            </div>
          )}
        </div>
        <div><span style={label}>Notes</span><input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <button onClick={save} style={{ ...btn(BASE.green), width: "100%", marginTop: 4 }}>Save Event</button>
      </div>
    </Modal>
  );
}

function forecastFor(forecast, date) {
  if (!forecast?.length) return null;
  return forecast.find((f) => new Date(f.date).toDateString() === date.toDateString());
}

function WeatherBadge({ day }) {
  if (!day) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, background: BASE.muted, border: `1.5px solid ${BASE.ink}`, borderRadius: 999, padding: "2px 8px", flexShrink: 0 }}>
      <Icon name={day.icon} size={14} />
      <span style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 800 }}>{day.highF}°</span>
    </div>
  );
}

// Google-Calendar-mobile-style agenda: date rail + event list, clean and dense.
function Agenda({ days, events, members, onOpen, forecast }) {
  const today = new Date();
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {days.map((d) => {
        const dayEvents = events.filter((e) => sameDay(new Date(e.start_at), d)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
        const isToday = sameDay(d, today);
        const dayForecast = forecastFor(forecast, d);
        return (
          <div key={d.toISOString()} style={{ display: "flex", borderBottom: `1.5px solid ${BASE.muted}`, minHeight: 64 }}>
            <div style={{ width: 56, flexShrink: 0, padding: "12px 6px", textAlign: "center", borderRight: `1.5px solid ${BASE.muted}` }}>
              <div style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 800, color: BASE.t2, textTransform: "uppercase" }}>{d.toLocaleDateString([], { weekday: "short" })}</div>
              <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "2px auto 0", background: isToday ? BASE.yellow : "transparent", border: isToday ? `2px solid ${BASE.ink}` : "none" }}>
                {d.getDate()}
              </div>
            </div>
            <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              {dayEvents.length === 0 ? (
                <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t3, padding: "6px 0" }}>—</div>
              ) : (
                dayEvents.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => onOpen(e)}
                    style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#fff", border: `1.5px solid ${BASE.ink}`, borderLeft: `6px solid ${eventColor(e, members)}`, borderRadius: 8, padding: "6px 10px" }}
                  >
                    <span style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 800, color: BASE.t2, minWidth: 56 }}>
                      {e.all_day ? "All day" : new Date(e.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14, flex: 1 }}>{e.title}</span>
                    <WeatherBadge day={dayForecast} />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MonthView({ cursor, events, members, onDayClick, onOpenEvent }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getTime() + i * DAY_MS));
  const today = new Date();
  return (
    <div style={{ padding: "0 16px 24px" }}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 10 }}>{cursor.toLocaleDateString([], { month: "long", year: "numeric" })}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 6 }}>
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontFamily: F.ui, fontWeight: 800, fontSize: 12, color: BASE.t2, textTransform: "uppercase" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          // Cells outside the current month are left blank rather than
          // showing the adjacent month's dates/events.
          if (!inMonth) {
            return <div key={d.toISOString()} style={{ border: `2px solid ${BASE.ink}`, borderRadius: 10, minHeight: 110, background: BASE.muted, opacity: 0.4 }} />;
          }
          const dayEvents = events.filter((e) => sameDay(new Date(e.start_at), d)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
          return (
            <div key={d.toISOString()} style={{ border: `2px solid ${BASE.ink}`, borderRadius: 10, minHeight: 110, padding: 6, background: sameDay(d, today) ? BASE.yellow : "#fff", display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
              <div onClick={() => onDayClick(d)} style={{ fontSize: 14, fontWeight: 800, fontFamily: F.ui, cursor: "pointer" }}>{d.getDate()}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minHeight: 0 }}>
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onOpenEvent ? onOpenEvent(e) : onDayClick(d); }}
                    style={{ background: eventColor(e, members), border: `1px solid ${BASE.ink}`, borderRadius: 5, padding: "2px 5px", cursor: "pointer", overflow: "hidden" }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, fontFamily: F.ui, color: "#fff", textShadow: "0 1px 1px rgba(0,0,0,0.35)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {e.all_day ? "" : new Date(e.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} {e.title}
                    </div>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div onClick={() => onDayClick(d)} style={{ fontSize: 11, fontWeight: 800, fontFamily: F.ui, color: BASE.t2, cursor: "pointer" }}>+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPage({ members, events, settings, onAdd, onUpdate, onDelete, onSyncGoogle }) {
  const [addOpen, setAddOpen] = useState(null);
  const [openEvent, setOpenEvent] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const { memberFilter, catFilter, view, setView, cursor, setCursor, addRequestToken } = useCalendarFilters();

  useEffect(() => {
    fetch("/api/weather?range=week").then((r) => r.json()).then((d) => setForecast(d?.days || [])).catch(() => setForecast([]));
  }, []);

  // The "+" button lives in the top-nav hamburger menu now — it bumps
  // addRequestToken, which this page listens for to open the modal for
  // whatever date the calendar is currently on.
  useEffect(() => {
    if (addRequestToken) setAddOpen(dateStr(cursor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addRequestToken]);

  const filtered = useMemo(
    () => events.filter((e) => (memberFilter === "all" || (e.member_ids || []).includes(memberFilter)) && (catFilter === "all" || e.category === catFilter)),
    [events, memberFilter, catFilter]
  );

  const dateStr = (d) => d.toISOString().slice(0, 10);

  const agendaDays = useMemo(() => {
    if (view === "week") return Array.from({ length: 7 }, (_, i) => new Date(startOfWeek(cursor).getTime() + i * DAY_MS));
    if (view === "3day") return Array.from({ length: 3 }, (_, i) => new Date(cursor.getTime() + i * DAY_MS));
    if (view === "day") return [new Date(cursor)];
    return [];
  }, [view, cursor]);

  const headerLabel = view === "month"
    ? cursor.toLocaleDateString([], { month: "long", year: "numeric" })
    : cursor.toLocaleDateString([], { weekday: view === "day" ? "long" : undefined, month: "long", day: "numeric", year: "numeric" });

  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 14px) 16px 0" }}>
        <div style={{ display: "inline-block", background: "#fff", border: `2.5px solid ${BASE.ink}`, borderRadius: 10, boxShadow: hardShadow(BASE.ink, 3, 3), padding: "6px 12px" }}>
          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18 }}>{headerLabel}</span>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {view === "month" && <MonthView cursor={cursor} events={filtered} members={members} onDayClick={(d) => { setCursor(d); setView("day"); }} onOpenEvent={setOpenEvent} />}
        {(view === "week" || view === "3day" || view === "day") && <Agenda days={agendaDays} events={filtered} members={members} onOpen={setOpenEvent} forecast={forecast} />}
      </div>

      {addOpen && <EventModal members={members} defaultDate={addOpen} onSave={(v) => { onAdd(v); setAddOpen(null); }} onClose={() => setAddOpen(null)} />}
      {openEvent && (
        <EventDetail
          event={openEvent}
          members={members}
          settings={settings}
          onClose={() => setOpenEvent(null)}
          onDelete={onDelete}
          onSyncGoogle={onSyncGoogle}
          onEdit={(e) => { setOpenEvent(null); setEditEvent(e); }}
        />
      )}
      {editEvent && (
        <EventModal
          event={editEvent}
          members={members}
          onSave={(v) => { onUpdate(editEvent.id, v); setEditEvent(null); }}
          onClose={() => setEditEvent(null)}
        />
      )}
    </div>
  );
}
