// api/confirm-invite-code.js
// Step 2 of the admin approval flow. The admin re-types the code that was
// just emailed to the designer. This only checks the code matches — it does
// NOT approve the invite yet. That happens in api/approve-invite.js, after
// the admin also re-confirms their own password.

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

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!idToken) return res.status(401).json({ error: 'Missing auth token' });

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired session — sign in again' });
  }

  const adminSnap = await admin.database().ref('admins/' + decoded.uid).once('value');
  if (!adminSnap.exists()) return res.status(403).json({ error: 'Not authorized' });

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  const key = emailToKey(email);
  const snap = await admin.database().ref('designerInvites/' + key).once('value');
  const invite = snap.val();

  if (!invite) return res.status(404).json({ error: 'No pending invite found for this email' });
  if (invite.used) return res.status(410).json({ error: 'This invite has already been used' });
  if (Date.now() > invite.expiresAt) return res.status(410).json({ error: 'This code has expired — send a new invite' });
  if (String(invite.code) !== String(code).trim()) return res.status(401).json({ error: 'That code doesn\'t match what was sent' });

  return res.status(200).json({ success: true });
};

