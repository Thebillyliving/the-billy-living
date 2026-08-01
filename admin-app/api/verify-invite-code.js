// api/verify-invite-code.js
// Called from designer-signup.html. Checks the code the designer typed in
// against what was stored when the admin sent the invite, and if it matches
// (and hasn't expired or been used already), creates their real Firebase
// Auth account with the password THEY chose.

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

  const { email, code, password } = req.body || {};
  if (!email || !code || !password) return res.status(400).json({ error: 'Email, code, and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const key = emailToKey(email);
  const ref = admin.database().ref('designerInvites/' + key);
  const snap = await ref.once('value');
  const invite = snap.val();

  if (!invite) return res.status(404).json({ error: 'No invite found for this email' });
  if (invite.used) return res.status(410).json({ error: 'This invite has already been used' });
  if (Date.now() > invite.expiresAt) return res.status(410).json({ error: 'This code has expired — ask for a new invite' });
  if (String(invite.code) !== String(code).trim()) return res.status(401).json({ error: 'Incorrect code' });

  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email: invite.email,
      password,
      displayName: invite.name
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  await admin.database().ref('designers/' + userRecord.uid).set({
    id: userRecord.uid,
    name: invite.name,
    email: invite.email,
    createdAt: Date.now()
  });
  await ref.update({ used: true });

  return res.status(200).json({ success: true });
};
