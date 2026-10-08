/* Mobility Database - account pages:
   login, create listing, wanted board, dashboard, messages, delivery, unsubscribe. */
(function () {
  'use strict';
  const M = window.MDB;
  const esc = M.esc;
  const $ = M.$;

  const linkBtn = 'style="background:none;border:0;font:inherit;cursor:pointer;color:var(--blue);text-decoration:underline;min-height:44px;padding:0"';

  // ================================================================== LOGIN
  const PW_HINT = 'At least 10 characters. A short sentence you will remember works well, for example: blue heron walks slowly';

  M.pages.login = function () {
    const app = $('#app');
    const p = M.params();
    const next = M.safeNext(p.next);
    const nextQ = next ? '?next=' + encodeURIComponent(next) : '';
    const goNext = () => window.location.replace(next || 'dashboard.html');

    // ---- the person pressed the link in an email
    if (p.t) {
      app.innerHTML = `<div class="card" role="status"><h2>One moment...</h2><p>Checking your link.</p></div>`;
      try { window.history.replaceState(null, '', 'login.html' + nextQ); } catch (e) { /* ignore */ }
      const signup = p.m === 'signup';
      M.api(signup ? 'verifySignup' : 'verifyLogin', { token: p.t }, { noToken: true }).then(r => {
        M.setSession(r.session, r.user, true);
        if (r.reset || (!signup && r.needsPassword)) { choosePassword(r.reset ? 'reset' : 'first'); }
        else { goNext(); }
      }, err => {
        app.innerHTML = `${M.errorBox(err.message)}<p><a class="btn" href="login.html${nextQ}">Back to sign in</a></p>`;
      });
      return;
    }

    if (M.loggedIn()) {
      app.innerHTML = `<div class="card"><h2>You are signed in</h2><p>${M.user() ? 'Signed in as <strong>' + esc(M.user().email) + '</strong>.' : ''}</p><p><a class="btn" href="${esc(next || 'dashboard.html')}">Continue</a> <button class="btn btn-secondary" type="button" data-signout>Sign out</button></p></div>`;
      $('[data-signout]').addEventListener('click', () => {
        M.api('logout', {}, { authRedirect: false }).catch(() => {}).then(() => { M.clearSession(); window.location.href = 'login.html'; });
      });
      return;
    }

    // ---- choose a password right after an email link (first time, or reset)
    function choosePassword(kind) {
      app.innerHTML = `<div class="card"><h2>${kind === 'reset' ? 'Choose a new password' : 'Create a password'}</h2>
        <p>${kind === 'reset' ? 'You are signed in. Choose a new password for next time.' : 'You are signed in. Create a password so you can sign in quickly next time. You can also skip this and keep using email links.'}</p>
        <form id="cp" novalidate>
          ${M.passwordField('cp-new', 'New password', { autocomplete: 'new-password', hint: PW_HINT })}
          ${M.passwordField('cp-new2', 'Type it again', { autocomplete: 'new-password' })}
          <button class="btn btn-block" type="submit">Save password</button>
        </form>
        ${kind === 'reset' ? '' : `<p style="margin-top:1rem"><button type="button" id="cp-skip" ${linkBtn}>Skip for now</button></p>`}</div>`;
      M.wirePasswordToggles(app);
      const f = $('#cp');
      const skip = $('#cp-skip'); if (skip) { skip.addEventListener('click', goNext); }
      f.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(f);
        const a = $('#cp-new').value, b = $('#cp-new2').value;
        if (a.length < 10) { M.showError(f, 'Your password needs at least 10 characters.'); return; }
        if (a !== b) { M.showError(f, 'The two passwords do not match. Please type them again.'); return; }
        const done = M.busy(f.querySelector('button[type=submit]'), 'Saving...');
        M.api('setPassword', { newPassword: a }).then(r => { M.setUser(r.user); M.toast('Password saved.', 'ok'); goNext(); }, err => { done(); M.showError(f, err.message); });
      });
    }

    // ---- "check your email" screen
    function sentScreen(title, email, lines) {
      app.innerHTML = `<div class="notice notice-ok" role="status"><h2 style="margin-top:0">${esc(title)}</h2><p>We sent an email to <strong>${esc(email)}</strong>.</p>${lines}<p>Nothing arrived? Look in your spam or junk folder, then <a href="login.html${nextQ}">try again</a>.</p></div>`;
    }

    // ---- forgot password / email me a link
    function emailLinkForm(reset) {
      app.innerHTML = `<div class="card"><h2>${reset ? 'Forgot your password?' : 'Email me a sign-in link'}</h2>
        <p>${reset ? 'Enter your email address. We will send you a link to choose a new password.' : 'Enter your email address. We will send a link that signs you in with no password.'}</p>
        <form id="ef" novalidate>
          <div class="field"><label for="e-email">Email address</label><input id="e-email" type="email" autocomplete="email" required></div>
          <div id="e-hc"></div>
          <button class="btn btn-block" type="submit">${reset ? 'Email me a reset link' : 'Email me a sign-in link'}</button>
        </form>
        <p style="margin-top:1rem"><a href="login.html${nextQ}">Back to sign in</a></p></div>`;
      const f = $('#ef'), hc = M.humanCheck($('#e-hc'));
      f.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(f);
        const email = $('#e-email').value.trim();
        if (!M.validEmail(email)) { M.showError(f, 'Please enter a valid email address.'); return; }
        const done = M.busy(f.querySelector('button[type=submit]'), 'Sending...');
        const v = hc.values();
        M.api('requestLogin', { email: email, reset: reset, next: next, hp: v.hp, ch: v.ch }, { noToken: true }).then(() => {
          sentScreen('Check your email', email, `<p>The link works once and expires in about 15 minutes.</p>`);
        }, err => { done(); hc.reset(); M.showError(f, err.message); });
      });
    }

    // ---- main screen: sign in / create account
    function main(mode) {
      const create = mode === 'create';
      app.innerHTML = `<div class="tabs" role="tablist" aria-label="Sign in or create an account">
          <button type="button" role="tab" id="t-in" aria-selected="${!create}" class="tab${create ? '' : ' active'}">Sign in</button>
          <button type="button" role="tab" id="t-new" aria-selected="${create}" class="tab${create ? ' active' : ''}">Create account</button>
        </div>
        <div class="card" role="tabpanel">${create ? createHtml() : signinHtml()}</div>
        <p class="small muted" style="margin-top:1rem">By continuing you agree to the <a href="terms.html">Terms of Use</a> and <a href="privacy.html">Privacy Policy</a>.</p>`;
      $('#t-in').addEventListener('click', () => main('signin'));
      $('#t-new').addEventListener('click', () => main('create'));
      M.wirePasswordToggles(app);
      if (create) { wireCreate(); } else { wireSignin(); }
    }

    function signinHtml() {
      return `<h2>Sign in</h2>
        <form id="sf" novalidate>
          <div class="field"><label for="s-email">Email address</label><input id="s-email" type="email" autocomplete="username" required></div>
          ${M.passwordField('s-pw', 'Password', { autocomplete: 'current-password' })}
          <div class="check"><input type="checkbox" id="s-keep" checked><label for="s-keep">Keep me signed in on this device for 30 days. Leave this unchecked on a shared or public computer.</label></div>
          <div id="s-hc"></div>
          <button class="btn btn-block" type="submit">Sign in</button>
        </form>
        <p style="margin:1rem 0 .3rem"><button type="button" id="s-forgot" ${linkBtn}>Forgot your password?</button></p>
        <p style="margin:0"><button type="button" id="s-link" ${linkBtn}>Email me a sign-in link instead</button></p>`;
    }
    function wireSignin() {
      const f = $('#sf'), hc = M.humanCheck($('#s-hc'));
      $('#s-forgot').addEventListener('click', () => emailLinkForm(true));
      $('#s-link').addEventListener('click', () => emailLinkForm(false));
      f.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(f);
        const email = $('#s-email').value.trim(), pw = $('#s-pw').value;
        if (!M.validEmail(email)) { M.showError(f, 'Please enter a valid email address.'); return; }
        if (!pw) { M.showError(f, 'Please enter your password.'); return; }
        const done = M.busy(f.querySelector('button[type=submit]'), 'Signing in...');
        const v = hc.values(), keep = $('#s-keep').checked;
        M.api('loginPassword', { email: email, password: pw, remember: keep, hp: v.hp, ch: v.ch }, { noToken: true }).then(r => {
          M.setSession(r.session, r.user, keep);
          goNext();
        }, err => { done(); hc.reset(); $('#s-pw').value = ''; M.showError(f, err.message); });
      });
    }

    function createHtml() {
      return `<h2>Create your account</h2>
        <p>One account works for buying and selling. We will email you a link to confirm your address.</p>
        <form id="cf" novalidate>
          <div class="field"><label for="c-email">Email address</label><input id="c-email" type="email" autocomplete="username" required><p class="hint">Never shown to other members.</p></div>
          ${M.passwordField('c-pw', 'Create a password', { autocomplete: 'new-password', hint: PW_HINT })}
          ${M.passwordField('c-pw2', 'Type the password again', { autocomplete: 'new-password' })}
          <div class="field"><label for="c-role">I am mostly here to</label><select id="c-role">${M.roleOptionsHtml('buyer')}</select></div>
          <div class="check"><input type="checkbox" id="c-consent"><label for="c-consent">Also email me the weekly update with new listings and price drops (optional).</label></div>
          <div id="c-hc"></div>
          <button class="btn btn-block" type="submit">Create my account</button>
        </form>`;
    }
    function wireCreate() {
      const f = $('#cf'), hc = M.humanCheck($('#c-hc'));
      f.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(f);
        const email = $('#c-email').value.trim(), a = $('#c-pw').value, b = $('#c-pw2').value;
        if (!M.validEmail(email)) { M.showError(f, 'Please enter a valid email address.'); return; }
        if (a.length < 10) { M.showError(f, 'Your password needs at least 10 characters.'); return; }
        if (a !== b) { M.showError(f, 'The two passwords do not match. Please type them again.'); return; }
        const done = M.busy(f.querySelector('button[type=submit]'), 'Creating...');
        const v = hc.values();
        M.api('signup', { email: email, password: a, role: $('#c-role').value, consent: $('#c-consent').checked, next: next, hp: v.hp, ch: v.ch }, { noToken: true }).then(() => {
          sentScreen('Almost done. Check your email', email, `<p>Press the button in that email to confirm your address and finish creating your account. The link works once and expires in about an hour.</p><p>If you already have an account, we sent a note about that instead.</p>`);
        }, err => { done(); hc.reset(); M.showError(f, err.message); });
      });
    }

    main(p.mode === 'create' || window.location.hash === '#create' ? 'create' : 'signin');
  };

  // ================================================================== CREATE LISTING
  M.pages['create-listing'] = function () {
    if (!M.requireLogin()) { return; }
    const app = $('#app');
    app.innerHTML = M.loading('Loading the form...');
    M.config().then(cfg => {
      const catOpts = cfg.categories;
      const stepNames = ['The item', 'Condition', 'Size and details', 'Photos and price', 'Review'];
      const carrierOpt = cfg.pickupOptions[2];
      const otherPickups = cfg.pickupOptions.filter((o, i) => i !== 2);
      let step = 1;
      const photos = [];   // { fileId, preview }

      app.innerHTML = `
      <ol class="steps-bar" id="cl-steps" aria-label="Progress">${stepNames.map((n, i) => `<li data-s="${i + 1}">${i + 1}. ${esc(n)}</li>`).join('')}</ol>
      <div id="cl-draft"></div>
      <form id="cl" class="card" novalidate>
        <section data-step="1"><h2>The item</h2>
          <div class="field"><label for="c-cat">Type of equipment</label><select id="c-cat" name="category" required></select></div>
          <div class="form-grid two">
            <div class="field"><label for="c-make">Make (the brand)</label><input id="c-make" name="make" type="text" maxlength="60" required></div>
            <div class="field"><label for="c-model">Model</label><input id="c-model" name="model" type="text" maxlength="80" required></div>
            <div class="field"><label for="c-year">Year bought or made</label><input id="c-year" name="year" type="number" min="1960" max="2100" inputmode="numeric"><p class="hint">Leave blank if you do not know.</p></div>
            <div class="field"><label for="c-serial">Serial number</label><input id="c-serial" name="serial" type="text" maxlength="60" autocomplete="off"><p class="hint" id="c-serial-hint">Look for a metal or sticker plate on the frame or under the seat. Buyers can check an item's history by serial number.</p></div>
          </div>
          <div class="check"><input type="checkbox" id="c-noserial" name="noSerial"><label for="c-noserial">I cannot find the serial number</label></div>
          <p class="hint">Listings without a serial number are reviewed by a person before they go live.</p>
        </section>

        <section data-step="2" hidden><h2>Condition</h2>
          <fieldset><legend>Pick the grade that fits best. Be honest. Honest grades sell faster and prevent disputes.</legend>
            <div class="grade-pick">${cfg.grades.map(g => `<label class="grade-opt"><input type="radio" name="grade" value="${esc(g.key)}"><span class="grade ${M.gradeClass(g.key)}" aria-hidden="true">${esc(M.gradeLetter(g.key))}</span><span><strong>${esc(g.label)}</strong><p>${esc(g.text)}</p></span></label>`).join('')}</div>
          </fieldset>
          <fieldset><legend>Seller checklist (all four are required)</legend>
            <p class="hint">If something does not apply or does not work, choose Parts Only and explain it in the description. Do not check a box that is not true.</p>
            <div class="check"><input type="checkbox" id="k1" name="poweredOn"><label for="k1">I turned it on and it powers up (or it needs no power).</label></div>
            <div class="check"><input type="checkbox" id="k2" name="brakes"><label for="k2">I tested the brakes or locks, and they hold.</label></div>
            <div class="check"><input type="checkbox" id="k3" name="batteryTested"><label for="k3">I tested the battery (or it has no battery).</label></div>
            <div class="check"><input type="checkbox" id="k4" name="cleaned"><label for="k4">I cleaned it, including the seat, arms, and controls.</label></div>
          </fieldset>
          <div class="form-grid two">
            <div class="field"><label for="c-bt">Battery type</label><input id="c-bt" name="batteryType" type="text" maxlength="60" placeholder="Example: Sealed lead-acid, Lithium"></div>
            <div class="field"><label for="c-ba">Battery age (years)</label><input id="c-ba" name="batteryAgeYears" type="number" min="0" max="30" step="0.5" inputmode="decimal"></div>
            <div class="field"><label for="c-rg">Range on a full charge (miles)</label><input id="c-rg" name="rangeMiles" type="number" min="0" max="100" inputmode="decimal"></div>
            <div class="field"><label for="c-ls">Last serviced</label><input id="c-ls" name="lastService" type="date"></div>
          </div>
          <div class="field"><label for="c-sn">Service history and known issues</label><textarea id="c-sn" name="serviceNotes" rows="3" maxlength="500"></textarea><p class="hint">Mention every problem, even small ones.</p></div>
        </section>

        <section data-step="3" hidden><h2>Size and details</h2>
          <p class="hint">These numbers help buyers see whether it fits through their doors and into their car. Measure with a tape. Leave blank anything you do not know.</p>
          <div class="form-grid two">
            <div class="field"><label for="c-cap">Weight limit (pounds)</label><input id="c-cap" name="capacityLbs" type="number" min="1" max="1500" inputmode="numeric"><p class="hint">Printed on the plate or in the manual.</p></div>
            <div class="field"><label for="c-seat">Seat width (inches)</label><input id="c-seat" name="seatWidthIn" type="number" min="5" max="40" step="0.5" inputmode="decimal"></div>
            <div class="field"><label for="c-w">Overall width (inches)</label><input id="c-w" name="widthIn" type="number" min="5" max="80" step="0.5" inputmode="decimal"><p class="hint">At the widest point.</p></div>
            <div class="field"><label for="c-l">Overall length (inches)</label><input id="c-l" name="lengthIn" type="number" min="5" max="160" step="0.5" inputmode="decimal"></div>
            <div class="field"><label for="c-hp">Heaviest single piece (pounds)</label><input id="c-hp" name="heaviestPieceLbs" type="number" min="1" max="600" inputmode="numeric"><p class="hint">When taken apart, the heaviest part someone must lift.</p></div>
            <div class="field"><label for="c-fold">Size when folded or taken apart</label><input id="c-fold" name="folded" type="text" maxlength="100" placeholder="Example: 28 x 20 x 12 inches"></div>
          </div>
          <div class="field"><label for="c-acc">What is included?</label><textarea id="c-acc" name="accessories" rows="3" maxlength="500" placeholder="Charger, manual, cushion, basket, keys..."></textarea></div>
          <div class="field"><label for="c-why">Why are you selling it?</label><textarea id="c-why" name="reason" rows="2" maxlength="500"></textarea></div>
          <p class="med-note">Please do not write about anyone's health or medical condition in your listing. Describe the equipment only.</p>
        </section>

        <section data-step="4" hidden><h2>Photos and price</h2>
          <div class="field"><label for="c-photos">Photos (up to ${cfg.maxPhotos})</label>
            <input id="c-photos" type="file" accept="image/*" multiple>
            <p class="hint">Take photos of the whole item, the seat, the controls, the battery, and the serial plate. Photos are shrunk automatically. The first photo is the cover.</p>
            <div class="progress" id="up-prog" hidden><span></span></div>
            <p id="up-msg" class="small" role="status" aria-live="polite"></p>
            <div class="photo-grid" id="photo-grid"></div></div>
          <div class="field"><label for="c-video">Video link (optional)</label><input id="c-video" name="video" type="url" placeholder="https://www.youtube.com/..."><p class="hint">Allowed: ${esc((cfg.allowedVideoHosts || []).join(', '))}. A short video of it running helps a lot.</p></div>
          <div class="form-grid two">
            <div class="field"><label for="c-price">Asking price ($)</label><input id="c-price" name="price" type="number" min="1" max="100000" inputmode="numeric"><div class="check" style="margin-top:8px"><input type="checkbox" id="c-free" name="free"><label for="c-free">It is free (donation)</label></div></div>
            <div class="field"><label>Need help pricing?</label><button class="btn btn-secondary" type="button" id="c-guide">Show a rough price range</button><div id="c-guide-out" class="small" style="margin-top:8px" aria-live="polite"></div></div>
          </div>
          <div class="form-grid three">
            <div class="field"><label for="c-zip">Where is it? ZIP code</label><input id="c-zip" name="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" required><p class="hint">Buyers see only your city and state.</p></div>
            <div class="field"><label for="c-city">City (only if the ZIP lookup fails)</label><input id="c-city" name="city" type="text" maxlength="60"></div>
            <div class="field"><label for="c-state">State (only if the ZIP lookup fails)</label><select id="c-state" name="state"></select></div>
          </div>
          <fieldset><legend>How can the buyer get it?</legend>
            ${otherPickups.map((o, i) => `<div class="check"><input type="checkbox" name="pickup" id="pk${i}" value="${esc(o)}"><label for="pk${i}">${esc(o)}</label></div>`).join('')}
            <div class="check"><input type="checkbox" id="pk-carrier" name="carrierPickupOk"><label for="pk-carrier"><strong>${esc(carrierOpt || 'Mobility City delivery (Wisconsin and Michigan)')}</strong>. Let a delivery partner pick it up from me and deliver it to a buyer in Wisconsin or Michigan. Only works if the item is in Wisconsin or Michigan. Your address is shared only with the delivery partner, only after a buyer requests delivery.</label></div>
          </fieldset>
        </section>

        <section data-step="5" hidden><h2>Review and submit</h2>
          <div id="c-review"></div>
          <div class="check"><input type="checkbox" id="c-rules" name="acceptRules"><label for="c-rules">I have read the <a href="prohibited.html" target="_blank">listing rules</a> and the <a href="terms.html" target="_blank">Terms of Use</a>. This listing is accurate, the item is mine to sell, and I will never ask for payment through the site.</label></div>
          <p class="hint">${M.loggedIn() ? 'Your first listing is checked by a person before it goes live. Later listings usually go live right away.' : ''}</p>
        </section>

        <div class="row row-between" style="margin-top:1.4rem">
          <button class="btn btn-secondary" type="button" id="c-back">Back</button>
          <button class="btn" type="button" id="c-next">Next</button>
          <button class="btn btn-green" type="submit" id="c-submit" hidden>Submit my listing</button>
        </div>
      </form>`;

      const f = $('#cl');
      M.fillSelect(f.category, catOpts, 'Choose one', c => c.name, c => c.name);
      M.fillSelect(f.state, cfg.states, 'Not needed');

      function reqSerial() { const c = catOpts.find(x => x.name === f.category.value); return !!(c && c.serialRequired); }
      f.category.addEventListener('change', () => {
        $('#c-serial-hint').textContent = reqSerial() ? 'Required for this type of equipment. Look for a metal or sticker plate on the frame or under the seat.' : 'Optional for this type of equipment.';
      });

      // ---- draft save / restore (text only; photos are not kept)
      const DRAFT = 'mdb_draft_listing';
      const fieldNames = ['category', 'make', 'model', 'year', 'serial', 'batteryType', 'batteryAgeYears', 'rangeMiles', 'lastService', 'serviceNotes', 'capacityLbs', 'seatWidthIn', 'widthIn', 'lengthIn', 'heaviestPieceLbs', 'folded', 'accessories', 'reason', 'video', 'price', 'zip', 'city', 'state'];
      function saveDraft() {
        const o = {}; fieldNames.forEach(n => { o[n] = f.elements[n] ? f.elements[n].value : ''; });
        o.grade = (f.querySelector('input[name=grade]:checked') || {}).value || '';
        try { M.store.set(DRAFT, JSON.stringify(o)); } catch (e) { /* ignore */ }
      }
      try {
        const d = JSON.parse(M.store.get(DRAFT) || 'null');
        if (d && (d.make || d.model)) {
          $('#cl-draft').innerHTML = `<div class="notice notice-info" id="draft-note"><p>We kept what you typed last time (not the photos). <button type="button" id="draft-clear" ${linkBtn}>Start over instead</button></p></div>`;
          fieldNames.forEach(n => { if (f.elements[n] && d[n] !== undefined) { f.elements[n].value = d[n]; } });
          if (d.grade) { const r = f.querySelector(`input[name=grade][value="${CSS.escape(d.grade)}"]`); if (r) { r.checked = true; } }
          $('#draft-clear').addEventListener('click', () => { M.store.del(DRAFT); window.location.reload(); });
        }
      } catch (e) { /* ignore */ }

      // ---- steps
      function show(n) {
        step = n;
        M.$$('section[data-step]', f).forEach(s => { s.hidden = Number(s.getAttribute('data-step')) !== n; });
        M.$$('#cl-steps li').forEach(li => {
          const i = Number(li.getAttribute('data-s'));
          li.className = i < n ? 'done' : ''; if (i === n) { li.setAttribute('aria-current', 'step'); } else { li.removeAttribute('aria-current'); }
        });
        $('#c-back').hidden = n === 1; $('#c-next').hidden = n === 5; $('#c-submit').hidden = n !== 5;
        if (n === 5) { review(); }
        saveDraft();
        const h = f.querySelector(`section[data-step="${n}"] h2`); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      function validate(n) {
        const need = (cond, msg) => { if (!cond) { M.showError(f, msg); return false; } return true; };
        M.clearError(f);
        if (n === 1) {
          if (!need(f.category.value, 'Please choose the type of equipment.')) { return false; }
          if (!need(f.make.value.trim(), 'Please enter the make (the brand).')) { return false; }
          if (!need(f.model.value.trim(), 'Please enter the model.')) { return false; }
          if (f.year.value && (Number(f.year.value) < 1960 || Number(f.year.value) > new Date().getFullYear() + 1)) { M.showError(f, 'Please enter a valid year, or leave it blank.'); return false; }
          if (reqSerial() && !f.serial.value.trim() && !f.noSerial.checked) { M.showError(f, 'Please enter the serial number, or check the box that says you cannot find it.'); return false; }
        }
        if (n === 2) {
          if (!need(f.querySelector('input[name=grade]:checked'), 'Please choose a condition grade.')) { return false; }
          if (!need(['poweredOn', 'brakes', 'batteryTested', 'cleaned'].every(k => f.elements[k].checked), 'All four checklist items must be checked. If something does not work, choose Parts Only and explain it.')) { return false; }
        }
        if (n === 4) {
          if (!need(photos.length >= 1, 'Please add at least one photo.')) { return false; }
          if (!need(f.free.checked || Number(f.price.value) >= 1, 'Please enter a price, or mark the item free.')) { return false; }
          if (!need(/^\d{5}$/.test(f.zip.value.trim()), 'Please enter a 5-digit ZIP code.')) { return false; }
          const anyPick = M.$$('input[name=pickup]:checked', f).length || f.carrierPickupOk.checked;
          if (!need(anyPick, 'Please choose at least one way the buyer can get the item.')) { return false; }
        }
        return true;
      }
      $('#c-next').addEventListener('click', () => { if (validate(step)) { show(step + 1); } });
      $('#c-back').addEventListener('click', () => show(step - 1));
      f.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') { e.preventDefault(); } });
      f.addEventListener('change', saveDraft);

      // ---- photos
      function drawPhotos() {
        $('#photo-grid').innerHTML = photos.map((p, i) => `<div class="photo-item"><img src="${esc(p.preview)}" alt="Photo ${i + 1}">${i === 0 ? '<span class="badge badge-green first">Cover</span>' : ''}<button type="button" class="btn btn-danger btn-sm" data-rm="${i}" aria-label="Remove photo ${i + 1}">Remove</button>${i > 0 ? `<button type="button" class="btn btn-secondary btn-sm" data-first="${i}" style="top:auto;bottom:6px;left:auto;right:6px">Make cover</button>` : ''}</div>`).join('');
      }
      $('#photo-grid').addEventListener('click', e => {
        const rm = e.target.closest('[data-rm]'), mf = e.target.closest('[data-first]');
        if (rm) { photos.splice(Number(rm.getAttribute('data-rm')), 1); drawPhotos(); }
        if (mf) { const i = Number(mf.getAttribute('data-first')); const x = photos.splice(i, 1)[0]; photos.unshift(x); drawPhotos(); }
      });
      $('#c-photos').addEventListener('change', async e => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        const room = cfg.maxPhotos - photos.length;
        if (!files.length) { return; }
        if (room <= 0) { M.toast('You already have ' + cfg.maxPhotos + ' photos.', 'error'); return; }
        const use = files.slice(0, room);
        if (files.length > room) { M.toast('Only the first ' + room + ' photos were added.', 'error'); }
        const prog = $('#up-prog'), bar = prog.querySelector('span'), msg = $('#up-msg');
        prog.hidden = false;
        for (let i = 0; i < use.length; i++) {
          msg.textContent = `Uploading photo ${i + 1} of ${use.length}...`; bar.style.width = Math.round((i / use.length) * 100) + '%';
          try {
            const r = await M.uploadImage(use[i], 'uploadPhoto', null, cfg.maxPhotoBytes);
            photos.push(r); drawPhotos();
          } catch (err) { M.toast(err.message, 'error'); }
        }
        bar.style.width = '100%'; msg.textContent = 'Photos ready.'; setTimeout(() => { prog.hidden = true; }, 800);
      });

      // ---- price guide
      $('#c-guide').addEventListener('click', () => {
        const out = $('#c-guide-out');
        if (!f.category.value) { out.textContent = 'Choose the type of equipment on step 1 first.'; return; }
        out.textContent = 'Looking up a range...';
        M.api('priceGuide', { category: f.category.value, make: f.make.value, model: f.model.value, year: f.year.value, grade: (f.querySelector('input[name=grade]:checked') || {}).value || 'B' }, { noToken: true }).then(r => {
          const g = r.guide;
          out.innerHTML = g ? `Similar items often list for <strong>${esc(M.money(g.low))} to ${esc(M.money(g.high))}</strong>.${g.comps ? ' Real listings here have a middle price near ' + esc(M.money(g.comps.median)) + '.' : ''} A rough guide, not an appraisal.` : 'No guide for this type yet.';
        }, err => { out.textContent = err.message; });
      });
      f.free.addEventListener('change', () => { f.price.disabled = f.free.checked; if (f.free.checked) { f.price.value = ''; } });

      // ---- review + submit
      function payload() {
        const g = k => (f.elements[k] ? f.elements[k].value.trim() : '');
        return {
          category: g('category'), make: g('make'), model: g('model'), year: g('year'), serial: g('serial'), noSerial: f.noSerial.checked,
          grade: (f.querySelector('input[name=grade]:checked') || {}).value || '',
          checklist: { poweredOn: f.poweredOn.checked, brakes: f.brakes.checked, batteryTested: f.batteryTested.checked, cleaned: f.cleaned.checked },
          acceptRules: f.acceptRules.checked, free: f.free.checked, price: f.free.checked ? 0 : Number(g('price')),
          capacityLbs: g('capacityLbs'), seatWidthIn: g('seatWidthIn'), widthIn: g('widthIn'), lengthIn: g('lengthIn'), heaviestPieceLbs: g('heaviestPieceLbs'),
          batteryType: g('batteryType'), batteryAgeYears: g('batteryAgeYears'), rangeMiles: g('rangeMiles'), lastService: g('lastService'),
          folded: g('folded'), serviceNotes: g('serviceNotes'), accessories: g('accessories'), reason: g('reason'),
          zip: g('zip'), city: g('city'), state: g('state'), carrierPickupOk: f.carrierPickupOk.checked,
          pickupOptions: M.$$('input[name=pickup]:checked', f).map(i => i.value), video: g('video'), photos: photos.map(p => p.fileId)
        };
      }
      function review() {
        const d = payload();
        const row = (a, b) => b || b === 0 ? `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>` : '';
        $('#c-review').innerHTML = `<div class="plate"><h2>${esc([d.year, d.make, d.model].filter(Boolean).join(' '))}</h2><dl>
          ${row('Type', d.category)}${row('Grade', d.grade)}${row('Serial number', d.noSerial && !d.serial ? 'Not provided' : d.serial)}${row('Price', d.free ? 'Free' : M.money(d.price))}${row('ZIP code', d.zip)}${row('Photos', photos.length)}
          ${row('Pickup', d.pickupOptions.concat(d.carrierPickupOk ? [carrierOpt] : []).join(', '))}${row('Weight limit', d.capacityLbs ? d.capacityLbs + ' lb' : '')}${row('Overall width', d.widthIn ? d.widthIn + ' in' : '')}</dl></div>
          <p><button class="btn btn-secondary btn-sm" type="button" data-goto="1">Change something</button></p>`;
        const g = $('[data-goto]'); if (g) { g.addEventListener('click', () => show(1)); }
      }
      f.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(f);
        for (const n of [1, 2, 4]) { if (!validate(n)) { show(n); validate(n); return; } }
        if (!f.acceptRules.checked) { M.showError(f, 'Please confirm that you have read the rules and that your listing is accurate.'); return; }
        const done = M.busy($('#c-submit'), 'Submitting...');
        M.api('createListing', payload()).then(r => {
          M.store.del(DRAFT);
          const live = r.status === 'Active';
          app.innerHTML = `<div class="notice notice-ok" role="status"><h2 style="margin-top:0">${live ? 'Your listing is live' : 'Thank you. Your listing was received'}</h2>
            <p>${live ? 'Buyers can see it now.' : 'A person checks every new seller\'s first listing before it goes live. We will email you as soon as it is approved.'}</p></div>
            <p><a class="btn" href="${live ? 'listing.html?id=' + encodeURIComponent(r.listingId) : 'dashboard.html'}">${live ? 'See your listing' : 'Go to My account'}</a> <a class="btn btn-secondary" href="create-listing.html">List another item</a></p>
            <div class="callout" style="margin-top:1.4rem"><div><h2>Sell faster</h2><p>Reply quickly to messages, keep your price fair, and mark the item sold when it goes. A Verified Seller badge appears after your first completed sale.</p></div></div>`;
          window.scrollTo({ top: 0 });
        }, err => { done(); M.showError(f, err.message); });
      });
      show(1);
    });
  };

  // ================================================================== WANTED BOARD
  M.pages.wanted = function () {
    const app = $('#app');
    const p = M.params();
    app.innerHTML = M.loading('Loading...');
    M.config().then(cfg => {
      app.innerHTML = `<details class="card" id="w-new" ${p.post ? 'open' : ''}><summary style="font-weight:700;font-size:1.15rem;cursor:pointer;min-height:44px;display:flex;align-items:center">Post what you need</summary>
        <form id="wf" novalidate style="margin-top:1rem">
          <div class="form-grid two">
            <div class="field"><label for="w-cat">Type of equipment</label><select id="w-cat" name="category" required></select></div>
            <div class="field"><label for="w-kw">What exactly? (brand, size, features)</label><input id="w-kw" name="keywords" type="text" maxlength="120" placeholder="Example: folding power chair, under 40 lb"></div>
            <div class="field"><label for="w-max">Most you can pay ($)</label><input id="w-max" name="maxPrice" type="number" min="0" inputmode="numeric"></div>
            <div class="field"><label for="w-st">State</label><select id="w-st" name="state"></select></div>
            <div class="field"><label for="w-by">Needed by</label><input id="w-by" name="neededBy" type="date"></div>
          </div>
          <div class="field"><label for="w-notes">Anything else sellers should know?</label><textarea id="w-notes" name="notes" rows="3" maxlength="400"></textarea><p class="hint">Do not type emails or phone numbers. Sellers answer through the site.</p></div>
          <div class="check"><input type="checkbox" id="w-notify" name="notify" checked><label for="w-notify">Email me when a new listing matches this.</label></div>
          <button class="btn" type="submit">Post it</button>
        </form></details>
        <div class="card" style="margin-top:1.2rem"><form id="wfilter" class="inline-form" novalidate>
          <div class="field"><label for="wf-cat">Show</label><select id="wf-cat"></select></div>
          <div class="field"><label for="wf-st">In</label><select id="wf-st"></select></div>
          <button class="btn btn-secondary" type="submit">Filter</button></form></div>
        <div id="w-list" style="margin-top:1.2rem"></div><nav class="pager" id="w-pager" aria-label="Pages"></nav>`;
      const wf = $('#wf');
      M.fillSelect(wf.category, cfg.categories, 'Choose one', c => c.name, c => c.name);
      M.fillSelect(wf.state, cfg.states, 'Anywhere');
      M.fillSelect($('#wf-cat'), cfg.categories, 'All types', c => c.name, c => c.name);
      M.fillSelect($('#wf-st'), cfg.states, 'Any state');
      let page = 1;

      wf.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(wf);
        if (!M.loggedIn()) { window.location.href = 'login.html?next=' + encodeURIComponent('wanted.html?post=1'); return; }
        if (!wf.category.value) { M.showError(wf, 'Please choose a type of equipment.'); return; }
        const done = M.busy(wf.querySelector('button[type=submit]'), 'Posting...');
        M.api('wantedCreate', { category: wf.category.value, keywords: wf.keywords.value, maxPrice: wf.maxPrice.value, state: wf.state.value, neededBy: wf.neededBy.value, notes: wf.notes.value, notify: wf.notify.checked }).then(r => {
          done(); wf.reset(); wf.notify.checked = true; $('#w-new').open = false;
          M.toast(r.sellersAlerted ? 'Posted. ' + r.sellersAlerted + ' matching ' + (r.sellersAlerted === 1 ? 'seller was' : 'sellers were') + ' told.' : 'Posted. Sellers can now see it.', 'ok');
          load();
        }, err => { done(); M.showError(wf, err.message); });
      });
      $('#wfilter').addEventListener('submit', e => { e.preventDefault(); page = 1; load(); });
      $('#w-pager').addEventListener('click', e => {
        const b = e.target.closest('button[data-page]'); if (!b || b.disabled) { return; }
        page = Number(b.getAttribute('data-page')); load(); $('#w-list').scrollIntoView({ behavior: 'smooth' });
      });

      function wantedCard(w) {
        const meta = [w.state ? 'In ' + w.state : 'Anywhere', w.maxPrice !== null ? 'Up to ' + M.money(w.maxPrice) : '', w.neededBy ? 'Needed by ' + M.date(w.neededBy) : '', 'Posted ' + M.ago(w.createdAt)].filter(Boolean);
        return `<article class="item-row" style="grid-template-columns:70px 1fr"><div class="thumb" style="width:70px;height:70px">${M.icon(M.catIcon(w.category))}</div><div>
          <h3 style="margin:0 0 .2em">${esc(w.category)}${w.keywords ? ': ' + esc(w.keywords) : ''}</h3>
          <p class="muted small" style="margin:0 0 .4em">${esc(meta.join(' · '))} · ${esc(w.poster)}</p>
          ${w.notes ? `<p style="margin:0 0 .4em">${M.escBr(w.notes)}</p>` : ''}
          <div class="item-actions">${w.mine ? `<button class="btn btn-secondary btn-sm" data-close="${esc(w.id)}" type="button">Close this post</button>` : `<button class="btn btn-sm" data-have="${esc(w.id)}" data-label="${esc(w.category + (w.keywords ? ': ' + w.keywords : ''))}" type="button">I have one</button>`}</div></div></article>`;
      }
      function load() {
        const list = $('#w-list'); list.innerHTML = M.loading('Loading...');
        const req = p.id ? M.api('wantedGet', { id: p.id }).then(r => ({ items: [r.wanted], page: 1, pages: 1, total: 1 })) : M.api('wantedList', { category: $('#wf-cat').value, state: $('#wf-st').value, page: page });
        req.then(r => {
          $('#w-pager').innerHTML = pagerHtml2(r.page, r.pages);
          if (!r.items.length) { list.innerHTML = '<div class="empty"><h2>No open posts here</h2><p>Be the first. Tell sellers what you are looking for.</p></div>'; return; }
          list.innerHTML = (p.id ? '<p><a href="wanted.html">See all wanted posts</a></p>' : '') + r.items.map(wantedCard).join('');
        }, err => { list.innerHTML = M.errorBox(err.message) + (p.id ? '<p><a class="btn" href="wanted.html">See all wanted posts</a></p>' : ''); });
      }
      function pagerHtml2(page, pages) {
        if (pages <= 1) { return ''; }
        return `<button class="btn btn-secondary" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${page} of ${pages}</span><button class="btn btn-secondary" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Next</button>`;
      }
      $('#w-list').addEventListener('click', e => {
        const c = e.target.closest('[data-close]'), h = e.target.closest('[data-have]');
        if (c) {
          M.confirm('Close this post? Sellers will no longer see it.', 'Close it').then(y => { if (y) { M.api('wantedClose', { id: c.getAttribute('data-close') }).then(() => { M.toast('Closed.', 'ok'); load(); }, err => M.toast(err.message, 'error')); } });
        }
        if (h) {
          if (!M.loggedIn()) { window.location.href = 'login.html?next=' + encodeURIComponent('wanted.html' + (p.id ? '?id=' + p.id : '')); return; }
          answerDialog(h.getAttribute('data-have'), h.getAttribute('data-label'));
        }
      });
      function answerDialog(wantedId, label) {
        const d = M.modal(`<h2>Offer an item</h2><p>The buyer wants: <strong>${esc(label)}</strong>. Pick one of your live listings and add a short note. The buyer's contact details stay private.</p><div id="ad-body">${M.loading('Loading your listings...')}</div>`);
        M.api('myListings', {}).then(r => {
          const live = r.items.filter(i => i.status === 'Active');
          const body = d.querySelector('#ad-body');
          if (!live.length) { body.innerHTML = '<div class="notice notice-info"><p>You have no live listings yet. <a href="create-listing.html">List your equipment</a> first, then come back.</p></div>'; return; }
          body.innerHTML = `<form novalidate><div class="field"><label for="ad-l">Your listing</label><select id="ad-l">${live.map(l => `<option value="${esc(l.id)}">${esc(M.title(l) + ' - ' + M.money(l.price, l.free))}</option>`).join('')}</select></div>
            <div class="field"><label for="ad-m">Your message</label><textarea id="ad-m" rows="3" maxlength="1500">Hello, I have one that may fit what you are looking for.</textarea></div><button class="btn btn-block" type="submit">Send offer</button></form>`;
          const fm = body.querySelector('form');
          fm.addEventListener('submit', e => {
            e.preventDefault(); M.clearError(fm);
            const done = M.busy(fm.querySelector('button[type=submit]'), 'Sending...');
            M.api('sendMessage', { listingId: body.querySelector('#ad-l').value, wantedId: wantedId, body: body.querySelector('#ad-m').value }).then(res => {
              d.close(); M.toast('Sent. Check Messages for a reply.', 'ok');
            }, err => { done(); M.showError(fm, err.message); });
          });
        }, err => { d.querySelector('#ad-body').innerHTML = M.errorBox(err.message); });
      }
      load();
    });
  };

  // ================================================================== DASHBOARD
  M.pages.dashboard = function () {
    if (!M.requireLogin()) { return; }
    const app = $('#app');
    const TABS = [['listings', 'My listings'], ['saved', 'Saved'], ['alerts', 'Alerts'], ['wanted', 'Wanted'], ['deliveries', 'Deliveries'], ['profile', 'Profile']];
    app.innerHTML = `<div id="d-hello" class="muted" style="margin-bottom:1rem"></div>
      <div class="tabs" role="tablist" aria-label="My account">${TABS.map(t => `<button type="button" role="tab" id="tab-${t[0]}" data-tab="${t[0]}" aria-selected="false">${esc(t[1])}</button>`).join('')}</div>
      <div id="d-body" role="tabpanel" tabindex="-1"></div>`;
    let me = M.user();
    M.api('me', {}).then(r => { me = r.user; M.setUser(me); $('#d-hello').innerHTML = `Signed in as <strong>${esc(me.email)}</strong>${me.verifiedSeller ? ' <span class="badge badge-green">Verified seller</span>' : ''}${me.isAdmin ? ' &middot; <a href="admin.html">Admin</a>' : ''}`; const prof = $('#tab-profile'); if (prof && window.location.hash === '#profile') { render('profile'); } }, () => {});

    const body = $('#d-body');
    function render(tab) {
      if (!TABS.some(t => t[0] === tab)) { tab = 'listings'; }
      M.$$('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab ? 'true' : 'false'));
      try { window.history.replaceState(null, '', '#' + tab); } catch (e) { /* ignore */ }
      body.innerHTML = M.loading();
      ({ listings: tabListings, saved: tabSaved, alerts: tabAlerts, wanted: tabWanted, deliveries: tabDeliveries, profile: tabProfile })[tab]();
    }
    $('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { render(b.getAttribute('data-tab')); } });

    function tabListings() {
      M.api('myListings', {}).then(r => {
        const head = `<p><a class="btn" href="create-listing.html">${M.icon('camera')} List new equipment</a></p>`;
        if (!r.items.length) { body.innerHTML = head + '<div class="empty"><h2>You have not listed anything yet</h2><p>Listing takes about ten minutes. Have your serial number and a few photos ready.</p></div>'; return; }
        body.innerHTML = head + r.items.map(L => `<article class="item-row"><div class="thumb">${L.photos[0] ? `<img src="${esc(M.photoUrl(L.photos[0], 200))}" alt="" data-photo loading="lazy">` : M.icon(M.catIcon(L.category))}</div><div>
          <h3 style="margin:0 0 .2em"><a href="listing.html?id=${encodeURIComponent(L.id)}">${esc(M.title(L))}</a></h3>
          <p style="margin:0 0 .3em"><span class="status-pill status-${esc(L.status)}">${esc(L.status)}</span> ${esc(M.money(L.price, L.free))} &middot; ${esc(L.city)}, ${esc(L.state)}${L.status === 'Active' ? ' &middot; ' + L.views + ' views' : ''}</p>
          ${L.status === 'Pending' ? '<p class="small muted" style="margin:0">Waiting for review. We will email you.</p>' : ''}
          ${L.rejectReason ? `<div class="notice notice-warn" style="margin:.4rem 0"><p><strong>Needs changes:</strong> ${esc(L.rejectReason)}</p></div>` : ''}
          ${L.renewalDue && L.status === 'Active' ? `<p class="small" style="margin:0;color:var(--warn-ink)"><strong>Expires ${esc(M.date(L.expiresAt))}.</strong> Renew it or mark it sold.</p>` : ''}
          <div class="item-actions"><a class="btn btn-secondary btn-sm" href="listing.html?id=${encodeURIComponent(L.id)}">View</a>
            ${(L.status === 'Active' || L.status === 'Expired') ? `<button class="btn btn-green btn-sm" data-act="markSold" data-id="${esc(L.id)}" type="button">Mark sold</button><button class="btn btn-secondary btn-sm" data-act="renewListing" data-id="${esc(L.id)}" type="button">Renew</button>` : ''}
            ${(L.status === 'Active' || L.status === 'Pending') ? `<button class="btn btn-danger btn-sm" data-act="removeListing" data-id="${esc(L.id)}" type="button">Remove</button>` : ''}</div></div></article>`).join('');
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }
    function tabSaved() {
      M.api('savedList', {}).then(r => {
        if (!r.items.length) { body.innerHTML = '<div class="empty"><h2>Nothing saved yet</h2><p>Press Save on any listing to keep it here and get price-drop emails.</p><p><a class="btn" href="browse.html">Browse listings</a></p></div>'; return; }
        body.innerHTML = '<div class="listing-grid">' + r.items.map(L => `<div>${M.listingCard(L)}<p class="small" style="margin:.4rem 0 0">${L.status !== 'Active' ? `<span class="status-pill status-${esc(L.status)}">${esc(L.status)}</span> ` : ''}${L.watching ? 'Price drop emails on. ' : ''}${L.priceAtSave > L.price ? '<strong style="color:var(--green)">Price dropped from ' + esc(M.money(L.priceAtSave)) + '.</strong> ' : ''}<button type="button" data-unsave="${esc(L.id)}" ${linkBtn}>Remove</button></p></div>`).join('') + '</div>';
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }
    function tabAlerts() {
      M.api('savedSearchList', {}).then(r => {
        if (!r.items.length) { body.innerHTML = '<div class="empty"><h2>No alerts yet</h2><p>On the Browse page, search for what you want and press Email me new matches.</p><p><a class="btn" href="browse.html">Go to Browse</a></p></div>'; return; }
        body.innerHTML = r.items.map(s => `<article class="item-row" style="grid-template-columns:1fr"><div><h3 style="margin:0 0 .2em">${esc(s.name)}</h3><p class="muted small" style="margin:0">${esc(s.summary)} &middot; ${s.frequency === 'daily' ? 'Daily digest' : 'Instant'}</p>
          <div class="item-actions"><a class="btn btn-secondary btn-sm" href="browse.html?${M.qs({ q: s.query.q, category: s.query.category, minPrice: s.query.minPrice, maxPrice: s.query.maxPrice, grades: (s.query.grades || []).join(','), state: s.query.state, zip: s.query.zip, radius: s.query.radius, free: s.query.free, delivery: s.query.delivery, checked: s.query.checked })}">See matches now</a><button class="btn btn-danger btn-sm" data-del-alert="${esc(s.id)}" type="button">Delete alert</button></div></div></article>`).join('');
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }
    function tabWanted() {
      M.api('wantedMine', {}).then(r => {
        const head = '<p><a class="btn" href="wanted.html?post=1">Post what you need</a></p>';
        if (!r.items.length) { body.innerHTML = head + '<div class="empty"><h2>No open wanted posts</h2></div>'; return; }
        body.innerHTML = head + r.items.map(w => `<article class="item-row" style="grid-template-columns:1fr"><div><h3 style="margin:0 0 .2em">${esc(w.category)}${w.keywords ? ': ' + esc(w.keywords) : ''}</h3><p class="muted small" style="margin:0">Posted ${esc(M.ago(w.createdAt))}${w.maxPrice !== null ? ' &middot; up to ' + esc(M.money(w.maxPrice)) : ''}</p><div class="item-actions"><button class="btn btn-secondary btn-sm" data-close-wanted="${esc(w.id)}" type="button">Close this post</button></div></div></article>`).join('');
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }
    function tabDeliveries() {
      M.api('deliveryMine', {}).then(r => {
        if (!r.items.length) { body.innerHTML = '<div class="empty"><h2>No deliveries</h2><p>When you request or confirm a delivery, it shows up here.</p></div>'; return; }
        body.innerHTML = r.items.map(D => `<article class="item-row"><div class="thumb">${D.photo ? `<img src="${esc(M.photoUrl(D.photo, 200))}" alt="" data-photo loading="lazy">` : M.icon('truck')}</div><div>
          <h3 style="margin:0 0 .2em"><a href="delivery.html?id=${encodeURIComponent(D.id)}">${esc(D.listingTitle)}</a></h3>
          <p style="margin:0"><span class="status-pill status-${esc(D.status.replace(/\s/g, ''))}">${esc(D.status)}</span> You are the ${esc(D.role)}. ${D.needsSellerConfirm ? '<strong>Action needed: confirm pickup details.</strong>' : ''}${D.canApprove ? '<strong>Your quote is ready.</strong>' : ''}</p>
          <div class="item-actions"><a class="btn btn-secondary btn-sm" href="delivery.html?id=${encodeURIComponent(D.id)}">Open</a></div></div></article>`).join('');
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }
    function passwordCard(u) {
      const box = $('#pw-body');
      function mailForm(msg) {
        box.innerHTML = `<p>${msg}</p><form id="pl" novalidate><div id="pl-hc"></div><button class="btn btn-secondary" type="submit">Email me a link to ${u.hasPassword ? 'reset my password' : 'set a password'}</button></form>`;
        const f = $('#pl'), hc = M.humanCheck($('#pl-hc'));
        f.addEventListener('submit', e => {
          e.preventDefault(); M.clearError(f);
          const done = M.busy(f.querySelector('button[type=submit]'), 'Sending...'), v = hc.values();
          M.api('requestLogin', { email: u.email, reset: true, next: 'dashboard.html#profile', hp: v.hp, ch: v.ch }, { noToken: true }).then(() => {
            box.innerHTML = `<div class="notice notice-ok" role="status"><p style="margin:0">We sent a link to <strong>${esc(u.email)}</strong>. Press it to choose a password. It works once and expires in about 15 minutes.</p></div>`;
          }, err => { done(); hc.reset(); M.showError(f, err.message); });
        });
      }
      if (!u.hasPassword) { mailForm('You have no password yet. You sign in with email links. To add a password, we first confirm your email address.'); return; }
      box.innerHTML = `<p class="muted">You have a password. Changing it signs you out on your other devices.</p>
        <form id="cpw" novalidate>
          ${M.passwordField('pw-cur', 'Current password', { autocomplete: 'current-password' })}
          ${M.passwordField('pw-new', 'New password', { autocomplete: 'new-password', hint: PW_HINT })}
          ${M.passwordField('pw-new2', 'Type the new password again', { autocomplete: 'new-password' })}
          <button class="btn" type="submit">Change password</button></form>
        <p style="margin-top:1rem"><button type="button" id="pw-forgot" ${linkBtn}>I forgot my current password</button></p>`;
      M.wirePasswordToggles(box);
      $('#pw-forgot').addEventListener('click', () => mailForm('We will email you a link so you can choose a new password.'));
      const f = $('#cpw');
      f.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(f);
        const a = $('#pw-new').value, b = $('#pw-new2').value;
        if (a.length < 10) { M.showError(f, 'Your new password needs at least 10 characters.'); return; }
        if (a !== b) { M.showError(f, 'The two new passwords do not match.'); return; }
        const done = M.busy(f.querySelector('button[type=submit]'), 'Saving...');
        M.api('setPassword', { currentPassword: $('#pw-cur').value, newPassword: a }).then(r => {
          me = r.user; M.setUser(me); done(); f.reset(); M.toast('Password changed.', 'ok');
        }, err => { done(); M.showError(f, err.message); });
      });
    }
    function tabProfile() {
      const u = me || M.user() || {};
      body.innerHTML = `<form id="pf" class="card" novalidate><h2>Your profile</h2>
        <p class="muted">Email: <strong>${esc(u.email || '')}</strong> (never shown to other members)</p>
        <div class="field"><label for="p-name">Name shown to others</label><input id="p-name" type="text" maxlength="40" value="${esc(u.displayName && !/^Member /.test(u.displayName) ? u.displayName : '')}"><p class="hint">A first name or nickname is fine. Do not use your full name, email, or phone number.</p></div>
        <div class="field"><label for="p-role">I am mostly here to</label><select id="p-role">${M.roleOptionsHtml(u.role || 'buyer')}</select></div>
        <div class="check"><input type="checkbox" id="p-care" ${u.caregiverMode ? 'checked' : ''}><label for="p-care">Caregiver mode: I am shopping or selling for someone else.</label></div>
        <div class="field" id="p-onb" ${u.caregiverMode ? '' : 'hidden'}><label for="p-label">Who are you helping? (shown on your messages)</label><input id="p-label" type="text" maxlength="40" value="${esc(u.onBehalfLabel || '')}" placeholder="Example: my mother"><p class="hint">Messages will say "Caregiver writing for my mother". Use a relationship, not a name.</p></div>
        <button class="btn" type="submit">Save profile</button></form>
        <div class="card" style="margin-top:1.2rem" id="pw-card"><h2>Password</h2><div id="pw-body"></div></div>
        <div class="card" style="margin-top:1.2rem"><h2>Email settings</h2><p>Every email has an unsubscribe link. Alerts you created are managed on the <a href="#alerts" data-goto-tab="alerts">Alerts tab</a>.</p></div>
        <p style="margin-top:1.2rem"><button class="btn btn-secondary" type="button" data-signout>Sign out</button></p>`;
      const pf = $('#pf');
      $('#p-care').addEventListener('change', () => { $('#p-onb').hidden = !$('#p-care').checked; });
      pf.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(pf);
        const done = M.busy(pf.querySelector('button[type=submit]'), 'Saving...');
        M.api('updateProfile', { displayName: $('#p-name').value, role: $('#p-role').value, caregiverMode: $('#p-care').checked, onBehalfLabel: $('#p-care').checked ? $('#p-label').value : '' }).then(r => {
          me = r.user; M.setUser(me); done(); M.toast('Profile saved.', 'ok');
        }, err => { done(); M.showError(pf, err.message); });
      });
      passwordCard(u);
      $('[data-signout]').addEventListener('click', () => { M.api('logout', {}, { authRedirect: false }).catch(() => {}).then(() => { M.clearSession(); window.location.href = 'index.html'; }); });
      const gt = $('[data-goto-tab]'); if (gt) { gt.addEventListener('click', e => { e.preventDefault(); render('alerts'); }); }
    }

    body.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'), us = e.target.closest('[data-unsave]'), da = e.target.closest('[data-del-alert]'), cw = e.target.closest('[data-close-wanted]');
      if (a) {
        const act = a.getAttribute('data-act'), id = a.getAttribute('data-id');
        const go = () => M.api(act, { id: id }).then(() => { M.toast('Done.', 'ok'); render('listings'); }, err => M.toast(err.message, 'error'));
        if (act === 'removeListing') { M.confirm('Remove this listing? Buyers will no longer see it.', 'Remove it', true).then(y => { if (y) { go(); } }); }
        else if (act === 'markSold') { M.confirm('Mark this item as sold? It will be hidden from buyers.', 'Yes, it sold').then(y => { if (y) { go(); } }); }
        else { go(); }
      }
      if (us) { M.api('saveListing', { listingId: us.getAttribute('data-unsave'), saved: false }).then(() => render('saved'), err => M.toast(err.message, 'error')); }
      if (da) { M.api('savedSearchDelete', { id: da.getAttribute('data-del-alert') }).then(() => { M.toast('Alert deleted.', 'ok'); render('alerts'); }, err => M.toast(err.message, 'error')); }
      if (cw) { M.api('wantedClose', { id: cw.getAttribute('data-close-wanted') }).then(() => { M.toast('Closed.', 'ok'); render('wanted'); }, err => M.toast(err.message, 'error')); }
    });
    render((window.location.hash || '#listings').replace('#', ''));
  };

  // ================================================================== MESSAGES
  M.pages.messages = function () {
    if (!M.requireLogin()) { return; }
    const app = $('#app');
    app.innerHTML = `<div class="msg-layout"><div class="thread-list" id="m-list" aria-label="Conversations">${M.loading()}</div><div id="m-convo"><div class="empty"><p>Choose a conversation.</p></div></div></div>`;
    let current = M.params().thread || '';

    function loadList() {
      return M.api('threads', {}).then(r => {
        const list = $('#m-list');
        if (!r.items.length) { list.innerHTML = '<div class="empty" style="border:0"><h2>No messages yet</h2><p>When you message a seller or a buyer writes to you, the conversation appears here.</p><p><a class="btn" href="browse.html">Browse listings</a></p></div>'; return r; }
        list.innerHTML = r.items.map(t => `<button type="button" class="thread-item" data-thread="${esc(t.threadId)}" ${t.threadId === current ? 'aria-current="true"' : ''}>
          <span style="flex:1;min-width:0"><span class="t">${esc(t.listingTitle)}</span><span class="s">${esc(t.otherName)} &middot; you are the ${esc(t.role)}</span><span class="s" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${esc(t.lastMessage)}</span></span>${t.unread ? `<span class="unread-dot" title="${t.unread} unread" aria-label="${t.unread} unread"></span>` : ''}</button>`).join('');
        return r;
      }, err => { $('#m-list').innerHTML = M.errorBox(err.message); });
    }
    $('#m-list').addEventListener('click', e => { const b = e.target.closest('[data-thread]'); if (b) { openThread(b.getAttribute('data-thread'), true); } });

    function openThread(id, scroll) {
      current = id;
      M.$$('.thread-item').forEach(b => { if (b.getAttribute('data-thread') === id) { b.setAttribute('aria-current', 'true'); const dot = b.querySelector('.unread-dot'); if (dot) { dot.remove(); } } else { b.removeAttribute('aria-current'); } });
      try { window.history.replaceState(null, '', 'messages.html?thread=' + encodeURIComponent(id)); } catch (e) { /* ignore */ }
      const box = $('#m-convo'); box.innerHTML = M.loading('Loading the conversation...');
      M.api('thread', { threadId: id }).then(r => {
        const t = r.thread;
        let share = '';
        if (t.contactVisible) {
          share = `<div class="contact-box" role="status"><strong>Contact details are now shared.</strong><br>Their details: <strong>${esc(r.theirContact)}</strong><br><span class="small">You shared: ${esc(r.myContact)}. <button type="button" id="stop-share" ${linkBtn}>Stop sharing mine</button></span></div>`;
        } else if (t.iShared) {
          share = `<div class="contact-box" style="background:var(--mist);border-color:var(--line)"><strong>You offered to share your details.</strong> They appear only if the other person agrees too. <button type="button" id="stop-share" ${linkBtn}>Take it back</button></div>`;
        } else {
          share = `<details class="contact-box" style="background:var(--mist);border-color:var(--line)"><summary style="cursor:pointer;font-weight:700;min-height:44px;display:flex;align-items:center">${t.theyShared ? 'The other person is ready to share contact details. Share yours to see them.' : 'Share My Contact (optional)'}</summary>
            <form id="share-form" novalidate style="margin-top:8px"><div class="field"><label for="sh-c">Your email or phone number</label><input id="sh-c" type="text" maxlength="120" autocomplete="off"><p class="hint">Only shown if both of you agree. Take it back any time.</p></div><button class="btn btn-sm" type="submit">Share My Contact</button></form></details>`;
        }
        const closed = t.listingStatus === 'Removed';
        box.innerHTML = `<div class="convo"><div class="convo-head"><strong><a href="listing.html?id=${encodeURIComponent(t.listingId)}">${esc(t.listingTitle)}</a></strong><br><span class="muted small">With ${esc(t.otherName)}${t.otherVerified ? ' (Verified seller)' : ''} &middot; ${esc(t.listingStatus === 'Active' ? 'listing is live' : 'listing ' + t.listingStatus.toLowerCase())}</span></div>
          ${share}
          <div class="bubbles" id="bubbles" tabindex="0" aria-label="Messages">${r.messages.map(m => `<div class="bubble ${m.mine ? 'mine' : ''}">${esc(m.body)}<span class="who">${m.mine ? 'You' : esc(t.otherName)}${m.onBehalf ? ' (' + esc(m.onBehalf) + ')' : ''} &middot; ${esc(M.dateTime(m.at))}${!m.mine ? ` &middot; <button type="button" data-report="${esc(m.id)}" style="min-height:32px;background:none;border:0;font:inherit;font-size:.85rem;color:var(--blue);text-decoration:underline;cursor:pointer;padding:0">Report</button>` : ''}</span></div>`).join('')}</div>
          <form class="convo-form" id="reply" novalidate><div class="field"><label for="r-body">Reply</label><textarea id="r-body" rows="3" maxlength="1500" ${closed ? 'disabled' : ''}></textarea><p class="hint">Emails and phone numbers cannot be typed here. Use Share My Contact above.</p></div>
          <div class="row"><button class="btn" type="submit" ${closed ? 'disabled' : ''}>Send</button><button class="btn btn-secondary" type="button" id="m-refresh">Check for new messages</button></div></form></div>`;
        const bub = $('#bubbles'); bub.scrollTop = bub.scrollHeight;
        if (scroll && window.innerWidth < 900) { box.scrollIntoView({ behavior: 'smooth' }); }
        const rf = $('#reply');
        rf.addEventListener('submit', e => {
          e.preventDefault(); M.clearError(rf);
          const text = $('#r-body').value.trim(); if (text.length < 2) { M.showError(rf, 'Please type a message first.'); return; }
          const done = M.busy(rf.querySelector('button[type=submit]'), 'Sending...');
          M.api('sendMessage', { threadId: id, body: text }).then(() => { openThread(id); loadList(); }, err => { done(); M.showError(rf, err.message); });
        });
        $('#m-refresh').addEventListener('click', () => { openThread(id); loadList(); });
        const sf = $('#share-form');
        if (sf) {
          sf.addEventListener('submit', e => {
            e.preventDefault(); M.clearError(sf);
            const done = M.busy(sf.querySelector('button'), 'Sharing...');
            M.api('shareContact', { threadId: id, contact: $('#sh-c').value }).then(() => { M.toast('Done.', 'ok'); openThread(id); }, err => { done(); M.showError(sf, err.message); });
          });
        }
        const ss = $('#stop-share');
        if (ss) { ss.addEventListener('click', () => { M.api('shareContact', { threadId: id, share: false }).then(() => { M.toast('Your contact details are no longer shared.', 'ok'); openThread(id); }, err => M.toast(err.message, 'error')); }); }
        bub.addEventListener('click', e => {
          const b = e.target.closest('[data-report]'); if (!b) { return; }
          const d = M.modal(`<h2>Report this message</h2><p>A person will read it. Nothing is sent to the other member.</p><form novalidate><div class="field"><label for="rm-r">What is the problem?</label><select id="rm-r"><option>Scam or suspicious</option><option>Rude or abusive</option><option>Other</option></select></div><div class="field"><label for="rm-d">Details (optional)</label><textarea id="rm-d" rows="3" maxlength="600"></textarea></div><button class="btn btn-danger btn-block" type="submit">Send report</button></form>`);
          const fm = d.querySelector('form');
          fm.addEventListener('submit', ev => {
            ev.preventDefault();
            const done = M.busy(fm.querySelector('button[type=submit]'), 'Sending...');
            M.api('report', { targetType: 'message', targetId: b.getAttribute('data-report'), reason: d.querySelector('#rm-r').value, details: d.querySelector('#rm-d').value }).then(() => { d.close(); M.toast('Thank you. We will look at it.', 'ok'); }, err => { done(); M.showError(fm, err.message); });
          });
        });
      }, err => { box.innerHTML = M.errorBox(err.message); });
    }
    loadList().then(() => { if (current) { openThread(current, false); } });
  };

  // ================================================================== DELIVERY
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function timeline(history) {
    const labels = { buyer: 'Buyer', seller: 'Seller', carrier: 'Delivery partner', admin: 'Site team', system: 'Automatic' };
    return '<ol class="timeline">' + (history || []).slice().reverse().map(h => `<li><strong>${esc(h.s)}</strong> <span class="muted small">${esc(M.dateTime(h.at))} &middot; ${esc(labels[h.by] || h.by)}</span>${h.note ? `<br><span class="small">${esc(h.note)}</span>` : ''}</li>`).join('') + '</ol>';
  }
  function photoStrip(ids, label) {
    if (!ids || !ids.length) { return ''; }
    return `<h3>${esc(label)}</h3><div class="photo-grid">${ids.map((id, i) => `<a class="photo-item" href="${esc(M.photoUrl(id, 1600))}" target="_blank" rel="noopener noreferrer"><img src="${esc(M.photoUrl(id, 500))}" alt="${esc(label)} ${i + 1}" loading="lazy" data-photo></a>`).join('')}</div>`;
  }
  function quoteTable(q) {
    return `<table class="quote-table"><tbody>${(q.lines || []).map(l => `<tr><td>${esc(l.label)}</td><td>${l.amount ? esc(M.moneyExact(l.amount)) : ''}</td></tr>`).join('')}<tr class="total"><td>Total${q.estimate ? ' (estimate)' : q.final ? ' (final quote)' : ''}</td><td>${esc(M.moneyExact(q.total))}</td></tr></tbody></table>${q.note ? `<p class="small">${esc(q.note)}</p>` : ''}`;
  }

  M.pages.delivery = function () {
    if (!M.requireLogin()) { return; }
    const app = $('#app');
    const p = M.params();
    if (p.new) { return deliveryForm(app, p); }
    if (p.id) { return deliveryDetail(app, p.id); }
    app.innerHTML = M.loading();
    M.api('deliveryMine', {}).then(r => {
      if (!r.items.length) { app.innerHTML = '<div class="empty"><h2>No deliveries yet</h2><p>On a listing that offers delivery, enter your ZIP code to see the price.</p><p><a class="btn" href="browse.html?delivery=1">See listings with delivery</a></p></div>'; return; }
      app.innerHTML = r.items.map(D => `<article class="item-row"><div class="thumb">${D.photo ? `<img src="${esc(M.photoUrl(D.photo, 200))}" alt="" data-photo>` : M.icon('truck')}</div><div><h3 style="margin:0 0 .2em"><a href="delivery.html?id=${encodeURIComponent(D.id)}">${esc(D.listingTitle)}</a></h3><p style="margin:0"><span class="status-pill status-${esc(D.status.replace(/\s/g, ''))}">${esc(D.status)}</span> You are the ${esc(D.role)}.</p></div></article>`).join('');
    }, err => { app.innerHTML = M.errorBox(err.message); });
  };

  function deliveryForm(app, p) {
    app.innerHTML = M.loading('Loading...');
    Promise.all([M.config(), M.api('listing', { id: p.new })]).then(arr => {
      const cfg = arr[0], L = arr[1].listing;
      if (!L.deliveryEligible || L.status !== 'Active') { app.innerHTML = M.errorBox('Delivery is not available for this item.') + '<p><a class="btn" href="browse.html">Browse listings</a></p>'; return; }
      app.innerHTML = `
      <div class="notice notice-info"><p><strong>How it works.</strong> You request delivery and see a price. The delivery partner confirms a final quote. <strong>Nothing is charged until you approve that quote.</strong> The seller confirms where to pick it up. The driver photographs the item at pickup and delivery.</p></div>
      <div class="item-row" style="margin-top:1rem"><div class="thumb">${L.photos[0] ? `<img src="${esc(M.photoUrl(L.photos[0], 200))}" alt="" data-photo>` : M.icon(M.catIcon(L.category))}</div><div><h2 style="margin:0">${esc(M.title(L))}</h2><p style="margin:0">${esc(M.money(L.price, L.free))} &middot; ${esc(L.city)}, ${esc(L.state)}</p></div></div>
      <form id="df" class="card" novalidate>
        <h2>Where should it go?</h2>
        <div class="form-grid two">
          <div class="field"><label for="d-name">Your name (the person receiving it)</label><input id="d-name" name="buyerName" type="text" maxlength="80" autocomplete="name" required></div>
          <div class="field"><label for="d-phone">Phone number the driver can call</label><input id="d-phone" name="buyerPhone" type="tel" autocomplete="tel" required></div>
          <div class="field"><label for="d-addr">Street address</label><input id="d-addr" name="address" type="text" maxlength="120" autocomplete="street-address" required></div>
          <div class="field"><label for="d-city">City</label><input id="d-city" name="city" type="text" maxlength="60" autocomplete="address-level2" required></div>
          <div class="field"><label for="d-zip">ZIP code (Wisconsin or Michigan)</label><input id="d-zip" name="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" required value="${esc(/^\d{5}$/.test(p.zip || '') ? p.zip : '')}"></div>
        </div>
        <h2>Getting it inside</h2>
        <div class="form-grid three">
          <div class="field"><label for="d-steps">Steps at the entrance</label><select id="d-steps" name="steps"><option value="none">None</option><option>1 to 3</option><option>4 or more</option></select></div>
          <div class="field"><label for="d-elev">Is there an elevator?</label><select id="d-elev" name="elevator"><option>not sure</option><option>yes</option><option>no</option></select></div>
          <div class="field"><label for="d-door">Narrowest doorway (inches)</label><input id="d-door" name="doorwayIn" type="number" min="10" max="60" step="0.5" inputmode="decimal"></div>
        </div>
        <fieldset><legend>Days that work for you (pick any)</legend><div class="row">${DAYS.map(d => `<div class="check"><input type="checkbox" name="day" id="dy-${d}" value="${d}"><label for="dy-${d}">${d}</label></div>`).join('')}</div></fieldset>
        <div class="form-grid two"><div class="field"><label for="d-time">Best time of day</label><select id="d-time" name="time"><option value="any">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option></select></div></div>
        <div class="field"><label for="d-ins">Anything the driver should know?</label><textarea id="d-ins" name="instructions" rows="3" maxlength="400" placeholder="Gate code is not needed now. Example: Use the side door."></textarea><p class="hint">Do not type email addresses or health information.</p></div>
        <h2>Extras and price</h2>
        <div id="d-addons"></div>
        <div class="check"><input type="checkbox" id="d-rush" name="rush"><label for="d-rush">Rush (as soon as possible)</label></div>
        <div id="d-quote" aria-live="polite"><p class="muted">Enter your ZIP code to see the price.</p></div>
        <h2>Please confirm</h2>
        <div class="check"><input type="checkbox" id="a1" name="agreePartner"><label for="a1">I understand the delivery is performed by Mobility City, an independent business, and not by this website. ${esc(cfg.carrierDisclosure || '')}</label></div>
        <div class="check"><input type="checkbox" id="a2" name="agreeAsIs"><label for="a2">I understand this is used equipment sold as is by the seller. This website does not inspect, repair, or guarantee it.</label></div>
        <div class="check"><input type="checkbox" id="a3" name="agreeTerms"><label for="a3">I have read and agree to the <a href="delivery-terms.html" target="_blank">Delivery Terms</a>.</label></div>
        <div class="check"><input type="checkbox" id="a4" name="consentDelivery"><label for="a4">I agree that my name, phone number, and delivery address will be shared with the delivery partner and the seller's city with the driver, only to complete this delivery.</label></div>
        <div class="check"><input type="checkbox" id="a5" name="consentMarketing"><label for="a5">Also email me the weekly update (optional).</label></div>
        <button class="btn btn-block" type="submit">Request this delivery</button>
      </form>`;
      const f = $('#df');
      let addons = [], timer = null, lastQuote = null;
      function selectedServices() { return M.$$('input[name=service]:checked', f).map(i => i.value); }
      function quote() {
        const zip = f.zip.value.trim(); const out = $('#d-quote');
        if (!/^\d{5}$/.test(zip)) { out.innerHTML = '<p class="muted">Enter your ZIP code to see the price.</p>'; return; }
        const days = M.$$('input[name=day]:checked', f).map(i => i.value);
        const fl = f.querySelector('#d-flights');
        out.innerHTML = M.loading('Working out the price...');
        M.api('quote', { listingId: L.id, buyerZip: zip, services: selectedServices(), stairs: fl ? Number(fl.value) || 0 : 0, weekend: days.length === 1 && days[0] === 'Sat', rush: f.rush.checked }).then(r => {
          lastQuote = r.quote;
          if (!addons.length && r.addons) { addons = r.addons; drawAddons(); }
          const q = r.quote;
          out.innerHTML = !q.available ? `<div class="notice notice-warn"><p>${esc(q.reason)}</p></div>` : `${quoteTable(q)}<p class="small muted">${q.estimate ? 'This is an estimate. ' : ''}${esc(q.partnerName)} confirms the final quote before you approve anything.${q.needsManual ? ' Some items are priced by the delivery partner.' : ''}</p>`;
        }, err => { out.innerHTML = M.errorBox(err.message); });
      }
      function drawAddons() {
        const sel = selectedServices(), flv = f.querySelector('#d-flights') ? f.querySelector('#d-flights').value : '1';
        $('#d-addons').innerHTML = addons.length ? `<fieldset><legend>Add-ons</legend>${addons.map(a => `<div class="check"><input type="checkbox" name="service" id="sv-${esc(a.key)}" value="${esc(a.key)}" ${sel.includes(a.key) ? 'checked' : ''}><label for="sv-${esc(a.key)}">${esc(a.label)}${a.key === 'STAIRS' ? '' : a.amount > 0 ? ' (+' + esc(M.moneyExact(a.amount)) + ')' : ' (priced by the delivery partner)'}</label></div>${a.key === 'STAIRS' && sel.includes('STAIRS') ? `<div class="field" style="margin-left:2.2rem"><label for="d-flights">Flights of stairs</label><input id="d-flights" type="number" min="1" max="10" value="${esc(flv)}" style="max-width:120px"></div>` : ''}`).join('')}</fieldset>` : '';
      }
      f.addEventListener('change', e => {
        if (e.target.name === 'service') { drawAddons(); }
        if (['zip', 'service', 'day', 'rush'].includes(e.target.name) || e.target.id === 'd-flights') { clearTimeout(timer); timer = setTimeout(quote, 250); }
      });
      f.zip.addEventListener('input', () => { if (/^\d{5}$/.test(f.zip.value.trim())) { clearTimeout(timer); timer = setTimeout(quote, 400); } });
      if (f.zip.value) { quote(); }
      f.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(f);
        const need = (c, m) => { if (!c) { M.showError(f, m); return false; } return true; };
        if (!need(f.buyerName.value.trim().length >= 2, 'Please enter your name.')) { return; }
        if (!need(f.buyerPhone.value.replace(/\D/g, '').length >= 10, 'Please enter a phone number the driver can call.')) { return; }
        if (!need(f.address.value.trim().length >= 5 && f.city.value.trim(), 'Please enter the full delivery address.')) { return; }
        if (!need(/^\d{5}$/.test(f.zip.value.trim()), 'Please enter a 5-digit ZIP code.')) { return; }
        if (!need(['agreePartner', 'agreeAsIs', 'agreeTerms', 'consentDelivery'].every(k => f[k].checked), 'Please check all four required confirmation boxes.')) { return; }
        const days = M.$$('input[name=day]:checked', f).map(i => i.value);
        const fl = f.querySelector('#d-flights');
        const done = M.busy(f.querySelector('button[type=submit]'), 'Sending your request...');
        M.api('deliveryRequest', {
          listingId: L.id, buyerName: f.buyerName.value, buyerPhone: f.buyerPhone.value, address: f.address.value, city: f.city.value, zip: f.zip.value.trim(),
          steps: f.steps.value, elevator: f.elevator.value, doorwayIn: f.doorwayIn.value, days: days, time: f.time.value, instructions: f.instructions.value,
          services: selectedServices(), stairs: fl ? Number(fl.value) || 0 : 0, rush: f.rush.checked,
          agreePartner: true, agreeAsIs: true, agreeTerms: true, consentDelivery: true, consentMarketing: f.consentMarketing.checked
        }).then(r => { window.location.href = 'delivery.html?id=' + encodeURIComponent(r.deliveryId); }, err => { done(); M.showError(f, err.message); });
      });
    }).catch(err => { app.innerHTML = M.errorBox(err.message); });
  }

  function deliveryDetail(app, id) {
    app.innerHTML = M.loading('Loading...');
    function load() {
      M.api('deliveryGet', { id: id }).then(r => draw(r.delivery), err => { app.innerHTML = M.errorBox(err.message) + '<p><a class="btn" href="dashboard.html#deliveries">Back to My account</a></p>'; });
    }
    function draw(D) {
      const buyer = D.role === 'buyer', seller = D.role === 'seller';
      let action = '';
      if (buyer && D.status === 'Requested') { action = '<div class="notice notice-info"><p><strong>Waiting for the delivery partner\'s final quote.</strong> You will get an email, usually within one business day.</p></div>'; }
      if (buyer && D.canApprove) { action = `<div class="notice notice-ok"><p><strong>Your final quote is ready: ${esc(M.moneyExact(D.quote.total))}.</strong> Nothing is charged until you approve. The delivery partner will contact you about payment and scheduling after you approve.</p><p><button class="btn btn-green" type="button" id="approve">Approve this quote</button></p></div>`; }
      if (seller && D.needsSellerConfirm) {
        action = `<form id="sc" class="card" novalidate><h2>Confirm pickup details</h2><p>Tell the delivery partner where to pick it up. Your address is shared only with the delivery partner. The buyer sees only your city.</p>
          <div class="form-grid two"><div class="field"><label for="s-a">Street address</label><input id="s-a" type="text" maxlength="120" autocomplete="street-address" required></div><div class="field"><label for="s-c">City</label><input id="s-c" type="text" maxlength="60" required></div><div class="field"><label for="s-z">ZIP code</label><input id="s-z" inputmode="numeric" maxlength="5" required></div></div>
          <fieldset><legend>Days you can be home for pickup</legend><div class="row">${DAYS.map(d => `<div class="check"><input type="checkbox" name="sd" id="sd-${d}" value="${d}"><label for="sd-${d}">${d}</label></div>`).join('')}</div></fieldset>
          <div class="field"><label for="s-n">Notes for the driver</label><textarea id="s-n" rows="3" maxlength="400" placeholder="Example: Item is in the garage. Please ring the bell."></textarea></div>
          <div class="check"><input type="checkbox" id="s-h"><label for="s-h">Someone will be home to hand it over.</label></div>
          <button class="btn" type="submit">Confirm pickup details</button></form>`;
      }
      const loc = buyer ? `<p><strong>Delivery address:</strong> ${esc(D.deliveryAddress)}<br><strong>Item is in:</strong> ${esc(D.otherCity)}</p>` : `<p><strong>Delivery city:</strong> ${esc(D.otherCity)}${D.pickupAddress ? `<br><strong>Pickup address you gave:</strong> ${esc(D.pickupAddress)}` : ''}</p>`;
      app.innerHTML = `
        <p><a href="dashboard.html#deliveries">&larr; My deliveries</a></p>
        <div class="item-row"><div class="thumb">${D.photo ? `<img src="${esc(M.photoUrl(D.photo, 200))}" alt="" data-photo>` : M.icon('truck')}</div><div><h2 style="margin:0"><a href="listing.html?id=${encodeURIComponent(D.listingId)}">${esc(D.listingTitle)}</a></h2><p style="margin:.2em 0 0"><span class="status-pill status-${esc(D.status.replace(/\s/g, ''))}">${esc(D.status)}</span> You are the ${esc(D.role)}.</p></div></div>
        ${D.status === 'Issue' ? `<div class="notice notice-error"><p><strong>There is an issue:</strong> ${esc(D.issueNote)} Our team has been notified.</p></div>` : ''}
        ${action}
        <div class="listing-layout" style="margin-top:1.4rem"><div>
          <div class="card"><h2>Details</h2>${loc}
            ${D.pickupDate || D.deliveryDate ? `<p><strong>Scheduled:</strong> pickup ${esc(D.pickupDate ? M.date(D.pickupDate) : 'to be confirmed')}, delivery ${esc(D.deliveryDate ? M.date(D.deliveryDate) : 'to be confirmed')}</p>` : ''}
            ${D.preferredDays ? `<p><strong>Buyer's days:</strong> ${esc(D.preferredDays)} (${esc(D.preferredTime)})</p>` : ''}
            ${D.buyerSignoff ? `<p><strong>Signed for by:</strong> ${esc(D.buyerSignoff)}</p>` : ''}
            ${photoStrip(D.pickupPhotos, 'Photos at pickup')}${photoStrip(D.deliveryPhotos, 'Photos at delivery')}</div>
        </div><aside>
          <div class="side-card"><h2>Price</h2>${quoteTable(D.quote)}${D.quote.estimate ? '<p class="small muted">Estimate. The final quote comes from the delivery partner.</p>' : ''}${buyer && D.canCancel ? '<p><button class="btn btn-danger btn-sm" type="button" id="cancel">Cancel this delivery</button></p>' : ''}</div>
          <div class="side-card"><h2>History</h2>${timeline(D.history)}</div>
          <p class="small muted">Delivery is performed by an independent delivery partner. <a href="delivery-terms.html">Delivery Terms</a>. Questions? <a href="contact.html">Contact us</a>.</p>
        </aside></div>`;
      const ap = $('#approve');
      if (ap) { ap.addEventListener('click', () => M.confirm('Approve this quote of ' + M.moneyExact(D.quote.total) + '?', 'Approve').then(y => { if (!y) { return; } const done = M.busy(ap, 'Approving...'); M.api('deliveryApprove', { id: D.id }).then(() => { M.toast('Approved.', 'ok'); load(); }, err => { done(); M.toast(err.message, 'error'); }); })); }
      const cn = $('#cancel');
      if (cn) { cn.addEventListener('click', () => M.confirm('Cancel this delivery request?', 'Cancel it', true).then(y => { if (!y) { return; } M.api('deliveryCancel', { id: D.id }).then(() => { M.toast('Cancelled.', 'ok'); load(); }, err => M.toast(err.message, 'error')); })); }
      const sc = $('#sc');
      if (sc) {
        sc.addEventListener('submit', e => {
          e.preventDefault(); M.clearError(sc);
          const done = M.busy(sc.querySelector('button[type=submit]'), 'Saving...');
          M.api('deliverySellerConfirm', { id: D.id, address: $('#s-a').value, city: $('#s-c').value, zip: $('#s-z').value.trim(), days: M.$$('input[name=sd]:checked', sc).map(i => i.value), notes: $('#s-n').value, homeToHandOver: $('#s-h').checked }).then(() => { M.toast('Thank you. The delivery partner has been told.', 'ok'); load(); }, err => { done(); M.showError(sc, err.message); });
        });
      }
    }
    load();
  }

  // ================================================================== UNSUBSCRIBE
  M.pages.unsubscribe = function () {
    const app = $('#app');
    const t = M.params().t;
    if (!t) { app.innerHTML = '<div class="notice notice-warn"><p>This page needs the link from the bottom of one of our emails. Use that link, or <a href="contact.html">contact us</a> and we will remove you by hand.</p></div>'; return; }
    app.innerHTML = `<div class="card"><h2>Stop the weekly email?</h2><p>You will no longer get the weekly update or promotional email. You will still get messages about your own listings, deliveries, and sign-in links.</p><p><button class="btn" id="un" type="button">Yes, unsubscribe me</button></p></div>`;
    $('#un').addEventListener('click', () => {
      const done = M.busy($('#un'), 'Working...');
      M.api('unsubscribe', { token: t }, { noToken: true }).then(() => {
        app.innerHTML = `<div class="notice notice-ok" role="status"><h2 style="margin-top:0">You are unsubscribed</h2><p>We will not send you the weekly update anymore.</p></div><p>Changed your mind? <button type="button" id="re" ${linkBtn}>Subscribe again</button></p>`;
        $('#re').addEventListener('click', () => { M.api('resubscribe', { token: t }, { noToken: true }).then(() => { app.innerHTML = '<div class="notice notice-ok" role="status"><p>Welcome back. You are subscribed again.</p></div>'; }, err => { app.innerHTML = M.errorBox(err.message); }); });
      }, err => { done(); app.innerHTML = M.errorBox(err.message) + '<p><a href="contact.html">Contact us</a> and we will remove you by hand.</p>'; });
    });
  };
})();
