# NyxOS / Mr Sprinkles MagicMirror² Dashboard

A MagicMirror² instance running headless in Docker on the mini PC, showing a
combined household dashboard pulled from two systems:

- **Mr Sprinkles** (this repo) via Supabase — meals, kids coins, kids chores,
  kids checklist
- **NyxOS** (separate system, same mini PC) via PocketBase — open tasks,
  this week's calendar events, school-dropoff departure countdown
- Current weather + forecast (MagicMirror's built-in `weather` module,
  Open-Meteo — no API key needed)

The actual data-merging logic lives in `modules/MMM-NyxOS/` — see that
module's own README for region-by-region details and known limitations.

## Start

```sh
cd magicmirror
cp .env.example .env   # fill in real values, see "Environment variables" below
docker compose up -d magicmirror
```

## Test

From a laptop on the same LAN or Tailscale network:

```
http://<mini-pc-ip>:8080
```

You should see the clock/weather at top, and the eight NyxOS regions
(departure bar, this week's events, meals, tasks, coins, checklist, chores)
populate within ~60 seconds. Check `docker compose logs -f magicmirror` for
`[MMM-NyxOS]` warnings if a region stays on "coming soon" or empty longer
than that.

## Environment variables

Set in `magicmirror/.env` (see `.env.example`):

| Variable              | Source                                    |
|-----------------------|--------------------------------------------|
| `SUPABASE_URL`        | Mr Sprinkles Supabase project settings      |
| `SUPABASE_ANON_KEY`   | Mr Sprinkles Supabase project settings      |
| `PB_URL`              | NyxOS PocketBase base URL (see note below)  |
| `PB_ADMIN_EMAIL`      | NyxOS PocketBase superuser email            |
| `PB_ADMIN_PASSWORD`   | NyxOS PocketBase superuser password         |
| `TZ`                  | e.g. `America/New_York`                     |

**`PB_URL` note:** NyxOS's `docker-compose.yml` is a separate project from
this one. If MagicMirror isn't joined to the same docker network as NyxOS's
`pocketbase` container, `http://pocketbase:8090` won't resolve — use the
mini PC's LAN or Tailscale IP with PocketBase's published port instead
(e.g. `http://100.x.x.x:8090`), and make sure that port is actually
published in NyxOS's compose file. `docker-compose.yml` here has a commented
`networks: nyxos-net (external: true)` block if you'd rather join NyxOS's
existing network by name.

Also adjust the `weather` module's `lat`/`lon` in `config/config.js` to your
actual location (currently placeholder-set to the Dayton, OH area, matching
the departure example in the spec) — and double check the `ipWhitelist` CIDR
ranges in `config/config.js` match your actual LAN subnet.

## Onn HDMI stick kiosk setup

The Onn stick (Android TV/Google TV) can't run MagicMirror itself — it just
needs to display the page above in a fullscreen kiosk browser.

1. Install **Fully Kiosk Browser** (or **TV Bro**) from the Play Store on the
   stick. If it's not listed for your model, sideload it via the
   "Downloader" app (search Play Store for "Downloader", then use it to
   fetch the Fully Kiosk Browser APK).
2. Open it and set:
   - **Start URL**: `http://<mini-pc-ip>:8080` (LAN IP, or your Tailscale IP
     if you want it to work away from home — see below)
   - **Fullscreen / kiosk mode**: enabled
   - **Keep screen on / disable sleep**: enabled
   - **Launch on boot** and **set as launcher/home app**: enabled, so a power
     cycle comes back up on the dashboard with no interaction
3. Optional — remote access: install the **Tailscale** Android TV app on the
   stick and sign in to the same tailnet as the mini PC, then use the mini
   PC's Tailscale IP as the start URL instead of its LAN IP.

## Security

MagicMirror has no built-in authentication. It must stay reachable only on
LAN or Tailscale, **never exposed to the public internet**:

- `config/config.js`'s `ipWhitelist` restricts connections by source IP —
  keep it scoped to your actual LAN subnet + Tailscale's `100.64.0.0/10`
  range, never `[]` opened to everything.
- Don't add a port-forward or reverse-proxy rule that exposes port 8080
  publicly.
- Supabase and PocketBase credentials live only in `magicmirror/.env` and are
  read by `node_helper.js` (server-side) — the browser never sees them.

## Known limitations

See `modules/MMM-NyxOS/README.md` for the full list. Summary:

- No Breakfast slot (Mr Sprinkles' schema doesn't have one).
- `calendar_events` and `rules` are PocketBase collections NyxOS has spec'd
  but not yet confirmed built — those regions show "coming soon" until they
  exist, without crashing the rest of the dashboard.
- Departure countdown picks the first active `rules` record matching
  "dropoff" or "school" by name; rename if NyxOS ends up with multiple.
