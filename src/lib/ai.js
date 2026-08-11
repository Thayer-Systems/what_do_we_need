// Mr. Sprinkles text assistant — parses free-form family text into a
// structured action (grocery item, chore, calendar event, or meal).
// The actual model call happens server-side in /api/assistant so the
// Anthropic key never ships to the browser.

export async function interpretMessage(text) {
  try {
    const r = await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) throw new Error("assistant request failed");
    return await r.json();
  } catch (e) {
    return { type: "unknown", reason: "Couldn't reach the assistant — try again in a moment." };
  }
}
