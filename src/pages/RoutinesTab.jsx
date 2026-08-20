import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Card } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, DAY_NAMES, hardShadow, MASCOT } from "../lib/theme.js";
import { speak } from "../lib/tts.js";

// Minutes-remaining thresholds a live routine calls out loud at, checked
// on the same 15s tick that drives the countdown display.
const ANNOUNCE_THRESHOLDS = [15, 10, 5, 2];

const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };

// A curated picture set for routine items — plain emoji rather than new
// image assets, so young kids who can't read yet get a recognizable
// picture next to each task without adding files to the repo.
const ROUTINE_ITEM_ICONS = [
  "🪥", "🚿", "🧼", "🧴", "🚽", "👕", "🧦", "👟", "🎒", "🍽️",
  "🍳", "🚗", "🥣", "🛏️", "📚", "🧸", "💊", "🧹", "🐶", "☀️", "🌙", "⭐",
];
const DEFAULT_ITEM_ICON = "⭐";

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
function fmtCountdown(ms) {
  if (ms <= 0) return "now";
  const totalMin = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// A routine is "live" right now if today's weekday is in its days and the
// clock (local device time) is between start_time and end_time.
function routineIsLive(routine, now) {
  if (!routine.active) return false;
  if (!(routine.days || []).includes(now.getDay())) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = (routine.start_time || "00:00").split(":").map(Number);
  const [eh, em] = (routine.end_time || "23:59").split(":").map(Number);
  return mins >= sh * 60 + sm && mins < eh * 60 + em;
}

function endMomentFor(routine, now) {
  const [eh, em] = (routine.end_time || "23:59").split(":").map(Number);
  const end = new Date(now);
  end.setHours(eh, em, 0, 0);
  return end;
}

function RoutineModal({ routine, onSave, onDelete, onClose }) {
  const [name, setName] = useState(routine?.name || "");
  const [days, setDays] = useState(routine?.days || [1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState(routine?.start_time?.slice(0, 5) || "06:45");
  const [endTime, setEndTime] = useState(routine?.end_time?.slice(0, 5) || "08:30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const toggleDay = (i) => setDays((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const result = await onSave({ id: routine?.id, name: name.trim(), days, start_time: startTime, end_time: endTime, active: true });
    setBusy(false);
    if (result?.ok === false) setError(result.error || "Unknown error");
    else onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{routine?.id ? "Edit Routine" : "New Routine"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Name</span><input autoFocus style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekday Morning" /></div>
        <div><span style={label}>Days</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DAY_NAMES.map((d, i) => <button key={d} type="button" onClick={() => toggleDay(i)} style={btn(days.includes(i) ? BASE.teal : "#fff")}>{d}</button>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><span style={label}>Start time</span><input type="time" style={inp} value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div style={{ flex: 1 }}><span style={label}>End time</span><input type="time" style={inp} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
        </div>
        <button disabled={busy} style={{ ...btn(BASE.green), width: "100%", opacity: busy ? 0.6 : 1 }} onClick={submit}>{busy ? "Saving..." : "Save Routine"}</button>
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

// Bouncing Mr. Sprinkles for whenever the clock isn't inside any
// configured routine window — there's no dedicated "jumping" mascot asset,
// so the standard mascot art gets a CSS bounce instead.
function IdleMascot() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 16px" }}>
      <img src={MASCOT.main} alt="" style={{ width: 120, height: 120, objectFit: "contain", animation: "sprinkles-jump 1.1s ease-in-out infinite" }} />
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, textAlign: "center" }}>No routine going on right now</div>
      <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, textAlign: "center" }}>Set up a routine below and it'll show up here when it's time.</div>
      <style>{`
        @keyframes sprinkles-jump {
          0%, 100% { transform: translateY(0) scaleY(1); }
          20% { transform: translateY(0) scaleY(0.92); }
          45% { transform: translateY(-28px) scaleY(1.05); }
          70% { transform: translateY(0) scaleY(0.96); }
          85% { transform: translateY(-6px) scaleY(1.02); }
        }
      `}</style>
    </div>
  );
}

function LiveRoutineCard({ routine, members, items, now, checked, onToggle }) {
  const end = endMomentFor(routine, now);
  const msLeft = end - now;
  return (
    <div style={{ background: BASE.yellow, border: `2.5px solid ${BASE.ink}`, borderRadius: 14, boxShadow: hardShadow(BASE.ink, 4, 4), padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 800, color: BASE.t2, textTransform: "uppercase" }}>Happening now</div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22 }}>{routine.name}</div>
        </div>
        <div style={{ background: BASE.ink, color: "#fff", borderRadius: 999, padding: "8px 16px", fontFamily: F.ui, fontWeight: 800, fontSize: 13 }}>
          {fmtCountdown(msLeft)} left · ends {fmtTime(routine.end_time?.slice(0, 5))}
        </div>
      </div>
      {members.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2 }}>No kids to show a checklist for.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {members.map((k) => {
            const mine = items.filter((i) => i.member_id === k.id && i.active).sort((a, b) => a.sort_order - b.sort_order);
            const doneCount = mine.filter((i) => checked.has(i.id)).length;
            return (
              <div key={k.id} style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IconBadge icon={k.icon} bg={k.color} size={32} radius={10} iconColor="#fff" />
                  <div>
                    <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>{k.name}</div>
                    <div style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t2 }}>{doneCount}/{mine.length} done</div>
                  </div>
                </div>
                {mine.length === 0 ? (
                  <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t3 }}>No items for {k.name} in this routine.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {mine.map((item) => {
                      const done = checked.has(item.id);
                      return (
                        <div key={item.id} onClick={() => onToggle(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: BASE.muted, borderRadius: 8, padding: "8px 10px", cursor: "pointer", opacity: done ? 0.55 : 1 }}>
                          <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{item.icon || DEFAULT_ITEM_ICON}</span>
                          <span style={{ flex: 1, fontFamily: F.ui, fontWeight: 700, fontSize: 14, textDecoration: done ? "line-through" : "none" }}>{item.title}</span>
                          <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${BASE.ink}`, background: done ? BASE.green : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {done && <Icon name="check" size={13} color="#fff" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RoutinesTab({ members, routines, routineItems, onAdd, onUpdateRoutine, onUpdateRoutineItem, onDelete }) {
  const kids = useMemo(() => members.filter((m) => m.role !== "parent"), [members]);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  const [checked, setChecked] = useState(new Set());
  const onToggle = (id) => setChecked((p) => {
    const next = new Set(p);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const [routineModal, setRoutineModal] = useState(null);
  const [itemModal, setItemModal] = useState(null);

  const liveRoutine = routines.find((r) => routineIsLive(r, now));
  const sorted = [...routines].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  // Voice callouts as a live routine's end time approaches. Tracked per
  // activation (keyed by routine id) so switching routines, or the same
  // routine coming back tomorrow, gets a fresh set of announcements.
  const announcedRef = useRef({ routineId: null, minutes: new Set() });
  useEffect(() => {
    if (!liveRoutine) {
      announcedRef.current = { routineId: null, minutes: new Set() };
      return;
    }
    if (announcedRef.current.routineId !== liveRoutine.id) {
      announcedRef.current = { routineId: liveRoutine.id, minutes: new Set() };
    }
    const msLeft = endMomentFor(liveRoutine, now) - now;
    const minutesLeft = Math.ceil(msLeft / 60000);
    for (const threshold of ANNOUNCE_THRESHOLDS) {
      if (minutesLeft <= threshold && !announcedRef.current.minutes.has(threshold)) {
        announcedRef.current.minutes.add(threshold);
        speak(`${liveRoutine.name} ends in ${threshold} minute${threshold === 1 ? "" : "s"}.`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRoutine?.id, now]);

  const updateRoutine = async (v) => {
    const { id, ...ch } = v;
    if (id) return onUpdateRoutine(id, ch);
    const result = await onAdd("sprinkles_routines", { ...ch, sort_order: routines.length });
    return result?.ok === false ? result : { ok: true };
  };

  return (
    <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 16px) 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22 }}>Routines</div>
        <button onClick={() => setRoutineModal({})} style={btn(BASE.pink)}><Icon name="plus" size={15} /> Routine</button>
      </div>

      {liveRoutine ? (
        <LiveRoutineCard routine={liveRoutine} members={kids} items={routineItems} now={now} checked={checked} onToggle={onToggle} />
      ) : (
        <Card><IdleMascot /></Card>
      )}

      <div style={{ marginTop: 22, fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>All Routines</div>
      {sorted.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No routines set up yet — add one to get started.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sorted.map((r) => {
            const items = routineItems.filter((i) => i.routine_id === r.id).sort((a, b) => a.sort_order - b.sort_order);
            const isLive = liveRoutine?.id === r.id;
            // Reassigns every item's sort_order to its new index rather than
            // just swapping the two values — existing rows can share the
            // same sort_order (e.g. everything defaulted to 0 before this
            // existed), so a plain swap between equal values would look
            // like nothing happened.
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
              <Card key={r.id} style={isLive ? { borderColor: BASE.ink, boxShadow: hardShadow(BASE.yellow, 4, 4) } : {}}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>{r.name}{isLive ? " · live now" : ""}</div>
                    <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2, marginTop: 2 }}>
                      {(r.days || []).map((d) => DAY_NAMES[d]).join(", ") || "No days set"} · {fmtTime(r.start_time?.slice(0, 5))}–{fmtTime(r.end_time?.slice(0, 5))}
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

      {routineModal && (
        <RoutineModal
          routine={routineModal.id ? routineModal : null}
          onSave={updateRoutine}
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
