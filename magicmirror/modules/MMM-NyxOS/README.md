# MMM-NyxOS

Custom MagicMirror² module that renders one household-dashboard region per
instance, all fed from a single payload assembled server-side in
`node_helper.js`. Two data sources, merged, credentials never sent to the
browser:

- **Mr Sprinkles (Supabase)** — meals, kids coins, kids chores, kids checklist
- **NyxOS (PocketBase)** — open tasks, this week's calendar events, the
  school-dropoff departure countdown

## Config

Each screen region is a separate module instance with a `region` config key.
See `../config/config.js` for the full layout; the valid values are:

| region      | shows                                  |
|-------------|-----------------------------------------|
| `departure` | "Leave in N min for X" countdown        |
| `events`    | This week's calendar events, by day     |
| `meals`     | Today's Lunch/Dinner (no Breakfast slot)|
| `tasks`     | Open tasks (max 5)                      |
| `coins`     | Kids' coin totals                       |
| `checklist` | Today's routine checklist items         |
| `chores`    | Today's kids' chores                    |

```js
{ module: "MMM-NyxOS", position: "top_bar", config: { region: "departure" } }
```

`updateInterval` (default 60000ms) controls how often each instance asks
`node_helper.js` for fresh data; the helper's own 60s cache means this can be
lower than 60s per-instance without actually hitting Supabase/PocketBase more
often than once a minute.

## Environment variables (read by node_helper.js, not the browser)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `PB_URL`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`
- `TZ` (used for "today" / "this week" boundaries)

## Known limitations

- **No Breakfast.** Mr Sprinkles' `meal_plan` table only has Lunch and Dinner
  slots — the meals region shows Breakfast as "Not tracked" rather than
  inventing a field that doesn't exist in Supabase.
- **`calendar_events` and `rules` are unconfirmed-built PocketBase
  collections.** If either 404s (collection doesn't exist yet) or errors,
  that region renders "coming soon" and logs a warning instead of crashing
  the whole dashboard. `tasks` is confirmed built and is not guarded this way.
- **Departure rule matching is a name search.** It looks for the first active
  `rules` record whose `name` contains "dropoff", falling back to "school".
  If NyxOS ends up with more than one such rule, only the first match (by
  PocketBase's default order) is used — rename rules if you need a specific
  one picked.
- **Checklist covers whichever routines are scheduled for today** (morning
  and/or evening, per `sprinkles_routines.days`), not a single fixed list.
