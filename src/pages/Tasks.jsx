import { useEffect, useState } from "react";
import { Card, Modal, Chip } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { ProgressBar } from "../components/Charts.jsx";
import { BASE, F, DAY_NAMES, hardShadow } from "../lib/theme.js";
import { choreAppliesToday } from "../lib/tasks.js";

const btn = (bg) => ({ background: bg, color: BASE.ink, border: `1px solid ${BASE.border}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });
const inp = { background: "#fff", border: `1px solid ${BASE.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
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

function AssigneeBadge({ member }) {
  if (!member) return <span style={{ fontSize: 11, fontWeight: 700, color: BASE.t3, fontFamily: F.ui }}>Unassigned</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.ui, fontSize: 11, fontWeight: 800 }}>
      <IconBadge icon={member.icon} bg={member.color} size={20} radius={7} iconColor="#fff" />
      {member.name}
    </span>
  );
}

export function ProjectModal({ project, members, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(project?.title || "");
  const [description, setDescription] = useState(project?.description || "");
  const [progress, setProgress] = useState(project?.progress ?? 0);
  const [dueDate, setDueDate] = useState(project?.due_date || "");
  const [memberId, setMemberId] = useState(project?.member_id ?? null);
  const [visibility, setVisibility] = useState(project?.visibility || "public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const status = progress >= 100 ? "done" : progress > 0 ? "in_progress" : "not_started";

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    const result = await onSave({ id: project?.id, title: title.trim(), description: description.trim() || null, progress, status, due_date: dueDate || null, member_id: memberId, visibility });
    setBusy(false);
    if (result?.ok === false) setError(result.error || "Unknown error");
    else onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{project?.id ? "Edit Project" : "New Project"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Title</span><input autoFocus style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Family trip" /></div>
        <div><span style={label}>Description</span><textarea style={{ ...inp, minHeight: 70 }} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div><span style={label}>Assigned to</span><AssigneePicker members={members} value={memberId} onChange={setMemberId} /></div>
        <div><span style={label}>Visibility</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => setVisibility("public")} style={btn(visibility === "public" ? BASE.teal : "#fff")}>Public — on Tasks tab</button>
            <button type="button" onClick={() => setVisibility("private")} style={btn(visibility === "private" ? BASE.lilac : "#fff")}>Private — profile only</button>
          </div>
        </div>
        <div><span style={label}>Due date (optional)</span><input type="date" style={inp} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        <div>
          <span style={label}>Progress — {progress}%</span>
          <input type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(Number(e.target.value))} style={{ width: "100%" }} />
          <ProgressBar pct={progress} color={STATUS_COLOR[status]} />
        </div>
        <button disabled={busy} style={{ ...btn(BASE.green), width: "100%", opacity: busy ? 0.6 : 1 }} onClick={submit}>
          {busy ? "Saving..." : "Save Project"}
        </button>
        {error && <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, color: BASE.red }}>Couldn't save that: {error}</div>}
        {project?.id && <button style={{ ...btn(BASE.red), width: "100%" }} onClick={() => { if (window.confirm(`Delete "${project.title}"?`)) { onDelete(project.id); onClose(); } }}>Delete Project</button>}
      </div>
    </Modal>
  );
}

