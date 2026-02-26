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
  apiKey:            "AIzaSyD-ZCaYTLvvaaNFd8G4S8_InyRcSQ9qk8s",
  authDomain:        "the-billy-living-ee243.firebaseapp.com",
  projectId:         "the-billy-living-ee243",
  storageBucket:     "the-billy-living-ee243.firebasestorage.app",
  messagingSenderId: "454031913213",
  appId:             "1:454031913213:web:d68fc786f556b6e49c8e94",
  measurementId:     "G-F7RKJK3R1D",  // optional
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
