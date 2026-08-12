import { useState } from "react";
import { PageHeader, Card, Modal } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { ProgressBar } from "../components/Charts.jsx";
import { BASE, F, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };
const STATUS_COLOR = { not_started: BASE.muted, in_progress: BASE.yellow, done: BASE.green };
const STATUS_LABEL = { not_started: "Not started", in_progress: "In progress", done: "Done" };

function ProjectModal({ project, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(project?.title || "");
  const [description, setDescription] = useState(project?.description || "");
  const [progress, setProgress] = useState(project?.progress ?? 0);
  const [dueDate, setDueDate] = useState(project?.due_date || "");
  const status = progress >= 100 ? "done" : progress > 0 ? "in_progress" : "not_started";

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{project?.id ? "Edit Project" : "New Project"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Title</span><input autoFocus style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Family trip" /></div>
        <div><span style={label}>Description</span><textarea style={{ ...inp, minHeight: 70 }} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
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
            onSave({ id: project?.id, title: title.trim(), description: description.trim() || null, progress, status, due_date: dueDate || null });
          }}
        >
          Save Project
        </button>
        {project?.id && <button style={{ ...btn(BASE.red), width: "100%" }} onClick={() => { onDelete(project.id); onClose(); }}>Delete Project</button>}
      </div>
    </Modal>
  );
}

export default function Projects({ projects, onAdd, onUpdate, onDelete }) {
  const { navigate } = useRouter();
  const [modal, setModal] = useState(null);

  return (
    <div>
      <PageHeader
        title="Projects"
        sprinkles="settings"
        back={() => navigate("/settings/household")}
        right={<button onClick={() => setModal({})} style={btn(BASE.pink)}><Icon name="plus" size={15} /></button>}
      />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
        {projects.length === 0 && <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No projects yet — add one to track family trips, house projects, and more.</div>}
        {projects.map((p) => (
          <Card key={p.id} onClick={() => setModal(p)} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>{p.title}</span>
              <IconBadge icon="grid" bg={STATUS_COLOR[p.status] || BASE.muted} size={28} radius={8} />
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
      {modal && (
        <ProjectModal
          project={modal.id ? modal : null}
          onSave={(v) => { if (v.id) onUpdate(v.id, v); else onAdd(v); setModal(null); }}
          onDelete={onDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
