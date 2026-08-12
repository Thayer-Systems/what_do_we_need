// Exposes only the public VAPID key so the client can subscribe. The
// private key stays server-side.
module.exports = async function handler(req, res) {
  const key = process.env.VAPID_PUBLIC_KEY || null;
  res.status(200).json({ available: !!key, publicKey: key });
};
