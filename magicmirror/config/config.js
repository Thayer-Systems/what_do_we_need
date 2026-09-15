/* MagicMirror² config for the NyxOS/Mr Sprinkles household dashboard.
 * Runs headless in Docker (server-only) — the Onn HDMI stick's kiosk
 * browser is the only thing that ever renders this.
 */
let config = {
  address: "0.0.0.0",
  port: 8080,
  basePath: "/",

  // LAN + Tailscale only. Never expose this port to the public internet —
  // MagicMirror has no auth of its own. 100.64.0.0/10 is Tailscale's CGNAT
  // range; replace 192.168.0.0/16 with your actual LAN subnet if different.
  ipWhitelist: ["127.0.0.1", "::1", "192.168.0.0/16", "100.64.0.0/10"],

  language: "en",
  locale: "en-US",
  logLevel: ["INFO", "LOG", "WARN", "ERROR"],
  timeFormat: 12,
  units: "imperial",

  modules: [
    {
      module: "clock",
      position: "top_left",
      config: {
        displaySeconds: false,
      },
    },
    {
      module: "weather",
      position: "top_right",
      config: {
        weatherProvider: "openmeteo",
        type: "current",
        lat: 39.7589,
        lon: -84.1916,
      },
    },
    {
      module: "weather",
      position: "top_right",
      config: {
        weatherProvider: "openmeteo",
        type: "forecast",
        lat: 39.7589,
        lon: -84.1916,
        maxNumberOfDays: 4,
      },
    },

    // One MMM-NyxOS instance per screen region. All instances share the
    // same node_helper (and its 60s cache), so this doesn't multiply load
    // on Supabase/PocketBase — each just renders its own slice of the one
    // assembled payload.
    { module: "MMM-NyxOS", position: "top_bar", config: { region: "departure" } },
    { module: "MMM-NyxOS", position: "top_left", config: { region: "events" } },
    { module: "MMM-NyxOS", position: "upper_third", config: { region: "tasks" } },
    { module: "MMM-NyxOS", position: "middle_center", config: { region: "meals" } },
    { module: "MMM-NyxOS", position: "lower_third", config: { region: "coins" } },
    { module: "MMM-NyxOS", position: "bottom_left", config: { region: "checklist" } },
    { module: "MMM-NyxOS", position: "bottom_center", config: { region: "chores" } },
  ],
};

if (typeof module !== "undefined") {
  module.exports = config;
}
