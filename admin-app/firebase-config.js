/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  AYOOLUWA ADMIN — Firebase Configuration                        ║
 * ║  PASTE YOUR FIREBASE PROJECT KEYS BELOW                         ║
 * ║  (Firebase Console → Project Settings → Your Apps → Web App)   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * ⚠️  NOTE ON SECURITY:
 *  Firebase web API keys are INTENTIONALLY public. They are not secrets.
 *  Security is enforced server-side via Firestore Security Rules.
 *  The admin app has full read/write/delete access via password protection
 *  at the app level and Firestore rules at the server level.
 */

const TBL_FIREBASE_CONFIG = {
  apiKey:            "PASTE_YOUR_apiKey_HERE",
  authDomain:        "PASTE_YOUR_authDomain_HERE",
  projectId:         "PASTE_YOUR_projectId_HERE",
  storageBucket:     "PASTE_YOUR_storageBucket_HERE",
  messagingSenderId: "PASTE_YOUR_messagingSenderId_HERE",
  appId:             "PASTE_YOUR_appId_HERE",
  measurementId:     "PASTE_YOUR_measurementId_HERE",  // optional
};

/**
 * HOW TO GET THESE VALUES:
 * 1. Go to https://console.firebase.google.com
 * 2. Select your project
 * 3. Click the ⚙️ gear icon → "Project settings"
 * 4. Scroll to "Your apps" → click your Web App ( </> icon )
 * 5. Copy the firebaseConfig object values into the keys above
 */

window.__TBL_FIREBASE_CONFIG__ = TBL_FIREBASE_CONFIG;

