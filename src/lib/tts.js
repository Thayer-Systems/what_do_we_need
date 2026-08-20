// Client-side ElevenLabs playback — fetches MP3 bytes from /api/tts and
// plays them. A single shared <audio> element means a new line always
// interrupts whatever's currently speaking instead of overlapping it.
let sharedAudio = null;
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
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    if (sharedAudio) {
      sharedAudio.pause();
      URL.revokeObjectURL(sharedAudio.src);
    }
    sharedAudio = new Audio(url);
    sharedAudio.play().catch(() => {}); // browsers can block autoplay before any user gesture — ignore
  } catch (e) {
    // Voice is a nice-to-have; never let a network hiccup break the chat.
  }
}

export function stopSpeaking() {
  if (sharedAudio) {
    sharedAudio.pause();
    URL.revokeObjectURL(sharedAudio.src);
    sharedAudio = null;
  }
}
