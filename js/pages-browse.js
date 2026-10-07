/* Mobility Database - public browsing pages:
   home, browse, free corner, fit finder, listing detail, price guide, equipment passport. */
(function () {
  'use strict';
  const M = window.MDB;
  const esc = M.esc;
  const $ = M.$;

  const REPORT_REASONS = ['Scam or suspicious', 'Prohibited item', 'Wrong or misleading information', 'Rude or abusive', 'Contact details in the listing', 'Other'];

  // ------------------------------------------------------------------ shared: pager
  function pagerHtml(page, pages) {
    if (pages <= 1) { return ''; }
    return `<button class="btn btn-secondary" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button>` +
      `<span aria-live="polite">Page ${page} of ${pages}</span>` +
      `<button class="btn btn-secondary" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Next</button>`;
  }

  // ------------------------------------------------------------------ HOME
  M.pages.home = function () {
    const catsEl = $('#home-cats');
    const newEl = $('#home-new');
    const sel = $('#hs-category');
    M.config().then(cfg => {
      if (catsEl) {
        catsEl.innerHTML = cfg.categories.map(c =>
          `<a class="cat-tile" href="browse.html?category=${encodeURIComponent(c.name)}">${M.icon(M.catIcon(c.name))}<span>${esc(c.name)}</span></a>`).join('');
      }
      if (sel) { M.fillSelect(sel, cfg.categories, 'All equipment', c => c.name, c => c.name); }
    });
    const form = $('#home-search');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const zip = form.zip.value.trim();
        if (zip && !/^\d{5}$/.test(zip)) { M.showError(form, 'Please enter a 5-digit ZIP code, or leave it blank.'); return; }
        const q = { q: form.q.value.trim(), category: form.category.value, zip: zip, radius: zip ? form.radius.value : '' };
        window.location.href = 'browse.html' + (M.qs(q) ? '?' + M.qs(q) : '');
      });
    }
    if (newEl) {
      newEl.innerHTML = M.loading('Loading the newest listings...');
      M.api('listings', { pageSize: 8, sort: 'newest' }, { noToken: true }).then(r => {
        if (!r.items.length) {
          newEl.innerHTML = `<div class="empty"><h3>Be the first to list</h3><p>No listings yet. Listing takes about ten minutes, and the first one you post is checked by a person before it goes live.</p><p><a class="btn" href="create-listing.html">List your equipment</a></p></div>`;
          return;
        }
        newEl.innerHTML = M.listingGrid(r.items);
      }, err => { newEl.innerHTML = M.errorBox(err); });
    }
    const wiNote = $('#home-wi');
    if (wiNote) { wiNote.hidden = false; }
  };

  // ------------------------------------------------------------------ BROWSE / FREE CORNER
  function readFilters(form, preset) {
    const f = {
      q: form.q.value.trim(), category: form.category.value, minPrice: form.minPrice.value.trim(), maxPrice: form.maxPrice.value.trim(),
      grades: Array.from(form.querySelectorAll('input[name="grade"]:checked')).map(i => i.value),
      state: form.state.value, zip: form.zip.value.trim(), radius: form.radius.value, sort: form.sort.value,
      free: preset === 'free' ? true : form.free.checked, delivery: form.delivery.checked, checked: form.checked.checked
    };
    return f;
  }

  M.pages.browse = function () {
    const app = $('#app');
    const preset = document.body.getAttribute('data-preset') || '';
    app.innerHTML = M.loading('Loading...');
    M.config().then(cfg => {
      app.innerHTML = `
      <div class="browse-layout">
        <details class="filters" id="filters">
          <summary>Search and filters</summary>
          <form id="bf" novalidate>
            <div class="field"><label for="f-q">Search words</label><input id="f-q" name="q" type="search" placeholder="Example: scooter, Pride, Hoveround"></div>
            <div class="field"><label for="f-cat">Type of equipment</label><select id="f-cat" name="category"></select></div>
            <div class="form-grid two">
              <div class="field"><label for="f-min">Lowest price ($)</label><input id="f-min" name="minPrice" type="number" min="0" inputmode="numeric"></div>
              <div class="field"><label for="f-max">Highest price ($)</label><input id="f-max" name="maxPrice" type="number" min="0" inputmode="numeric"></div>
            </div>
            <fieldset><legend>Condition grade</legend>
              ${cfg.grades.map(g => `<div class="check"><input type="checkbox" name="grade" id="g-${esc(g.key.replace(/\W/g, ''))}" value="${esc(g.key)}"><label for="g-${esc(g.key.replace(/\W/g, ''))}">${esc(g.label)}</label></div>`).join('')}
              <p class="hint"><a href="guides.html#grades">What do the grades mean?</a></p>
            </fieldset>
            <div class="field"><label for="f-state">State</label><select id="f-state" name="state"></select></div>
            <div class="form-grid two">
              <div class="field"><label for="f-zip">Your ZIP code</label><input id="f-zip" name="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code"></div>
              <div class="field"><label for="f-rad">Within</label><select id="f-rad" name="radius"><option value="">Any distance</option><option>10</option><option>25</option><option>50</option><option>100</option><option>250</option></select></div>
            </div>
            <div class="check" ${preset === 'free' ? 'hidden' : ''}><input type="checkbox" id="f-free" name="free"><label for="f-free">Free items only</label></div>
            <div class="check"><input type="checkbox" id="f-del" name="delivery"><label for="f-del">Wisconsin delivery available</label></div>
            <div class="check"><input type="checkbox" id="f-chk" name="checked"><label for="f-chk">Safety checked by Mobility City</label></div>
            <div class="field"><label for="f-sort">Sort by</label><select id="f-sort" name="sort"><option value="newest">Newest first</option><option value="priceAsc">Lowest price</option><option value="priceDesc">Highest price</option><option value="nearest">Nearest (needs ZIP)</option></select></div>
            <button class="btn btn-block" type="submit">Show results</button>
            <p><button class="btn-link" type="button" id="f-reset" style="background:none;border:0;font:inherit;cursor:pointer;min-height:48px;text-decoration:underline;color:var(--blue)">Clear everything</button></p>
          </form>
        </details>
        <div>
          <div class="result-bar"><p id="count" role="status" aria-live="polite" style="margin:0"></p><button class="btn btn-secondary btn-sm" type="button" id="save-search">${M.icon('bell')} Email me new matches</button></div>
          <div id="results"></div>
          <nav class="pager" id="pager" aria-label="Pages of results"></nav>
        </div>
      </div>`;
      const form = $('#bf');
      M.fillSelect(form.category, cfg.categories, 'All equipment', c => c.name, c => c.name);
      M.fillSelect(form.state, cfg.states, 'Any state');
      if (window.innerWidth >= 960) { $('#filters').open = true; }

      const p = M.params();
      form.q.value = p.q || ''; form.category.value = p.category || ''; form.minPrice.value = p.minPrice || ''; form.maxPrice.value = p.maxPrice || '';
      (p.grades || '').split(',').forEach(g => { const i = form.querySelector(`input[name="grade"][value="${CSS.escape(g)}"]`); if (i) { i.checked = true; } });
      form.state.value = p.state || ''; form.zip.value = p.zip || ''; form.radius.value = p.radius || '';
      form.sort.value = p.sort || 'newest';
      form.free.checked = p.free === '1'; form.delivery.checked = p.delivery === '1'; form.checked.checked = p.checked === '1';
      let page = Math.max(1, parseInt(p.page, 10) || 1);
      let lastFilters = null;

      function load(push) {
        M.clearError(form);
        const f = readFilters(form, preset);
        if (f.zip && !/^\d{5}$/.test(f.zip)) { M.showError(form, 'Please enter a 5-digit ZIP code, or leave it blank.'); return; }
        if (f.radius && !f.zip) { M.showError(form, 'To search by distance, please enter your ZIP code.'); return; }
        if (f.sort === 'nearest' && !f.zip) { M.showError(form, 'To sort by nearest, please enter your ZIP code.'); return; }
        lastFilters = f;
        const urlObj = { q: f.q, category: f.category, minPrice: f.minPrice, maxPrice: f.maxPrice, grades: f.grades.join(','), state: f.state, zip: f.zip, radius: f.radius, sort: f.sort === 'newest' ? '' : f.sort, free: preset === 'free' ? '' : f.free, delivery: f.delivery, checked: f.checked, page: page > 1 ? page : '' };
        const url = window.location.pathname.split('/').pop() + (M.qs(urlObj) ? '?' + M.qs(urlObj) : '');
        try { push ? window.history.pushState(null, '', url) : window.history.replaceState(null, '', url); } catch (e) { /* ignore */ }
        const res = $('#results');
        res.innerHTML = M.loading('Searching...');
        const payload = { q: f.q, category: f.category, minPrice: f.minPrice, maxPrice: f.maxPrice, grades: f.grades, state: f.state, zip: f.zip, radius: f.radius, sort: f.sort, page: page, pageSize: 12 };
        if (f.free) { payload.free = true; }
        if (f.delivery) { payload.delivery = true; }
        if (f.checked) { payload.checked = true; }
        M.api('listings', payload, { noToken: true }).then(r => {
          page = r.page;
          $('#count').textContent = r.total === 0 ? 'No matches.' : `${r.total} ${r.total === 1 ? 'listing' : 'listings'} found.`;
          if (r.zipOk === false) { M.toast('We could not find that ZIP code, so distance was ignored.', 'error'); }
          if (!r.items.length) {
            res.innerHTML = `<div class="empty"><h2>Nothing matches yet</h2><p>Try fewer filters or a wider distance. You can also post what you need on the Wanted Board, and sellers will be told.</p><p><a class="btn" href="wanted.html">Post on the Wanted Board</a> <button class="btn btn-secondary" type="button" id="empty-save">Email me when something matches</button></p></div>`;
            const es = $('#empty-save'); if (es) { es.addEventListener('click', openSave); }
          } else {
            res.innerHTML = M.listingGrid(r.items) + (r.items.some(i => i.sample) ? '<p class="hint" style="margin-top:1rem">Listings marked SAMPLE show how the site works. They are not real items.</p>' : '');
          }
          $('#pager').innerHTML = pagerHtml(r.page, r.pages);
        }, err => { res.innerHTML = M.errorBox(err); $('#pager').innerHTML = ''; });
      }

      function openSave() {
        if (!M.loggedIn()) { M.requireLogin(); return; }
        const f = lastFilters || readFilters(form, preset);
        const d = M.modal(`<h2>Email me new matches</h2><p>We will email you when a new listing matches this search. Your search: <strong>${esc(describe(f))}</strong></p>
          <form novalidate><div class="field"><label for="ss-name">Name for this alert (optional)</label><input id="ss-name" type="text" maxlength="60"></div>
          <fieldset><legend>How often?</legend>
          <div class="check"><input type="radio" name="freq" id="ss-i" value="instant" checked><label for="ss-i">Right away, one email per new listing</label></div>
          <div class="check"><input type="radio" name="freq" id="ss-d" value="daily"><label for="ss-d">Once a day, in a single digest</label></div></fieldset>
          <button class="btn btn-block" type="submit">Save this alert</button></form>`);
        const fm = d.querySelector('form');
        fm.addEventListener('submit', e => {
          e.preventDefault();
          const done = M.busy(fm.querySelector('button[type=submit]'), 'Saving...');
          const query = { q: f.q, category: f.category, minPrice: f.minPrice, maxPrice: f.maxPrice, grades: f.grades, state: f.state, zip: f.zip, radius: f.radius, free: f.free, delivery: f.delivery, checked: f.checked };
          M.api('savedSearchCreate', { name: d.querySelector('#ss-name').value.trim(), query: query, frequency: fm.querySelector('input[name=freq]:checked').value }).then(() => {
            d.close(); M.toast('Alert saved. Manage your alerts in My account.', 'ok');
          }, err => { done(); M.showError(fm, err.message); });
        });
      }
      function describe(f) {
        const bits = [];
        if (f.q) { bits.push('"' + f.q + '"'); }
        if (f.category) { bits.push(f.category); }
        if (f.maxPrice) { bits.push('under $' + f.maxPrice); }
        if (f.state) { bits.push('in ' + f.state); }
        if (f.zip && f.radius) { bits.push('within ' + f.radius + ' miles of ' + f.zip); }
        if (f.free) { bits.push('free items'); }
        if (f.delivery) { bits.push('delivery available'); }
        return bits.length ? bits.join(', ') : 'all listings';
      }

      form.addEventListener('submit', e => { e.preventDefault(); page = 1; load(true); if (window.innerWidth < 960) { $('#filters').open = false; } });
      $('#f-reset').addEventListener('click', () => {
        form.reset(); form.sort.value = 'newest'; page = 1; load(true);
      });
      $('#save-search').addEventListener('click', openSave);
      $('#pager').addEventListener('click', e => {
        const b = e.target.closest('button[data-page]'); if (!b || b.disabled) { return; }
        page = parseInt(b.getAttribute('data-page'), 10); load(true); window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      window.addEventListener('popstate', () => window.location.reload());
      load(false);
    });
  };

  // ------------------------------------------------------------------ FIT FINDER
  M.pages.fit = function () {
    const app = $('#app');
    app.innerHTML = `
    <form id="ff" class="card" novalidate>
      <h2>Tell us about your space</h2>
      <p>Answer any one question or all three. We will show only the scooters, chairs, walkers, and lift chairs that can work, and tell you what we could not confirm.</p>
      <div class="form-grid three">
        <div class="field"><label for="ff-w">The user's weight (pounds)</label><input id="ff-w" name="weight" type="number" min="20" max="1000" inputmode="numeric"><p class="hint">Items are matched against the weight limit listed by the seller.</p></div>
        <div class="field"><label for="ff-d">Narrowest doorway (inches)</label><input id="ff-d" name="door" type="number" min="10" max="60" step="0.5" inputmode="decimal"><p class="hint">Measure the opening itself, not the door. We leave one inch of room for hands.</p></div>
        <div class="field"><label for="ff-v">How will it travel?</label><select id="ff-v" name="vehicle"><option value="">Not sure or not needed</option><option value="car">Car trunk</option><option value="suv">SUV or crossover</option><option value="minivan">Minivan with ramp or lift</option><option value="van">Full-size van with ramp or lift</option><option value="delivery">Delivered to me (Wisconsin)</option></select></div>
      </div>
      <button class="btn" type="submit">Find equipment that fits</button>
    </form>
    <div id="ff-results" style="margin-top:1.6rem"></div><nav class="pager" id="ff-pager" aria-label="Pages of results"></nav>
    <p class="med-note">This tool compares measurements and weight limits that sellers typed in. It is not medical advice and cannot judge whether equipment suits a person. Ask a therapist or equipment specialist about fit and safety.</p>`;
    const form = $('#ff');
    let page = 1;
    const p = M.params();
    form.weight.value = p.weight || ''; form.door.value = p.door || ''; form.vehicle.value = p.vehicle || '';
    function run() {
      M.clearError(form);
      const fit = { weight: Number(form.weight.value) || 0, door: Number(form.door.value) || 0, vehicle: form.vehicle.value };
      if (!fit.weight && !fit.door && !fit.vehicle) { M.showError(form, 'Please answer at least one question.'); return; }
      const res = $('#ff-results'); res.innerHTML = M.loading('Looking for matches...');
      M.api('listings', { fit: fit, page: page, pageSize: 12, sort: 'newest' }, { noToken: true }).then(r => {
        $('#ff-pager').innerHTML = pagerHtml(r.page, r.pages);
        if (!r.items.length) {
          res.innerHTML = `<div class="empty"><h2>No matches right now</h2><p>Nothing listed fits all of that yet. Post what you need on the Wanted Board and sellers who have a match will be told.</p><p><a class="btn" href="wanted.html">Post on the Wanted Board</a></p></div>`;
          return;
        }
        res.innerHTML = `<h2>${r.total} ${r.total === 1 ? 'match' : 'matches'}</h2>` + M.listingGrid(r.items);
      }, err => { res.innerHTML = M.errorBox(err); });
    }
    form.addEventListener('submit', e => { e.preventDefault(); page = 1; run(); });
    $('#ff-pager').addEventListener('click', e => {
      const b = e.target.closest('button[data-page]'); if (!b || b.disabled) { return; }
      page = parseInt(b.getAttribute('data-page'), 10); run(); window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    if (p.weight || p.door || p.vehicle) { run(); }
  };

  // ------------------------------------------------------------------ LISTING DETAIL
  function specRow(label, value) { return value === null || value === undefined || value === '' ? '' : `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`; }

  M.pages.listing = function () {
    const app = $('#app');
    const id = M.params().id;
    if (!id) { app.innerHTML = M.errorBox('No listing was chosen. Go back to Browse and pick one.'); return; }
    app.innerHTML = M.loading('Loading the listing...');
    Promise.all([M.config(), M.api('listing', { id: id })]).then(arr => render(arr[0], arr[1].listing)).catch(err => {
      app.innerHTML = M.errorBox(err.message) + '<p><a class="btn" href="browse.html">Browse other listings</a></p>';
    });

    function render(cfg, L) {
      document.title = M.title(L) + ' | ' + (cfg.siteName || 'Mobility Database');
      const gradeInfo = cfg.grades.find(g => g.key === L.grade);
      const photos = L.photos || [];
      const notLive = L.status !== 'Active';
      const mainPhoto = photos.length ? `<img src="${esc(M.photoUrl(photos[0], 1000))}" alt="Photo 1 of ${photos.length}: ${esc(M.title(L))}" data-photo id="g-main">` : M.icon(M.catIcon(L.category));
      const thumbs = photos.length > 1 ? `<div class="thumbs" role="group" aria-label="Photos">${photos.map((ph, i) => `<button type="button" data-i="${i}" aria-label="Show photo ${i + 1}" ${i === 0 ? 'aria-current="true"' : ''}><img src="${esc(M.photoUrl(ph, 200))}" alt="" loading="lazy" data-photo></button>`).join('')}</div>` : '';

      const serialHtml = L.serial ? `${esc(L.serial)} <a href="passport.html?serial=${encodeURIComponent(L.serial)}" class="small">(history)</a>` : '<span class="muted">Not provided</span>';
      const specs = [
        specRow('Type', esc(L.category)), specRow('Make', esc(L.make)), specRow('Model', esc(L.model)), specRow('Year', L.year ? esc(L.year) : ''),
        specRow('Serial number', serialHtml), specRow('Condition', esc(L.gradeLabel)),
        specRow('Weight limit', L.capacityLbs ? L.capacityLbs + ' lb' : ''), specRow('Seat width', L.seatWidthIn ? L.seatWidthIn + ' in' : ''),
        specRow('Overall width', L.widthIn ? L.widthIn + ' in' : ''), specRow('Overall length', L.lengthIn ? L.lengthIn + ' in' : ''),
        specRow('Folded size', esc(L.folded)), specRow('Heaviest piece', L.heaviestPieceLbs ? L.heaviestPieceLbs + ' lb' : ''),
        specRow('Battery type', esc(L.batteryType)), specRow('Battery age', L.batteryAgeYears !== null ? L.batteryAgeYears + (L.batteryAgeYears === 1 ? ' year' : ' years') : ''),
        specRow('Range', L.rangeMiles ? 'About ' + L.rangeMiles + ' miles' : ''), specRow('Last serviced', L.lastService ? M.date(L.lastService) : '')
      ].join('');

      const ck = L.checklist || {};
      const checks = [['poweredOn', 'Powers on'], ['brakes', 'Brakes tested'], ['batteryTested', 'Battery tested'], ['cleaned', 'Cleaned']]
        .map(c => `<li>${ck[c[0]] ? M.icon('check') : M.icon('alert')}${esc(c[1])}</li>`).join('');

      let guideHtml = '';
      if (L.guide) {
        const g = L.guide;
        let cmp = '';
        if (!L.free && L.price > 0) {
          if (L.price > g.high * 1.3) { cmp = 'The asking price is above this rough range. Ask the seller what makes this one worth more.'; }
          else if (L.price < g.low * 0.7) { cmp = 'The asking price is below this rough range. Check the condition and the serial number carefully.'; }
          else { cmp = 'The asking price is close to this rough range.'; }
        }
        guideHtml = `<section class="card" style="margin-top:1.4rem"><h2>${M.icon('tag')} What do similar items usually cost?</h2>
          <p><strong>${esc(M.money(g.low))} to ${esc(M.money(g.high))}</strong> is a rough starting range for this type, age, and condition (based on ${esc(g.basis)}${g.assumedAge ? ', age assumed' : ''}).</p>
          ${g.comps ? `<p>Real listings on this site for this type have a middle price of about ${esc(M.money(g.comps.median))} (${g.comps.count} listings).</p>` : ''}
          ${cmp ? `<p>${esc(cmp)}</p>` : ''}<p class="hint">${esc(g.note)} <a href="price-guide.html">Try the price guide</a>.</p></section>`;
      }

      const textBlocks = [['Included with it', L.accessories], ['Service history', L.serviceNotes], ['Why the seller is selling', L.reason]]
        .filter(b => b[1]).map(b => `<section style="margin-top:1.2rem"><h2>${esc(b[0])}</h2><p>${M.escBr(b[1])}</p></section>`).join('');

      const pickup = `<section style="margin-top:1.2rem"><h2>How you can get it</h2><ul>${(L.pickupOptions || []).map(o => `<li>${esc(o)}</li>`).join('')}</ul></section>`;

      let passportHtml = '';
      if (L.passportCount > 1) { passportHtml = `<div class="notice notice-info"><p><strong>This serial number has been listed ${L.passportCount} times on this site.</strong> <a href="passport.html?serial=${encodeURIComponent(L.serial)}">See its history</a> before you buy.</p></div>`; }

      const statusNote = notLive ? `<div class="notice notice-warn" role="status"><p><span class="status-pill status-${esc(L.status)}">${esc(L.status)}</span> ${
        L.status === 'Pending' ? 'This listing is waiting for review and is not visible to buyers yet.' : L.status === 'Sold' ? 'This item has been sold.' : L.status === 'Expired' ? 'This listing has expired and is hidden from buyers.' : 'This listing is not visible to buyers.'}${L.adminView && !L.isOwner ? ' (Viewing as an administrator.)' : ''}</p></div>` : '';

      app.innerHTML = `
      <nav aria-label="Breadcrumb" class="small" style="margin-bottom:1rem"><a href="browse.html">Browse</a> &rsaquo; <a href="browse.html?category=${encodeURIComponent(L.category)}">${esc(L.category)}</a></nav>
      ${statusNote}
      ${L.sample ? '<div class="notice notice-info"><p><strong>Sample listing.</strong> This is not a real item. It shows how a listing looks, and it cannot be messaged.</p></div>' : ''}
      <div class="title-row"><span class="grade grade-lg ${M.gradeClass(L.grade)}"><span aria-hidden="true">${esc(M.gradeLetter(L.grade))}</span><span class="sr-only">${esc(L.gradeLabel)}</span></span><h1>${esc(M.title(L))}</h1></div>
      <div class="listing-layout">
        <div>
          <div class="gallery-main">${mainPhoto}</div>${thumbs}
          ${L.video ? `<p style="margin-top:.8rem"><a href="${esc(L.video)}" target="_blank" rel="noopener noreferrer">Watch the seller's video (opens in a new tab)</a></p>` : ''}
          <div class="plate" style="margin-top:1.4rem"><h2>Equipment plate</h2><dl>${specs}</dl></div>
          ${gradeInfo ? `<p class="small muted" style="margin-top:.6rem"><strong>${esc(gradeInfo.label)}:</strong> ${esc(gradeInfo.text)}</p>` : ''}
          <section style="margin-top:1.4rem"><h2>Seller checklist <span class="small muted">(confirmed by the seller)</span></h2><ul class="checks">${checks}</ul></section>
          ${passportHtml ? '<div style="margin-top:1.2rem">' + passportHtml + '</div>' : ''}
          ${textBlocks}${pickup}${guideHtml}
        </div>
        <aside aria-label="Buying options">
          <div class="side-card">
            <div class="price-big">${esc(M.money(L.price, L.free))}${L.previousPrice ? ` <s class="small muted" style="font-weight:400"><span class="sr-only">was </span>${esc(M.money(L.previousPrice))}</s>` : ''}</div>
            <p class="muted" style="margin:.4rem 0 .8rem">${esc(L.city)}, ${esc(L.state)} &middot; listed ${esc(M.date(L.createdAt))}</p>
            <div class="seller-line"><strong>${esc(L.seller.name)}</strong>
              ${L.seller.verified ? `<span class="badge badge-green">${M.icon('check')}Verified seller</span>` : ''}
              ${L.carrierChecked ? `<span class="badge badge-green">${M.icon('shield')}Safety checked</span>` : ''}</div>
            <p class="small muted" style="margin:.5rem 0 0">${L.seller.completedSales ? L.seller.completedSales + ' completed ' + (L.seller.completedSales === 1 ? 'sale' : 'sales') + ' on this site. ' : ''}${L.seller.since ? 'Member since ' + esc(L.seller.since) + '.' : ''}</p>
            ${L.carrierChecked ? `<p class="small" style="margin:.5rem 0 0">A Mobility City technician checked this item${L.carrierCheckedDate ? ' on ' + esc(M.date(L.carrierCheckedDate)) : ''}. It is a visual and function check, not a guarantee.</p>` : ''}
          </div>
          <div id="owner-box"></div>
          <div id="contact-box"></div>
          <div id="delivery-box"></div>
          <div id="partner-box"></div>
          <div class="side-card"><h2>${M.icon('shield')} Staying safe</h2><ul class="small">
            <li>Look at the item in person, or use delivery with photo records.</li>
            <li>Meet in a public place, and bring someone with you.</li>
            <li>Never pay with gift cards, wire transfers, or a check for more than the price.</li>
            <li>Test the brakes, controls, and battery before you pay.</li>
            <li>Do not use a used chair or scooter for mobility until you are sure it works safely. A qualified technician can check it.</li></ul>
            <p class="small"><button type="button" class="btn-link" id="report-btn" style="background:none;border:0;font:inherit;cursor:pointer;color:var(--blue);text-decoration:underline;min-height:44px">Report this listing</button></p>
          </div>
        </aside>
      </div>`;

      // gallery
      const main = $('#g-main');
      M.$$('.thumbs button').forEach(b => b.addEventListener('click', () => {
        const i = Number(b.getAttribute('data-i'));
        if (main) { main.src = M.photoUrl(photos[i], 1000); main.alt = `Photo ${i + 1} of ${photos.length}: ${M.title(L)}`; }
        M.$$('.thumbs button').forEach(x => x.removeAttribute('aria-current')); b.setAttribute('aria-current', 'true');
      }));

      if (L.isOwner) { ownerBox(L); } else if (L.status === 'Active') { contactBox(L); deliveryBox(L); }
      partnerBox(L);
      $('#report-btn').addEventListener('click', () => reportDialog(L));
    }

    // ---- owner controls
    function ownerBox(L) {
      const box = $('#owner-box');
      const live = L.status === 'Active', exp = L.status === 'Expired';
      box.innerHTML = `<div class="side-card"><h2>This is your listing</h2>
        <p class="small muted">Status: <span class="status-pill status-${esc(L.status)}">${esc(L.status)}</span>${L.expiresAt && live ? ' Expires ' + esc(M.date(L.expiresAt)) + '.' : ''}</p>
        ${(live || L.status === 'Pending') ? `<form id="price-form" novalidate><div class="field"><label for="np">Change the price ($)</label><input id="np" type="number" min="1" max="100000" value="${esc(L.price)}" ${L.free ? 'disabled' : ''}><p class="hint">Lowering the price emails everyone watching it.</p></div><button class="btn btn-secondary btn-sm" type="submit" ${L.free ? 'disabled' : ''}>Save price</button></form>` : ''}
        <div class="item-actions">
          ${(live || exp) ? '<button class="btn btn-green btn-sm" data-act="sold" type="button">Mark as sold</button>' : ''}
          ${(live || exp) ? '<button class="btn btn-secondary btn-sm" data-act="renew" type="button">Renew this listing</button>' : ''}
          <button class="btn btn-danger btn-sm" data-act="remove" type="button">Remove listing</button>
        </div><p class="small"><a href="dashboard.html">Back to My account</a></p></div>`;
      const pf = $('#price-form');
      if (pf) {
        pf.addEventListener('submit', e => {
          e.preventDefault(); M.clearError(pf);
          const done = M.busy(pf.querySelector('button'), 'Saving...');
          M.api('editListing', { id: L.id, price: Number($('#np').value) }).then(() => { M.toast('Price saved.', 'ok'); setTimeout(() => window.location.reload(), 800); }, err => { done(); M.showError(pf, err.message); });
        });
      }
      box.addEventListener('click', e => {
        const b = e.target.closest('button[data-act]'); if (!b) { return; }
        const act = b.getAttribute('data-act');
        const doIt = () => M.api(act === 'sold' ? 'markSold' : act === 'renew' ? 'renewListing' : 'removeListing', { id: L.id }).then(() => { M.toast('Done.', 'ok'); setTimeout(() => window.location.reload(), 700); }, err => M.toast(err.message, 'error'));
        if (act === 'remove') { M.confirm('Remove this listing? Buyers will no longer see it.', 'Remove it', true).then(y => { if (y) { doIt(); } }); }
        else if (act === 'sold') { M.confirm('Mark this item as sold? It will be hidden from buyers.', 'Yes, it sold').then(y => { if (y) { doIt(); } }); }
        else { doIt(); }
      });
    }

    // ---- message the seller + save
    function contactBox(L) {
      const box = $('#contact-box');
      if (L.sample) { box.innerHTML = ''; return; }
      if (!M.loggedIn()) {
        box.innerHTML = `<div class="side-card"><h2>${M.icon('mail')} Ask the seller a question</h2><p>Sign in with just your email. No password. The seller never sees your email address or phone number.</p><a class="btn btn-block" href="login.html?next=${encodeURIComponent(M.here())}">Sign in to message the seller</a>
        <p class="small" style="margin-top:.8rem">Want to watch this item? <a href="login.html?next=${encodeURIComponent(M.here())}">Sign in</a> to save it and get price-drop emails.</p></div>`;
        return;
      }
      box.innerHTML = `<div class="side-card"><h2>${M.icon('mail')} Ask the seller a question</h2>
        <form id="msg-form" novalidate><div class="field"><label for="m-body">Your message</label><textarea id="m-body" rows="4" maxlength="1500" required placeholder="Example: Is the battery original? Could I see it on Saturday?"></textarea>
        <p class="hint">Emails and phone numbers cannot be typed here. After you talk, either of you can press Share My Contact, and details appear only when both agree.</p></div>
        <button class="btn btn-block" type="submit">Send message</button></form></div>
        <div class="side-card"><h2>${M.icon('heart')} Save this item</h2>
        <div class="check"><input type="checkbox" id="w-watch" ${L.watching ? 'checked' : ''}><label for="w-watch">Email me if the price drops</label></div>
        <button class="btn btn-secondary btn-block" id="save-btn" type="button">${L.saved ? 'Saved. Tap to remove' : 'Save this item'}</button></div>`;
      const mf = $('#msg-form');
      mf.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(mf);
        const body = $('#m-body').value.trim();
        if (body.length < 2) { M.showError(mf, 'Please type a message first.'); return; }
        const done = M.busy(mf.querySelector('button[type=submit]'), 'Sending...');
        M.api('sendMessage', { listingId: L.id, body: body }).then(r => {
          mf.innerHTML = `<div class="notice notice-ok" role="status"><p><strong>Message sent.</strong> You will get an email when the seller replies.</p></div><a class="btn btn-block" href="messages.html?thread=${encodeURIComponent(r.threadId)}">Open the conversation</a>`;
        }, err => { done(); M.showError(mf, err.message); });
      });
      let saved = L.saved;
      const sb = $('#save-btn'), wc = $('#w-watch');
      const doSave = () => {
        const done = M.busy(sb, 'Saving...');
        M.api('saveListing', { listingId: L.id, saved: !saved || false, watch: wc.checked }).then(r => {
          saved = r.saved; done(); sb.textContent = saved ? 'Saved. Tap to remove' : 'Save this item';
          M.toast(saved ? (r.watching ? 'Saved. We will email you if the price drops.' : 'Saved.') : 'Removed from your saved items.', 'ok');
          if (!saved) { wc.checked = false; }
        }, err => { done(); sb.textContent = saved ? 'Saved. Tap to remove' : 'Save this item'; M.toast(err.message, 'error'); });
      };
      sb.addEventListener('click', doSave);
      wc.addEventListener('change', () => {
        if (!saved && wc.checked) { doSave(); return; }
        if (saved) {
          M.api('saveListing', { listingId: L.id, saved: true, watch: wc.checked }).then(r => M.toast(r.watching ? 'We will email you if the price drops.' : 'Price drop emails turned off.', 'ok'), err => M.toast(err.message, 'error'));
        }
      });
    }

    // ---- delivery estimate
    function deliveryBox(L) {
      const box = $('#delivery-box');
      if (!L.deliveryEligible || !L.carrierAvailable) {
        if (L.deliveryEligible) { box.innerHTML = ''; }
        return;
      }
      box.innerHTML = `<div class="side-card"><h2>${M.icon('truck')} Wisconsin delivery</h2>
        <p>Delivered by Mobility City, an independent delivery partner. See the price before you decide. Nothing is charged until you approve a final quote.</p>
        <form id="dq-form" novalidate><div class="field"><label for="dq-zip">ZIP code where it should be delivered</label><input id="dq-zip" inputmode="numeric" maxlength="5" autocomplete="postal-code"></div>
        <button class="btn btn-secondary btn-block" type="submit">Get a delivery estimate</button></form><div id="dq-out" aria-live="polite"></div></div>`;
      const f = $('#dq-form'), out = $('#dq-out');
      let addons = null, selected = [], stairs = 0, weekend = false, rush = false;
      function quote() {
        M.clearError(f);
        const zip = $('#dq-zip').value.trim();
        if (!/^\d{5}$/.test(zip)) { M.showError(f, 'Please enter a 5-digit ZIP code.'); return; }
        out.innerHTML = M.loading('Working out the price...');
        M.api('quote', { listingId: L.id, buyerZip: zip, services: selected, stairs: stairs, weekend: weekend, rush: rush }, { noToken: true }).then(r => {
          const q = r.quote; addons = r.addons || addons;
          if (!q.available) { out.innerHTML = `<div class="notice notice-warn"><p>${esc(q.reason)}</p></div>`; return; }
          const rows = q.lines.map(l => `<tr><td>${esc(l.label)}</td><td>${l.amount ? esc(M.moneyExact(l.amount)) : ''}</td></tr>`).join('');
          const addonHtml = (addons || []).map(a => `<div class="check"><input type="checkbox" data-addon="${esc(a.key)}" id="ad-${esc(a.key)}" ${selected.includes(a.key) ? 'checked' : ''}><label for="ad-${esc(a.key)}">${esc(a.label)}${a.key === 'STAIRS' ? '' : a.amount > 0 ? ' (+' + esc(M.moneyExact(a.amount)) + ')' : ' (priced by the carrier)'}</label></div>${a.key === 'STAIRS' && selected.includes('STAIRS') ? `<div class="field" style="margin-left:2.2rem"><label for="ad-fl">Flights of stairs (each flight)</label><input id="ad-fl" type="number" min="0" max="10" value="${stairs}" style="max-width:120px"></div>` : ''}`).join('');
          out.innerHTML = `<table class="quote-table" style="margin-top:1rem"><tbody>${rows}<tr class="total"><td>Total${q.estimate ? ' (estimate)' : ''}</td><td>${esc(M.moneyExact(q.total))}</td></tr></tbody></table>
            ${q.estimate ? '<p class="small muted">This is an estimate. The delivery partner confirms the final price before you approve anything.</p>' : ''}
            ${q.needsManual ? '<p class="small muted">The delivery partner will give you a final price for the items marked above.</p>' : ''}
            <fieldset style="margin-top:1rem"><legend>Add-ons</legend>${addonHtml}
              <div class="check"><input type="checkbox" id="ad-we" ${weekend ? 'checked' : ''}><label for="ad-we">Saturday delivery only</label></div>
              <div class="check"><input type="checkbox" id="ad-ru" ${rush ? 'checked' : ''}><label for="ad-ru">Rush (as soon as possible)</label></div></fieldset>
            <a class="btn btn-block" href="delivery.html?new=${encodeURIComponent(L.id)}&zip=${encodeURIComponent(zip)}">Request this delivery</a>
            <p class="small muted" style="margin-top:.6rem">${esc(q.partnerName)} is an independent business. ${esc((window.__cfg && window.__cfg.carrierDisclosure) || '')}</p>`;
        }, err => { out.innerHTML = M.errorBox(err.message); });
      }
      M.config().then(c => { window.__cfg = c; });
      f.addEventListener('submit', e => { e.preventDefault(); quote(); });
      out.addEventListener('change', e => {
        const t = e.target;
        if (t.hasAttribute('data-addon')) {
          const k = t.getAttribute('data-addon');
          selected = selected.filter(x => x !== k); if (t.checked) { selected.push(k); }
          if (k === 'STAIRS' && t.checked && !stairs) { stairs = 1; }
          quote();
        } else if (t.id === 'ad-fl') { stairs = Math.max(0, Math.min(10, Number(t.value) || 0)); quote(); }
        else if (t.id === 'ad-we') { weekend = t.checked; quote(); }
        else if (t.id === 'ad-ru') { rush = t.checked; quote(); }
      });
    }

    // ---- partners (repair, inspection, dealers)
    function partnerBox(L) {
      const box = $('#partner-box');
      const ps = L.partners || [];
      if (!ps.length || L.isOwner) { return; }
      box.innerHTML = `<div class="side-card"><h2>Want it checked or repaired?</h2><p class="small muted">Independent businesses near this item. We do not vouch for them.</p>
        ${ps.map(p => `<div style="margin-bottom:.9rem"><strong>${esc(p.name)}</strong> <span class="badge badge-grey">${esc(p.type)}</span><br>
          <span class="small">${esc([p.city, p.state].filter(Boolean).join(', '))}</span>${p.phone ? ' &middot; <a href="tel:' + esc(p.phone.replace(/[^\d+]/g, '')) + '">' + esc(p.phone) + '</a>' : ''}${p.website ? ' &middot; <a href="' + esc(p.website) + '" target="_blank" rel="noopener noreferrer">Website</a>' : ''}
          ${p.description ? '<br><span class="small">' + esc(p.description) + '</span>' : ''}<br><button class="btn btn-secondary btn-sm" type="button" data-lead="${esc(p.id)}" data-name="${esc(p.name)}" style="margin-top:6px">Ask them to contact me</button></div>`).join('')}</div>`;
      box.addEventListener('click', e => {
        const b = e.target.closest('button[data-lead]'); if (!b) { return; }
        if (!M.loggedIn()) { M.requireLogin(); return; }
        M.leadDialog(b.getAttribute('data-lead'), b.getAttribute('data-name'), L.id);
      });
    }
  };

  // Shared with the directory page.
  M.leadDialog = function (partnerId, name, listingId) {
    const d = M.modal(`<h2>Ask ${esc(name)} to contact you</h2><p>We will send them your email address and your message. They contact you directly. ${esc((window.MDB_CONFIG || {}).SITE_NAME || 'This site')} is not part of any agreement between you and the business.</p>
      <form novalidate><div class="field"><label for="ld-type">What do you need?</label><select id="ld-type"><option value="inspection">A safety check or inspection</option><option value="repair">A repair</option><option value="refurbish">Refurbishing</option><option value="dealer">To buy or learn about equipment</option><option value="delivery-help">Help with delivery</option></select></div>
      <div class="field"><label for="ld-msg">Your message</label><textarea id="ld-msg" rows="4" maxlength="500"></textarea><p class="hint">Do not type emails or phone numbers here. The business already receives your email.</p></div>
      <div class="check"><input type="checkbox" id="ld-ok" required><label for="ld-ok">I agree to share my email address with this business for this request.</label></div>
      <button class="btn btn-block" type="submit">Send my request</button></form>`);
    const f = d.querySelector('form');
    f.addEventListener('submit', e => {
      e.preventDefault(); M.clearError(f);
      if (!d.querySelector('#ld-ok').checked) { M.showError(f, 'Please check the box to agree to share your email address.'); return; }
      const done = M.busy(f.querySelector('button[type=submit]'), 'Sending...');
      M.api('leadRequest', { partnerId: partnerId, listingId: listingId || '', type: d.querySelector('#ld-type').value, message: d.querySelector('#ld-msg').value, consentShare: true }).then(() => {
        d.close(); M.toast('Request sent. They will contact you directly.', 'ok');
      }, err => { done(); M.showError(f, err.message); });
    });
  };

  function reportDialog(L) {
    if (!M.loggedIn()) { M.requireLogin(); return; }
    const d = M.modal(`<h2>Report this listing</h2><p>Tell us what is wrong. A person reads every report. If several people report the same listing, it is pulled back for review automatically.</p>
      <form novalidate><div class="field"><label for="rp-r">What is the problem?</label><select id="rp-r">${REPORT_REASONS.map(r => `<option>${esc(r)}</option>`).join('')}</select></div>
      <div class="field"><label for="rp-d">Details (optional)</label><textarea id="rp-d" rows="4" maxlength="600"></textarea></div>
      <button class="btn btn-danger btn-block" type="submit">Send report</button></form>`);
    const f = d.querySelector('form');
    f.addEventListener('submit', e => {
      e.preventDefault();
      const done = M.busy(f.querySelector('button[type=submit]'), 'Sending...');
      M.api('report', { targetType: 'listing', targetId: L.id, reason: d.querySelector('#rp-r').value, details: d.querySelector('#rp-d').value }).then(() => {
        d.close(); M.toast('Thank you. We will look at it.', 'ok');
      }, err => { done(); M.showError(f, err.message); });
    });
  }

  // ------------------------------------------------------------------ PRICE GUIDE
  M.pages['price-guide'] = function () {
    const app = $('#app');
    M.config().then(cfg => {
      app.innerHTML = `<form id="pg" class="card" novalidate><h2>Describe the equipment</h2>
        <div class="form-grid two">
          <div class="field"><label for="pg-c">Type of equipment</label><select id="pg-c" name="category" required></select></div>
          <div class="field"><label for="pg-g">Condition</label><select id="pg-g" name="grade"></select></div>
          <div class="field"><label for="pg-m">Make (brand)</label><input id="pg-m" name="make" type="text" maxlength="60" placeholder="Optional"></div>
          <div class="field"><label for="pg-mo">Model</label><input id="pg-mo" name="model" type="text" maxlength="80" placeholder="Optional"></div>
          <div class="field"><label for="pg-y">Year bought</label><input id="pg-y" name="year" type="number" min="1960" max="2100" placeholder="Optional"></div>
        </div><button class="btn" type="submit">Show a rough price range</button></form><div id="pg-out" style="margin-top:1.4rem" aria-live="polite"></div>`;
      const f = $('#pg');
      M.fillSelect(f.category, cfg.categories, 'Choose one', c => c.name, c => c.name);
      M.fillSelect(f.grade, cfg.grades, null, g => g.key, g => g.label); f.grade.value = 'B';
      const p = M.params(); if (p.category) { f.category.value = p.category; }
      f.addEventListener('submit', e => {
        e.preventDefault(); M.clearError(f);
        if (!f.category.value) { M.showError(f, 'Please choose a type of equipment.'); return; }
        const out = $('#pg-out'); out.innerHTML = M.loading('Looking up a range...');
        M.api('priceGuide', { category: f.category.value, grade: f.grade.value, make: f.make.value, model: f.model.value, year: f.year.value }, { noToken: true }).then(r => {
          const g = r.guide;
          if (!g) { out.innerHTML = '<div class="notice notice-info"><p>We do not have a guide for that type yet. Compare similar listings on the <a href="browse.html">Browse page</a>.</p></div>'; return; }
          out.innerHTML = `<div class="card"><h2>${esc(M.money(g.low))} to ${esc(M.money(g.high))}</h2>
            <p>A rough range for this kind of item, based on ${esc(g.basis)}${g.assumedAge ? '. You left out the year, so we assumed about five years old' : ''}. Middle of the range: about <strong>${esc(M.money(g.mid))}</strong>.</p>
            ${g.comps ? `<p>Real listings on this site for this type have a middle price of about <strong>${esc(M.money(g.comps.median))}</strong> (${g.comps.count} listings).</p>` : ''}
            <p class="hint">${esc(g.note)}</p>
            <p><a class="btn" href="create-listing.html">List yours</a> <a class="btn btn-secondary" href="browse.html?category=${encodeURIComponent(f.category.value)}">See similar listings</a></p></div>`;
        }, err => { out.innerHTML = M.errorBox(err.message); });
      });
    });
  };

  // ------------------------------------------------------------------ EQUIPMENT PASSPORT
  M.pages.passport = function () {
    const app = $('#app');
    app.innerHTML = `<form id="pp" class="card" novalidate><div class="field"><label for="pp-s">Serial number</label><input id="pp-s" name="serial" type="text" maxlength="60" required autocomplete="off"><p class="hint">Look for a metal or sticker plate on the frame. Spaces and dashes do not matter.</p></div><button class="btn" type="submit">Look up this serial number</button></form><div id="pp-out" style="margin-top:1.4rem" aria-live="polite"></div>`;
    const f = $('#pp');
    function run() {
      M.clearError(f);
      const s = f.serial.value.trim();
      if (s.length < 3) { M.showError(f, 'Please enter a serial number of at least 3 characters.'); return; }
      const out = $('#pp-out'); out.innerHTML = M.loading('Checking...');
      M.api('passport', { serial: s }, { noToken: true }).then(r => {
        if (!r.found) { out.innerHTML = `<div class="notice notice-info"><p><strong>No history on this site.</strong> ${esc(r.serial)} has not been listed here before. That does not mean it is safe or unsafe. Ask the seller for the original manual and receipts, and check for recalls with the maker.</p></div>`; return; }
        out.innerHTML = `<div class="plate"><h2>Passport: ${esc(r.serial)}</h2><dl>${specRow('Item', esc([r.make, r.model].filter(Boolean).join(' ')))}${specRow('Type', esc(r.category))}${specRow('Times listed here', r.listingCount)}${specRow('Different sellers', r.sellerCount)}</dl></div>
          <div class="table-wrap" style="margin-top:1rem"><table class="data"><thead><tr><th>Listed on</th><th>Status</th><th>Grade</th><th>Price</th><th>Place</th><th>Battery age</th><th>Last service</th></tr></thead><tbody>
          ${r.history.map(h => `<tr><td>${esc(M.date(h.listedOn))}</td><td>${h.id ? `<a href="listing.html?id=${encodeURIComponent(h.id)}">Active</a>` : esc(h.status)}</td><td>${esc(h.grade)}</td><td>${esc(M.money(h.price))}</td><td>${esc(h.state)}</td><td>${h.batteryAgeYears !== '' ? esc(h.batteryAgeYears) + ' yr' : ''}</td><td>${esc(h.lastService ? M.date(h.lastService) : '')}</td></tr>${h.serviceNotes ? `<tr><td colspan="7" class="small muted">Service notes: ${esc(h.serviceNotes)}</td></tr>` : ''}`).join('')}
          </tbody></table></div>
          ${r.sellerCount > 1 ? '<div class="notice notice-warn" style="margin-top:1rem"><p>This item has been listed by more than one seller. That can be normal when equipment is resold. If a story does not add up, ask questions, or report the listing.</p></div>' : ''}`;
      }, err => { out.innerHTML = M.errorBox(err.message); });
    }
    f.addEventListener('submit', e => { e.preventDefault(); run(); });
    const p = M.params(); if (p.serial) { f.serial.value = p.serial; run(); }
  };
})();
