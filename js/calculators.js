/* Used Mobility Market - ramp length calculator and stairlift cost estimator.
   Plain JavaScript. Runs only on the two calculator pages. Nothing typed here is sent anywhere. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function track(tool) { try { if (typeof window.gtag === 'function') { window.gtag('event', 'calculator_used', { tool: tool }); } } catch (e) { /* ignore */ } }
  function feet(inches) {
    var ft = Math.floor(inches / 12 + 1e-9);
    var inch = Math.round(inches - ft * 12);
    if (inch === 12) { ft += 1; inch = 0; }
    return ft + ' ft' + (inch ? ' ' + inch + ' in' : '');
  }


  // ------------------------------------------------------------ optional quote request
  // Shown only after a result appears. Nothing is sent unless the visitor ticks the box and presses the button.
  function leadForm(boxId, tool, label, getSummary) {
    var box = $(boxId);
    if (!box || !(window.MDB_CONFIG || {}).LEADS_ENABLED) { return { show: function () {} }; }
    var built = false, hc = null, sent = false;
    function build() {
      built = true;
      box.innerHTML =
        '<h2 style="margin-top:0">Want free quotes from local providers?</h2>' +
        '<p>This is optional. Tell us where you are and we will pass your request to ' + esc(label) + ' near you so they can contact you. You are under no obligation.</p>' +
        '<form id="' + boxId + '-form" novalidate>' +
        '<div class="field"><label for="' + boxId + '-name">Your name</label><input id="' + boxId + '-name" type="text" autocomplete="name" maxlength="80"></div>' +
        '<div class="field"><label for="' + boxId + '-email">Email address</label><input id="' + boxId + '-email" type="email" autocomplete="email" maxlength="120"></div>' +
        '<div class="field"><label for="' + boxId + '-phone">Phone (optional)</label><input id="' + boxId + '-phone" type="tel" autocomplete="tel" maxlength="20"></div>' +
        '<div class="field"><label for="' + boxId + '-zip">ZIP code</label><input id="' + boxId + '-zip" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="5"></div>' +
        '<div class="check"><input type="checkbox" id="' + boxId + '-ok"><label for="' + boxId + '-ok">I agree that Used Mobility Market may share my name, email, phone, ZIP code and the details above with ' + esc(label) + ' so they can contact me about this project. I understand Used Mobility Market does not install, sell or guarantee their work.</label></div>' +
        '<div class="hc-slot"></div>' +
        '<div class="form-error" role="alert" hidden></div>' +
        '<button class="btn btn-block" type="submit">Send my request</button>' +
        '</form>';
      var form = $(boxId + '-form');
      var M = window.MDB;
      if (!M || !M.api || !M.humanCheck) { box.hidden = true; return; }
      var slot = box.querySelector('.hc-slot');
      $(boxId + '-email').addEventListener('focus', function () { if (!hc) { hc = M.humanCheck(slot); } }, { once: true });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var err = box.querySelector('.form-error');
        function fail(m) { err.textContent = m; err.hidden = false; err.classList.add('notice', 'notice-warn'); }
        err.hidden = true;
        var name = $(boxId + '-name').value.trim(), email = $(boxId + '-email').value.trim(), phone = $(boxId + '-phone').value.trim(), zip = $(boxId + '-zip').value.trim();
        if (!name) { return fail('Please enter your name.'); }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { return fail('Please enter a valid email address.'); }
        if (!/^\d{5}$/.test(zip)) { return fail('Please enter your 5 digit ZIP code.'); }
        if (!$(boxId + '-ok').checked) { return fail('Please tick the box to let us share your request.'); }
        if (!hc) { hc = M.humanCheck(slot); }
        var v = hc.values();
        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Sending...';
        M.api('projectLead', { tool: tool, name: name, email: email, phone: phone, zip: zip, details: getSummary(), consentShare: true, hp: v.hp, ch: v.ch }, { noToken: true }).then(function () {
          sent = true;
          try { if (typeof window.gtag === 'function') { window.gtag('event', 'quote_request', { tool: tool }); } } catch (x) { /* ignore */ }
          box.innerHTML = '<div class="notice notice-ok" role="status"><p><strong>Thank you.</strong> Your request is in. We sent a confirmation to your email. A local provider will contact you directly.</p></div>';
        }, function (ex) { btn.disabled = false; btn.textContent = 'Send my request'; hc.reset(); fail(ex && ex.message ? ex.message : 'Could not send. Please try again.'); });
      });
    }
    return { show: function () { if (sent) { return; } if (!built) { build(); } box.hidden = false; } };
  }

  // ------------------------------------------------------------ ramp
  var rampSummary = '';
  var rampLead = leadForm('rc-lead', 'ramp', 'local ramp builders and installers', function () { return rampSummary; });
  var rampForm = $('rc-form');
  if (rampForm) {
    var used = false;
    var run = function (ev) {
      if (ev) { ev.preventDefault(); }
      var out = $('rc-out');
      var rise = parseFloat($('rc-rise').value);
      var ratio = parseInt($('rc-slope').value, 10);
      var price = parseFloat($('rc-price').value);
      if (!isFinite(rise) || rise <= 0) {
        out.innerHTML = '<p class="muted">Enter the total rise in inches to see the result.</p>';
        return;
      }
      if (rise > 120) {
        out.innerHTML = '<div class="notice notice-warn"><p>That is more than 10 feet of rise. A ramp that tall is a major building project. Please talk to a qualified contractor.</p></div>';
        return;
      }
      if (!used) { used = true; track('ramp'); }
      var len = rise * ratio;
      var runs = Math.max(1, Math.ceil(rise / 30 - 1e-9));
      var landings = runs - 1;
      var room = len / 12 + 5 * (runs + 1);
      var h = '<h2 style="margin-top:0">Your ramp</h2>';
      h += '<p class="price-big">' + esc(feet(len)) + '</p>';
      h += '<p class="muted">of ramp surface at 1:' + ratio + ' for ' + esc(String(rise)) + ' inches of rise.</p>';
      h += '<ul>';
      h += '<li><strong>' + runs + (runs === 1 ? ' run' : ' runs') + '.</strong> A single run can rise at most 30 inches under the ADA guide' + (runs > 1 ? '. Yours needs a flat landing between runs.' : '.') + '</li>';
      h += '<li><strong>Landings:</strong> a flat landing at the top, at the bottom, and ' + (landings ? landings + ' in between' : 'at any turn') + '. Each should be at least 5 ft by 5 ft (60 by 60 inches).</li>';
      h += '<li><strong>Room needed in a straight line:</strong> about ' + esc(feet(room * 12)) + ', counting the ramp and landings.</li>';
      h += '<li><strong>Width:</strong> at least 36 inches clear between the handrails.</li>';
      h += '<li><strong>Handrails:</strong> ' + (rise > 6 ? 'on both sides, with edge protection along the sides.' : 'a rise of 6 inches or less does not need handrails under the ADA guide, but edge protection still matters.') + '</li>';
      h += '</ul>';
      if (isFinite(price) && price > 0) {
        h += '<p><strong>Rough cost at ' + money(price) + ' per foot:</strong> ' + money(price * len / 12) + ' for the ramp surface. Landings, railings and installation are often priced separately, so ask for the total in writing.</p>';
      }
      h += '<h3>Compare slopes</h3><div class="table-wrap"><table class="legal-table"><thead><tr><th>Slope</th><th>Ramp length</th></tr></thead><tbody>';
      [12, 16, 20].forEach(function (r) {
        var sel = r === ratio;
        h += '<tr><td>' + (sel ? '<strong>1:' + r + '</strong>' : '1:' + r) + '</td><td>' + (sel ? '<strong>' : '') + esc(feet(rise * r)) + (sel ? '</strong>' : '') + '</td></tr>';
      });
      h += '</tbody></table></div>';
      h += '<p class="muted">1:12 is the steepest slope the ADA guide allows. A gentler slope is easier to push up and safer coming down, but takes more room.</p>';
      out.innerHTML = h;
      rampSummary = 'Ramp project: ' + rise + ' inch rise, 1:' + ratio + ' slope, about ' + feet(len) + ' of ramp, ' + runs + (runs === 1 ? ' run.' : ' runs.');
      rampLead.show();
    };
    rampForm.addEventListener('submit', run);
    ['rc-rise', 'rc-slope', 'rc-price'].forEach(function (id) { var el = $(id); el.addEventListener('input', function () { run(); }); el.addEventListener('change', function () { run(); }); });
    run();
  }

  // ------------------------------------------------------------ stairlift
  var liftSummary = '';
  var liftLead = leadForm('sl-lead', 'stairlift', 'local stairlift and mobility providers', function () { return liftSummary; });
  var liftForm = $('sl-form');
  if (liftForm) {
    var used2 = false;
    var TYPES = {
      straight: { label: 'New straight stairlift (one straight staircase)', lo: 3200, hi: 4500, buy: true },
      curved1: { label: 'New curved stairlift, one 90-degree turn', lo: 9000, hi: 11000, buy: true },
      curved: { label: 'New curved stairlift, several turns or landings', lo: 9000, hi: 15000, buy: true },
      outdoor: { label: 'New outdoor straight stairlift', lo: 3500, hi: 7500, buy: true },
      used: { label: 'Used or refurbished straight stairlift', lo: 2000, hi: 3200, buy: true },
      rental: { label: 'Rental (straight stairlift)', rent: true }
    };
    var ADD = {
      swivel: { lo: 300, hi: 500 },
      fold: { lo: 200, hi: 400 },
      heavy: { lo: 500, hi: 1500 },
      warranty: { lo: 200, hi: 500 }
    };
    var run2 = function (ev) {
      if (ev) { ev.preventDefault(); }
      var out = $('sl-out');
      var t = TYPES[$('sl-type').value];
      if (!t) { return; }
      if (!used2) { used2 = true; track('stairlift'); }
      var h = '<h2 style="margin-top:0">Your ballpark</h2>';
      var optsBox = $('sl-opts');
      if (t.rent) {
        if (optsBox) { optsBox.hidden = true; }
        h += '<p class="price-big">$500 to $1,000 to set up</p>';
        h += '<p>Then about <strong>$150 to $300 a month</strong>. Over 12 months that is roughly ' + money(500 + 150 * 12) + ' to ' + money(1000 + 300 * 12) + '.</p>';
        h += '<p class="muted">Renting suits a short recovery. If you will need it for more than a year or two, buying new or used usually costs less.</p>';
        out.innerHTML = h;
        liftSummary = 'Stairlift project: ' + t.label + '.';
        liftLead.show();
        return;
      }
      if (optsBox) { optsBox.hidden = false; }
      var lo = t.lo, hi = t.hi;
      var note = [];
      ['swivel', 'fold', 'heavy'].forEach(function (k) {
        var el = $('sl-' + k);
        if (el && el.checked) { lo += ADD[k].lo; hi += ADD[k].hi; note.push($('sl-' + k + '-label').textContent); }
      });
      if ($('sl-premium').checked) { lo *= 1.10; hi *= 1.15; note.push('Premium brand'); }
      var loc = $('sl-loc').value;
      if (loc === 'low') { lo *= 0.85; hi *= 0.90; }
      if (loc === 'high') { lo *= 1.15; hi *= 1.25; }
      if (loc === 'remote') { lo += 200; hi += 500; }
      if ($('sl-warranty').checked) { lo += ADD.warranty.lo; hi += ADD.warranty.hi; note.push('Extended warranty'); }
      h += '<p class="price-big">' + money(lo) + ' to ' + money(hi) + '</p>';
      h += '<p class="muted">' + esc(t.label) + (t.buy && t !== TYPES.used ? ', installed.' : '.') + '</p>';
      if (note.length) { h += '<p>Includes: ' + esc(note.join(', ')) + '.</p>'; }
      h += '<h3>Costs after you buy</h3><ul>';
      h += '<li><strong>Batteries:</strong> about $50 to $120 a pair, replaced every 2 to 3 years.</li>';
      h += '<li><strong>Yearly service:</strong> about $150 for one visit. A maintenance contract is optional, at roughly $300 to $500 a year.</li>';
      h += '</ul>';
      if (t === TYPES.used) { h += '<div class="notice notice-warn"><p>Ask who installs it, whether it has a warranty, and whether the rail fits your stairs. Used lifts are usually sized for one staircase.</p></div>'; }
      out.innerHTML = h;
      liftSummary = 'Stairlift project: ' + t.label + (note.length ? ' (' + note.join(', ') + ')' : '') + '. Area: ' + $('sl-loc').options[$('sl-loc').selectedIndex].text + '. Ballpark shown: ' + money(lo) + ' to ' + money(hi) + '.';
      liftLead.show();
    };
    liftForm.addEventListener('submit', run2);
    liftForm.addEventListener('input', function () { run2(); });
    liftForm.addEventListener('change', function () { run2(); });
    run2();
  }
})();
