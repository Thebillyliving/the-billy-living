# The Billy Living — Final Deployment Guide

---

## 1. REPOSITORY STRUCTURE

Push this exact folder structure to GitHub:

```
your-repo/
├── client-app/
│   ├── index.html          ← The Billy Living (READ-ONLY client)
│   ├── manifest.json
│   ├── sw.js
│   ├── db.js               ← READ-ONLY. No write() or delete() methods.
│   └── firebase-config.js  ← Paste your Firebase keys here
│
├── admin-app/
│   ├── index.html          ← ayooluwa (Password: 1AYOoluw$)
│   ├── manifest.json
│   ├── sw.js
│   ├── db.js               ← READ + WRITE + DELETE. Admin only.
│   └── firebase-config.js  ← Paste same Firebase keys here
│
└── netlify.toml            ← Shared Netlify config
```

---

## 2. FIREBASE CONFIGURATION TEMPLATE

Open `firebase-config.js` in BOTH apps and paste your keys:

```js
const TBL_FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",          // From Firebase Console
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abc123...",
  measurementId:     "G-XXXXXXXXXX",      // Optional (Analytics)
};
```

**How to get these values:**
1. Go to https://console.firebase.google.com
2. Select your project → Click ⚙️ gear → **Project settings**
3. Scroll to **Your apps** → Click your Web App icon `</>`
4. If no web app exists, click **Add app** → Choose Web → Register
5. Copy the `firebaseConfig` values into both `firebase-config.js` files

**After pasting keys, activate Firebase in db.js:**
Open `db.js` in BOTH folders. Change line 1:
```js
const USE_FIREBASE = true;  // ← Change false → true
```

---

## 3. ENVIRONMENT VARIABLES (Netlify)

Because these are plain HTML/JS PWAs (not React/Node), there is **no `process.env`**.
Firebase web API keys go directly in `firebase-config.js` — this is correct and safe.

> ⚠️ **Why this is safe:** Firebase web API keys are not secrets. Google designed them
> to be public. Security is enforced server-side by **Firestore Security Rules**
> (which only allow admin writes). Hiding the API key adds no security.

If you later add a Firebase Cloud Function (Node.js backend), those env vars
would be set in the Firebase Console under **Functions → Configuration**,
not in Netlify. For reference, the keys would be:

| Key | Value |
|-----|-------|
| `FIREBASE_PROJECT_ID`     | your-project-id |
| `FIREBASE_PRIVATE_KEY`    | From service account JSON |
| `FIREBASE_CLIENT_EMAIL`   | From service account JSON |

These are only needed for a server-side Admin SDK — not for these PWAs.

---

## 4. NETLIFY DEPLOYMENT — STEP BY STEP

You will create **two separate Netlify sites** from **one GitHub repository**.

---

### SITE 1: The Billy Living (Client App)

**Step 1** — Log into https://app.netlify.com

**Step 2** — Click **"Add new site"** → **"Import an existing project"**

**Step 3** — Click **GitHub** → Authorize → Select your repository

**Step 4** — Configure build settings:
```
Base directory:   client-app
Build command:    (leave empty)
Publish directory: client-app
```

**Step 5** — Click **"Deploy site"**

**Step 6** — After deploy, go to **Site settings → Domain management**
- Click **"Add custom domain"**
- Enter: `thebillyliving.com` (or your domain)
- Follow DNS instructions

**Step 7** — Go to **Site settings → Build & deploy → Environment**
- No environment variables needed for this PWA.

---

### SITE 2: ayooluwa (Admin App)

**Step 1** — Back on Netlify dashboard, click **"Add new site"** again

**Step 2** — Click **GitHub** → Select the **same repository**

**Step 3** — Configure build settings — ⚠️ THIS IS THE KEY DIFFERENCE:
```
Base directory:    admin-app        ← Different from Site 1
Build command:     (leave empty)
Publish directory: admin-app        ← Different from Site 1
```

**Step 4** — Click **"Deploy site"**

**Step 5** — After deploy, go to **Site settings → Domain management**
- Add your admin domain (e.g., `admin.thebillyliving.com` or keep the random Netlify URL)
- Recommend: **Do not publicize this URL**. Share only with yourself.

---

### HOW THE BASE DIRECTORY WORKS

Setting `Base directory: client-app` tells Netlify:
> "Treat the `client-app/` folder as if it were the root of the site."

