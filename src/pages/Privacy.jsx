import { BASE, F } from "../lib/theme.js";

const wrap = { maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px", fontFamily: F.ui, color: BASE.ink, lineHeight: 1.6 };
const h1 = { fontFamily: F.display, fontWeight: 700, fontSize: 30, marginBottom: 6 };
const h2 = { fontFamily: F.display, fontWeight: 700, fontSize: 18, marginTop: 28, marginBottom: 8 };
const p = { fontSize: 14, marginBottom: 10 };

export default function Privacy() {
  return (
    <div style={{ background: BASE.bg, minHeight: "100vh" }}>
      <div style={wrap}>
        <div style={h1}>Mr. Sprinkles — Privacy Policy</div>
        <p style={{ ...p, color: BASE.t2 }}>Last updated August 12, 2026</p>

        <p style={p}>
          Mr. Sprinkles is a private household organizer built for a single family's personal use. It is not a
          public product, is not monetized, and is not distributed to the general public. This page explains what
          data the app accesses and how it's used.
        </p>

        <div style={h2}>What data we access</div>
        <p style={p}>
          When a family member connects their Google Calendar, Mr. Sprinkles requests permission to read and create
          events on that calendar (the <code>calendar</code> scope) so that family events can be viewed and added
          from within the app, and so the app can check availability when scheduling.
        </p>

        <div style={h2}>How data is used</div>
        <p style={p}>
          Calendar data is used only to display events inside the app and to create new events at the request of a
          family member (for example, through the built-in assistant or the calendar page). It is never sold,
          shared with advertisers, or used for any purpose outside running the household calendar feature.
        </p>

        <div style={h2}>Where data is stored</div>
        <p style={p}>
          Calendar access tokens are stored server-side and used only to make requests to the Google Calendar API on
          behalf of the connected family member. Application data (family member profiles, tasks, meal plans,
          calendar event copies, etc.) is stored in a private Supabase database that only this app's server
          functions can access.
        </p>

        <div style={h2}>Sharing</div>
        <p style={p}>
          We do not share, sell, or transfer any data to third parties. The only outside services this app talks to
          are Google (Calendar), Tomorrow.io (weather), and Anthropic (the household assistant) — each solely to
          provide the corresponding feature, and none of them receive more data than is needed for that request.
        </p>

        <div style={h2}>Revoking access</div>
        <p style={p}>
          Any family member can revoke Mr. Sprinkles' access to their Google Calendar at any time from their{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
            Google Account permissions page
          </a>
          .
        </p>

        <div style={h2}>Contact</div>
        <p style={p}>
          Questions about this policy can be directed to{" "}
          <a href="mailto:mrarick2@gmail.com">mrarick2@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
