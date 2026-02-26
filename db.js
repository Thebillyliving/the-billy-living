/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  AYOOLUWA ADMIN — Database Layer (READ + WRITE + DELETE)         ║
 * ║  This file exists ONLY in the admin-app folder.                  ║
 * ║  The client-app/db.js has NO write or delete methods.           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

(function(window) {
  'use strict';

  const USE_FIREBASE = false; // ← Set to true after pasting keys in firebase-config.js
  const STORE_KEY    = 'tbl_db_v2';  // Same key as client so both apps sync via localStorage
  const BC_NAME      = 'tbl_sync_v2';

  const SEED = {
    meta: {
      appName: 'The Billy Living',
      tagline: 'Luxury Interior Design',
      whatsappNumber: '+2349000000000',
      waMessage: 'Hello, I found you on The Billy Living app and would love to enquire about your interior design services.',
      measurementUnit: 'inches',
    },
    posts: [
      { id:'p1', author:'The Billy Living', location:'Lagos Island, Lagos', caption:'Minimalist living room with warm accents. Every piece curated for harmony and elegance.', emoji:'🛋️', likes:284, category:'living', published:true, createdAt: Date.now()-86400000*3 },
      { id:'p2', author:'TBL Design Studio', location:'Victoria Island, Lagos', caption:'Golden hour in the master suite. Our bespoke headboard panels add that editorial touch.', emoji:'🛏️', likes:512, category:'bedroom', published:true, createdAt: Date.now()-86400000*2 },
      { id:'p3', author:'The Billy Living', location:'Ikoyi, Lagos', caption:'Open-plan kitchen with marble island. Functionality meets beauty in every detail.', emoji:'🍽️', likes:390, category:'kitchen', published:true, createdAt: Date.now()-86400000 },
      { id:'p4', author:'TBL Design Studio', location:'Banana Island, Lagos', caption:'Home office reimagined. Clean lines, natural light, and the perfect ambient temperature.', emoji:'💻', likes:176, category:'office', published:true, createdAt: Date.now() },
    ],
    stories: [
      { id:'s1', name:'Studio', emoji:'🏛️', active:true },
      { id:'s2', name:'Clients', emoji:'👑', active:true },
      { id:'s3', name:'Process', emoji:'🔨', active:true },
      { id:'s4', name:'Reveal',  emoji:'✨', active:true },
    ],
    catalog: [
      { id:'c1', name:'Living Room',  emoji:'🛋️', color:'#C9A84C', desc:'Serenity · Warmth · Flow',   count:28, published:true },
      { id:'c2', name:'Bedroom',      emoji:'🛏️', color:'#8B6F8E', desc:'Calm · Intimacy · Rest',     count:22, published:true },
      { id:'c3', name:'Kitchen',      emoji:'🍽️', color:'#C0614B', desc:'Energy · Function · Joy',    count:19, published:true },
      { id:'c4', name:'Bathroom',     emoji:'🚿', color:'#4A7C8B', desc:'Refresh · Spa · Clean',      count:14, published:true },
      { id:'c5', name:'Home Office',  emoji:'💻', color:'#5C7A4E', desc:'Focus · Clarity · Inspire',  count:17, published:true },
      { id:'c6', name:'Outdoor',      emoji:'🌿', color:'#7A9B6B', desc:'Nature · Open · Breathe',    count:11, published:true },
      { id:'c7', name:'Dining Room',  emoji:'🕯️', color:'#B8813A', desc:'Gather · Elegance · Story',  count:16, published:true },
      { id:'c8', name:"Kids' Room",   emoji:'🎨', color:'#D4956A', desc:'Wonder · Play · Grow',       count:12, published:true },
    ],
    designers: [
      { id:'d1', name:'Amara Osei',      initials:'AO', specialty:'Luxury Residential',       tags:['Modern','Minimalist','West African'], online:true,  whatsapp:'+2349100000001' },
      { id:'d2', name:'Chidi Bello',     initials:'CB', specialty:'Commercial & Hospitality', tags:['Industrial','Contemporary'],           online:true,  whatsapp:'+2349100000002' },
      { id:'d3', name:'Fatima Al-Sayed', initials:'FA', specialty:'Boutique & Maximalist',    tags:['Boho','Art Deco','Color'],             online:false, whatsapp:'+2349100000003' },
    ],
    portfolio: [
      { id:'pf1', emoji:'🛋️', title:'Lagos Penthouse',      category:'living',   published:true },
      { id:'pf2', emoji:'🛏️', title:'Victoria Island Suite', category:'bedroom',  published:true },
      { id:'pf3', emoji:'🍽️', title:'Ikoyi Dining',          category:'dining',   published:true },
      { id:'pf4', emoji:'💻', title:'Island Office',          category:'office',   published:true },
      { id:'pf5', emoji:'🚿', title:'Spa Bathroom',           category:'bathroom', published:true },
      { id:'pf6', emoji:'🌿', title:'Tropical Garden',        category:'outdoor',  published:true },
      { id:'pf7', emoji:'🎨', title:"Kids' Wonderland",       category:'kids',     published:true },
      { id:'pf8', emoji:'🕯️', title:'Heritage Dining',        category:'dining',   published:true },
    ],
    vipUsers: [
      { id:'v1', name:'Mrs. Adaeze Agu',      email:'adaeze@example.com',     initials:'AA', tier:'Platinum', status:'approved', joinedAt: Date.now()-86400000*30 },
      { id:'v2', name:'Chief Emmanuel Nwosu', email:'enwosu@example.com',     initials:'EN', tier:'Gold',     status:'approved', joinedAt: Date.now()-86400000*14 },
      { id:'v3', name:'Dr. Kemi Babatunde',   email:'kbabatunde@example.com', initials:'KB', tier:'Platinum', status:'pending',  joinedAt: Date.now()-86400000*2  },
    ],
    trending: [
      { id:'t1', title:'Lagos Penthouse Reveal', views:'24.5K', emoji:'🏙️', badge:'Trending', published:true },
      { id:'t2', title:'Japandi Bedroom',         views:'18K',   emoji:'🌸', badge:'',         published:true },
      { id:'t3', title:'Marble Kitchen',           views:'31K',   emoji:'🪨', badge:'',         published:true },
      { id:'t4', title:'Boho Living Room',         views:'9.2K',  emoji:'🌿', badge:'',         published:true },
      { id:'t5', title:'Industrial Loft',           views:'14K',   emoji:'🔧', badge:'',         published:true },
    ],
  };

  let _cache = null;
  const _listeners = {};

  function _load() {
    if (_cache) return _cache;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      _cache = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(SEED));
    } catch(e) { _cache = JSON.parse(JSON.stringify(SEED)); }
    Object.keys(SEED).forEach(k => { if (!_cache[k]) _cache[k] = JSON.parse(JSON.stringify(SEED[k])); });
    return _cache;
  }

  function _save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(_cache));
    try { const bc = new BroadcastChannel(BC_NAME); bc.postMessage({ts:Date.now()}); bc.close(); } catch(e){}
  }

  function _notify(col) {
    (_listeners[col]||[]).forEach(cb => {
      const data = _load();
      cb(col==='meta' ? {...data.meta} : (data[col]||[]).map(i=>({...i})));
    });
  }

  window.addEventListener('storage', e => {
    if (e.key === STORE_KEY) { _cache=null; Object.keys(_listeners).forEach(col=>_notify(col)); }
  });

  // Firebase refs
  let _fb = null;
  async function _initFirebase() {
    if (_fb) return _fb;
    const cfg = window.__TBL_FIREBASE_CONFIG__;
    if (!cfg || cfg.apiKey.includes('PASTE')) return null;
    try {
      const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const { getFirestore, collection, doc, onSnapshot, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp } =
        await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      const app = getApps().length ? getApps()[0] : initializeApp(cfg);
      _fb = { db: getFirestore(app), auth: getAuth(app), collection, doc, onSnapshot, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp };
      return _fb;
    } catch(e) { console.warn('Firebase init failed:', e); return null; }
  }

  // ── PUBLIC API (READ + WRITE + DELETE) ────────────────────────────
  window.TBL_DB = {

    async read(col) {
      if (USE_FIREBASE) {
        const fb = await _initFirebase();
        if (fb) {
          if (col === 'meta') {
            const snap = await fb.getDoc(fb.doc(fb.db, 'meta', 'global'));
            return snap.exists() ? snap.data() : {..._load().meta};
          }
          const snap = await fb.getDocs(fb.collection(fb.db, col));
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      }
      const data = _load();
      return col==='meta' ? {...data.meta} : (data[col]||[]).map(i=>({...i}));
    },

    async write(col, item) {
      if (USE_FIREBASE) {
        const fb = await _initFirebase();
        if (fb) {
          if (col === 'meta') {
            await fb.setDoc(fb.doc(fb.db, 'meta', 'global'), { ...item, lastUpdated: fb.serverTimestamp() }, { merge: true });
            return item;
          }
          await fb.setDoc(fb.doc(fb.db, col, item.id), { ...item, updatedAt: fb.serverTimestamp() }, { merge: true });
          return item;
        }
      }
      const data = _load();
      if (col === 'meta') {
        data.meta = { ...data.meta, ...item };
      } else {
        const arr = data[col] || [];
        const idx = arr.findIndex(i => i.id === item.id);
        if (idx >= 0) arr[idx] = { ...arr[idx], ...item }; else arr.unshift(item);
        data[col] = arr;
      }
      _save(); _notify(col);
      return item;
    },

    async delete(col, id) {
      if (USE_FIREBASE) {
        const fb = await _initFirebase();
        if (fb) { await fb.deleteDoc(fb.doc(fb.db, col, id)); return; }
      }
      const data = _load();
      if (data[col]) data[col] = data[col].filter(i => i.id !== id);
      _save(); _notify(col);
    },

    async listen(col, callback) {
      if (USE_FIREBASE) {
        const fb = await _initFirebase();
        if (fb) {
          if (col === 'meta') return fb.onSnapshot(fb.doc(fb.db,'meta','global'), snap => callback(snap.exists()?snap.data():{}));
          return fb.onSnapshot(fb.collection(fb.db, col), snap => callback(snap.docs.map(d=>({id:d.id,...d.data()}))));
        }
      }
      if (!_listeners[col]) _listeners[col] = [];
      _listeners[col].push(callback);
      this.read(col).then(callback);
      try {
        const bc = new BroadcastChannel(BC_NAME);
        bc.onmessage = () => this.read(col).then(callback);
        return () => { bc.close(); _listeners[col]=_listeners[col].filter(c=>c!==callback); };
      } catch(e) { return ()=>{}; }
    },

    newId(prefix='id') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; },

    reset() { _cache=JSON.parse(JSON.stringify(SEED)); _save(); Object.keys(_listeners).forEach(col=>_notify(col)); },
  };

})(window);
