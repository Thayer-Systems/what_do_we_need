import { useRef, useState } from "react";
import { BASE, F, MASCOT, hardShadow, SPRINKLE_BG_STYLE, CATEGORY_COLORS } from "../lib/theme.js";
import { IconBadge } from "./Deco.jsx";
import { Icon } from "./Icons.jsx";
import { useRouter } from "../lib/router.jsx";
import { isToolsUnlocked } from "../lib/pin.js";
import { Chip } from "./ui.jsx";
import { useCalendarFilters } from "../lib/calendarFilters.jsx";

// Kids Coins and Parents Goals used to be their own top-level tabs — they're
// now reached through the "Tasks" dropdown below instead (see
// TASKS_SUBPAGES), alongside the household chores/projects page that used
// to be the only thing "Tasks" meant.
export const TABS = [
  ["/routines", "clock", "Routines", BASE.lilac],
  ["/", "home", "Today", BASE.yellow],
  ["/calendar", "calendar", "Calendar", BASE.teal],
  ["/food", "meals", "Food", BASE.lilac],
  ["/tasks", "check", "Tasks", BASE.green],
  ["/settings", "settings", "Tools", "#cfd8e3"],
];

// Each entry's own `match` decides its highlight — plain path.startsWith()
// isn't precise enough here since "/goals/kids" is a prefix of both
// "/goals/kids/chores" and "/goals/kids/trends/:id", which need to light up
// Kids Chores and Kids Coins respectively, not both at once.
const TASKS_SUBPAGES = [
  ["/tasks", "check", "Household", BASE.green, (p) => p === "/tasks"],
  ["/goals/kids", "star", "Kids Coins", BASE.pink, (p) => p === "/goals/kids" || p.startsWith("/goals/kids/trends")],
  ["/goals/kids/chores", "check", "Kids Chores", BASE.teal, (p) => p === "/goals/kids/chores"],
  ["/goals/parents", "users", "Parents", BASE.orange, (p) => p.startsWith("/goals/parents")],
];

const CATEGORIES = ["event", "appointment", "activity", "meal", "chore", "work", "other"];

