/* Mobility Database - shared code used by every page.
   Plain JavaScript, no libraries. Talks to the Google Apps Script web app named in config.js. */
(function () {
  'use strict';
  var CFG = window.MDB_CONFIG || {};
  var M = window.MDB = { pages: {} };

  // ------------------------------------------------------------------ storage
  var mem = {};
  function sget(k) { try { return window.localStorage.getItem(k); } catch (e) { return mem[k] === undefined ? null : mem[k]; } }
  function sset(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  function sdel(k) { try { window.localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
  M.store = { get: sget, set: sset, del: sdel };

  // ------------------------------------------------------------------ small helpers
  M.esc = function (s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var esc = M.esc;
  M.escBr = function (s) { return esc(s).replace(/\r?\n/g, '<br>'); };
  M.$ = function (sel, root) { return (root || document).querySelector(sel); };
  M.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  M.money = function (n, free) {
    n = Number(n) || 0;
    if (free || n === 0) { return 'Free'; }
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: n % 1 ? 2 : 0, minimumFractionDigits: n % 1 ? 2 : 0 });
  };
  M.moneyExact = function (n) { return '$' + (Number(n) || 0).toFixed(2); };
  M.date = function (iso) {
    iso = String(iso || '');
    if (!iso) { return ''; }
    var d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) { d = new Date(Number(iso.substr(0, 4)), Number(iso.substr(5, 2)) - 1, Number(iso.substr(8, 2))); }
    else { d = new Date(iso); }
    if (isNaN(d.getTime())) { return ''; }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  M.dateTime = function (iso) {
    var d = new Date(String(iso || ''));
    if (isNaN(d.getTime())) { return ''; }
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };
  M.ago = function (iso) {
    var d = new Date(String(iso || '')); if (isNaN(d.getTime())) { return ''; }
    var s = Math.max(0, (Date.now() - d.getTime()) / 1000);
    if (s < 3600) { return Math.max(1, Math.round(s / 60)) + ' min ago'; }
    if (s < 86400) { return Math.round(s / 3600) + ' hr ago'; }
    if (s < 86400 * 14) { return Math.round(s / 86400) + ' days ago'; }
    return M.date(iso);
  };
  M.params = function () {
    var o = {}, q = window.location.search.replace(/^\?/, '');
    if (!q) { return o; }
    q.split('&').forEach(function (p) {
      var kv = p.split('=');
      try { o[decodeURIComponent(kv[0])] = decodeURIComponent((kv.slice(1).join('=') || '').replace(/\+/g, ' ')); } catch (e) { /* ignore bad escape */ }
    });
    return o;
  };
  M.qs = function (obj) {
    var parts = [];
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v === '' || v === null || v === undefined || v === false) { return; }
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v === true ? '1' : v));
    });
    return parts.join('&');
  };
  M.validEmail = function (e) { return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(String(e || '').trim()); };
  M.photoUrl = function (id, w) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (w || 800); };
  M.gradeClass = function (g) { return g === 'A' ? 'grade-A' : g === 'B' ? 'grade-B' : g === 'C' ? 'grade-C' : 'grade-P'; };
  M.gradeLetter = function (g) { return g === 'Parts Only' ? 'P' : g; };
  M.title = function (L) { return [L.year, L.make, L.model].filter(function (x) { return x; }).join(' '); };
  M.safeNext = function (n) { return /^[a-z0-9\-]+\.html(\?[A-Za-z0-9=&%_.\-]*)?$/i.test(String(n || '')) ? n : ''; };

  // ------------------------------------------------------------------ icons
  var ICONS = {
    wheelchair: '<circle cx="9" cy="17" r="4.5"/><path d="M8 3v9h7l3 6h3M8 8h5"/>',
    power: '<circle cx="8" cy="17" r="4"/><circle cx="17.5" cy="18.5" r="2"/><path d="M7 3v8h6l2.5 5M7 7h4M16 5l3 3"/>',
    scooter: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 15l3-6h4l2 9M13 9l-1-5H9M9 18h6"/>',
    walker: '<path d="M5 20V8M19 20V8M5 8h14M5 13h14M3 20h4M17 20h4"/>',
    lift: '<path d="M4 20L20 5M4 20h4M20 5v4"/><rect x="9" y="9" width="6" height="5" rx="1" transform="rotate(-36 12 11.5)"/>',
    ramp: '<path d="M3 19h18L5 19zM3 19L19 9v10M7 19v-2.5M11 19v-5M15 19v-7.5"/>',
    vehicle: '<path d="M3 15l2-6h10l4 6v3H3zM7 18v1M17 18v1M9 6l3-3 3 3"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>',
    bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',
    bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-.01"/>',
    parts: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    truck: '<path d="M2 6h11v10H2zM13 9h4l3 3v4h-7zM6 19.5a1.5 1.5 0 1 0 0-.01M17 19.5a1.5 1.5 0 1 0 0-.01"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    check: '<path d="M4 12.5l5 5 11-11"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    camera: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="14" r="4"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    ruler: '<path d="M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2"/>',
    doc: '<path d="M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h7"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    hand: '<path d="M8 12V5a1.5 1.5 0 0 1 3 0v6M11 11V3.5a1.5 1.5 0 0 1 3 0V11M14 11V5a1.5 1.5 0 0 1 3 0v8c0 5-2 8-6 8s-5-2-7-6l-1-2a1.5 1.5 0 0 1 2.5-1.5L8 14"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>'
  };
  M.icon = function (name, cls) {
    return '<svg class="' + esc(cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || ICONS.parts) + '</svg>';
  };
  var CAT_ICON = {
    'Mobility Scooter': 'scooter', 'Power Wheelchair': 'power', 'Manual Wheelchair': 'wheelchair', 'Walker or Rollator': 'walker',
    'Lift or Stair Lift': 'lift', 'Ramp': 'ramp', 'Vehicle Lift or Hand Controls': 'vehicle', 'Bathroom Safety': 'bath',
    'Bed or Lift Chair': 'bed', 'Parts and Accessories': 'parts'
  };
  M.catIcon = function (cat) { return CAT_ICON[cat] || 'parts'; };

  // ------------------------------------------------------------------ session
  M.token = function () { return sget('mdb_session') || ''; };
  M.user = function () { try { return JSON.parse(sget('mdb_user') || 'null'); } catch (e) { return null; } };
  M.setSession = function (token, user) { sset('mdb_session', token); sset('mdb_user', JSON.stringify(user || null)); };
  M.setUser = function (user) { sset('mdb_user', JSON.stringify(user || null)); };
  M.clearSession = function () { sdel('mdb_session'); sdel('mdb_user'); };
  M.loggedIn = function () { return !!M.token(); };
  M.here = function () {
    var f = window.location.pathname.split('/').pop() || 'index.html';
    return M.safeNext(f + window.location.search);
  };
  M.requireLogin = function () {
    if (M.loggedIn()) { return true; }
    var next = M.here();
    window.location.href = 'login.html' + (next ? '?next=' + encodeURIComponent(next) : '');
    return false;
  };

  // ------------------------------------------------------------------ api
  function mkErr(msg, code) { var e = new Error(msg); e.code = code || 'error'; return e; }
  M.api = function (action, data, opts) {
    opts = opts || {};
    var url = CFG.API_URL || '';
    if (!url || /PASTE_YOUR/.test(url)) {
      return Promise.reject(mkErr('This website is not connected to its back end yet. The site owner needs to paste the web app address into js/config.js (see the setup guide).', 'setup'));
    }
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, opts.timeout || 70000) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ a: action, d: data || {}, t: opts.noToken ? '' : M.token() }),
      redirect: 'follow',
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      if (timer) { clearTimeout(timer); }
      return r.text();
    }).then(function (txt) {
      var j;
      try { j = JSON.parse(txt); } catch (e) { throw mkErr('The server sent an answer we could not read. Please try again in a moment.', 'parse'); }
      if (!j.ok) {
        if (j.code === 'auth') { M.clearSession(); }
        throw mkErr(j.error || 'Something went wrong.', j.code);
      }
      return j.data;
    }, function (err) {
      if (timer) { clearTimeout(timer); }
      if (err && err.code) { throw err; }
      throw mkErr('We could not reach the server. Please check your internet connection and try again.', 'network');
    }).catch(function (err) {
      if (err && err.code === 'auth' && opts.authRedirect !== false && document.body.hasAttribute('data-auth')) { M.requireLogin(); }
      throw err;
    });
  };

  // ------------------------------------------------------------------ config (with offline fallback)
  var FALLBACK = {
    siteName: 'Mobility Database', supportEmail: '', offline: true, ratesConfirmed: false, maxPhotos: 6, maxPhotoBytes: 3145728,
    categories: ['Mobility Scooter', 'Power Wheelchair', 'Manual Wheelchair', 'Walker or Rollator', 'Lift or Stair Lift', 'Ramp', 'Vehicle Lift or Hand Controls', 'Bathroom Safety', 'Bed or Lift Chair', 'Parts and Accessories'].map(function (n) {
      return { name: n, serialRequired: ['Walker or Rollator', 'Ramp', 'Bathroom Safety', 'Parts and Accessories'].indexOf(n) === -1 };
    }),
    grades: [
      { key: 'A', label: 'Grade A - Like new', text: 'Looks and works like new. No cracks, tears, rust, or repairs. Battery holds a full charge and the seller can show it working. Includes original charger and parts.' },
      { key: 'B', label: 'Grade B - Good', text: 'Works fully. Normal signs of use such as light scratches or seat wear. No safety problems. Battery works but may be a few years old.' },
      { key: 'C', label: 'Grade C - Fair', text: 'Works but shows heavy wear or has a known small issue (for example a tired battery, a worn seat, or a missing cosmetic part). The seller must describe every issue in the listing.' },
      { key: 'Parts Only', label: 'Parts Only', text: 'Does not work safely as it is, or is missing key parts. Sold for repair or for parts. The buyer should not use it for mobility until it is repaired and checked by a qualified technician.' }
    ],
    states: ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'],
    pickupOptions: ['Buyer picks up', 'Seller can meet nearby', 'Mobility City delivery (Wisconsin)', 'Buyer arranges own transport'],
    disclaimer: 'Mobility Database is a listing service. We do not own, inspect, or sell the equipment, and we are not a medical provider. Buyers and sellers deal with each other directly.',
    carrierDisclosure: 'Delivery is performed by an independent delivery partner, not by Mobility Database.',
    allowedVideoHosts: ['youtube.com', 'youtu.be', 'vimeo.com']
  };
  var cfgPromise = null;
  M.config = function () {
    if (!cfgPromise) {
      cfgPromise = M.api('config', {}, { noToken: true }).catch(function (e) {
        var f = JSON.parse(JSON.stringify(FALLBACK)); f.error = e && e.message; return f;
      });
    }
    return cfgPromise;
  };

  // ------------------------------------------------------------------ UI helpers
  function toastRegion() {
    var r = document.getElementById('toasts');
    if (!r) { r = document.createElement('div'); r.id = 'toasts'; r.className = 'toast-region'; r.setAttribute('role', 'status'); r.setAttribute('aria-live', 'polite'); document.body.appendChild(r); }
    return r;
  }
  M.toast = function (msg, kind) {
    var t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    toastRegion().appendChild(t);
    setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, kind === 'error' ? 9000 : 5000);
  };
  M.showError = function (container, msg) {
    if (!container) { M.toast(msg, 'error'); return; }
    var n = container.querySelector('.form-error');
    if (!n) {
      n = document.createElement('div'); n.className = 'notice notice-error form-error'; n.setAttribute('role', 'alert'); n.tabIndex = -1;
      container.insertBefore(n, container.firstChild);
    }
    n.innerHTML = '<p>' + esc(msg) + '</p>';
    n.hidden = false;
    n.scrollIntoView({ block: 'center', behavior: 'smooth' });
    try { n.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  };
  M.clearError = function (container) {
    var n = container && container.querySelector('.form-error');
    if (n) { n.hidden = true; n.innerHTML = ''; }
  };
  M.busy = function (btn, text) {
    if (!btn) { return function () {}; }
    var old = btn.innerHTML;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = text || 'Working...';
    return function () { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = old; };
  };
  M.modal = function (html, opts) {
    opts = opts || {};
    var d = document.createElement('dialog');
    d.innerHTML = '<div class="dialog-body"><button type="button" class="dialog-close" aria-label="Close">Close</button>' + html + '</div>';
    document.body.appendChild(d);
    d.querySelector('.dialog-close').addEventListener('click', function () { d.close(); });
    d.addEventListener('close', function () { if (d.parentNode) { d.parentNode.removeChild(d); } if (opts.onClose) { opts.onClose(); } });
    d.addEventListener('click', function (e) { if (e.target === d) { d.close(); } });
    if (typeof d.showModal === 'function') { d.showModal(); } else { d.setAttribute('open', ''); }
    return d;
  };
  M.confirm = function (message, yesText, danger) {
    return new Promise(function (resolve) {
      var done = false;
      var d = M.modal('<h2>Please confirm</h2><p>' + esc(message) + '</p><div class="row"><button type="button" class="btn ' + (danger ? 'btn-danger' : '') + '" data-yes>' + esc(yesText || 'Yes') + '</button><button type="button" class="btn btn-secondary" data-no>Cancel</button></div>', { onClose: function () { if (!done) { done = true; resolve(false); } } });
      d.querySelector('[data-yes]').addEventListener('click', function () { done = true; resolve(true); d.close(); });
      d.querySelector('[data-no]').addEventListener('click', function () { d.close(); });
    });
  };
  M.loading = function (msg) { return '<p class="muted" role="status">' + esc(msg || 'Loading...') + '</p>'; };
  M.errorBox = function (err) {
    var m = typeof err === 'string' ? err : (err && err.message) || 'Something went wrong.';
    return '<div class="notice notice-error" role="alert"><p>' + esc(m) + '</p></div>';
  };
  M.fillSelect = function (sel, items, blankLabel, valueFn, labelFn) {
    if (!sel) { return; }
    var cur = sel.value;
    sel.innerHTML = (blankLabel !== null && blankLabel !== undefined ? '<option value="">' + esc(blankLabel) + '</option>' : '') +
      items.map(function (it) {
        var v = valueFn ? valueFn(it) : it, l = labelFn ? labelFn(it) : it;
        return '<option value="' + esc(v) + '">' + esc(l) + '</option>';
      }).join('');
    if (cur) { sel.value = cur; }
  };

  // ------------------------------------------------------------------ human check + honeypot
  var hcCount = 0;
  M.humanCheck = function (container, opts) {
    opts = opts || {};
    hcCount++;
    var id = 'hc' + hcCount;
    var box = document.createElement('div');
    box.className = 'human-check';
    box.innerHTML = '<label for="' + id + '">Quick check to keep out robots: <span data-q>Loading the question...</span></label>' +
      '<input id="' + id + '" type="text" inputmode="numeric" autocomplete="off" maxlength="3" required aria-required="true">' +
      '<div class="hp-field" aria-hidden="true"><label>Leave this box empty<input type="text" tabindex="-1" autocomplete="off" data-hp></label></div>';
    container.appendChild(box);
    var state = { ts: 0, sig: '', loaded: false, loading: null };
    var qEl = box.querySelector('[data-q]'), input = box.querySelector('input[type="text"]'), hp = box.querySelector('[data-hp]');
    function load() {
      if (state.loading) { return state.loading; }
      qEl.textContent = 'Loading the question...';
      state.loading = M.api('challenge', {}, { noToken: true }).then(function (r) {
        state.ts = r.ts; state.sig = r.sig; state.loaded = true; qEl.textContent = r.q; input.value = '';
        state.loading = null;
      }, function (e) { state.loading = null; qEl.textContent = 'Could not load. ' + (e && e.message ? e.message : ''); });
      return state.loading;
    }
    if (!opts.lazy) { load(); }
    return {
      el: box, load: load, input: input,
      ensure: function () { return state.loaded ? Promise.resolve() : load(); },
      values: function () { return { hp: hp.value, ch: { ts: state.ts, sig: state.sig, ans: input.value } }; },
      reset: function () { state.loaded = false; state.loading = null; return load(); }
    };
  };

  // ------------------------------------------------------------------ subscribe (dialog + generic)
  function roleOptionsHtml(selected) {
    return [['buyer', 'I am looking to buy'], ['seller', 'I have equipment to sell'], ['caregiver', 'I am a caregiver or family member'], ['dealer', 'I run a business']].map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === selected ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');
  }
  M.roleOptionsHtml = roleOptionsHtml;
  // Opens a dialog with the full signup form.
  M.openSubscribe = function (o) {
    o = o || {};
    var source = o.source || 'popup';
    var d = M.modal('<h2>' + esc(o.title || 'Get new listings and price drops by email') + '</h2>' +
      '<p>' + esc(o.text || 'One short email a week. We never share your address, and every email has an unsubscribe link.') + '</p>' +
      '<form novalidate data-sub><div class="field"><label for="sd-email">Email address</label><input id="sd-email" type="email" autocomplete="email" required></div>' +
      '<div class="field"><label for="sd-role">I am</label><select id="sd-role">' + roleOptionsHtml(o.role || 'buyer') + '</select></div>' +
      '<div class="check"><input type="checkbox" id="sd-consent" required><label for="sd-consent">Yes, email me the weekly update. I can unsubscribe at any time.</label></div>' +
      '<div data-hc></div><button class="btn btn-block" type="submit">Sign me up</button></form><div data-done hidden></div>');
    var form = d.querySelector('[data-sub]'), hc = M.humanCheck(d.querySelector('[data-hc]'));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      M.clearError(form);
      var email = form.querySelector('#sd-email').value.trim();
      if (!M.validEmail(email)) { M.showError(form, 'Please enter a valid email address.'); return; }
      if (!form.querySelector('#sd-consent').checked) { M.showError(form, 'Please check the box to confirm you want the weekly email.'); return; }
      var done = M.busy(form.querySelector('button[type=submit]'), 'Signing you up...');
      var v = hc.values();
      M.api('subscribe', { email: email, role: form.querySelector('#sd-role').value, consent: true, source: source, hp: v.hp, ch: v.ch }).then(function () {
        sset('mdb_subscribed', '1');
        form.hidden = true;
        var dn = d.querySelector('[data-done]'); dn.hidden = false;
        dn.innerHTML = '<div class="notice notice-ok" role="status"><p><strong>You are signed up.</strong> Watch for the next weekly update.</p></div><button class="btn" type="button" data-close>Close</button>';
        dn.querySelector('[data-close]').addEventListener('click', function () { d.close(); });
        if (o.onDone) { o.onDone(email); }
      }, function (err) { done(); hc.reset(); M.showError(form, err.message); });
    });
    return d;
  };

  // Generic inline subscribe form: <form data-subscribe data-source="footer"> with email, consent and a .hc-slot
  M.wireSubscribeForm = function (form, o) {
    o = o || {};
    var slot = form.querySelector('.hc-slot'), hc = null;
    var emailInput = form.querySelector('input[type="email"]');
    function ensureHc() { if (!hc && slot) { hc = M.humanCheck(slot); } return hc; }
    if (emailInput) { emailInput.addEventListener('focus', ensureHc, { once: true }); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      M.clearError(form);
      var email = (emailInput.value || '').trim();
      if (!M.validEmail(email)) { M.showError(form, 'Please enter a valid email address.'); return; }
      var cb = form.querySelector('input[type="checkbox"]');
      if (cb && !cb.checked) { M.showError(form, 'Please check the box to confirm you want the email.'); return; }
      ensureHc();
      var btn = form.querySelector('button[type="submit"]');
      var done = M.busy(btn, 'Signing you up...');
      var v = hc.values();
      var roleSel = form.querySelector('select[name="role"]');
      M.api('subscribe', { email: email, role: roleSel ? roleSel.value : (o.role || ''), consent: true, source: o.source || form.getAttribute('data-source') || 'footer', hp: v.hp, ch: v.ch }).then(function (r) {
        sset('mdb_subscribed', '1');
        done();
        var ok = document.createElement('div'); ok.className = 'notice notice-ok'; ok.setAttribute('role', 'status');
        ok.innerHTML = '<p><strong>Thank you.</strong> You are signed up.</p>';
        form.parentNode.replaceChild(ok, form);
        if (o.onDone) { o.onDone(email, r); }
      }, function (err) { done(); hc.reset(); M.showError(form, err.message); });
    });
  };

  // ------------------------------------------------------------------ listing card
  M.listingCard = function (L, o) {
    o = o || {};
    var photo = L.photos && L.photos[0]
      ? '<img src="' + esc(M.photoUrl(L.photos[0], 600)) + '" alt="" loading="lazy" data-photo>'
      : M.icon(M.catIcon(L.category));
    var badges = '';
    if (L.carrierChecked) { badges += '<span class="badge badge-green">' + M.icon('shield') + 'Safety checked</span>'; }
    if (L.deliveryEligible) { badges += '<span class="badge">' + M.icon('truck') + 'Wisconsin delivery</span>'; }
    if (L.seller && L.seller.verified) { badges += '<span class="badge badge-green">' + M.icon('check') + 'Verified seller</span>'; }
    if (L.free) { badges += '<span class="badge badge-amber">Free</span>'; }
    var meta = [L.category, L.city + ', ' + L.state];
    if (L.distanceMiles !== undefined && L.distanceMiles !== null) { meta.push(L.distanceMiles + ' mi away'); }
    var fit = '';
    if (L.fitNotes && L.fitNotes.length) { fit += '<p class="lcard-fit">' + esc(L.fitNotes.join(' ')) + '</p>'; }
    if (L.fitWarnings && L.fitWarnings.length) { fit += '<p class="lcard-fit warn">' + esc(L.fitWarnings.join(' ')) + '</p>'; }
    var href = (o.href || 'listing.html?id=') + encodeURIComponent(L.id);
    return '<article class="lcard"><div class="lcard-photo">' + photo + '</div>' +
      '<span class="grade ' + M.gradeClass(L.grade) + '" title="' + esc(L.gradeLabel) + '"><span aria-hidden="true">' + esc(M.gradeLetter(L.grade)) + '</span><span class="sr-only">' + esc(L.gradeLabel) + '</span></span>' +
      (L.sample ? '<span class="badge badge-grey sample-flag">SAMPLE</span>' : '') +
      '<div class="lcard-body"><div class="lcard-price">' + esc(M.money(L.price, L.free)) + (L.previousPrice ? ' <s><span class="sr-only">was </span>' + esc(M.money(L.previousPrice)) + '</s>' : '') + '</div>' +
      '<h3 class="lcard-title"><a href="' + esc(href) + '">' + esc(M.title(L)) + '</a></h3>' +
      '<div class="lcard-meta">' + esc(meta.join(' · ')) + '</div>' + fit +
      (badges ? '<div class="lcard-badges">' + badges + '</div>' : '') + '</div></article>';
  };
  M.listingGrid = function (items) {
    return '<div class="listing-grid">' + items.map(function (L) { return M.listingCard(L); }).join('') + '</div>';
  };

  // ------------------------------------------------------------------ photos: compress and upload
  M.compressImage = function (file, maxBytes) {
    maxBytes = maxBytes || 3145728;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type || '')) { reject(new Error('That file is not a photo. Please choose a JPG or PNG picture.')); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var max = 1200, w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) { throw new Error('bad'); }
          var scale = Math.min(1, max / Math.max(w, h));
          var cw = Math.round(w * scale), ch = Math.round(h * scale);
          var c = document.createElement('canvas'); c.width = cw; c.height = ch;
          var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); ctx.drawImage(img, 0, 0, cw, ch);
          var q = 0.86, data = c.toDataURL('image/jpeg', q);
          while (data.length * 0.75 > maxBytes * 0.9 && q > 0.4) { q -= 0.1; data = c.toDataURL('image/jpeg', q); }
          URL.revokeObjectURL(url);
          resolve(data);
        } catch (e) { URL.revokeObjectURL(url); reject(new Error('We could not read that photo. Please try a JPG or PNG picture.')); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('We could not read that photo. Please try a JPG or PNG picture.')); };
      img.src = url;
    });
  };
  // action: 'uploadPhoto' (signed in) or 'carrierUpload' (extra = {id, key})
  M.uploadImage = function (file, action, extra, maxBytes) {
    return M.compressImage(file, maxBytes).then(function (data) {
      var d = { data: data };
      if (extra) { Object.keys(extra).forEach(function (k) { d[k] = extra[k]; }); }
      return M.api(action, d, { timeout: 120000 }).then(function (r) { return { fileId: r.fileId, preview: data }; });
    });
  };

  // ------------------------------------------------------------------ page chrome
  function enhanceChrome() {
    var page = document.body.getAttribute('data-page') || '';
    // nav toggle
    var tog = M.$('.nav-toggle'), nav = M.$('.site-nav');
    if (tog && nav) {
      tog.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        tog.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    // current page highlight
    var file = window.location.pathname.split('/').pop() || 'index.html';
    M.$$('.site-nav a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('?')[0].split('#')[0];
      if (href === file) { a.setAttribute('aria-current', 'page'); }
    });
    // account link state
    var acct = M.$('[data-nav-account]');
    var u = M.user();
    if (acct) {
      if (M.loggedIn()) {
        acct.textContent = 'My account'; acct.setAttribute('href', 'dashboard.html');
        var nm = M.$('[data-nav-messages]'); if (nm) { nm.hidden = false; }
        if (u && u.isAdmin) { var na = M.$('[data-nav-admin]'); if (na) { na.hidden = false; } }
      } else { acct.textContent = 'Sign in'; acct.setAttribute('href', 'login.html'); }
    }
    // footer subscribe
    var fs = M.$('#footer-subscribe');
    if (fs) { M.wireSubscribeForm(fs, { source: 'footer' }); }
    // sign-out buttons
    M.$$('[data-signout]').forEach(function (b) {
      b.addEventListener('click', function () {
        M.api('logout', {}, { authRedirect: false }).catch(function () {}).then(function () { M.clearSession(); window.location.href = 'index.html'; });
      });
    });
    // signup bar for visitors
    var barOk = document.body.getAttribute('data-bar') === '1';
    if (barOk && !M.loggedIn() && !sget('mdb_subscribed')) {
      var dismissed = Number(sget('mdb_bar_dismissed') || 0);
      if (!dismissed || Date.now() - dismissed > 14 * 86400000) {
        var shown = false;
        var show = function () {
          if (shown) { return; } shown = true;
          var bar = document.createElement('div');
          bar.className = 'signup-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Email signup');
          bar.innerHTML = '<div class="wrap"><p><strong>New listings and price drops, once a week.</strong> Free. Unsubscribe any time.</p><button class="btn btn-light" type="button" data-open>Sign up</button><button class="btn-link" type="button" data-no style="background:none;border:0;font:inherit;cursor:pointer;min-height:48px;text-decoration:underline">No thanks</button></div>';
          document.body.appendChild(bar); document.body.classList.add('has-bar');
          var close = function () { sset('mdb_bar_dismissed', String(Date.now())); if (bar.parentNode) { bar.parentNode.removeChild(bar); } document.body.classList.remove('has-bar'); };
          bar.querySelector('[data-no]').addEventListener('click', close);
          bar.querySelector('[data-open]').addEventListener('click', function () { M.openSubscribe({ source: 'bar', onDone: close }); });
        };
        setTimeout(show, 25000);
        window.addEventListener('scroll', function onS() { if (window.scrollY > document.body.scrollHeight * 0.45) { window.removeEventListener('scroll', onS); show(); } }, { passive: true });
      }
    }
    // data-open-subscribe buttons anywhere on a page
    M.$$('[data-open-subscribe]').forEach(function (b) {
      b.addEventListener('click', function () { M.openSubscribe({ source: b.getAttribute('data-open-subscribe') || 'popup', role: b.getAttribute('data-role') || 'buyer' }); });
    });
    // print buttons (pages cannot use inline scripts)
    M.$$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
    // support email address filled in from the back end settings
    var se = M.$$('[data-support-email]');
    if (se.length) {
      M.config().then(function (c) {
        if (c.supportEmail) { se.forEach(function (el) { el.innerHTML = '<a href="mailto:' + esc(c.supportEmail) + '">' + esc(c.supportEmail) + '</a>'; }); }
        else { se.forEach(function (el) { el.textContent = 'the contact form on the Contact page'; }); }
      });
    }
    // disclaimer text from the server (keeps wording in one place)
    var dis = M.$('[data-disclaimer]');
    if (dis) { M.config().then(function (c) { if (c.disclaimer) { dis.textContent = c.disclaimer; } }); }
    return page;
  }

  // broken photo fallback
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.hasAttribute('data-photo') && !t.getAttribute('data-failed')) {
      t.setAttribute('data-failed', '1');
      var holder = t.parentNode;
      if (holder) { var span = document.createElement('span'); span.innerHTML = M.icon('camera'); span.style.display = 'contents'; holder.replaceChild(span, t); }
    }
  }, true);

  // ------------------------------------------------------------------ start
  function start() {
    // Clickjacking guard: do not show this site inside someone else's frame.
    try { if (window.top !== window.self) { document.documentElement.style.display = 'none'; return; } } catch (e) { document.documentElement.style.display = 'none'; return; }
    var page = enhanceChrome();
    var fn = M.pages[page];
    if (fn) {
      try { fn(); } catch (e) {
        var main = document.getElementById('main');
        if (main) { main.insertAdjacentHTML('afterbegin', M.errorBox('Something on this page did not load: ' + (e && e.message))); }
        if (window.console) { console.error(e); }
      }
    }
  }
  // Deferred scripts run while readyState is 'interactive', before DOMContentLoaded, so page scripts loaded after this one are registered in time.
  if (document.readyState === 'complete') { start(); } else { document.addEventListener('DOMContentLoaded', start); }
})();
