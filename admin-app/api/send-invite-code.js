// api/send-invite-code.js
// Called from the admin Management panel when Billy invites a new designer.
// Verifies the caller is a real signed-in admin, generates a 6-digit code,
// stores it in Realtime Database, and emails it via Resend.

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

  // Only a real, currently-signed-in admin can trigger an invite.
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

  const { name, email } = req.body || {};
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid name and email required' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const key = emailToKey(email);
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  await admin.database().ref('designerInvites/' + key).set({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    code,
    createdAt: Date.now(),
    expiresAt,
    used: false
  });

  const resendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Your Billy Living designer invite code',
      html:
        '<div style="font-family:sans-serif;background:#120D06;color:#F5F0E8;padding:32px;">' +
        '<h2 style="color:#C9A84C;">Billy Living</h2>' +
        '<p>Hi ' + name.trim() + ',</p>' +
        '<p>You\'ve been invited to join as a designer. Use this code to set up your account:</p>' +
        '<div style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#E8D5A3;margin:24px 0;">' + code + '</div>' +
        '<p style="color:#A89B8C;font-size:13px;">This code expires in 15 minutes.</p>' +
        '</div>'
    })
  });

  if (!resendResp.ok) {
    const errText = await resendResp.text();
    return res.status(502).json({ error: 'Failed to send email: ' + errText });
  }

  return res.status(200).json({ success: true });
};
