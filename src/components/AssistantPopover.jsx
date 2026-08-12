import { useState, useRef, useEffect } from "react";
import { BASE, F, MASCOT, hardShadow } from "../lib/theme.js";
import { promptOfDay } from "../lib/prompts.js";
import { Icon } from "./Icons.jsx";

const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };

export default function AssistantPopover({ onSend }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [log, open]);

  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("sprinkles-open-assistant", openIt);
    return () => window.removeEventListener("sprinkles-open-assistant", openIt);
  }, []);

  const submit = async () => {
    const msg = text.trim();
    if (!msg || busy) return;
    const nextLog = [...log, { role: "user", text: msg }];
    setLog(nextLog);
    setText("");
    setBusy(true);
    const reply = await onSend(msg, nextLog);
    setLog((p) => [...p, { role: "sprinkles", text: reply }]);
    setBusy(false);
  };

  return (
    <>
      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,15,10,0.4)", zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="sprinkles-assistant-panel"
            style={{
              width: "100%",
              maxWidth: 420,
              maxHeight: "70vh",
              margin: "0 16px 96px",
              background: "#fff",
              border: `2.5px solid ${BASE.ink}`,
              borderRadius: 20,
              boxShadow: hardShadow(BASE.ink, 5, 5),
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ background: BASE.yellow, borderBottom: `2.5px solid ${BASE.ink}`, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={MASCOT.main} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>Ask Mr. Sprinkles</span>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {log.length === 0 && (
                <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, fontWeight: 700 }}>
                  {promptOfDay()}
                </div>
              )}
              {log.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    background: m.role === "user" ? BASE.teal : BASE.muted,
                    border: `1.5px solid ${BASE.ink}`,
                    borderRadius: 12,
                    padding: "8px 12px",
                    maxWidth: "85%",
                    fontFamily: F.ui,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {m.text}
                </div>
              ))}
              {busy && <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t3 }}>Thinking…</div>}
            </div>

            <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1.5px solid ${BASE.muted}` }}>
              <input style={inp} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Type a message…" autoFocus />
              <button
                onClick={submit}
                disabled={busy}
                style={{ width: 42, height: 42, borderRadius: 10, border: `2px solid ${BASE.ink}`, background: BASE.pink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <Icon name="send" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media (min-width: 900px) {
          .sprinkles-assistant-panel { margin-bottom: 24px !important; }
        }
      `}</style>
    </>
  );
}
