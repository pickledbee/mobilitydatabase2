/* Mobility Database - delivery partner job page (Mobility City).
   No sign-in: the link carries a private key for this one job. Anyone with the link can update this job,
   so partners must keep it private. */
(function () {
  'use strict';
  const M = window.MDB;
  const esc = M.esc;
  const $ = M.$;

  M.pages.carrier = function () {
    const app = $('#app');
    const p = M.params();
    const id = p.d || '', key = p.k || '';
    if (!id || !key) { app.innerHTML = M.errorBox('This job link is incomplete. Please use the full link from the email.'); return; }
    const auth = { id: id, key: key };
    const call = (action, data, opts) => M.api(action, Object.assign({}, data || {}, auth), Object.assign({ noToken: true }, opts || {}));
    app.innerHTML = M.loading('Loading the job...');

    function load() {
      call('carrierGet').then(r => draw(r.job), err => { app.innerHTML = M.errorBox(err.message); });
    }

    function photos(ids, label) {
      if (!ids || !ids.length) { return ''; }
      return `<h3>${esc(label)}</h3><div class="photo-grid">${ids.map((x, i) => `<a class="photo-item" href="${esc(M.photoUrl(x, 1600))}" target="_blank" rel="noopener noreferrer"><img src="${esc(M.photoUrl(x, 500))}" alt="${esc(label)} ${i + 1}" loading="lazy" data-photo></a>`).join('')}</div>`;
    }

    // photo picker with upload; returns { ids: [], el }
    function picker(container, labelText) {
      const ids = [];
      container.innerHTML = `<div class="field"><label>${esc(labelText)}</label><input type="file" accept="image/*" capture="environment" multiple><div class="progress" hidden><span></span></div><p class="small" role="status" aria-live="polite" data-msg></p><div class="photo-grid" data-grid></div></div>`;
      const input = container.querySelector('input'), prog = container.querySelector('.progress'), bar = prog.firstElementChild, msg = container.querySelector('[data-msg]'), grid = container.querySelector('[data-grid]');
      input.addEventListener('change', async () => {
        const files = Array.from(input.files || []); input.value = '';
        if (!files.length) { return; }
        prog.hidden = false;
        for (let i = 0; i < files.length; i++) {
          if (ids.length >= 12) { M.toast('Twelve photos is the most.', 'error'); break; }
          msg.textContent = `Uploading photo ${i + 1} of ${files.length}...`; bar.style.width = Math.round(i / files.length * 100) + '%';
          try {
            const r = await M.uploadImage(files[i], 'carrierUpload', auth, 3145728);
            ids.push(r.fileId);
            grid.insertAdjacentHTML('beforeend', `<div class="photo-item"><img src="${esc(r.preview)}" alt="Uploaded photo ${ids.length}"></div>`);
          } catch (e) { M.toast(e.message, 'error'); }
        }
        bar.style.width = '100%'; msg.textContent = ids.length + (ids.length === 1 ? ' photo ready.' : ' photos ready.'); setTimeout(() => { prog.hidden = true; }, 700);
      });
      return { ids: ids };
    }

    function draw(J) {
      const L = J.listing || {};
      const closed = ['Delivered', 'Cancelled'].includes(J.status);
      const wantsSafety = (J.services || []).includes('SAFETY');
      app.innerHTML = `
      <div class="notice notice-info"><p><strong>Private job page.</strong> Keep this link private. Anyone who has it can update this job. ${esc(J.disclosure || '')}</p></div>
      <div class="item-row" style="margin-top:1rem"><div class="thumb">${(L.photos || [])[0] ? `<img src="${esc(M.photoUrl(L.photos[0], 200))}" alt="" data-photo>` : M.icon('truck')}</div><div><h2 style="margin:0">${esc(L.title || 'Delivery job')}</h2>
        <p style="margin:.2em 0 0"><span class="status-pill status-${esc(J.status.replace(/\s/g, ''))}">${esc(J.status)}</span> ${J.approved ? 'Buyer approved the quote.' : 'Buyer has not approved the quote yet.'}</p></div></div>
      <div class="listing-layout" style="margin-top:1.2rem"><div>
        <div class="card"><h2>The item</h2><p>${esc(L.category || '')} &middot; serial <strong>${esc(L.serial || 'not provided')}</strong>${L.carrierChecked ? ' &middot; already safety checked' : ''}<br>Overall width: ${L.widthIn ? esc(L.widthIn) + ' in' : 'not listed'} &middot; heaviest piece: ${L.heaviestPieceLbs ? esc(L.heaviestPieceLbs) + ' lb' : 'not listed'}</p>${photos(L.photos, 'Listing photos')}</div>
        <div class="card" style="margin-top:1rem"><h2>Pickup (seller)</h2>${J.seller ? `<p><strong>${esc(J.seller.name)}</strong><br>${esc(J.seller.address)}, ${esc(J.seller.city)} ${esc(J.seller.zip)}<br>Available: ${esc(J.seller.days || 'not given')} &middot; ${J.seller.homeToHandOver ? 'someone will be home' : 'seller did not say someone will be home'}</p>${J.seller.notes ? `<p>${M.escBr(J.seller.notes)}</p>` : ''}` : `<p class="muted">The seller has not confirmed the pickup address yet. Item is in ${esc(L.city)}, ${esc(L.state)}. You will get an email when they do.</p>`}</div>
        <div class="card" style="margin-top:1rem"><h2>Delivery (buyer)</h2><p><strong>${esc(J.buyer.name)}</strong> &middot; <a href="tel:${esc(J.buyer.phone.replace(/[^\d+]/g, ''))}">${esc(J.buyer.phone)}</a><br>${esc(J.buyer.address)}, ${esc(J.buyer.city)} ${esc(J.buyer.zip)}</p>
          <p>Entrance steps: ${esc(J.buyer.steps)} &middot; elevator: ${esc(J.buyer.elevator)} &middot; narrowest doorway: ${J.buyer.doorwayIn ? esc(J.buyer.doorwayIn) + ' in' : 'not given'}<br>Preferred days: ${esc(J.buyer.days || 'any')} &middot; time: ${esc(J.buyer.time)}</p>${J.buyer.instructions ? `<p><strong>Buyer's notes:</strong> ${M.escBr(J.buyer.instructions)}</p>` : ''}
          ${(J.services || []).length ? `<p><strong>Services ordered:</strong> ${esc(J.services.join(', '))}</p>` : ''}</div>
        ${J.pickupPhotos.length || J.deliveryPhotos.length ? `<div class="card" style="margin-top:1rem">${photos(J.pickupPhotos, 'Pickup photos')}${photos(J.deliveryPhotos, 'Delivery photos')}${J.serialAtPickup ? `<p>Serial checked at pickup: <strong>${esc(J.serialAtPickup)}</strong></p>` : ''}${J.signoff ? `<p>Signed for by: <strong>${esc(J.signoff)}</strong></p>` : ''}</div>` : ''}
      </div><aside>
        <div class="side-card"><h2>Quote</h2><table class="quote-table"><tbody>${J.quote.lines.map(l => `<tr><td>${esc(l.label)}</td><td>${l.amount ? esc(M.moneyExact(l.amount)) : ''}</td></tr>`).join('')}<tr class="total"><td>Total${J.quote.final ? ' (final)' : ' (not final)'}</td><td>${esc(M.moneyExact(J.quote.total))}</td></tr></tbody></table>${J.quote.note ? `<p class="small">${esc(J.quote.note)}</p>` : ''}</div>
        <div id="c-actions"></div>
        <div class="side-card"><h2>History</h2><ol class="timeline">${J.history.slice().reverse().map(h => `<li><strong>${esc(h.s)}</strong> <span class="muted small">${esc(M.dateTime(h.at))}</span>${h.note ? `<br><span class="small">${esc(h.note)}</span>` : ''}</li>`).join('')}</ol></div>
      </aside></div>`;

      const A = $('#c-actions');
      const forms = [];
      if (['Requested', 'Quoted'].includes(J.status)) {
        forms.push(`<form class="side-card" id="f-quote" novalidate><h2>${J.status === 'Requested' ? 'Send the final quote' : 'Change the quote'}</h2><p class="small muted">The buyer approves this price before anything happens. Changing it asks them to approve again.</p><div class="field"><label for="q-total">Final total ($)</label><input id="q-total" type="number" step="0.01" min="0" max="5000" value="${esc(J.quote.total)}" required></div><div class="field"><label for="q-note">Note to the buyer (optional)</label><textarea id="q-note" rows="2" maxlength="300"></textarea></div><button class="btn btn-block" type="submit">Send quote to buyer</button></form>`);
      }
      if (!closed) {
        forms.push(`<form class="side-card" id="f-sched" novalidate><h2>Schedule</h2><div class="field"><label for="s-p">Pickup date</label><input id="s-p" type="date" value="${esc(J.pickupDate)}"></div><div class="field"><label for="s-d">Delivery date</label><input id="s-d" type="date" value="${esc(J.deliveryDate)}"></div><button class="btn btn-secondary btn-block" type="submit">Save and tell buyer and seller</button></form>`);
      }
      if (J.status === 'Confirmed') {
        forms.push(`<form class="side-card" id="f-pick" novalidate><h2>Picked up</h2><p class="small muted">Photograph the item all around, the serial plate, and any damage. These protect everyone.</p><div class="field"><label for="p-ser">Serial number you see on the item</label><input id="p-ser" type="text" maxlength="60" autocomplete="off"></div><div id="p-photos"></div><div class="field"><label for="p-note">Condition note (optional)</label><textarea id="p-note" rows="2" maxlength="200"></textarea></div><button class="btn btn-green btn-block" type="submit">Mark as picked up</button></form>`);
      } else if (['Requested', 'Quoted'].includes(J.status)) {
        forms.push('<div class="side-card"><h2>Next</h2><p class="small">Pickup can be recorded after the buyer approves the final quote.</p></div>');
      }
      if (J.status === 'Picked Up') {
        forms.push(`<form class="side-card" id="f-del" novalidate><h2>Delivered</h2><p class="small muted">Photograph the item where you set it down, then get the name of the person who signs.</p><div id="d-photos"></div><div class="field"><label for="d-sign">Name of the person who signed for it</label><input id="d-sign" type="text" maxlength="80" required></div><div class="field"><label for="d-note">Note (optional)</label><textarea id="d-note" rows="2" maxlength="200"></textarea></div><button class="btn btn-green btn-block" type="submit">Mark as delivered</button></form>`);
      }
      if (wantsSafety && !L.carrierChecked && !closed) {
        forms.push('<div class="side-card"><h2>Safety check</h2><p class="small">The buyer paid for a safety check. If the item passes your check, mark it. The listing then shows a Safety Checked badge. This is a visual and function check, not a guarantee.</p><button class="btn btn-secondary btn-block" type="button" id="b-safe">Mark safety check passed</button></div>');
      }
      forms.push(`<form class="side-card" id="f-issue" novalidate><h2>Report a problem</h2><div class="field"><label for="i-note">What happened?</label><textarea id="i-note" rows="3" maxlength="500"></textarea></div><button class="btn btn-danger btn-block" type="submit">Report an issue</button></form>`);
      A.innerHTML = forms.join('');

      const wire = (sel, fn) => { const f = $(sel); if (f) { f.addEventListener('submit', e => { e.preventDefault(); M.clearError(f); fn(f, M.busy(f.querySelector('button[type=submit]'), 'Saving...')); }); } };
      const send = (f, done, data, msg) => call('carrierUpdate', data).then(() => { M.toast(msg, 'ok'); load(); }, err => { done(); M.showError(f, err.message); });
      wire('#f-quote', (f, done) => send(f, done, { action: 'quote', total: $('#q-total').value, note: $('#q-note').value }, 'Quote sent to the buyer.'));
      wire('#f-sched', (f, done) => send(f, done, { action: 'schedule', pickupDate: $('#s-p').value, deliveryDate: $('#s-d').value }, 'Schedule saved. Buyer and seller were emailed.'));
      let pk = null, dl = null;
      if ($('#p-photos')) { pk = picker($('#p-photos'), 'Pickup condition photos (at least one)'); }
      if ($('#d-photos')) { dl = picker($('#d-photos'), 'Delivery photos (at least one)'); }
      wire('#f-pick', (f, done) => { if (!pk.ids.length) { done(); M.showError(f, 'Please add at least one pickup photo.'); return; } send(f, done, { action: 'pickedUp', photos: pk.ids, serial: $('#p-ser').value, note: $('#p-note').value }, 'Recorded as picked up.'); });
      wire('#f-del', (f, done) => { if (!dl.ids.length) { done(); M.showError(f, 'Please add at least one delivery photo.'); return; } send(f, done, { action: 'delivered', photos: dl.ids, signoff: $('#d-sign').value, note: $('#d-note').value }, 'Recorded as delivered.'); });
      wire('#f-issue', (f, done) => send(f, done, { action: 'issue', note: $('#i-note').value }, 'Issue reported. The site team was told.'));
      const bs = $('#b-safe');
      if (bs) { bs.addEventListener('click', () => M.confirm('Confirm that this item passed your safety check?', 'Yes, it passed').then(y => { if (y) { call('carrierUpdate', { action: 'safetyPassed' }).then(() => { M.toast('Marked as safety checked.', 'ok'); load(); }, err => M.toast(err.message, 'error')); } })); }
    }
    load();
  };
})();
