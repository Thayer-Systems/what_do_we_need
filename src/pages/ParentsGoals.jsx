import { useMemo, useState } from "react";
import { Card, Modal, EmptyState } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { ProgressBar } from "../components/Charts.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, hardShadow } from "../lib/theme.js";

const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };

function GoalModal({ goal, onSave, onDelete, onClose }) {
  const [text, setText] = useState(goal?.label || "");
  const [value, setValue] = useState(goal?.value ?? 0);
  const [target, setTarget] = useState(goal?.target ?? 100);
  const [unit, setUnit] = useState(goal?.unit || "");

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{goal?.id ? "Edit Goal" : "New Goal"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Goal</span><input autoFocus style={inp} value={text} onChange={(e) => setText(e.target.value)} placeholder="Run a 5k" /></div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><span style={label}>Current</span><input type="number" style={inp} value={value} onChange={(e) => setValue(e.target.value)} /></div>
          <div style={{ flex: 1 }}><span style={label}>Target</span><input type="number" style={inp} value={target} onChange={(e) => setTarget(e.target.value)} /></div>
        </div>
        <div><span style={label}>Unit (optional)</span><input style={inp} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="miles, $, sessions" /></div>
        <button
          style={{ ...btn(BASE.green), width: "100%" }}
          onClick={() => { if (!text.trim()) return; onSave({ label: text.trim(), value: Number(value) || 0, target: Number(target) || 1, unit }); }}
        >
          Save Goal
        </button>
        {goal?.id && <button style={{ ...btn(BASE.red), width: "100%" }} onClick={() => { onDelete(goal.id); onClose(); }}>Delete Goal</button>}
      </div>
    </Modal>
  );
}

function ParentColumn({ parent, goals, onAddStat, onUpdateStat, onDeleteStat }) {
  const [modal, setModal] = useState(null);
  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <IconBadge icon={parent.icon} bg={parent.color} size={40} iconColor="#fff" />
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18 }}>{parent.name}'s Goals</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setModal({})} style={btn(BASE.yellow)}><Icon name="plus" size={14} /></button>
      </div>
      {goals.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No goals yet — add one to start tracking.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {goals.map((g) => {
            const pct = g.target ? Math.round((g.value / g.target) * 100) : 0;
            return (
              <Card key={g.id} onClick={() => setModal(g)} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>{g.label}</span>
                  <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 12 }}>{g.value}{g.unit} / {g.target}{g.unit}</span>
                </div>
                <ProgressBar pct={pct} color={parent.color} />
              </Card>
            );
          })}
        </div>
      )}
      {modal && (
        <GoalModal
          goal={modal.id ? modal : null}
          onSave={(body) => { if (modal.id) onUpdateStat(modal.id, body); else onAddStat(parent.id, body); setModal(null); }}
          onDelete={onDeleteStat}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default function ParentsGoals({ members, stats, onAddStat, onUpdateStat, onDeleteStat }) {
  const parents = useMemo(() => members.filter((m) => m.role === "parent"), [members]);

  if (parents.length === 0) {
    return (
      <div>
        <EmptyState icon="star" text="No parents marked yet — mark family members as parents on the Family list to see their goals here." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 18px) 16px 40px", display: "flex", gap: 24, flexWrap: "wrap" }}>
        {parents.map((p) => (
          <ParentColumn
            key={p.id}
            parent={p}
            goals={stats.filter((s) => s.member_id === p.id)}
            onAddStat={onAddStat}
            onUpdateStat={onUpdateStat}
            onDeleteStat={onDeleteStat}
          />
        ))}
      </div>
    </div>
  );
}
