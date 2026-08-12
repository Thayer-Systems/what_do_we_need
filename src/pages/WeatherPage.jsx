import { useEffect, useState } from "react";
import { PageHeader, Card, EmptyState } from "../components/ui.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

function DayCard({ day, isToday }) {
  const d = new Date(day.date);
  return (
    <Card bg={isToday ? BASE.teal : "#fff"} style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 60, flexShrink: 0 }}>
        <div style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 13 }}>{isToday ? "Today" : d.toLocaleDateString([], { weekday: "short" })}</div>
        <div style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t2 }}>{d.toLocaleDateString([], { month: "short", day: "numeric" })}</div>
      </div>
      <Icon name={day.icon} size={32} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>{day.summary}</div>
        <div style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t2 }}>
          {day.precipProbability != null && `${day.precipProbability}% rain · `}
          {day.windMph != null && `${day.windMph} mph wind · `}
          {day.humidity != null && `${day.humidity}% humidity`}
        </div>
      </div>
      <div style={{ textAlign: "right", fontFamily: F.ui }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>{day.highF}°</span>
        <span style={{ color: BASE.t3, fontSize: 13 }}> / {day.lowF}°</span>
      </div>
    </Card>
  );
}

export default function WeatherPage() {
  const { navigate } = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/weather?range=week").then((r) => r.json()).then(setData).catch(() => setData({ available: false }));
  }, []);

  return (
    <div>
      <PageHeader title="Weather" back={() => navigate("/")} />
      <div style={{ padding: "18px 16px 40px" }}>
        {!data ? (
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2 }}>Loading…</div>
        ) : !data.available || !data.days?.length ? (
          <EmptyState icon="cloud" text="Weather isn't connected yet" />
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {data.days.map((d, i) => <DayCard key={d.date} day={d} isToday={i === 0} />)}
            </div>
            {data.days[0] && (
              <Card>
                <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Today's details</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {[
                    ["droplet", "Humidity", data.days[0].humidity != null ? `${data.days[0].humidity}%` : "—"],
                    ["wind", "Wind", data.days[0].windMph != null ? `${data.days[0].windMph} mph` : "—"],
                    ["cloudRain", "Rain chance", data.days[0].precipProbability != null ? `${data.days[0].precipProbability}%` : "—"],
                    ["sun", "UV Index", data.days[0].uvIndex ?? "—"],
                  ].map(([icon, lbl, val]) => (
                    <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 10, background: BASE.muted, borderRadius: 12, padding: "10px 12px" }}>
                      <Icon name={icon} size={22} />
                      <div>
                        <div style={{ fontFamily: F.ui, fontSize: 10, fontWeight: 800, color: BASE.t2, textTransform: "uppercase" }}>{lbl}</div>
                        <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {data.days[0].sunrise && (
                  <div style={{ display: "flex", gap: 16, marginTop: 12, fontFamily: F.ui, fontSize: 12, color: BASE.t2 }}>
                    <span><Icon name="sunrise" size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />{new Date(data.days[0].sunrise).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
