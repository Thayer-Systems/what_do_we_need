// Reports which server-side integrations are configured, without ever
// exposing the underlying secret values to the client.
module.exports = async function handler(req, res) {
  res.status(200).json({
    assistant: !!process.env.ANTHROPIC_API_KEY,
    weather: !!process.env.TOMORROW_IO_API_KEY,
    googleMapsConfigured: !!process.env.GOOGLE_MAPS_KEY,
    googleCalendarConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    pushConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  });
};
