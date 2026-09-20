// api/send-push.js
//
// NOTE ON ASSUMPTIONS: I don't have your other /api files (send-invite-code.js
// etc.) in this conversation, so I couldn't match their exact conventions —
// this uses CommonJS (module.exports), which is Vercel's default for a plain
// .js file unless your package.json has "type": "module". If your other
// endpoints use `export default` instead, paste me one and I'll match it.

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://the-billy-living-default-rtdb.firebaseio.com'
  });
}

module.exports = async (req, res) => {
  // CORS — this endpoint is called from two different domains (the client
  // app and the separate standalone admin.html deployment), so it can't
  // rely on same-origin. Real authorization is the ID-token check below, not
  // the origin, so allowing any origin here doesn't weaken security — a
  // request still needs a valid Firebase token to do anything.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Missing auth token' });

  let uid;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (e) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  const { title, body, imageUrl, postId, uid: targetUid } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  const adminSnap = await admin.database().ref('admins/' + uid).get();
  const isAdmin = adminSnap.exists();

  // ── Targeted send (a `uid` was given): notifyClient() on the client uses
  // this for concierge replies, progress updates, vault updates, and a
  // client's own security alert. Allowed if the caller is an admin (sending
  // TO a client) or is sending to their own uid — never to notify someone
  // else without admin rights.
  if (targetUid) {
    if (!isAdmin && targetUid !== uid) {
      return res.status(403).json({ error: 'Not permitted to notify this user' });
    }
    const tokenSnap = await admin.database().ref('userProfiles/' + targetUid + '/fcmToken').get();
    const token = tokenSnap.val();
    if (!token) return res.status(200).json({ sent: 0, message: 'No registered device for this user' });

    try {
      await admin.messaging().send({
        token,
        notification: Object.assign({ title, body }, imageUrl ? { imageUrl } : {}),
        data: postId ? { postId: String(postId) } : {}
      });
      return res.status(200).json({ sent: 1 });
    } catch (e) {
      if (e.code === 'messaging/registration-token-not-registered' || e.code === 'messaging/invalid-registration-token') {
        await admin.database().ref('userProfiles/' + targetUid + '/fcmToken').remove();
      }
      return res.status(200).json({ sent: 0, error: e.message });
    }
  }

  // ── Broadcast (no `uid` given): only an admin can push to every
  // registered device — this is the new-post-published path.
  if (!isAdmin) return res.status(403).json({ error: 'Not an admin' });

  // Collect every device token on file. This reads the whole userProfiles
  // tree — fine at current scale; if the user base grows a lot, worth
  // switching to a dedicated fcmTokens/{uid} index instead so this doesn't
  // scale with total profile data size.
  const profilesSnap = await admin.database().ref('userProfiles').get();
  const tokens = [];
  if (profilesSnap.exists()) {
    profilesSnap.forEach(child => {
      const t = child.val() && child.val().fcmToken;
      if (t) tokens.push(t);
    });
  }

  if (!tokens.length) {
    return res.status(200).json({ sent: 0, message: 'No registered devices' });
  }

  const message = {
    notification: Object.assign({ title, body }, imageUrl ? { imageUrl } : {}),
    data: postId ? { postId: String(postId) } : {}
  };

  // FCM's multicast send caps at 500 tokens per call — chunk to be safe.
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));

  let successCount = 0, failureCount = 0;
  const staleTokens = [];

  for (const chunk of chunks) {
    const result = await admin.messaging().sendEachForMulticast(Object.assign({}, message, { tokens: chunk }));
    successCount += result.successCount;
    failureCount += result.failureCount;
    result.responses.forEach((r, i) => {
      if (!r.success && r.error && (
        r.error.code === 'messaging/registration-token-not-registered' ||
        r.error.code === 'messaging/invalid-registration-token'
      )) {
        staleTokens.push(chunk[i]);
      }
    });
  }

  // Clean up tokens that are no longer valid (app uninstalled, permission
  // revoked, etc.) so future sends don't keep wasting calls on them.
  if (staleTokens.length) {
    const updates = {};
    profilesSnap.forEach(child => {
      const t = child.val() && child.val().fcmToken;
      if (t && staleTokens.includes(t)) updates['userProfiles/' + child.key + '/fcmToken'] = null;
    });
    if (Object.keys(updates).length) await admin.database().ref().update(updates);
  }

  return res.status(200).json({ sent: successCount, failed: failureCount });
};