export function ChoreModal({ chore, members, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(chore?.title || "");
  const [memberId, setMemberId] = useState(chore?.member_id ?? null);
  const [visibility, setVisibility] = useState(chore?.visibility || "public");
  // New tasks default to no timeline; a schedule (recurring days) and/or a
  // due date are both optional add-ons rather than a forced choice.
  const [scheduled, setScheduled] = useState((chore?.frequency && chore.frequency !== "none") || false);
  const [frequency, setFrequency] = useState(chore?.frequency && chore.frequency !== "none" ? chore.frequency : "daily");
  const [days, setDays] = useState(chore?.days || []);
  const [hasDueDate, setHasDueDate] = useState(!!chore?.due_date);
  const [dueDate, setDueDate] = useState(chore?.due_date || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const toggleDay = (i) => setDays((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const submit = async () => {
    if (!title.trim() || !memberId) return;
    setBusy(true);
    setError(null);
    const result = await onSave({
      id: chore?.id, title: title.trim(), member_id: memberId, visibility,
      frequency: scheduled ? frequency : "none",
      days: scheduled && frequency === "custom" ? days : [],
      due_date: hasDueDate ? dueDate || null : null,
      active: true,
    });
    setBusy(false);
    if (result?.ok === false) setError(result.error || "Unknown error");
    else onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{chore?.id ? "Edit Task" : "New Task"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Task</span><input autoFocus style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Feed the dog" /></div>
        <div><span style={label}>Assigned to</span><AssigneePicker members={members} value={memberId} onChange={setMemberId} /></div>
        <div><span style={label}>Visibility</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => setVisibility("public")} style={btn(visibility === "public" ? BASE.teal : "#fff")}>Public — on Today's board</button>
            <button type="button" onClick={() => setVisibility("private")} style={btn(visibility === "private" ? BASE.lilac : "#fff")}>Private — profile only</button>
          </div>
        </div>
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} />
            <span style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 700 }}>Set a schedule</span>
          </label>
          <div style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t3, marginTop: 2 }}>Off by default — the task just stays open with no timeline.</div>
          {scheduled && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["daily", "custom"].map((f) => <button key={f} type="button" onClick={() => setFrequency(f)} style={btn(frequency === f ? BASE.teal : "#fff")}>{f}</button>)}
              </div>
              {frequency === "custom" && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {DAY_NAMES.map((d, i) => <button key={d} type="button" onClick={() => toggleDay(i)} style={btn(days.includes(i) ? BASE.teal : "#fff")}>{d}</button>)}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={hasDueDate} onChange={(e) => setHasDueDate(e.target.checked)} />
            <span style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 700 }}>Set a due date</span>
          </label>
          {hasDueDate && <input type="date" style={{ ...inp, marginTop: 8 }} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
        </div>
        <button disabled={busy} style={{ ...btn(BASE.green), width: "100%", opacity: busy ? 0.6 : 1 }} onClick={submit}>
          {busy ? "Saving..." : "Save Task"}
        </button>
        {error && <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, color: BASE.red }}>Couldn't save that: {error}</div>}
        {chore?.id && <button style={{ ...btn(BASE.red), width: "100%" }} onClick={() => { onDelete(chore.id); onClose(); }}>Delete Task</button>}
      </div>
    </Modal>
  );
}

