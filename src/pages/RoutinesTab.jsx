import { useMemo, useState } from "react";
import { Card } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, hardShadow, MASCOT } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

const DEFAULT_ITEM_ICON = "⭐";

const PERIODS = [
  { key: "morning", label: "Morning", icon: "sun", bg: BASE.yellow },
  { key: "evening", label: "Evening", icon: "moon", bg: BASE.lilac },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Whichever routine is tagged for this period AND includes today's weekday
// — set up on the Routines setup page (one or more days per routine).
function routineForToday(routines, period, dow) {
  return routines.find((r) => r.active && r.period === period && (r.days || []).includes(dow));
}

// A kid's per-item checkboxes for one routine, on one date — checking every
// active item pays out the flat 3-coin all-or-none reward (handled by the
// caller's onToggleRoutineItem).
function KidChecklist({ kid, items, checked, onToggle }) {
  const doneCount = items.filter((i) => checked.has(i.id)).length;
  const allDone = items.length > 0 && doneCount === items.length;
  return (
    <div style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <IconBadge icon={kid.icon} bg={kid.color} size={32} radius={10} iconColor="#fff" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>{kid.name}</div>
          <div style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t2 }}>{doneCount}/{items.length} done{allDone ? " · +3 coins!" : ""}</div>
        </div>
      </div>
      {items.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t3 }}>No items for {kid.name} in this routine yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item) => {
            const done = checked.has(item.id);
            return (
              <div key={item.id} onClick={() => onToggle(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: BASE.muted, borderRadius: 8, padding: "8px 10px", cursor: "pointer", opacity: done ? 0.55 : 1 }}>
                <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{item.icon || DEFAULT_ITEM_ICON}</span>
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
}

function RoutineBoxModal({ period, routine, kids, items, completions, date, onToggleItem, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,15,10,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16, boxSizing: "border-box" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: BASE.bg, borderRadius: 22, border: `2.5px solid ${BASE.ink}`, width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto", padding: "20px", boxShadow: hardShadow(BASE.ink, 5, 5) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IconBadge icon={period.icon} bg={period.bg} size={36} radius={10} />
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20 }}>{routine.name || period.label}</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }}><Icon name="close" size={20} /></button>
        </div>
        {kids.length === 0 ? (
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2 }}>No kids to show a checklist for.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {kids.map((k) => {
              const mine = items.filter((i) => i.routine_id === routine.id && i.member_id === k.id && i.active).sort((a, b) => a.sort_order - b.sort_order);
              const completion = completions.find((c) => c.routine_id === routine.id && c.member_id === k.id && c.date === date);
              const checked = new Set(completion?.checked_item_ids || []);
              return <KidChecklist key={k.id} kid={k} items={mine} checked={checked} onToggle={(itemId) => onToggleItem(routine.id, k.id, itemId, date)} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PeriodBox({ period, routine, kids, items, completions, date, onOpen, onSetup }) {
  const summary = useMemo(() => {
    if (!routine) return null;
    return kids.map((k) => {
      const mine = items.filter((i) => i.routine_id === routine.id && i.member_id === k.id && i.active);
      const completion = completions.find((c) => c.routine_id === routine.id && c.member_id === k.id && c.date === date);
      const checked = new Set(completion?.checked_item_ids || []);
      const allDone = mine.length > 0 && mine.every((i) => checked.has(i.id));
      return { kid: k, allDone };
    });
  }, [routine, kids, items, completions, date]);

  return (
    <Card onClick={routine ? onOpen : onSetup} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", padding: 22 }}>
      <IconBadge icon={period.icon} bg={period.bg} size={56} radius={16} />
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20 }}>{period.label}</div>
      {routine ? (
        <>
          <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2 }}>{routine.name}</div>
          {summary && summary.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {summary.map(({ kid, allDone }) => (
                <div key={kid.id} style={{ display: "flex", alignItems: "center", gap: 4, background: allDone ? BASE.green : BASE.muted, border: `1.5px solid ${BASE.ink}`, borderRadius: 999, padding: "3px 8px" }}>
                  <IconBadge icon={kid.icon} bg={kid.color} size={18} radius={6} iconColor="#fff" style={{ boxShadow: "none", border: "none" }} />
                  <span style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 800, color: allDone ? "#fff" : BASE.ink }}>{allDone ? "✓" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t3, fontStyle: "italic" }}>Not set up yet — tap to set up</div>
      )}
    </Card>
  );
}

export default function RoutinesTab({ members, routines, routineItems, routineCompletions, onToggleRoutineItem }) {
  const { navigate } = useRouter();
  const kids = useMemo(() => members.filter((m) => m.role !== "parent"), [members]);
  const [openPeriod, setOpenPeriod] = useState(null);
  const today = new Date();
  const dow = today.getDay();
  const date = todayStr();

  const goToSetup = () => navigate("/settings/routines");
  const openRoutine = openPeriod ? routineForToday(routines, openPeriod, dow) : null;
  const openPeriodDef = PERIODS.find((p) => p.key === openPeriod);

  return (
    <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 16px) 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22 }}>Routines</div>
          <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2 }}>{today.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div>
        </div>
        <button onClick={goToSetup} aria-label="Set up routines" style={{ width: 38, height: 38, borderRadius: 10, border: `2px solid ${BASE.ink}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: hardShadow(BASE.ink, 2.5, 2.5) }}>
          <Icon name="settings" size={17} />
        </button>
      </div>

      {kids.length === 0 ? (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 16px" }}>
            <img src={MASCOT.main} alt="" style={{ width: 90, height: 90, objectFit: "contain" }} />
            <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, textAlign: "center" }}>Add kids on the Family page to start setting up routines.</div>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {PERIODS.map((period) => (
            <PeriodBox
              key={period.key}
              period={period}
              routine={routineForToday(routines, period.key, dow)}
              kids={kids}
              items={routineItems}
              completions={routineCompletions}
              date={date}
              onOpen={() => setOpenPeriod(period.key)}
              onSetup={goToSetup}
            />
          ))}
        </div>
      )}

      {openRoutine && openPeriodDef && (
        <RoutineBoxModal
          period={openPeriodDef}
          routine={openRoutine}
          kids={kids}
          items={routineItems}
          completions={routineCompletions}
          date={date}
          onToggleItem={onToggleRoutineItem}
          onClose={() => setOpenPeriod(null)}
        />
      )}
    </div>
  );
}
