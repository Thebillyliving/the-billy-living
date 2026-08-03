// api/send-signup-code.js
// Called when someone taps "Continue" on the Create Account screen (name +
// email only, no password yet). Generates a 6-digit code, stores it, and
// emails it via Resend. No admin auth needed — this is public self-signup.

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

  const { name, email } = req.body || {};
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid name and email required' });
  }

  // If this email already has an account, don't let them "re-signup" —
  // point them to Sign In instead.
  try {
    await admin.auth().getUserByEmail(email.toLowerCase().trim());
    return res.status(409).json({ error: 'An account already exists with this email — try signing in instead.' });
  } catch (e) {
    if (e.code !== 'auth/user-not-found') {
      return res.status(500).json({ error: 'Could not check this email — try again.' });
    }
    // user-not-found is the expected/good case, fall through
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const key = emailToKey(email);
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  await admin.database().ref('signupCodes/' + key).set({
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
      subject: 'Your Billy Living confirmation code',
      html:
        '<div style="font-family:sans-serif;background:#0a0e1a;color:#f5f0e8;padding:32px;">' +
        '<h2 style="color:#C9A84C;">The Billy Living</h2>' +
        '<p>Hi ' + name.trim() + ',</p>' +
        '<p>Use this code to confirm your email and finish creating your account:</p>' +
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