// "Everyone" view: instead of one flat list of everybody's items, show a
// row of square per-person boxes with a count — tapping a box filters down
// to that person's full list.
function MemberCountBoxes({ members, items, onPick }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(110px, 1fr))`, gap: 10 }}>
      {members.map((m) => {
        const count = items.filter((i) => i.member_id === m.id).length;
        return (
          <div
            key={m.id}
            onClick={() => onPick(m.id)}
            style={{ background: m.color, border: `1px solid ${BASE.border}`, borderRadius: 12, boxShadow: hardShadow(BASE.ink, 3, 3), color: "#fff", cursor: "pointer", aspectRatio: "1 / 1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 10 }}
          >
            <IconBadge icon={m.icon} bg="#fff" size={30} radius={9} />
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22 }}>{count}</span>
            <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 11 }}>{m.name}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Tasks({ members, chores, completions, projects, onAddChore, onUpdateChore, onDeleteChore, onToggleChore, onAddProject, onUpdateProject, onDeleteProject }) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [choreModal, setChoreModal] = useState(null);
  const [projectModal, setProjectModal] = useState(null);
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  // The Today page's combined Tasks & Projects box jumps here and fires
  // this to pop the add menu straight open, instead of landing on the page
  // and leaving the "+" button to be discovered.
  useEffect(() => {
    const openIt = () => setAddMenuOpen(true);
    window.addEventListener("sprinkles-open-add-menu", openIt);
    return () => window.removeEventListener("sprinkles-open-add-menu", openIt);
  }, []);

  const memberById = (id) => members.find((m) => m.id === id);
  const todayStr = new Date().toISOString().slice(0, 10);

  const visibleChores = chores.filter((c) => assigneeFilter === "all" || c.member_id === assigneeFilter);
  const visibleProjects = projects.filter((p) => (p.visibility || "public") === "public" && (assigneeFilter === "all" || p.member_id === assigneeFilter));

  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 14px) 16px 0", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ position: "relative" }}>
          <button onClick={() => setAddMenuOpen((o) => !o)} style={btn(BASE.pink)}><Icon name="plus" size={15} /></button>
          {addMenuOpen && (
            <div style={{ position: "absolute", right: 0, top: 44, background: "#fff", border: `1px solid ${BASE.border}`, borderRadius: 12, boxShadow: hardShadow(BASE.ink, 3, 3), overflow: "hidden", zIndex: 30, minWidth: 160 }}>
              <button onClick={() => { setChoreModal({}); setAddMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "#fff", border: "none", cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>+ Task</button>
              <button onClick={() => { setProjectModal({}); setAddMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "#fff", border: "none", borderTop: `1px solid ${BASE.border}`, cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>+ Project</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "12px 16px 0", display: "flex", gap: 6, overflowX: "auto" }}>
        <Chip active={assigneeFilter === "all"} onClick={() => setAssigneeFilter("all")}>Everyone</Chip>
        {members.map((m) => (
          <Chip key={m.id} active={assigneeFilter === m.id} onClick={() => setAssigneeFilter(m.id)} color={m.color}>{m.name}</Chip>
        ))}
      </div>

      <div style={{ padding: "16px 16px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Tasks</div>
          {chores.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No tasks yet.</div>
          ) : assigneeFilter === "all" ? (
            <MemberCountBoxes members={members} items={chores} onPick={setAssigneeFilter} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleChores.map((c) => {
                const applicable = c.active && choreAppliesToday(c);
                const done = completions.some((cm) => cm.chore_id === c.id && cm.date === todayStr);
                const timeline = c.frequency === "daily" ? "Every day"
                  : c.frequency === "custom" ? ((c.days || []).map((d) => DAY_NAMES[d]).join(", ") || "Custom")
                  : "No timeline";
                return (
                  <Card key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleChore && onToggleChore(c); }}
                      title={done ? "Completed" : "Mark complete"}
                      style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${BASE.border}`, background: done ? BASE.green : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}
                    >
                      {done && <Icon name="check" size={15} color="#fff" />}
                    </button>
                    <div onClick={() => setChoreModal(c)} style={{ flex: 1, cursor: "pointer", minWidth: 0 }}>
                      <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>{c.title}</div>
                      <div style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t2, marginTop: 2 }}>
                        {timeline}{applicable ? (done ? " · done today" : " · due today") : ""}
                        {c.due_date ? ` · due ${new Date(c.due_date + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}` : ""}
                        {(c.visibility || "public") === "private" ? " · private" : ""}
                      </div>
                    </div>
                    <AssigneeBadge member={memberById(c.member_id)} />
                    <button
                      onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${c.title}"?`)) onDeleteChore(c.id); }}
                      title="Delete task"
                      style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${BASE.border}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Projects</div>
          {projects.filter((p) => (p.visibility || "public") === "public").length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No projects yet — add one to track family trips, house projects, and more.</div>
          ) : assigneeFilter === "all" ? (
            <MemberCountBoxes members={members} items={projects.filter((p) => (p.visibility || "public") === "public")} onPick={setAssigneeFilter} />
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
          onSave={(v) => (v.id ? onUpdateChore(v.id, v) : onAddChore(v))}
          onDelete={onDeleteChore}
          onClose={() => setChoreModal(null)}
        />
      )}
      {projectModal && (
        <ProjectModal
          project={projectModal.id ? projectModal : null}
          members={members}
          onSave={(v) => (v.id ? onUpdateProject(v.id, v) : onAddProject(v))}
          onDelete={onDeleteProject}
          onClose={() => setProjectModal(null)}
        />
      )}
    </div>
  );
}
