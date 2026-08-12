import { createContext, useCallback, useContext, useState } from "react";
import { MASCOT, F, BASE } from "../lib/theme.js";

const CelebrationCtx = createContext(() => {});
export const useCelebrate = () => useContext(CelebrationCtx);

const SPRINKLE_COLORS = [BASE.pink, BASE.teal, BASE.yellow, BASE.lilac, BASE.orange, BASE.green];

function SprinkleBurst() {
  const pieces = Array.from({ length: 26 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
    const dist = 90 + Math.random() * 140;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const spin = 180 + Math.random() * 360;
    return { id: i, x, y, spin, color: SPRINKLE_COLORS[i % SPRINKLE_COLORS.length], delay: Math.random() * 0.12 };
  });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 10,
            height: 4,
            borderRadius: 4,
            background: p.color,
            border: `1.5px solid ${BASE.ink}`,
            "--fly-to": `translate(${p.x}px, ${p.y}px)`,
            "--spin": `${p.spin}deg`,
            animation: `sprinkle-fly 0.9s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

function CelebrationOverlay({ message, onDone }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}
    >
      <div
        style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", animation: "fade-out 1.6s ease forwards" }}
        onAnimationEnd={onDone}
      >
        <SprinkleBurst />
        <img
          src={MASCOT.celebrating}
          alt="Mr. Sprinkles celebrating"
          style={{ width: 140, height: 140, objectFit: "contain", animation: "sprinkle-pop-in 0.5s ease-out, mascot-bob 1s ease-in-out 0.5s infinite" }}
        />
        <div
          style={{
            marginTop: 10,
            background: "#fff",
            border: `2.5px solid ${BASE.ink}`,
            borderRadius: 999,
            padding: "8px 20px",
            fontFamily: F.display,
            fontWeight: 700,
            fontSize: 18,
            color: BASE.ink,
            boxShadow: `3px 3px 0 0 ${BASE.ink}`,
          }}
        >
          👍 {message || "Good Job!"}
        </div>
      </div>
    </div>
  );
}

export function CelebrationProvider({ children }) {
  const [active, setActive] = useState(null);
  const celebrate = useCallback((message) => {
    setActive({ message, key: Date.now() });
  }, []);
  return (
    <CelebrationCtx.Provider value={celebrate}>
      {children}
      {active && <CelebrationOverlay key={active.key} message={active.message} onDone={() => setActive(null)} />}
    </CelebrationCtx.Provider>
  );
}
