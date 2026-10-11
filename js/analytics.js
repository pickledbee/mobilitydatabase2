/* Used Mobility Market - Google Analytics 4 (visit counts only).
   Does nothing until a Measurement ID (looks like G-XXXXXXXXXX) is set as GA_ID in js/config.js.
   Not loaded on the admin page, never sent the part of the address after "?" or "#"
   (sign-in and unsubscribe links carry private codes there), no ad features,
   and respects the visitor's opt-out, Do Not Track and Global Privacy Control. */
(function () {
  'use strict';
  var CFG = window.MDB_CONFIG || {};
  var ID = String(CFG.GA_ID || '').trim();
  var KEY = 'mdb_no_analytics';

  function get() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { if (v) { window.localStorage.setItem(KEY, '1'); } else { window.localStorage.removeItem(KEY); } } catch (e) { /* ignore */ } }

  // opt-out switch on the Cookies and data page
  function wireSwitch() {
    var box = document.getElementById('analytics-optout');
    if (!box) { return; }
    var msg = document.getElementById('analytics-optout-status');
    function show() { var off = !!get(); box.textContent = off ? 'Turn visit counting back on' : 'Turn visit counting off'; if (msg) { msg.textContent = off ? 'Visit counting is OFF in this browser.' : 'Visit counting is ON in this browser.'; } }
    box.addEventListener('click', function () { set(get() ? '' : '1'); show(); });
    show();
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', wireSwitch); } else { wireSwitch(); }

  if (!/^G-[A-Z0-9]{6,14}$/i.test(ID)) { return; }
  var page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (page === 'admin.html') { return; }
  if (get()) { return; }
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true) { return; }

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
  gtag('config', ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: window.location.origin + window.location.pathname,
    page_referrer: document.referrer ? document.referrer.split('?')[0].split('#')[0] : undefined
  });
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
  document.head.appendChild(s);

  // count clicks on the Mobility City delivery sign-up link
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="mobilitycity.com"]') : null;
    if (a) { gtag('event', 'mobility_city_click', { link_page: page }); }
  });
})();
