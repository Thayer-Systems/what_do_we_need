import { useState } from "react";
import { PageHeader, Card, EmptyState } from "../components/ui.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, MASCOT, hardShadow } from "../lib/theme.js";

const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: "11px 14px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "10px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });

function AssistantBox({ onSend }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const result = await onSend(text.trim());
    setLastResult(result);
    setText("");
    setBusy(false);
  };

  return (
    <Card bg={BASE.lilac} style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <img src={MASCOT.pointing} alt="" style={{ width: 46, height: 46, objectFit: "contain", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Tell Mr. Sprinkles what you need</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={inp}
              placeholder='e.g. "need milk" or "Piper has dance Tuesdays at 5pm"'
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <button onClick={submit} disabled={busy} style={{ ...btn(BASE.yellow), opacity: busy ? 0.6 : 1, flexShrink: 0 }}>{busy ? "..." : "Send"}</button>
          </div>
          {lastResult && <div style={{ marginTop: 8, fontSize: 12, fontFamily: F.ui, fontWeight: 700 }}>{lastResult}</div>}
        </div>
      </div>
    </Card>
  );
}

function WalmartExport({ shopping }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = shopping.map((s) => s.name).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // clipboard API unavailable — fall back to a visible prompt
      window.prompt("Copy this list:", text);
    }
  };
  if (shopping.length === 0) return null;
  return (
    <button onClick={copy} style={{ ...btn(copied ? BASE.green : "#fff"), width: "100%", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Icon name="cart" size={15} /> {copied ? "Copied!" : "Copy list for Walmart+"}
    </button>
  );
}

export default function Grocery({ shopping, onAssistantSend, onAdd, onRemove }) {
  const [name, setName] = useState("");
  return (
    <div>
      <PageHeader title="Grocery" sprinkles="grocery" />
      <div style={{ padding: "18px 16px 32px" }}>
        <AssistantBox onSend={onAssistantSend} />

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input style={inp} placeholder="Add item..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { onAdd(name.trim()); setName(""); } }} />
          <button style={btn(BASE.pink)} onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(""); } }}>+ Add</button>
        </div>

        <WalmartExport shopping={shopping} />

        {shopping.length === 0 ? (
          <EmptyState icon="cart" text="Nothing on the list" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shopping.map((s) => (
              <Card key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 15 }}>{s.name}</span>
                <button onClick={() => onRemove(s.id)} style={{ border: `1.5px solid ${BASE.ink}`, background: "#fff", borderRadius: 8, width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" size={14} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
