import { useMemo, useState } from "react";
import { Card, Modal, EmptyState } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { ProgressBar } from "../components/Charts.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, hardShadow } from "../lib/theme.js";
import { periodStart, effectiveGoalValue } from "../lib/goals.js";

const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };
const PERIODS = ["day", "week", "month"];

function GoalModal({ goal, onSave, onDelete, onClose }) {
  const [goalType, setGoalType] = useState(goal?.goal_type || "numeric");
  const [text, setText] = useState(goal?.label || "");
  const [value, setValue] = useState(goal?.value ?? 0);
  const [target, setTarget] = useState(goal?.target ?? (goal?.goal_type === "count" ? 5 : 100));
  const [unit, setUnit] = useState(goal?.unit || "");
  const [period, setPeriod] = useState(goal?.period || "week");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    const body = goalType === "count"
      ? { label: text.trim(), goal_type: "count", target: Number(target) || 1, unit: "", period, value: goal?.value ?? 0, period_start: goal?.period_start || periodStart(period) }
      : { label: text.trim(), goal_type: "numeric", value: Number(value) || 0, target: Number(target) || 1, unit, period: null };
    const result = await onSave(body);
    setBusy(false);
    if (result?.ok === false) setError(result.error || "Unknown error");
    else onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{goal?.id ? "Edit Goal" : "New Goal"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Goal</span><input autoFocus style={inp} value={text} onChange={(e) => setText(e.target.value)} placeholder="Workout, Run a 5k..." /></div>
        <div><span style={label}>Type</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => setGoalType("numeric")} style={btn(goalType === "numeric" ? BASE.teal : "#fff")}>Track a number</button>
            <button type="button" onClick={() => setGoalType("count")} style={btn(goalType === "count" ? BASE.teal : "#fff")}>X times per period</button>
          </div>
        </div>
        {goalType === "count" ? (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><span style={label}>Times</span><input type="number" style={inp} value={target} onChange={(e) => setTarget(e.target.value)} /></div>
            <div style={{ flex: 1 }}><span style={label}>Per</span>
              <div style={{ display: "flex", gap: 6 }}>
                {PERIODS.map((p) => <button key={p} type="button" onClick={() => setPeriod(p)} style={{ ...btn(period === p ? BASE.teal : "#fff"), padding: "9px 12px" }}>{p}</button>)}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><span style={label}>Current</span><input type="number" style={inp} value={value} onChange={(e) => setValue(e.target.value)} /></div>
              <div style={{ flex: 1 }}><span style={label}>Target</span><input type="number" style={inp} value={target} onChange={(e) => setTarget(e.target.value)} /></div>
            </div>
            <div><span style={label}>Unit (optional)</span><input style={inp} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="miles, $, sessions" /></div>
          </>
        )}
        <button disabled={busy} style={{ ...btn(BASE.green), width: "100%", opacity: busy ? 0.6 : 1 }} onClick={submit}>{busy ? "Saving..." : "Save Goal"}</button>
        {error && <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, color: BASE.red }}>Couldn't save that: {error}</div>}
        {goal?.id && <button style={{ ...btn(BASE.red), width: "100%" }} onClick={() => { onDelete(goal.id); onClose(); }}>Delete Goal</button>}
      </div>
    </Modal>
  );
}

function GoalCard({ goal, color, onEdit, onLogOne }) {
  const isCount = goal.goal_type === "count";
  const value = effectiveGoalValue(goal);
  const pct = goal.target ? Math.round((value / goal.target) * 100) : 0;

  return (
    <Card style={{ cursor: "pointer" }}>
      <div onClick={onEdit}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>{goal.label}</span>
          <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 12 }}>
            {isCount ? `${value}/${goal.target} this ${goal.period}` : `${goal.value}${goal.unit} / ${goal.target}${goal.unit}`}
          </span>
        </div>
        <ProgressBar pct={pct} color={color} />
      </div>
      {isCount && (
        <button
          onClick={(e) => { e.stopPropagation(); onLogOne(goal); }}
          style={{ ...btn(BASE.yellow), width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Icon name="plus" size={13} /> Log one
        </button>
      )}
    </Card>
  );
}

function ParentColumn({ parent, goals, onAddStat, onUpdateStat, onDeleteStat }) {
  const [modal, setModal] = useState(null);

  const onLogOne = (goal) => {
    const curStart = periodStart(goal.period);
    const stale = goal.period_start !== curStart;
    onUpdateStat(goal.id, { value: stale ? 1 : goal.value + 1, period_start: curStart });
  };

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
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} color={parent.color} onEdit={() => setModal(g)} onLogOne={onLogOne} />
          ))}
        </div>
      )}
      {modal && (
        <GoalModal
          goal={modal.id ? modal : null}
          onSave={(body) => (modal.id ? onUpdateStat(modal.id, body) : onAddStat(parent.id, body))}
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
