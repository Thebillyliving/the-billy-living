// api/check-signup-code.js
// Called when the person types the code into the "Check Your Email" screen.
// Read-only check — does NOT mark the code used or create the account.
// That happens in api/complete-signup.js, after the password step too.

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

function emailToKey(email) {
  return Buffer.from(email.toLowerCase().trim())
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  const key = emailToKey(email);
  const snap = await admin.database().ref('signupCodes/' + key).once('value');
  const record = snap.val();

  if (!record) return res.status(404).json({ error: 'No code found for this email — go back and try again' });
  if (record.used) return res.status(410).json({ error: 'This code has already been used' });
  if (Date.now() > record.expiresAt) return res.status(410).json({ error: 'This code has expired — go back and request a new one' });
  if (String(record.code) !== String(code).trim()) return res.status(401).json({ error: 'That code is incorrect' });

  return res.status(200).json({ success: true });
};
