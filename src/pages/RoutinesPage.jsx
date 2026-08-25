import { useState } from "react";
import { PageHeader, Card, Modal } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, DAY_NAMES, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };

const PERIODS = [
  { key: "morning", label: "Morning", icon: "sun", defaultStart: "06:00", defaultEnd: "09:00" },
  { key: "evening", label: "Evening", icon: "moon", defaultStart: "17:00", defaultEnd: "20:00" },
];

const ROUTINE_ITEM_ICONS = [
  "🪥", "🚿", "🧼", "🧴", "🚽", "👕", "🧦", "👟", "🎒", "🍽️",
  "🍳", "🚗", "🥣", "🛏️", "📚", "🧸", "💊", "🧹", "🐶", "☀️", "🌙", "⭐",
];
const DEFAULT_ITEM_ICON = "⭐";

// A routine's "name" is just a friendly label now (period + days drive the
// actual matching) — defaults to something sensible so it's optional to type.
function RoutineModal({ routine, onSave, onDelete, onClose }) {
  const [name, setName] = useState(routine?.name || "");
  const [period, setPeriod] = useState(routine?.period || "morning");
  const [days, setDays] = useState(routine?.days || [1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const toggleDay = (i) => setDays((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const submit = async () => {
    if (!days.length) return;
    const def = PERIODS.find((p) => p.key === period);
    setBusy(true);
    setError(null);
    const result = await onSave({
      id: routine?.id,
      name: name.trim() || `${DAY_NAMES.filter((_, i) => days.includes(i)).join("/")} ${def.label}`,
      period, days,
      start_time: def.defaultStart, end_time: def.defaultEnd,
      active: true,
    });
    setBusy(false);
    if (result?.ok === false) setError(result.error || "Unknown error");
    else onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{routine?.id ? "Edit Routine" : "New Routine"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Period</span>
          <div style={{ display: "flex", gap: 6 }}>
            {PERIODS.map((p) => (
              <button key={p.key} type="button" onClick={() => setPeriod(p.key)} style={{ ...btn(period === p.key ? BASE.yellow : "#fff"), display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center" }}>
                <Icon name={p.icon} size={14} /> {p.label}
              </button>
            ))}
          </div>
        </div>
        <div><span style={label}>Days (pick one or more)</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DAY_NAMES.map((d, i) => <button key={d} type="button" onClick={() => toggleDay(i)} style={btn(days.includes(i) ? BASE.teal : "#fff")}>{d}</button>)}
          </div>
        </div>
        <div><span style={label}>Name (optional)</span><input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekday Morning" /></div>
        <button disabled={busy || !days.length} style={{ ...btn(BASE.green), width: "100%", opacity: busy || !days.length ? 0.6 : 1 }} onClick={submit}>{busy ? "Saving..." : "Save Routine"}</button>
        {error && <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, color: BASE.red }}>Couldn't save that: {error}</div>}
        {routine?.id && <button style={{ ...btn(BASE.red), width: "100%" }} onClick={() => { if (window.confirm(`Delete "${routine.name}"? Its checklist items go too.`)) { onDelete(routine.id); onClose(); } }}>Delete Routine</button>}
      </div>
    </Modal>
  );
}

function RoutineItemModal({ members, routineId, nextSortOrder, onSave, onClose }) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? null);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState(DEFAULT_ITEM_ICON);
  const submit = () => {
    if (!title.trim() || !memberId) return;
    onSave({ member_id: memberId, routine_id: routineId, title: title.trim(), icon, active: true, sort_order: nextSortOrder });
    onClose();
  };
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>Add Checklist Item</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Kid</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {members.map((m) => (
              <button key={m.id} onClick={() => setMemberId(m.id)} style={{ ...btn(memberId === m.id ? m.color : "#fff"), color: memberId === m.id ? "#fff" : BASE.ink, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name={m.icon} size={13} color={memberId === m.id ? "#fff" : BASE.ink} /> {m.name}
              </button>
            ))}
          </div>
        </div>
        <div><span style={label}>Item</span><input autoFocus style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brush teeth" /></div>
        <div>
          <span style={label}>Picture</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ROUTINE_ITEM_ICONS.map((e) => (
              <button key={e} type="button" onClick={() => setIcon(e)} style={{ width: 40, height: 40, fontSize: 20, borderRadius: 10, border: `2px solid ${BASE.ink}`, background: icon === e ? BASE.yellow : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <button style={{ ...btn(BASE.green), width: "100%" }} onClick={submit}>Add Item</button>
      </div>
    </Modal>
  );
}

const CONTENT_TOGGLES = [
  ["show_weather", "Weather"],
  ["show_routines", "Kids' morning routines"],
  ["show_schedule", "Today's schedule"],
  ["show_coins", "Kids' coin balances"],
];

// The TV auto-display window config used to live at Settings > Display
// Schedule on its own — folded in here instead, since it's the only other
// piece of "how routines behave" configuration in the app.
function TvDisplaySection({ schedule, onUpdateSchedule }) {
  const [days, setDays] = useState(schedule?.days || [1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState(schedule?.start_time || "06:45");
  const [endTime, setEndTime] = useState(schedule?.end_time || "08:30");
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);
  const [toggles, setToggles] = useState({
    show_weather: schedule?.show_weather ?? true,
    show_routines: schedule?.show_routines ?? true,
    show_schedule: schedule?.show_schedule ?? false,
    show_coins: schedule?.show_coins ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const toggleDay = (i) => setDays((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    const result = await onUpdateSchedule({ days, start_time: startTime, end_time: endTime, enabled, ...toggles });
    setBusy(false);
    if (result?.ok === false) setError(result.error || "Unknown error");
    else setSaved(true);
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>TV Auto-Display</div>
        <button onClick={() => setEnabled((e) => !e)} style={btn(enabled ? BASE.green : "#fff")}>{enabled ? "Enabled" : "Disabled"}</button>
      </div>
      <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2, marginBottom: 12 }}>On a TV/kiosk device, the School Day screen becomes the main display during this window.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <span style={label}>Days</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DAY_NAMES.map((d, i) => <button key={d} type="button" onClick={() => toggleDay(i)} style={btn(days.includes(i) ? BASE.teal : "#fff")}>{d}</button>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><span style={label}>Start time</span><input type="time" style={inp} value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div style={{ flex: 1 }}><span style={label}>End time</span><input type="time" style={inp} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
        </div>
        <div>
          <span style={label}>What to show</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CONTENT_TOGGLES.map(([key, lbl]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={toggles[key]} onChange={(e) => setToggles((p) => ({ ...p, [key]: e.target.checked }))} />
                <span style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 700 }}>{lbl}</span>
              </label>
            ))}
          </div>
        </div>
        <button disabled={busy} style={{ ...btn(BASE.green), opacity: busy ? 0.6 : 1 }} onClick={save}>{busy ? "Saving..." : "Save"}</button>
        {saved && !error && <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, color: BASE.green }}>Saved.</div>}
        {error && <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, color: BASE.red }}>Couldn't save that: {error}</div>}
      </div>
    </Card>
  );
}

export default function RoutinesPage({ members, routines, routineItems, onAdd, onUpdateRoutine, onUpdateRoutineItem, onDelete, schedule, onUpdateSchedule }) {
  const { navigate } = useRouter();
  const kids = members.filter((m) => m.role !== "parent");
  const [routineModal, setRoutineModal] = useState(null);
  const [itemModal, setItemModal] = useState(null);
  const sorted = [...routines].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const saveRoutine = async (v) => {
    const { id, ...ch } = v;
    if (id) return onUpdateRoutine(id, ch);
    const result = await onAdd("sprinkles_routines", { ...ch, sort_order: routines.length });
    return result?.ok === false ? result : { ok: true };
  };

  return (
    <div>
      <PageHeader title="Routines Setup" sprinkles="settings" back={() => navigate("/routines")} />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2 }}>Set up which days each Morning/Evening routine covers, and each kid's checklist.</div>
          <button onClick={() => setRoutineModal({})} style={{ ...btn(BASE.pink), flexShrink: 0 }}><Icon name="plus" size={15} /></button>
        </div>

        {sorted.length === 0 ? (
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No routines set up yet — add one to get started.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sorted.map((r) => {
              const items = routineItems.filter((i) => i.routine_id === r.id).sort((a, b) => a.sort_order - b.sort_order);
              const period = PERIODS.find((p) => p.key === r.period) || PERIODS[0];
              const moveItem = (index, dir) => {
                const target = index + dir;
                if (target < 0 || target >= items.length) return;
                const reordered = [...items];
                [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
                reordered.forEach((item, i) => {
                  if (item.sort_order !== i) onUpdateRoutineItem(item.id, { sort_order: i });
                });
              };
              return (
                <Card key={r.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <IconBadge icon={period.icon} bg={BASE.yellow} size={32} radius={10} />
                      <div>
                        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>{r.name}</div>
                        <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2, marginTop: 2 }}>
                          {period.label} · {(r.days || []).map((d) => DAY_NAMES[d]).join(", ") || "No days set"}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setItemModal(r.id)} style={{ ...btn("#fff"), padding: "6px 10px" }}><Icon name="plus" size={13} /></button>
                      <button onClick={() => setRoutineModal(r)} style={{ ...btn(BASE.yellow), padding: "6px 10px" }}><Icon name="edit" size={13} /></button>
                    </div>
                  </div>
                  {items.length === 0 ? (
                    <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t3 }}>No checklist items yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {items.map((i, index) => {
                        const kid = kids.find((k) => k.id === i.member_id);
                        return (
                          <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, background: BASE.muted, borderRadius: 8, padding: "6px 10px" }}>
                            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{i.icon || DEFAULT_ITEM_ICON}</span>
                            <IconBadge icon={kid?.icon || "donut"} bg={kid?.color || BASE.yellow} size={20} radius={6} iconColor="#fff" />
                            <span style={{ flex: 1, fontFamily: F.ui, fontWeight: 700, fontSize: 12 }}>{i.title}</span>
                            <button onClick={() => moveItem(index, -1)} disabled={index === 0} style={{ border: "none", background: "transparent", cursor: index === 0 ? "default" : "pointer", display: "flex", opacity: index === 0 ? 0.25 : 1, padding: 2 }}><Icon name="chevronDown" size={13} style={{ transform: "rotate(180deg)" }} /></button>
                            <button onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} style={{ border: "none", background: "transparent", cursor: index === items.length - 1 ? "default" : "pointer", display: "flex", opacity: index === items.length - 1 ? 0.25 : 1, padding: 2 }}><Icon name="chevronDown" size={13} /></button>
                            <button onClick={() => onDelete("sprinkles_morning_routine_items", i.id)} style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex" }}><Icon name="close" size={12} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <TvDisplaySection schedule={schedule} onUpdateSchedule={onUpdateSchedule} />
      </div>

      {routineModal && (
        <RoutineModal
          routine={routineModal.id ? routineModal : null}
          onSave={saveRoutine}
          onDelete={(id) => onDelete("sprinkles_routines", id)}
          onClose={() => setRoutineModal(null)}
        />
      )}
      {itemModal && (
        <RoutineItemModal
          members={kids}
          routineId={itemModal}
          nextSortOrder={routineItems.filter((i) => i.routine_id === itemModal).length}
          onSave={(v) => onAdd("sprinkles_morning_routine_items", v)}
          onClose={() => setItemModal(null)}
        />
      )}
    </div>
  );
}
