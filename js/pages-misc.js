/* Mobility Database - forms and directory pages:
   estate and downsizing request, contact, local directory, free guides. */
(function () {
  'use strict';
  const M = window.MDB;
  const esc = M.esc;
  const $ = M.$;

  // ================================================================== ESTATE / DOWNSIZING
  M.pages.estate = function () {
    const app = $('#app');
    M.config().then(cfg => {
      app.innerHTML = `<form id="ef" class="card" novalidate>
        <h2>Tell us what you have</h2>
        <div class="form-grid two">
          <div class="field"><label for="e-name">Your name</label><input id="e-name" name="name" type="text" maxlength="80" autocomplete="name" required></div>
          <div class="field"><label for="e-org">Organization (optional)</label><input id="e-org" name="organization" type="text" maxlength="100" placeholder="Example: Smith Estate Sales"></div>
          <div class="field"><label for="e-email">Email address</label><input id="e-email" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="e-phone">Phone (optional)</label><input id="e-phone" name="phone" type="tel" autocomplete="tel"></div>
          <div class="field"><label for="e-city">City</label><input id="e-city" name="city" type="text" maxlength="60"></div>
          <div class="field"><label for="e-state">State</label><select id="e-state" name="state"></select></div>
          <div class="field"><label for="e-count">About how many items?</label><input id="e-count" name="itemCount" type="text" maxlength="20" placeholder="Example: 6"></div>
          <div class="field"><label for="e-time">When do you need them gone?</label><input id="e-time" name="timeline" type="text" maxlength="60" placeholder="Example: Within a month"></div>
        </div>
        <div class="field"><label for="e-desc">What equipment is there?</label><textarea id="e-desc" name="description" rows="5" maxlength="1000" required placeholder="Example: Two scooters, a power chair, a walker, a ramp, a stair lift. Most are working."></textarea><p class="hint">Please describe the equipment only. Do not include anyone's health information.</p></div>
        <div class="check"><input type="checkbox" id="e-consent" name="consent"><label for="e-consent">Also email me the weekly update (optional).</label></div>
        <div id="e-hc"></div>
        <button class="btn" type="submit">Send my request</button></form>`;
      const f = $('#ef'), hc = M.humanCheck($('#e-hc'));
      M.fillSelect(f.state, cfg.states, 'Choose a state');
      f.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(f);
        if (f.name.value.trim().length < 2) { M.showError(f, 'Please enter your name.'); return; }
        if (!M.validEmail(f.email.value)) { M.showError(f, 'Please enter a valid email address.'); return; }
        if (f.description.value.trim().length < 10) { M.showError(f, 'Please describe the equipment in a sentence or two.'); return; }
        const done = M.busy(f.querySelector('button[type=submit]'), 'Sending...');
        const v = hc.values();
        M.api('estateRequest', { name: f.name.value, organization: f.organization.value, email: f.email.value, phone: f.phone.value, city: f.city.value, state: f.state.value, itemCount: f.itemCount.value, description: f.description.value, timeline: f.timeline.value, consent: f.consent.checked, hp: v.hp, ch: v.ch }, { noToken: true }).then(() => {
          app.innerHTML = '<div class="notice notice-ok" role="status"><h2 style="margin-top:0">Thank you</h2><p>We received your request and will reply within two business days.</p></div><p><a class="btn" href="index.html">Back to the home page</a></p>';
        }, err => { done(); hc.reset(); M.showError(f, err.message); });
      });
    });
  };

  // ================================================================== CONTACT
  M.pages.contact = function () {
    const app = $('#app');
    const p = M.params();
    app.innerHTML = `<form id="cf" class="card" novalidate>
      <div class="form-grid two">
        <div class="field"><label for="c-kind">What is this about?</label><select id="c-kind" name="kind">
          <option value="question">A question</option><option value="problem">A problem with a listing, delivery, or my account</option><option value="privacy">A privacy request (see or delete my data)</option><option value="business">Business or partnership</option><option value="story">Sharing my story</option></select></div>
        <div class="field"><label for="c-name">Your name</label><input id="c-name" name="name" type="text" maxlength="80" autocomplete="name"></div>
        <div class="field"><label for="c-email">Email address (so we can reply)</label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
      </div>
      <div class="field"><label for="c-msg">Your message</label><textarea id="c-msg" name="message" rows="6" maxlength="2000" required></textarea><p class="hint">Please do not include passwords or payment card numbers. We will never ask for them.</p></div>
      <div class="check" id="c-perm-row" hidden><input type="checkbox" id="c-perm" name="permission"><label for="c-perm">You may share my story on the Success Stories page (first name only).</label></div>
      <div class="check"><input type="checkbox" id="c-consent" name="consent"><label for="c-consent">Also email me the weekly update (optional).</label></div>
      <div id="c-hc"></div>
      <button class="btn" type="submit">Send message</button></form>`;
    const f = $('#cf'), hc = M.humanCheck($('#c-hc'));
    if (['question', 'problem', 'privacy', 'business', 'story'].includes(p.kind)) { f.kind.value = p.kind; }
    const syncPerm = () => { $('#c-perm-row').hidden = f.kind.value !== 'story'; };
    f.kind.addEventListener('change', syncPerm); syncPerm();
    M.config().then(cfg => {
      if (cfg.supportEmail) { const el = $('#contact-email'); if (el) { el.innerHTML = `You can also write to <a href="mailto:${esc(cfg.supportEmail)}">${esc(cfg.supportEmail)}</a>.`; } }
    });
    f.addEventListener('submit', e => {
      e.preventDefault(); M.clearError(f);
      if (!M.validEmail(f.email.value)) { M.showError(f, 'Please enter a valid email address so we can reply.'); return; }
      if (f.message.value.trim().length < 10) { M.showError(f, 'Please write a little more so we can help.'); return; }
      const done = M.busy(f.querySelector('button[type=submit]'), 'Sending...');
      const v = hc.values();
      M.api('contact', { kind: f.kind.value, name: f.name.value, email: f.email.value, message: f.message.value, permission: f.permission.checked, consent: f.consent.checked, hp: v.hp, ch: v.ch }, { noToken: true }).then(() => {
        app.innerHTML = '<div class="notice notice-ok" role="status"><h2 style="margin-top:0">Message sent</h2><p>Thank you. We will reply by email, usually within two business days.</p></div><p><a class="btn" href="index.html">Back to the home page</a></p>';
      }, err => { done(); hc.reset(); M.showError(f, err.message); });
    });
  };

  // ================================================================== DIRECTORY
  const TYPE_LABELS = { carrier: 'Delivery', repair: 'Repair', refurbisher: 'Refurbisher', dealer: 'Dealer', mover: 'Mover', battery: 'Batteries' };
  M.pages.directory = function () {
    const app = $('#app');
    app.innerHTML = M.loading('Loading...');
    M.config().then(cfg => {
      app.innerHTML = `<div class="card"><form id="df" class="inline-form" novalidate>
        <div class="field"><label for="dr-t">Type of business</label><select id="dr-t"><option value="">All types</option>${Object.keys(TYPE_LABELS).map(k => `<option value="${k}">${esc(TYPE_LABELS[k])}</option>`).join('')}</select></div>
        <div class="field"><label for="dr-s">State</label><select id="dr-s"></select></div>
        <button class="btn" type="submit">Show businesses</button></form></div>
        <div id="dr-list" style="margin-top:1.2rem"></div>
        <p class="med-note">These are independent businesses. Mobility Database does not own, supervise, or guarantee them. Check references and get written prices before you hire anyone.</p>`;
      M.fillSelect($('#dr-s'), cfg.states, 'Any state');
      const p = M.params();
      if (p.type) { $('#dr-t').value = p.type; }
      if (p.state) { $('#dr-s').value = p.state; }
      function load() {
        const list = $('#dr-list'); list.innerHTML = M.loading();
        M.api('partners', { type: $('#dr-t').value, state: $('#dr-s').value }, { noToken: true }).then(r => {
          if (!r.items.length) { list.innerHTML = '<div class="empty"><h2>No businesses listed here yet</h2><p>Run a repair shop, dealership, or moving company that works with mobility equipment? <a href="contact.html?kind=business">Ask to be listed</a>.</p></div>'; return; }
          list.innerHTML = r.items.map(x => `<article class="item-row" style="grid-template-columns:1fr"><div><h3 style="margin:0 0 .2em">${esc(x.name)} <span class="badge badge-grey">${esc(TYPE_LABELS[x.type] || x.type)}</span></h3>
            <p class="muted small" style="margin:0 0 .4em">${esc([x.city, x.state].filter(Boolean).join(', '))}${x.states ? ' &middot; serves ' + esc(x.states) : ''}</p>
            ${x.description ? `<p style="margin:0 0 .4em">${esc(x.description)}</p>` : ''}
            <div class="item-actions">${x.phone ? `<a class="btn btn-secondary btn-sm" href="tel:${esc(x.phone.replace(/[^\d+]/g, ''))}">Call ${esc(x.phone)}</a>` : ''}${x.website ? `<a class="btn btn-secondary btn-sm" href="${esc(x.website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}
            <button class="btn btn-sm" type="button" data-lead="${esc(x.id)}" data-name="${esc(x.name)}">Ask them to contact me</button></div></div></article>`).join('');
        }, err => { list.innerHTML = M.errorBox(err.message); });
      }
      $('#df').addEventListener('submit', e => { e.preventDefault(); load(); });
      $('#dr-list').addEventListener('click', e => {
        const b = e.target.closest('[data-lead]'); if (!b) { return; }
        if (!M.loggedIn()) { M.requireLogin(); return; }
        M.leadDialog(b.getAttribute('data-lead'), b.getAttribute('data-name'), '');
      });
      load();
    });
  };

  // ================================================================== FREE GUIDES (email signup, then open)
  const GUIDES = [
    { source: 'lead-buyer-checklist', title: 'Used Mobility Equipment Buying Checklist', blurb: 'A one-page checklist to carry when you look at a used scooter, power chair, wheelchair, or lift chair. Questions to ask, things to test, and red flags.', page: 'lead-buyer-checklist.html', pdf: 'downloads/Used-Mobility-Equipment-Buying-Checklist.pdf', role: 'buyer' },
    { source: 'lead-pricing-photos', title: 'How to Price and Photograph Your Equipment', blurb: 'For sellers. How to set a fair price, the six photos every listing needs, and how to write a description that answers questions before they are asked.', page: 'lead-pricing-photos.html', pdf: 'downloads/How-to-Price-and-Photograph-Your-Equipment.pdf', role: 'seller' },
    { source: 'lead-hospital-discharge', title: 'Hospital Discharge Equipment Guide for Caregivers', blurb: 'For families who suddenly need equipment at home. How to plan, measure, ask the right people, and shop used with confidence, without rushing.', page: 'lead-hospital-discharge.html', pdf: 'downloads/Hospital-Discharge-Equipment-Guide.pdf', role: 'caregiver' }
  ];
  M.pages.guides = function () {
    const app = $('#app');
    M.config().then(cfg => {
      app.innerHTML = `<div class="grid cols-3" id="g-cards">${GUIDES.map(g => `<article class="card" id="${esc(g.source)}"><h2 style="font-size:1.25rem">${esc(g.title)}</h2><p>${esc(g.blurb)}</p><div data-slot="${esc(g.source)}"></div></article>`).join('')}</div>
      <section id="grades" class="section" style="padding-bottom:0"><h2>What the condition grades mean</h2><p>Every listing uses the same four grades, so you can compare items without guessing. Sellers choose the grade, and a seller checklist backs it up. A grade is a description of condition, not a safety guarantee.</p>
        <div class="grade-pick">${cfg.grades.map(g => `<div class="grade-opt" style="cursor:default"><span class="grade ${M.gradeClass(g.key)}" aria-hidden="true">${esc(M.gradeLetter(g.key))}</span><span><strong>${esc(g.label)}</strong><p>${esc(g.text)}</p></span></div>`).join('')}</div></section>`;
      GUIDES.forEach(g => {
        const slot = $(`[data-slot="${g.source}"]`);
        const open = () => { slot.innerHTML = `<p><a class="btn" href="${esc(g.page)}">Open the guide</a> <a class="btn btn-secondary" href="${esc(g.pdf)}" download>Download PDF</a></p>`; };
        if (M.store.get('mdb_lead_' + g.source)) { open(); return; }
        slot.innerHTML = `<form novalidate><div class="field"><label for="${esc(g.source)}-e">Email address</label><input id="${esc(g.source)}-e" type="email" autocomplete="email" required></div>
          <div class="check"><input type="checkbox" id="${esc(g.source)}-c"><label for="${esc(g.source)}-c">Yes, also send me the weekly update. I can unsubscribe at any time.</label></div>
          <div class="hc-slot"></div><button class="btn btn-block" type="submit">Get the free guide</button></form>`;
        const f = slot.querySelector('form'), hcSlot = f.querySelector('.hc-slot');
        let hc = null;
        const ensure = () => { if (!hc) { hc = M.humanCheck(hcSlot); } };
        f.querySelector('input[type=email]').addEventListener('focus', ensure, { once: true });
        f.addEventListener('submit', e => {
          e.preventDefault(); M.clearError(f);
          const email = f.querySelector('input[type=email]').value.trim();
          if (!M.validEmail(email)) { M.showError(f, 'Please enter a valid email address.'); return; }
          ensure();
          const consent = f.querySelector('input[type=checkbox]').checked;
          const done = M.busy(f.querySelector('button[type=submit]'), 'One moment...');
          const v = hc.values();
          M.api('subscribe', { email: email, role: g.role, consent: consent, source: g.source, hp: v.hp, ch: v.ch }, { noToken: true }).then(() => {
            M.store.set('mdb_lead_' + g.source, '1'); if (consent) { M.store.set('mdb_subscribed', '1'); }
            open();
            slot.insertAdjacentHTML('afterbegin', `<div class="notice notice-ok" role="status"><p>${consent ? 'Thank you. We also emailed you a link to the guide.' : 'Here it is.'}</p></div>`);
          }, err => { done(); hc.reset(); M.showError(f, err.message); });
        });
      });
      if (window.location.hash) { const el = document.getElementById(window.location.hash.slice(1)); if (el) { el.scrollIntoView(); } }
    });
  };
})();
