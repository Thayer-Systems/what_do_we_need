import { useMemo, useState } from "react";
import { PageHeader, Card, Modal, Chip, EmptyState } from "../components/ui.jsx";
import { BASE, F, CATEGORY_COLORS, hardShadow } from "../lib/theme.js";
import { downloadICS } from "../lib/ics.js";

const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };
const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });

const CATEGORIES = ["event", "appointment", "activity", "meal", "chore", "other"];
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

function EventPill({ e, members, onOpen }) {
  return (
    <div
      onClick={() => onOpen(e)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 8,
        background: CATEGORY_COLORS[e.category] || BASE.pink,
        border: `1.5px solid ${BASE.ink}`,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: F.ui,
      }}
    >
      {new Date(e.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} {e.title}
    </div>
  );
}

function EventDetail({ event, members, settings, onClose, onDelete }) {
  const attendees = (event.member_ids || []).map((id) => members.find((m) => m.id === id)?.name).filter(Boolean);
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{event.title}</div>
      <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, marginBottom: 14 }}>
        {new Date(event.start_at).toLocaleString([], { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: F.ui, fontSize: 14, marginBottom: 18 }}>
        {event.location && <div>📍 {event.location}</div>}
        {event.travel_minutes != null && <div>🚗 {event.travel_minutes} min travel time</div>}
        {attendees.length > 0 && <div>👤 {attendees.join(", ")}</div>}
        {event.notes && <div>📝 {event.notes}</div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btn(BASE.teal)} onClick={() => downloadICS(event, settings?.attendee_emails || [])}>Add to Calendar</button>
        <button style={btn(BASE.red)} onClick={() => { onDelete(event.id); onClose(); }}>Delete</button>
      </div>
    </Modal>
  );
}

function AddEventModal({ members, defaultDate, onSave, onClose }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("event");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("17:00");
  const [location, setLocation] = useState("");
  const [travel, setTravel] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [notes, setNotes] = useState("");

  const toggleMember = (id) => setMemberIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const [travelLookup, setTravelLookup] = useState("idle");

  const lookupTravel = async () => {
    if (!location.trim()) return;
    setTravelLookup("loading");
    try {
      const r = await fetch(`/api/travel-time?destination=${encodeURIComponent(location.trim())}`);
      const d = await r.json();
      if (d.available) {
        setTravel(String(d.minutes));
        setTravelLookup("done");
      } else {
        setTravelLookup("unavailable");
      }
    } catch (e) {
      setTravelLookup("unavailable");
    }
  };

  const save = () => {
    if (!title.trim() || !date) return;
    onSave({
      title: title.trim(),
      category,
      start_at: new Date(`${date}T${time}:00`).toISOString(),
      location: location.trim() || null,
      travel_minutes: travel ? Number(travel) : null,
      member_ids: memberIds,
      notes: notes.trim() || null,
      source: "manual",
    });
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>New Event</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Title</span><input autoFocus style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Piper's dance recital" /></div>
        <div><span style={label}>Category</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)} style={btn(category === c ? CATEGORY_COLORS[c] : "#fff")}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><span style={label}>Date</span><input type="date" style={inp} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div style={{ flex: 1 }}><span style={label}>Time</span><input type="time" style={inp} value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
        <div>
          <span style={label}>Location</span>
          <input style={inp} value={location} onChange={(e) => setLocation(e.target.value)} onBlur={lookupTravel} placeholder="Address or place" />
        </div>
        <div>
          <span style={label}>Travel time (minutes)</span>
          <input type="number" style={inp} value={travel} onChange={(e) => setTravel(e.target.value)} placeholder="Auto-filled from Google Maps" />
          <div style={{ fontSize: 11, color: BASE.t2, fontFamily: F.ui, marginTop: 4 }}>
            {travelLookup === "loading" && "Looking up drive time…"}
            {travelLookup === "done" && "✓ Auto-filled from Google Maps — edit if needed"}
            {travelLookup === "unavailable" && "Couldn't look it up — enter manually"}
          </div>
        </div>
        <div><span style={label}>Who</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {members.map((m) => (
              <button key={m.id} onClick={() => toggleMember(m.id)} style={btn(memberIds.includes(m.id) ? m.color : "#fff")}>{m.avatar_emoji} {m.name}</button>
            ))}
          </div>
        </div>
        <div><span style={label}>Notes</span><input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <button onClick={save} style={{ ...btn(BASE.green), width: "100%", marginTop: 4 }}>Save Event</button>
      </div>
    </Modal>
  );
}

