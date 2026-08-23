// admin-module.js — The Billy Living admin panel, lazy-loaded into client.html
//
// This file is only fetched when a verified admin taps "Switch to Admin
// View" in Settings — regular clients never download it. Everything in here
// lives inside one IIFE so nothing it declares can collide with client.html's
// own globals (client.html already has its own diag(), showToast(), etc. —
// admin.html had different versions of the same names, which is exactly the
// bug this isolation avoids). The only thing this file exposes to the outside
// is window.BillyAdmin.
//
// PHASE 1 (this file): harness only — mounts, shows who's logged in and
// their rank, and can be closed. Confirms the lazy-load + isolation mechanism
// works end-to-end before Phase 2 ports over the real admin.html panels
// (Catalog Manager, Project Forms, Messages, Settings, etc.) into the
// render() function below.

(function () {
  'use strict';

  const RANK_LABELS = {
    head: 'Head Designer',
    lead: 'Lead Designer',
    assistant_lead: 'Assistant Lead Designer',
    designer: 'Designer'
  };

  let _onClose = null;
  let _mounted = false;

  function root() {
    return document.getElementById('adminViewRoot');
  }

  function render(uid, rank) {
    const r = root();
    r.innerHTML = `
      <div style="padding:16px 20px;border-bottom:1px solid rgba(201,168,76,.2);display:flex;align-items:center;gap:12px;">
        <button id="baBackBtn" style="background:none;border:none;color:#C9A84C;font-size:22px;padding:4px 8px;">←</button>
        <span style="font-family:'Cormorant Garamond',serif;font-size:18px;color:#C9A84C;">Command Center</span>
        <span style="margin-left:auto;font-size:10px;letter-spacing:1.5px;color:#50C878;text-transform:uppercase;">${RANK_LABELS[rank] || rank}</span>
      </div>
      <div style="flex:1;overflow-y:auto;padding:24px;color:rgba(201,168,76,.6);font-family:'Jost',sans-serif;font-size:13px;line-height:1.7;">
        <p>Admin harness loaded and verified for uid <span style="color:#C9A84C">${uid.slice(0, 8)}…</span></p>
        <p style="margin-top:12px;">This is Phase 1 — the panels (Catalog Manager, Project Forms, Messages, Settings) get ported in here next.</p>
      </div>
    `;
    const backBtn = document.getElementById('baBackBtn');
    if (backBtn) backBtn.addEventListener('click', () => { if (_onClose) _onClose(); });
  }

  window.BillyAdmin = {
    init(uid, rank, onClose) {
      _onClose = onClose;
      render(uid, rank);
      root().style.display = 'flex';
      _mounted = true;
    },
    hide() {
      // called by client.html's closeAdminView() for the normal back-to-client
      // path — module state (whatever Phase 2 adds: loaded lists, open
      // listeners, etc.) stays alive for a fast re-open.
    },
    teardown() {
      // called on logout — this is where Phase 2 will detach any Firebase
      // listeners the admin panels opened, so a different account logging in
      // on the same device never inherits stale admin state.
      _mounted = false;
      _onClose = null;
    }
  };
})();
