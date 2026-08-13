import { useState } from "react";
import { PageHeader, Card, Modal, Chip } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { ProgressBar } from "../components/Charts.jsx";
import { BASE, F, DAY_NAMES, hardShadow } from "../lib/theme.js";
import { isChoreDue, isChoreDone, choreScheduleLabel } from "../lib/chores.js";

const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };
const STATUS_COLOR = { not_started: BASE.muted, in_progress: BASE.yellow, done: BASE.green };
const STATUS_LABEL = { not_started: "Not started", in_progress: "In progress", done: "Done" };

function AssigneePicker({ members, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button type="button" onClick={() => onChange(null)} style={btn(value == null ? BASE.muted : "#fff")}>Unassigned</button>
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          style={{ ...btn(value === m.id ? m.color : "#fff"), color: value === m.id ? "#fff" : BASE.ink, display: "flex", alignItems: "center", gap: 6 }}
        >
          <Icon name={m.icon} size={13} color={value === m.id ? "#fff" : BASE.ink} /> {m.name}
        </button>
      ))}
    </div>
  );
}

function CompleteCheckbox({ done, onToggle }) {
  return (
    <button
      type="button"
      aria-label={done ? "Mark task not done" : "Mark task done"}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      style={{
        width: 28, height: 28, borderRadius: 8, border: `2.5px solid ${BASE.ink}`, flexShrink: 0, padding: 0,
        background: done ? BASE.green : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      }}
    >
      {done && <Icon name="check" size={16} color="#fff" />}
    </button>
  );
}

function AssigneeBadge({ member }) {
  if (!member) return <span style={{ fontSize: 11, fontWeight: 700, color: BASE.t3, fontFamily: F.ui }}>Unassigned</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.ui, fontSize: 11, fontWeight: 800 }}>
      <IconBadge icon={member.icon} bg={member.color} size={20} radius={7} iconColor="#fff" />
      {member.name}
    </span>
  );
}

function ProjectModal({ project, members, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(project?.title || "");
  const [description, setDescription] = useState(project?.description || "");
  const [progress, setProgress] = useState(project?.progress ?? 0);
  const [dueDate, setDueDate] = useState(project?.due_date || "");
  const [memberId, setMemberId] = useState(project?.member_id ?? null);
  const status = progress >= 100 ? "done" : progress > 0 ? "in_progress" : "not_started";

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{project?.id ? "Edit Project" : "New Project"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Title</span><input autoFocus style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Family trip" /></div>
        <div><span style={label}>Description</span><textarea style={{ ...inp, minHeight: 70 }} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div><span style={label}>Assigned to</span><AssigneePicker members={members} value={memberId} onChange={setMemberId} /></div>
        <div><span style={label}>Due date (optional)</span><input type="date" style={inp} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        <div>
          <span style={label}>Progress — {progress}%</span>
          <input type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(Number(e.target.value))} style={{ width: "100%" }} />
          <ProgressBar pct={progress} color={STATUS_COLOR[status]} />
        </div>
        <button
          style={{ ...btn(BASE.green), width: "100%" }}
          onClick={() => {
            if (!title.trim()) return;
            onSave({ id: project?.id, title: title.trim(), description: description.trim() || null, progress, status, due_date: dueDate || null, member_id: memberId });
          }}
        >
          Save Project
        </button>
        {project?.id && <button style={{ ...btn(BASE.red), width: "100%" }} onClick={() => { onDelete(project.id); onClose(); }}>Delete Project</button>}
      </div>
    </Modal>
  );
}