So `client-app/index.html` becomes `https://yoursite.com/index.html` (the homepage).
Same logic applies to the admin app with `Base directory: admin-app`.

This is how one GitHub repository produces two completely separate, independent websites.

---

## 5. FIRESTORE SECURITY RULES

Deploy these rules from Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }

    // Public content — READ ONLY for everyone
    match /posts/{id}      { allow read: if resource.data.published == true; allow write: if isAdmin(); }
    match /stories/{id}    { allow read: if resource.data.active == true;    allow write: if isAdmin(); }
    match /catalog/{id}    { allow read: if resource.data.published == true; allow write: if isAdmin(); }
    match /trending/{id}   { allow read: if resource.data.published == true; allow write: if isAdmin(); }
    match /portfolio/{id}  { allow read: if resource.data.published == true; allow write: if isAdmin(); }
    match /designers/{id}  { allow read: if true;                            allow write: if isAdmin(); }
    match /meta/{id}       { allow read: if true;                            allow write: if isAdmin(); }

    // VIP users
    match /vipUsers/{userId} {
      allow read: if isAdmin() || (request.auth != null && request.auth.uid == userId);
      allow create: if request.auth != null && request.auth.uid == userId && request.resource.data.status == 'pending';
      allow update, delete: if isAdmin();
    }

    // Deny everything else
    match /{document=**} { allow read, write: if false; }
  }
}
```

**To set Admin custom claim** (run once from Firebase Admin SDK):
```js
const admin = require('firebase-admin');
admin.auth().setCustomUserClaims('YOUR_UID_HERE', { admin: true });
```

---

## 6. VALIDATION — READ/WRITE CONFIRMATION

### ✅ Client App (`client-app/db.js`)
| Method    | Exists? | Notes |
|-----------|---------|-------|
| `read()`  | ✅ Yes  | Reads published content only |
| `listen()`| ✅ Yes  | Real-time updates (read-only) |
| `write()` | ❌ NO   | Method does not exist in this file |
| `delete()`| ❌ NO   | Method does not exist in this file |

The client `index.html` has **zero** calls to any write or delete function.
Even if a user opens DevTools, there is no `TBL_DB.write` or `TBL_DB.delete` to call.

### ✅ Admin App (`admin-app/db.js`)
| Method    | Exists? | Notes |
|-----------|---------|-------|
| `read()`  | ✅ Yes  | Full read access |
| `listen()`| ✅ Yes  | Real-time updates |
| `write()` | ✅ Yes  | Admin only — password protected at app level, Firestore rules at server level |
| `delete()`| ✅ Yes  | Admin only |

### ✅ VIP Vault
- **Unauthenticated / Guest**: Sees locked gate with "Request VIP Access" button
- **Pending VIP**: Sees "Access Pending" holding screen
- **Approved VIP**: Sees exclusive collection content
- **Admin**: Can approve/reject VIP status from ayooluwa dashboard

---

## 7. DEMO CREDENTIALS

### Client App — The Billy Living
| Type | Email | Password |
|------|-------|----------|
| VIP (approved) | adaeze@example.com | any (demo) |
| Guest | — | tap "Continue as guest" |
| New user | any email | any password → creates pending account |

### Admin App — ayooluwa
| Field | Value |
|-------|-------|
| Password | `1AYOoluw$` |

---

## 8. MAKING APPS INSTALLABLE (Play Store / App Store)

### Android — Google Play (via TWA)
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://thebillyliving.com/manifest.json
bubblewrap build
# Upload generated .aab to play.google.com/console
```
- App Name on Play Store: **TBL Interiors**
- Admin app: **ayooluwa** (separate Play Store listing)

### iOS — App Store (via PWABuilder)
1. Visit https://pwabuilder.com
2. Enter `https://thebillyliving.com`
3. Download iOS package → Open in Xcode → Archive → App Store Connect
4. App Name: **The Billy Living**

---

## 9. ICONS REQUIRED

Create these PNG files and add to `client-app/icons/` and `admin-app/icons/`:

| File | Size | Notes |
|------|------|-------|
| `icon-192.png` | 192×192 | Required for Android install prompt |
| `icon-512.png` | 512×512 | Required for Play Store |

- **Client icons**: Use TBL gold/warm branding
- **Admin icons**: Use a clean, abstract mark — distinct from client
