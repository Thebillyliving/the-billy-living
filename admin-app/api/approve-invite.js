// api/approve-invite.js
// Step 3 of the admin approval flow. Called right after the admin
// re-authenticates with their own password in the browser (Firebase's
// reauthenticateWithCredential). We require the token's auth_time to be very
// recent as proof that reauthentication genuinely just happened — this
// can't be faked by a client skipping the password prompt, since Firebase
// itself stamps auth_time on the token at the moment of authentication.
// Only once this runs does the designer's own signup page start accepting
// their code.

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

  // auth_time is in seconds; require the reauth to have happened within the last 5 minutes.
  const authAgeSeconds = Date.now() / 1000 - decoded.auth_time;
  if (authAgeSeconds > 5 * 60) {
    return res.status(401).json({ error: 'Password confirmation expired — please re-enter it and try again' });
  }

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  const key = emailToKey(email);
  const ref = admin.database().ref('designerInvites/' + key);
  const snap = await ref.once('value');
  const invite = snap.val();

  if (!invite) return res.status(404).json({ error: 'No pending invite found for this email' });
  if (invite.used) return res.status(410).json({ error: 'This invite has already been used' });
  if (Date.now() > invite.expiresAt) return res.status(410).json({ error: 'This code has expired — send a new invite' });
  if (String(invite.code) !== String(code).trim()) return res.status(401).json({ error: 'That code doesn\'t match what was sent' });

  await ref.update({ approved: true });
  return res.status(200).json({ success: true });
};