// Renders via position:fixed (anchored from the button's own bounding
// rect) rather than position:absolute — the nav bar scrolls horizontally
// (overflow-x:auto), which per the CSS spec also clips overflow-y, so an
// absolutely-positioned dropdown inside it was getting cut off instead of
// showing.
function CalendarFilterControl({ members }) {
  const filters = useCalendarFilters();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  if (!filters) return null;
  const { memberFilter, setMemberFilter, catFilter, setCatFilter } = filters;
  const activeCount = (memberFilter !== "all" ? 1 : 0) + (catFilter !== "all" ? 1 : 0);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen((o) => !o);
  };

  return (
    <div style={{ flexShrink: 0 }}>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12,
          border: `1px solid ${BASE.border}`, background: activeCount ? BASE.yellow : "#fff", cursor: "pointer",
          fontFamily: F.ui, fontWeight: 800, fontSize: 12,
        }}
      >
        <Icon name="filter" size={14} /> Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>
      {open && pos && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "fixed", top: pos.top, right: pos.right, background: "#fff", border: `1px solid ${BASE.border}`,
              borderRadius: 14, boxShadow: hardShadow(BASE.ink, 3, 3), zIndex: 50, padding: 12, width: 280, maxWidth: "calc(100vw - 16px)",
            }}
          >
            <div style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", marginBottom: 6 }}>Who</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <Chip active={memberFilter === "all"} onClick={() => setMemberFilter("all")}>Everyone</Chip>
              {members.map((m) => (
                <Chip key={m.id} active={memberFilter === m.id} onClick={() => setMemberFilter(m.id)} color={m.color}>{m.name}</Chip>
              ))}
            </div>
            <div style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", marginBottom: 6 }}>Type</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Chip active={catFilter === "all"} onClick={() => setCatFilter("all")}>All types</Chip>
              {CATEGORIES.map((c) => <Chip key={c} active={catFilter === c} onClick={() => setCatFilter(c)} color={CATEGORY_COLORS[c]}>{c}</Chip>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const CAL_VIEWS = [["day", "Day"], ["3day", "3 day"], ["week", "Week"], ["month", "Month"]];

// The calendar's own view switcher + prev/today/next/add controls, tucked
// behind a hamburger button in the top nav (next to Filters) instead of a
// toolbar row above the calendar grid.
function CalendarNavControl() {
  const filters = useCalendarFilters();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  if (!filters) return null;
  const { view, setView, cursor, setCursor, requestAddEvent } = filters;

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen((o) => !o);
  };

  const shift = (dir) => {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else if (view === "3day") d.setDate(d.getDate() + dir * 3);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  };

  return (
    <div style={{ flexShrink: 0 }}>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12,
          border: `1px solid ${BASE.border}`, background: "#fff", cursor: "pointer",
          fontFamily: F.ui, fontWeight: 800, fontSize: 12, marginLeft: 6,
        }}
      >
        <Icon name="menu" size={14} /> Calendar
      </button>
      {open && pos && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "fixed", top: pos.top, right: pos.right, background: "#fff", border: `1px solid ${BASE.border}`,
              borderRadius: 14, boxShadow: hardShadow(BASE.ink, 3, 3), zIndex: 50, padding: 12, width: 240, maxWidth: "calc(100vw - 16px)",
            }}
          >
            <div style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", marginBottom: 6 }}>View</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {CAL_VIEWS.map(([v, lbl]) => (
                <button key={v} onClick={() => setView(v)} style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${BASE.border}`, background: view === v ? BASE.teal : "#fff", cursor: "pointer", fontFamily: F.ui, fontWeight: 800, fontSize: 12 }}>{lbl}</button>
              ))}
            </div>
            <div style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", marginBottom: 6 }}>Move</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => shift(-1)} style={{ padding: "7px 10px", borderRadius: 999, border: `1px solid ${BASE.border}`, background: "#fff", cursor: "pointer" }}><Icon name="chevronLeft" size={15} /></button>
              <button onClick={() => setCursor(new Date())} style={{ flex: 1, padding: "7px 10px", borderRadius: 999, border: `1px solid ${BASE.border}`, background: BASE.yellow, cursor: "pointer", fontFamily: F.ui, fontWeight: 800, fontSize: 12 }}>Today</button>
              <button onClick={() => shift(1)} style={{ padding: "7px 10px", borderRadius: 999, border: `1px solid ${BASE.border}`, background: "#fff", cursor: "pointer" }}><Icon name="chevronRight" size={15} /></button>
              <button onClick={() => { requestAddEvent(); setOpen(false); }} style={{ padding: "7px 10px", borderRadius: 999, border: `1px solid ${BASE.border}`, background: BASE.pink, cursor: "pointer" }}><Icon name="plus" size={15} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// The "Tasks" tab is a dropdown of three subpages instead of a plain link —
// same fixed-position dropdown pattern as the Calendar controls above (the
// nav bar scrolls horizontally, which clips an absolutely-positioned
// dropdown, so this anchors from the button's own bounding rect instead).
function TasksNavControl({ active }) {
  const { path, navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left });
    }
    setOpen((o) => !o);
  };

  return (
    <div style={{ flexShrink: 0 }}>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 12,
          border: active ? `1px solid ${BASE.border}` : "2.5px solid transparent",
          background: active ? BASE.green : "transparent",
          boxShadow: active ? hardShadow(BASE.ink, 2.5, 2.5) : "none",
          cursor: "pointer", fontFamily: F.ui, fontWeight: active ? 800 : 600, fontSize: 13,
          color: BASE.ink, whiteSpace: "nowrap",
        }}
      >
        <IconBadge icon="check" bg={active ? "#fff" : BASE.green} size={24} radius={8} style={{ boxShadow: "none" }} />
        Tasks
        <Icon name="chevronDown" size={12} />
      </button>
      {open && pos && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "fixed", top: pos.top, left: pos.left, background: "#fff", border: `1px solid ${BASE.border}`,
              borderRadius: 14, boxShadow: hardShadow(BASE.ink, 3, 3), zIndex: 50, padding: 8, minWidth: 190,
            }}
          >
            {TASKS_SUBPAGES.map(([p, icon, label, color, match]) => {
              const isActive = match(path);
              return (
                <button
                  key={p}
                  onClick={() => { navigate(p); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                    padding: "8px 10px", background: isActive ? color : "transparent", border: "none",
                    borderRadius: 8, cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 13, color: BASE.ink,
                  }}
                >
                  <IconBadge icon={icon} bg={color} size={22} radius={7} style={{ boxShadow: "none" }} /> {label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Mr. Sprinkles gets his own fixed box in the bottom-right corner on every
// page, including Today.
function MascotCorner() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("sprinkles-open-assistant"))}
      style={{
        position: "fixed", right: 14, bottom: 14, zIndex: 60,
        width: 76, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        background: "#fff", border: `1px solid ${BASE.border}`, borderRadius: 14,
        boxShadow: hardShadow(BASE.ink, 3, 3), padding: "8px 6px 6px", cursor: "pointer",
      }}
      aria-label="Ask Mr. Sprinkles"
    >
      <img src={MASCOT.main} alt="" style={{ width: 44, height: 44, objectFit: "contain", pointerEvents: "none" }} />
      <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 9, textAlign: "center", lineHeight: 1.15 }}>Mr. Sprinkles</span>
    </button>
  );
}

export default function Shell({ children, members = [] }) {
  const { path, navigate } = useRouter();
  const active = (p) => (p === "/" ? path === "/" : path.startsWith(p));
  const toolsLocked = !isToolsUnlocked();
  const onCalendar = path === "/calendar";

  return (
    <div style={{ minHeight: "100vh", background: BASE.bg, ...SPRINKLE_BG_STYLE, fontFamily: F.ui, color: BASE.ink, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "calc(env(safe-area-inset-top, 0px) + 8px) 10px 8px",
          background: BASE.surface,
          borderBottom: `1px solid ${BASE.border}`,
          position: "sticky",
          top: 0,
          zIndex: 30,
          overflowX: "auto",
        }}
      >
        {TABS.map(([p, icon, label, color]) =>
          p === "/tasks" ? (
            <TasksNavControl key={p} active={active("/tasks") || active("/goals/kids") || active("/goals/parents")} />
          ) : (
          <button
            key={p}
            onClick={() => navigate(p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 12,
              border: active(p) ? `1px solid ${BASE.border}` : "2.5px solid transparent",
              background: active(p) ? color : "transparent",
              boxShadow: active(p) ? hardShadow(BASE.ink, 2.5, 2.5) : "none",
              cursor: "pointer",
              fontFamily: F.ui,
              fontWeight: active(p) ? 800 : 600,
              fontSize: 13,
              color: BASE.ink,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <IconBadge icon={icon} bg={active(p) ? "#fff" : color} size={24} radius={8} style={{ boxShadow: "none" }} />
            {label}
            {p === "/settings" && toolsLocked && <Icon name="pin" size={12} style={{ opacity: 0.6 }} />}
          </button>
          )
        )}
        <div style={{ flex: 1 }} />
        {onCalendar && <CalendarFilterControl members={members} />}
        {onCalendar && <CalendarNavControl />}
        <button
          onClick={() => window.dispatchEvent(new Event("sprinkles-open-assistant"))}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12, border: "none", background: BASE.pink, cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 12, flexShrink: 0, marginLeft: 6, color: BASE.ink }}
        >
          <Icon name="sparkle" size={14} /> Ask Mr. Sprinkles
        </button>
      </div>

      <div style={{ flex: 1, minWidth: 0, width: "100%", maxWidth: 1400, margin: "0 auto" }}>
        {children}
      </div>

      <MascotCorner />
    </div>
  );
}
