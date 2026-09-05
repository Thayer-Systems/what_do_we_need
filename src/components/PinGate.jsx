import { useState } from "react";
import { BASE, F, hardShadow } from "../lib/theme.js";
import { IconBadge } from "./Deco.jsx";
import { Icon } from "./Icons.jsx";
import { isToolsUnlocked, tryUnlockTools, lockTools } from "../lib/pin.js";
import { useRouter } from "../lib/router.jsx";

const inp = { background: "#fff", border: `1px solid ${BASE.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 22, letterSpacing: "0.3em", textAlign: "center", fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const btn = (bg) => ({ background: bg, color: BASE.ink, border: `1px solid ${BASE.border}`, borderRadius: 999, padding: "10px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });

// Wraps Tools/Settings pages behind a 4-digit PIN. Unlock is per browser
// session (see lib/pin.js) — comes back locked on a fresh load.
export default function PinGate({ children }) {
  const { navigate } = useRouter();
  const [unlocked, setUnlocked] = useState(isToolsUnlocked());
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  if (unlocked) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 16px 0" }}>
          <button
            onClick={() => { lockTools(); setUnlocked(false); setCode(""); navigate("/settings"); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 12, color: BASE.t2 }}
          >
            <Icon name="pin" size={13} /> Lock Tools
          </button>
        </div>
        {children}
      </div>
    );
  }

  const submit = () => {
    if (tryUnlockTools(code)) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setCode("");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: 16 }}>
      <IconBadge icon="pin" bg={BASE.green} size={64} radius={18} />
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20 }}>Tools is locked</div>
      <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, textAlign: "center" }}>Enter the PIN to continue</div>
      <input
        style={{ ...inp, maxWidth: 220 }}
        type="password"
        inputMode="numeric"
        maxLength={4}
        autoFocus
        value={code}
        onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(false); }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      {error && <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.red, fontWeight: 700 }}>Wrong PIN — try again.</div>}
      <button onClick={submit} style={{ ...btn(BASE.green), width: "100%", maxWidth: 220 }}>Unlock</button>
    </div>
  );
}
