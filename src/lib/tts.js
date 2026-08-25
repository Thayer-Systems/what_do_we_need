// Client-side ElevenLabs playback — fetches MP3 bytes from /api/tts and
// plays them through the Web Audio API rather than a plain <audio> element.
//
// speak() is always called after an `await` (a save request finishing,
// etc.), so by the time playback would start, the browser no longer
// considers it part of the original tap/click. Mobile Safari enforces that
// distinction per-element on HTMLMediaElement.play() and silently rejects
// it — nothing plays, nothing throws where you'd notice. A single shared
// AudioContext doesn't have that problem: resuming it once inside a real
// user gesture unlocks it for the rest of the page session, and every
// later speak() just schedules a buffer on the already-unlocked context.
let audioCtx = null;
function getCtx() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

if (typeof window !== "undefined") {
  const unlock = () => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

let currentSource = null;
let ttsAvailable = null; // null = unknown yet, true/false once checked

export async function ttsConfigured() {
  if (ttsAvailable != null) return ttsAvailable;
  try {
    const r = await fetch("/api/status");
    const d = await r.json();
    ttsAvailable = !!d.ttsConfigured;
  } catch (e) {
    ttsAvailable = false;
  }
  return ttsAvailable;
}

export async function speak(text) {
  if (!text || !text.trim()) return;
  if (!(await ttsConfigured())) return;
  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const contentType = r.headers.get("content-type") || "";
    if (!r.ok || !contentType.includes("audio")) return; // not configured / errored — fail silently, chat text is still there
    const bytes = await r.arrayBuffer();

    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    const buffer = await ctx.decodeAudioData(bytes);

    if (currentSource) {
      try { currentSource.stop(); } catch (e) {} // already-finished sources throw on stop() — ignore
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    currentSource = source;
  } catch (e) {
    // Voice is a nice-to-have; never let a network hiccup break the chat.
  }
}

export function stopSpeaking() {
  if (currentSource) {
    try { currentSource.stop(); } catch (e) {}
    currentSource = null;
  }
}
