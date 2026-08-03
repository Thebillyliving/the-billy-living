// api/complete-signup.js
// Called from the password-creation screen, after the code has already been
// confirmed once. Re-validates the code here too (defense in depth — a
// client could otherwise skip straight to this endpoint), then creates the
// real Firebase Auth account via the Admin SDK and writes their profile.

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

  const { name, email, code, password } = req.body || {};
  if (!name || !email || !code || !password) return res.status(400).json({ error: 'Missing required fields' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const key = emailToKey(email);
  const ref = admin.database().ref('signupCodes/' + key);
  const snap = await ref.once('value');
  const record = snap.val();

  if (!record) return res.status(404).json({ error: 'No code found for this email — start over' });
  if (record.used) return res.status(410).json({ error: 'This code has already been used' });
  if (Date.now() > record.expiresAt) return res.status(410).json({ error: 'This code has expired — start over' });
  if (String(record.code) !== String(code).trim()) return res.status(401).json({ error: 'That code is incorrect' });

  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email: email.toLowerCase().trim(),
      password,
      displayName: name.trim()
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  await admin.database().ref('userProfiles/' + userRecord.uid).set({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    avatar: '', residence: '', mobile: '', measure: '',
    createdAt: Date.now()
  });
  await ref.update({ used: true });

  return res.status(200).json({ success: true });
};