function ChoreModal({ chore, members, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(chore?.title || "");
  const [memberId, setMemberId] = useState(chore?.member_id ?? null);
  const [frequency, setFrequency] = useState(chore?.frequency || "once");
  const [days, setDays] = useState(chore?.days || []);
  const toggleDay = (i) => setDays((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{chore?.id ? "Edit Task" : "New Recurring Task"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Task</span><input autoFocus style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Feed the dog" /></div>
        <div><span style={label}>Assigned to</span><AssigneePicker members={members} value={memberId} onChange={setMemberId} /></div>
        <div><span style={label}>Frequency</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["once", "daily", "custom"].map((f) => <button key={f} type="button" onClick={() => setFrequency(f)} style={btn(frequency === f ? BASE.teal : "#fff")}>{f === "once" ? "one-time" : f}</button>)}
          </div>
        </div>
        {frequency === "custom" && (
          <div><span style={label}>Days</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DAY_NAMES.map((d, i) => <button key={d} type="button" onClick={() => toggleDay(i)} style={btn(days.includes(i) ? BASE.teal : "#fff")}>{d}</button>)}
            </div>
          </div>
        )}
        <button
          style={{ ...btn(BASE.green), width: "100%" }}
          onClick={() => {
            if (!title.trim() || !memberId) return;
            onSave({ id: chore?.id, title: title.trim(), member_id: memberId, frequency, days, active: true });
          }}
        >
          Save Task
        </button>
        {chore?.id && <button style={{ ...btn(BASE.red), width: "100%" }} onClick={() => { onDelete(chore.id); onClose(); }}>Delete Task</button>}
      </div>
    </Modal>
  );
}

export default function Tasks({ members, chores, completions, projects, onAddChore, onUpdateChore, onDeleteChore, onToggleChore, onAddProject, onUpdateProject, onDeleteProject }) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [choreModal, setChoreModal] = useState(null);
  const [projectModal, setProjectModal] = useState(null);
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const memberById = (id) => members.find((m) => m.id === id);
  const todayStr = new Date().toISOString().slice(0, 10);
  const dow = new Date().getDay();

  const visibleChores = chores.filter((c) => assigneeFilter === "all" || c.member_id === assigneeFilter);
  const visibleProjects = projects.filter((p) => assigneeFilter === "all" || p.member_id === assigneeFilter);

  return (
    <div>
      <PageHeader
        title="Tasks"
        sprinkles="settings"
        right={
          <div style={{ position: "relative" }}>
            <button onClick={() => setAddMenuOpen((o) => !o)} style={btn(BASE.pink)}><Icon name="plus" size={15} /></button>
            {addMenuOpen && (
              <div style={{ position: "absolute", right: 0, top: 44, background: "#fff", border: `2.5px solid ${BASE.ink}`, borderRadius: 12, boxShadow: hardShadow(BASE.ink, 3, 3), overflow: "hidden", zIndex: 30, minWidth: 160 }}>
                <button onClick={() => { setChoreModal({}); setAddMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "#fff", border: "none", cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>+ Recurring Task</button>
                <button onClick={() => { setProjectModal({}); setAddMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "#fff", border: "none", borderTop: `1.5px solid ${BASE.muted}`, cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>+ Project</button>
              </div>
            )}
          </div>
        }
      />

      <div style={{ padding: "12px 16px 0", display: "flex", gap: 6, overflowX: "auto" }}>
        <Chip active={assigneeFilter === "all"} onClick={() => setAssigneeFilter("all")}>Everyone</Chip>
        {members.map((m) => (
          <Chip key={m.id} active={assigneeFilter === m.id} onClick={() => setAssigneeFilter(m.id)} color={m.color}>{m.name}</Chip>
        ))}
      </div>

      <div style={{ padding: "16px 16px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Tasks</div>
          {visibleChores.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No tasks yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleChores.map((c) => {
                const applicable = isChoreDue(c, dow);
                const done = isChoreDone(c, completions, todayStr);
                const scheduleLabel = c.frequency === "custom" ? (c.days || []).map((d) => DAY_NAMES[d]).join(", ") || "Custom" : choreScheduleLabel(c);
                return (
                  <Card key={c.id} onClick={() => setChoreModal(c)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <CompleteCheckbox done={done} onToggle={() => onToggleChore(c)} />
                      <div>
                        <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14, textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>{c.title}</div>
                        <div style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t2, marginTop: 2 }}>{scheduleLabel}{c.frequency !== "once" && applicable ? (done ? " · done today" : " · due today") : ""}</div>
                      </div>
                    </div>
                    <AssigneeBadge member={memberById(c.member_id)} />
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Projects</div>
          {visibleProjects.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No projects yet — add one to track family trips, house projects, and more.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visibleProjects.map((p) => (
                <Card key={p.id} onClick={() => setProjectModal(p)} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>{p.title}</span>
                    <AssigneeBadge member={memberById(p.member_id)} />
                  </div>
                  {p.description && <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, marginBottom: 8 }}>{p.description}</div>}
                  <ProgressBar pct={p.progress} color={STATUS_COLOR[p.status] || BASE.yellow} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: F.ui, fontSize: 11, fontWeight: 700, color: BASE.t2 }}>
                    <span>{STATUS_LABEL[p.status] || p.status}</span>
                    {p.due_date && <span>Due {new Date(p.due_date + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {choreModal && (
        <ChoreModal
          chore={choreModal.id ? choreModal : null}
          members={members}
          onSave={(v) => { if (v.id) onUpdateChore(v.id, v); else onAddChore(v); setChoreModal(null); }}
          onDelete={onDeleteChore}
          onClose={() => setChoreModal(null)}
        />
      )}
      {projectModal && (
        <ProjectModal
          project={projectModal.id ? projectModal : null}
          members={members}
          onSave={(v) => { if (v.id) onUpdateProject(v.id, v); else onAddProject(v); setProjectModal(null); }}
          onDelete={onDeleteProject}
          onClose={() => setProjectModal(null)}
        />
      )}
    </div>
  );
}
