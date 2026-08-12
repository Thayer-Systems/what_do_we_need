import { useState } from "react";
import { PageHeader, Card, Modal } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { BarChart, ProgressBar, StatCard } from "../components/Charts.jsx";
import { Icon, MEMBER_ICONS } from "../components/Icons.jsx";
import { BASE, F, THEMES, themeFor, DAY_NAMES, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

const btn = (bg = BASE.pink) => ({
  background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 16px",
  fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3),
});
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 8, display: "block" };

function Section({ title, children, onAdd }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={label}>{title}</span>
        {onAdd && <button onClick={onAdd} style={btn(BASE.yellow)}>+ Add</button>}
      </div>
      {children}
    </Card>
  );
}

function Row({ children, onDelete }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", background: BASE.muted, borderRadius: 10, border: `1.5px solid ${BASE.ink}` }}>
      <div style={{ fontFamily: F.ui, fontSize: 13, flex: 1 }}>{children}</div>
      <button onClick={onDelete} style={{ border: `1.5px solid ${BASE.ink}`, background: "#fff", borderRadius: 8, width: 24, height: 24, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}

function SimpleAddModal({ title, fields, onSave, onClose }) {
  const [vals, setVals] = useState(Object.fromEntries(fields.map((f) => [f.key, f.default ?? ""])));
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {fields.map((f) => (
          <div key={f.key}>
            <span style={label}>{f.label}</span>
            {f.type === "select" ? (
              <select style={inp} value={vals[f.key]} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "days" ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAY_NAMES.map((d, i) => {
                  const activeDay = (vals[f.key] || []).includes(i);
                  return (
                    <button key={d} type="button" onClick={() => setVals((v) => ({ ...v, [f.key]: activeDay ? v[f.key].filter((x) => x !== i) : [...(v[f.key] || []), i] }))} style={{ ...btn(activeDay ? BASE.teal : "#fff"), padding: "6px 10px" }}>
                      {d}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input style={inp} type={f.type || "text"} value={vals[f.key]} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder} autoFocus={f.autoFocus} />
            )}
          </div>
        ))}
        <button onClick={() => onSave(vals)} style={{ ...btn(BASE.green), width: "100%", marginTop: 6 }}>Save</button>
      </div>
    </Modal>
  );
}

function PrefField({ label: lbl, values, onChange }) {
  const [text, setText] = useState((values || []).join(", "));
  return (
    <div>
      <span style={label}>{lbl}</span>
      <input style={inp} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onChange(text.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="comma, separated, list" />
    </div>
  );
}

function StatRow({ stat, color, onEdit, onTogglePause, onDelete }) {
  const pct = stat.target ? Math.round((stat.value / stat.target) * 100) : 0;
  return (
    <div style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: 12, opacity: stat.paused ? 0.55 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>{stat.label}{stat.paused ? " (paused)" : ""}</span>
        <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 12 }}>{stat.value}{stat.unit} / {stat.target}{stat.unit}</span>
      </div>
      <ProgressBar pct={pct} color={color} />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={onEdit} style={{ ...btn("#fff"), padding: "4px 10px", fontSize: 11 }}>Edit</button>
        <button onClick={onTogglePause} style={{ ...btn(BASE.yellow), padding: "4px 10px", fontSize: 11 }}>{stat.paused ? "Resume" : "Pause"}</button>
        <button onClick={onDelete} style={{ ...btn(BASE.red), padding: "4px 10px", fontSize: 11 }}>Delete</button>
      </div>
    </div>
  );
}

export default function FamilyMember({
  member, contacts, activities, medications, foodPrefs, links, chores, completions, stats,
  onUpdateMember, onAdd, onDelete, onUpdateFoodPrefs, onAddStat, onUpdateStat, onDeleteStat,
}) {
  const { navigate } = useRouter();
  const [modal, setModal] = useState(null);
  const [statModal, setStatModal] = useState(null);

  if (!member) return null;
  const theme = themeFor(member);

  const mContacts = contacts.filter((c) => c.member_id === member.id);
  const mActivities = activities.filter((a) => a.member_id === member.id);
  const mMeds = medications.filter((m) => m.member_id === member.id);
  const mLinks = links.filter((l) => l.member_id === member.id);
  const mChores = chores.filter((c) => c.member_id === member.id);
  const mStats = stats.filter((s) => s.member_id === member.id);
  const mFood = foodPrefs.find((f) => f.member_id === member.id) || { likes: [], dislikes: [], allergies: [] };

  // last 7 days chore completion %
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dow = d.getDay();
    const dateStr = d.toISOString().slice(0, 10);
    const applicable = mChores.filter((c) => c.active && (c.frequency === "daily" || (c.days || []).includes(dow)));
    const done = completions.filter((c) => c.date === dateStr && applicable.some((a) => a.id === c.chore_id)).length;
    return { label: DAY_NAMES[dow][0], value: applicable.length ? Math.round((done / applicable.length) * 100) : 0 };
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const dow = new Date().getDay();
  const todaysChores = mChores.filter((c) => c.active && (c.frequency === "daily" || (c.days || []).includes(dow)));
  const doneToday = completions.filter((c) => c.date === todayStr && todaysChores.some((t) => t.id === c.chore_id)).length;
  const weekAvg = Math.round(chartData.reduce((s, d) => s + d.value, 0) / 7);

  return (
    <div>
      <PageHeader title={member.name} back={() => navigate("/settings/family")} />

      <div style={{ background: theme.bg, padding: "20px 16px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Card bg={member.color} style={{ display: "flex", alignItems: "center", gap: 14, color: "#fff" }}>
          <IconBadge icon={member.icon} bg="#fff" size={64} radius={18} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 24 }}>{member.name}</div>
            <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>{theme.label}</div>
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <StatCard label="Chores today" value={`${doneToday}/${todaysChores.length}`} color={BASE.yellow} />
          <StatCard label="7-day avg" value={`${weekAvg}%`} color={BASE.teal} />
          <StatCard label="Active goals" value={mStats.filter((s) => !s.paused).length} color={BASE.pink} />
        </div>

        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Chore completion — last 7 days</div>
          <BarChart data={chartData} color={member.color} />
        </Card>

        <Section title="Goals & Counters" onAdd={() => setStatModal({})}>
          {mStats.length === 0 && <div style={{ fontSize: 13, color: BASE.t3, fontFamily: F.ui }}>No goals yet — add a counter to track anything (reading minutes, screen time, savings, etc).</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mStats.map((s) => (
              <StatRow
                key={s.id}
                stat={s}
                color={member.color}
                onEdit={() => setStatModal(s)}
                onTogglePause={() => onUpdateStat(s.id, { paused: !s.paused })}
                onDelete={() => onDeleteStat(s.id)}
              />
            ))}
          </div>
        </Section>

        {member.role === "kid" && (
          <Section title="Theme">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(THEMES).filter(([k]) => k !== "default").map(([key, t]) => (
                <button key={key} onClick={() => onUpdateMember(member.id, { theme: key })} style={btn(member.theme === key ? t.primary : "#fff")}>
                  {t.label}
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section title="Birthday">
          <input type="date" style={inp} value={member.birthday || ""} onChange={(e) => onUpdateMember(member.id, { birthday: e.target.value })} />
          <div style={{ fontSize: 12, color: BASE.t2, fontFamily: F.ui }}>Mr. Sprinkles will wish {member.name} a happy birthday on the home screen that day.</div>
        </Section>

        <Section title="Chores" onAdd={() => setModal({ type: "chore" })}>
          {mChores.length === 0 && <div style={{ fontSize: 13, color: BASE.t3, fontFamily: F.ui }}>No chores yet.</div>}
          {mChores.map((c) => (
            <Row key={c.id} onDelete={() => onDelete("sprinkles_chores", c.id)}>
              <b>{c.title}</b> · {c.frequency === "daily" ? "every day" : (c.days || []).map((d) => DAY_NAMES[d]).join(", ") || "custom"}
            </Row>
          ))}
        </Section>

        <Section title="Activities & Schedule" onAdd={() => setModal({ type: "activity" })}>
          {mActivities.length === 0 && <div style={{ fontSize: 13, color: BASE.t3, fontFamily: F.ui }}>No recurring activities yet. Adding one syncs it to the calendar automatically.</div>}
          {mActivities.map((a) => (
            <Row key={a.id} onDelete={() => onDelete("sprinkles_activities", a.id)}>
              <b>{a.name}</b> · {(a.days || []).map((d) => DAY_NAMES[d]).join(", ")} {a.start_time ? `· ${a.start_time.slice(0, 5)}` : ""} {a.location ? `· ${a.location}` : ""}
            </Row>
          ))}
        </Section>

        <Section title="Medications" onAdd={() => setModal({ type: "medication" })}>
          {mMeds.length === 0 && <div style={{ fontSize: 13, color: BASE.t3, fontFamily: F.ui }}>None on file.</div>}
          {mMeds.map((m) => (
            <Row key={m.id} onDelete={() => onDelete("sprinkles_medications", m.id)}>
              <b>{m.name}</b> {m.dosage ? `· ${m.dosage}` : ""} {m.schedule ? `· ${m.schedule}` : ""}
            </Row>
          ))}
        </Section>

        <Section title="Food Preferences">
          <PrefField label="Likes" values={mFood.likes} onChange={(v) => onUpdateFoodPrefs(member.id, { ...mFood, likes: v })} />
          <PrefField label="Dislikes" values={mFood.dislikes} onChange={(v) => onUpdateFoodPrefs(member.id, { ...mFood, dislikes: v })} />
          <PrefField label="Allergies" values={mFood.allergies} onChange={(v) => onUpdateFoodPrefs(member.id, { ...mFood, allergies: v })} />
        </Section>

        <Section title="Contacts" onAdd={() => setModal({ type: "contact" })}>
          {mContacts.length === 0 && <div style={{ fontSize: 13, color: BASE.t3, fontFamily: F.ui }}>No contacts yet (doctors, teachers, etc).</div>}
          {mContacts.map((c) => (
            <Row key={c.id} onDelete={() => onDelete("sprinkles_contacts", c.id)}>
              <b>{c.label}</b>{c.name ? ` — ${c.name}` : ""}{c.phone ? ` · ${c.phone}` : ""}
            </Row>
          ))}
        </Section>

        <Section title="Links" onAdd={() => setModal({ type: "link" })}>
          {mLinks.length === 0 && <div style={{ fontSize: 13, color: BASE.t3, fontFamily: F.ui }}>No saved links yet (school login, doctor portal, etc).</div>}
          {mLinks.map((l) => (
            <Row key={l.id} onDelete={() => onDelete("sprinkles_links", l.id)}>
              <a href={l.url} target="_blank" rel="noreferrer" style={{ color: BASE.ink, fontWeight: 700 }}>{l.label}</a>
            </Row>
          ))}
        </Section>
      </div>

      {modal?.type === "contact" && (
        <SimpleAddModal title="Add Contact" fields={[
          { key: "label", label: "Label (e.g. Pediatrician)", placeholder: "Pediatrician", autoFocus: true },
          { key: "name", label: "Name", placeholder: "Dr. Smith" },
          { key: "phone", label: "Phone", placeholder: "(555) 555-5555" },
          { key: "notes", label: "Notes" },
        ]} onSave={(v) => { onAdd("sprinkles_contacts", { member_id: member.id, ...v }); setModal(null); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === "activity" && (
        <SimpleAddModal title="Add Activity" fields={[
          { key: "name", label: "Activity", placeholder: "Dance class", autoFocus: true },
          { key: "days", label: "Days", type: "days", default: [] },
          { key: "start_time", label: "Start time", type: "time" },
          { key: "end_time", label: "End time", type: "time" },
          { key: "location", label: "Location", placeholder: "Studio address" },
        ]} onSave={(v) => { onAdd("sprinkles_activities", { member_id: member.id, active: true, ...v }); setModal(null); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === "medication" && (
        <SimpleAddModal title="Add Medication" fields={[
          { key: "name", label: "Name", placeholder: "Allergy medicine", autoFocus: true },
          { key: "dosage", label: "Dosage", placeholder: "5mg" },
          { key: "schedule", label: "Schedule", placeholder: "Every morning" },
          { key: "notes", label: "Notes" },
        ]} onSave={(v) => { onAdd("sprinkles_medications", { member_id: member.id, ...v }); setModal(null); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === "link" && (
        <SimpleAddModal title="Add Link" fields={[
          { key: "label", label: "Label", placeholder: "School portal", autoFocus: true },
          { key: "url", label: "URL", placeholder: "https://..." },
        ]} onSave={(v) => { onAdd("sprinkles_links", { member_id: member.id, ...v }); setModal(null); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === "chore" && (
        <SimpleAddModal title="Add Chore" fields={[
          { key: "title", label: "Chore", placeholder: "Feed the dog", autoFocus: true },
          { key: "frequency", label: "Frequency", type: "select", options: ["daily", "custom"], default: "daily" },
          { key: "days", label: "Days (if custom)", type: "days", default: [] },
        ]} onSave={(v) => { onAdd("sprinkles_chores", { member_id: member.id, active: true, ...v }); setModal(null); }} onClose={() => setModal(null)} />
      )}
      {statModal && (
        <SimpleAddModal
          title={statModal.id ? "Edit Goal" : "Add Goal"}
          fields={[
            { key: "label", label: "Label", placeholder: "Reading minutes", autoFocus: true, default: statModal.label },
            { key: "value", label: "Current value", type: "number", default: statModal.value ?? 0 },
            { key: "target", label: "Target", type: "number", default: statModal.target ?? 100 },
            { key: "unit", label: "Unit (optional)", placeholder: "min, $, pts", default: statModal.unit || "" },
          ]}
          onSave={(v) => {
            const body = { label: v.label, value: Number(v.value), target: Number(v.target) || 1, unit: v.unit };
            if (statModal.id) onUpdateStat(statModal.id, body);
            else onAddStat(member.id, body);
            setStatModal(null);
          }}
          onClose={() => setStatModal(null)}
        />
      )}
    </div>
  );
}