export default function CalendarPage({ members, events, settings, onAdd, onDelete }) {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(new Date());
  const [memberFilter, setMemberFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(null);
  const [openEvent, setOpenEvent] = useState(null);

  const filtered = useMemo(
    () =>
      events.filter(
        (e) => (memberFilter === "all" || (e.member_ids || []).includes(memberFilter)) && (catFilter === "all" || e.category === catFilter)
      ),
    [events, memberFilter, catFilter]
  );

  const shift = (dir) => {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  };

  const dateStr = (d) => d.toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Calendar"
        right={<button onClick={() => setAddOpen(dateStr(cursor))} style={btn(BASE.pink)}>+ Event</button>}
      />
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["month", "week", "day"].map((v) => (
            <Chip key={v} active={view === v} onClick={() => setView(v)} color={BASE.teal}>{v}</Chip>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => shift(-1)} style={btn("#fff")}>←</button>
          <button onClick={() => setCursor(new Date())} style={btn(BASE.yellow)}>Today</button>
          <button onClick={() => shift(1)} style={btn("#fff")}>→</button>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10 }}>
          <Chip active={memberFilter === "all"} onClick={() => setMemberFilter("all")}>Everyone</Chip>
          {members.map((m) => (
            <Chip key={m.id} active={memberFilter === m.id} onClick={() => setMemberFilter(m.id)} color={m.color}>{m.avatar_emoji} {m.name}</Chip>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 14 }}>
          <Chip active={catFilter === "all"} onClick={() => setCatFilter("all")}>All types</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={catFilter === c} onClick={() => setCatFilter(c)} color={CATEGORY_COLORS[c]}>{c}</Chip>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 16px 32px" }}>
        {view === "month" && <MonthView cursor={cursor} events={filtered} members={members} onDayClick={(d) => { setCursor(d); setView("day"); }} onOpen={setOpenEvent} />}
        {view === "week" && <WeekView cursor={cursor} events={filtered} members={members} onOpen={setOpenEvent} onAdd={(d) => setAddOpen(dateStr(d))} />}
        {view === "day" && <DayView cursor={cursor} events={filtered} members={members} onOpen={setOpenEvent} />}
      </div>

      {addOpen && <AddEventModal members={members} defaultDate={addOpen} onSave={(v) => { onAdd(v); setAddOpen(null); }} onClose={() => setAddOpen(null)} />}
      {openEvent && <EventDetail event={openEvent} members={members} settings={settings} onClose={() => setOpenEvent(null)} onDelete={onDelete} />}
    </div>
  );
}

function MonthView({ cursor, events, members, onDayClick, onOpen }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getTime() + i * DAY_MS));
  const today = new Date();

  return (
    <div>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, marginBottom: 10 }}>
        {cursor.toLocaleDateString([], { month: "long", year: "numeric" })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {days.map((d) => {
          const dayEvents = events.filter((e) => sameDay(new Date(e.start_at), d));
          const inMonth = d.getMonth() === cursor.getMonth();
          return (
            <div
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              style={{
                border: `2px solid ${BASE.ink}`,
                borderRadius: 10,
                minHeight: 62,
                padding: 5,
                background: sameDay(d, today) ? BASE.yellow : inMonth ? "#fff" : BASE.muted,
                opacity: inMonth ? 1 : 0.5,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: F.ui }}>{d.getDate()}</div>
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginTop: 3 }}>
                {dayEvents.slice(0, 4).map((e) => (
                  <div key={e.id} style={{ width: 6, height: 6, borderRadius: "50%", background: CATEGORY_COLORS[e.category] || BASE.pink, border: `1px solid ${BASE.ink}` }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ cursor, events, members, onOpen, onAdd }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {days.map((d) => {
        const dayEvents = events.filter((e) => sameDay(new Date(e.start_at), d)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
        return (
          <Card key={d.toISOString()} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 13 }}>{d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
              <button onClick={() => onAdd(d)} style={{ ...btn(BASE.yellow), padding: "4px 10px", fontSize: 11 }}>+</button>
            </div>
            {dayEvents.length === 0 ? (
              <div style={{ fontSize: 12, color: BASE.t3, fontFamily: F.ui }}>Nothing scheduled</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {dayEvents.map((e) => <EventPill key={e.id} e={e} members={members} onOpen={onOpen} />)}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function DayView({ cursor, events, members, onOpen }) {
  const dayEvents = events.filter((e) => sameDay(new Date(e.start_at), cursor)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  return (
    <div>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
        {cursor.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
      </div>
      {dayEvents.length === 0 ? (
        <EmptyState icon="🌤️" text="Nothing scheduled this day" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {dayEvents.map((e) => (
            <Card key={e.id} onClick={() => onOpen(e)} style={{ cursor: "pointer", display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: CATEGORY_COLORS[e.category] || BASE.pink, border: `1.5px solid ${BASE.ink}` }} />
              <div>
                <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>{e.title}</div>
                <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2 }}>
                  {new Date(e.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{e.location ? ` · ${e.location}` : ""}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
