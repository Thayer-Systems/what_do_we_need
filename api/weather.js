// Server-side weather lookup so the Tomorrow.io key never ships to the browser.
// GET /api/weather -> current conditions (used by the dashboard widget)
// GET /api/weather?range=week -> daily forecast (used by the weather page)

const CODE_TEXT = {
  1000: "Clear", 1100: "Mostly Clear", 1101: "Partly Cloudy", 1102: "Mostly Cloudy",
  1001: "Cloudy", 2000: "Fog", 4000: "Drizzle", 4001: "Rain", 4200: "Light Rain",
  4201: "Heavy Rain", 5000: "Snow", 5001: "Flurries", 5100: "Light Snow", 5101: "Heavy Snow",
  6000: "Freezing Drizzle", 6001: "Freezing Rain", 7000: "Ice Pellets", 8000: "Thunderstorm",
};
const CODE_ICON = {
  1000: "sun", 1100: "cloudSun", 1101: "cloudSun", 1102: "cloud", 1001: "cloud", 2000: "cloud",
  4000: "cloudRain", 4001: "cloudRain", 4200: "cloudRain", 4201: "cloudRain", 5000: "cloudSnow",
  5001: "cloudSnow", 5100: "cloudSnow", 5101: "cloudSnow", 6000: "cloudRain", 6001: "cloudRain",
  7000: "cloudSnow", 8000: "storm",
};

module.exports = async function handler(req, res) {
  const key = process.env.TOMORROW_IO_API_KEY;
  const location = process.env.WEATHER_LOCATION || "45005 US";
  if (!key) {
    res.status(200).json({ available: false });
    return;
  }

  const range = req.query?.range;
  const isWeek = range === "week";
  const isHourly = range === "hourly";

  try {
    if (isHourly) {
      const url = `https://api.tomorrow.io/v4/weather/forecast?location=${encodeURIComponent(location)}&units=imperial&timesteps=1h&apikey=${key}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("hourly forecast lookup failed");
      const data = await r.json();
      const hours = (data?.timelines?.hourly || []).slice(0, 168).map((h) => {
        const v = h.values || {};
        return {
          time: h.time,
          tempF: v.temperature != null ? Math.round(v.temperature) : null,
          code: v.weatherCode,
          summary: CODE_TEXT[v.weatherCode] || "—",
          icon: CODE_ICON[v.weatherCode] || "sun",
          precipProbability: v.precipitationProbability != null ? Math.round(v.precipitationProbability) : null,
          humidity: v.humidity != null ? Math.round(v.humidity) : null,
          windMph: v.windSpeed != null ? Math.round(v.windSpeed) : null,
        };
      });
      res.status(200).json({ available: true, hours });
      return;
    }

    if (!isWeek) {
      const url = `https://api.tomorrow.io/v4/weather/realtime?location=${encodeURIComponent(location)}&units=imperial&apikey=${key}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("weather lookup failed");
      const data = await r.json();
      const v = data?.data?.values || {};
      res.status(200).json({
        available: true,
        temperatureF: v.temperature != null ? Math.round(v.temperature) : null,
        code: v.weatherCode,
        summary: CODE_TEXT[v.weatherCode] || "—",
        icon: CODE_ICON[v.weatherCode] || "sun",
      });
      return;
    }

    const url = `https://api.tomorrow.io/v4/weather/forecast?location=${encodeURIComponent(location)}&units=imperial&timesteps=1d&apikey=${key}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("forecast lookup failed");
    const data = await r.json();
    const days = (data?.timelines?.daily || []).slice(0, 7).map((d) => {
      const v = d.values || {};
      return {
        date: d.time,
        highF: v.temperatureMax != null ? Math.round(v.temperatureMax) : null,
        lowF: v.temperatureMin != null ? Math.round(v.temperatureMin) : null,
        code: v.weatherCodeMax || v.weatherCodeMin,
        summary: CODE_TEXT[v.weatherCodeMax || v.weatherCodeMin] || "—",
        icon: CODE_ICON[v.weatherCodeMax || v.weatherCodeMin] || "sun",
        humidity: v.humidityAvg != null ? Math.round(v.humidityAvg) : null,
        windMph: v.windSpeedAvg != null ? Math.round(v.windSpeedAvg) : null,
        precipProbability: v.precipitationProbabilityAvg != null ? Math.round(v.precipitationProbabilityAvg) : null,
        uvIndex: v.uvIndexMax != null ? Math.round(v.uvIndexMax) : null,
        sunrise: v.sunriseTime,
        sunset: v.sunsetTime,
      };
    });
    res.status(200).json({ available: true, days });
  } catch (e) {
    res.status(200).json({ available: false });
  }
};
