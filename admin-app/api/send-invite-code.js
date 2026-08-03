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
    used: false,
    approved: false
  });

  // Build the signup link using whatever domain the request actually came
  // through — avoids hardcoding a URL that could go stale if the deployment
  // domain ever changes.
  const origin = 'https://' + req.headers.host;
  const signupUrl = origin + '/designer-signup.html?email=' + encodeURIComponent(email.toLowerCase().trim());

  const resendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Your Billy Living designer account code',
      html:
        '<div style="font-family:sans-serif;background:#120D06;color:#F5F0E8;padding:32px;">' +
        '<h2 style="color:#C9A84C;">Billy Living</h2>' +
        '<p>Hi ' + name.trim() + ',</p>' +
        '<p>A designer account is being created for you at Billy Living. Tap below to finish setting it up:</p>' +
        '<p style="margin:24px 0;"><a href="' + signupUrl + '" style="background:#C9A84C;color:#1a1206;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Set Up My Account</a></p>' +
        '<p>Or go to <a href="' + signupUrl + '" style="color:#E8D5A3;">' + signupUrl + '</a> and enter this code:</p>' +
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
