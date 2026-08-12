// Server-side weather lookup so the Tomorrow.io key never ships to the browser.

const CODE_TEXT = {
  1000: "Clear", 1100: "Mostly Clear", 1101: "Partly Cloudy", 1102: "Mostly Cloudy",
  1001: "Cloudy", 2000: "Fog", 4000: "Drizzle", 4001: "Rain", 4200: "Light Rain",
  4201: "Heavy Rain", 5000: "Snow", 5001: "Flurries", 5100: "Light Snow", 5101: "Heavy Snow",
  6000: "Freezing Drizzle", 6001: "Freezing Rain", 7000: "Ice Pellets", 8000: "Thunderstorm",
};
const CODE_EMOJI = {
  1000: "☀️", 1100: "🌤️", 1101: "⛅", 1102: "🌥️", 1001: "☁️", 2000: "🌫️",
  4000: "🌦️", 4001: "🌧️", 4200: "🌦️", 4201: "🌧️", 5000: "❄️", 5001: "🌨️",
  5100: "🌨️", 5101: "❄️", 6000: "🌧️", 6001: "🌧️", 7000: "🧊", 8000: "⛈️",
};

module.exports = async function handler(req, res) {
  const key = process.env.TOMORROW_IO_API_KEY;
  const location = process.env.WEATHER_LOCATION || "45005 US";
  if (!key) {
    res.status(200).json({ available: false });
    return;
  }
  try {
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
      emoji: CODE_EMOJI[v.weatherCode] || "🌡️",
    });
  } catch (e) {
    res.status(200).json({ available: false });
  }
};
