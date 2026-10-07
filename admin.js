/* Mobility Database - administrator dashboard.
   Every action here is checked again on the server. Hiding a button is not security. */
(function () {
  'use strict';
  const M = window.MDB;
  const esc = M.esc;
  const $ = M.$;

  M.pages.admin = function () {
    if (!M.requireLogin()) { return; }
    const app = $('#app');
    const TABS = [['overview', 'Overview'], ['pending', 'Approve listings'], ['listings', 'All listings'], ['reports', 'Reports'], ['deliveries', 'Deliveries'], ['users', 'Members'], ['rates', 'Delivery prices'], ['partners', 'Partners'], ['email', 'Email'], ['requests', 'Leads and requests'], ['settings', 'Settings'], ['activity', 'Activity log']];
    app.innerHTML = `<div class="tabs" role="tablist" aria-label="Admin sections">${TABS.map(t => `<button type="button" role="tab" data-tab="${t[0]}" aria-selected="false" id="at-${t[0]}">${esc(t[1])}<span class="count" hidden></span></button>`).join('')}</div><div id="a-body" role="tabpanel" tabindex="-1">${M.loading()}</div>`;
    const body = $('#a-body');
    const link = 'style="background:none;border:0;font:inherit;cursor:pointer;color:var(--blue);text-decoration:underline;padding:0;min-height:36px"';
    const money = M.moneyExact;

    function badge(tab, n) { const c = $(`#at-${tab} .count`); if (c) { c.hidden = !n; c.textContent = n || ''; } }
    function ask(title, label, okText, danger) {
      return new Promise(resolve => {
        let done = false;
        const d = M.modal(`<h2>${esc(title)}</h2><form novalidate><div class="field"><label for="ask-t">${esc(label)}</label><textarea id="ask-t" rows="3" maxlength="300"></textarea></div><div class="row"><button class="btn ${danger ? 'btn-danger' : ''}" type="submit">${esc(okText)}</button><button class="btn btn-secondary" type="button" data-no>Cancel</button></div></form>`, { onClose: () => { if (!done) { resolve(null); } } });
        d.querySelector('[data-no]').addEventListener('click', () => d.close());
        d.querySelector('form').addEventListener('submit', e => { e.preventDefault(); done = true; resolve(d.querySelector('#ask-t').value.trim()); d.close(); });
      });
    }
    function act(action, data, okMsg, reload) {
      return M.api(action, data).then(r => { M.toast(okMsg || 'Done.', 'ok'); if (reload) { reload(); } return r; }, err => { M.toast(err.message, 'error'); throw err; });
    }
    function table(heads, rows) {
      return `<div class="table-wrap"><table class="data"><thead><tr>${heads.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    }

    // ------------------------------------------------ overview
    function tOverview() {
      M.api('adminStats', {}).then(s => {
        badge('pending', s.pendingListings); badge('reports', s.reportsOpen);
        const em = s.email || {};
        const kv = o => Object.keys(o || {}).length ? Object.keys(o).map(k => `${esc(k)}: <strong>${esc(o[k])}</strong>`).join(' &middot; ') : 'none';
        body.innerHTML = `${(s.warnings || []).length ? `<div class="notice notice-warn"><h2 style="margin-top:0">Fix these before launch</h2><ul>${s.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : '<div class="notice notice-ok"><p>No setup warnings.</p></div>'}
        <div class="grid cols-3">
          <div class="card"><h3>Waiting for approval</h3><p style="font-size:2rem;font-weight:700;margin:0">${esc(s.pendingListings)}</p><p><button type="button" data-goto="pending" ${link}>Open the queue</button></p></div>
          <div class="card"><h3>Open reports</h3><p style="font-size:2rem;font-weight:700;margin:0">${esc(s.reportsOpen)}</p><p><button type="button" data-goto="reports" ${link}>Open reports</button></p></div>
          <div class="card"><h3>Members</h3><p style="font-size:2rem;font-weight:700;margin:0">${esc(s.users)}</p><p class="small muted">${esc(s.subscribers)} email subscribers, ${esc(s.consentedSubscribers)} agreed to the weekly update</p></div>
        </div>
        <div class="card" style="margin-top:1rem"><h3>Listings</h3><p>${kv(s.listings)}</p><h3>Deliveries</h3><p>${kv(s.deliveries)}</p>
          <h3>Email today</h3><p>Sent ${esc(em.sentToday)} of a soft limit of ${esc(em.softLimit)}. Google says ${esc(em.googleQuotaRemaining)} left. ${esc(em.queued)} waiting in the queue.</p>
          <p class="small muted">Back-end version ${esc(s.version)}. If email waits in the queue often, it is time to move email to a sending service (see KNOWN-LIMITS).</p></div>`;
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }

    // ------------------------------------------------ listing rows
    function listingRow(L, mode) {
      const flags = (L.flags || []).map(f => `<li>${esc(f)}</li>`).join('');
      return `<article class="item-row"><div class="thumb">${L.photos[0] ? `<img src="${esc(M.photoUrl(L.photos[0], 200))}" alt="" data-photo loading="lazy">` : M.icon(M.catIcon(L.category))}</div><div>
        <h3 style="margin:0 0 .2em"><a href="listing.html?id=${encodeURIComponent(L.id)}" target="_blank">${esc(M.title(L))}</a> <span class="status-pill status-${esc(L.status)}">${esc(L.status)}</span></h3>
        <p class="small" style="margin:0 0 .3em">${esc(L.category)} &middot; Grade ${esc(L.grade)} &middot; <strong>${esc(M.money(L.price, L.free))}</strong> &middot; ${esc(L.city)}, ${esc(L.state)} ${esc(L.zip || '')} &middot; serial ${esc(L.serial || 'none')}</p>
        <p class="small muted" style="margin:0 0 .3em">Seller: ${esc(L.sellerEmail)} (${esc(L.sellerStatus)}, ${esc(L.sellerListingCount)} listings) &middot; created ${esc(M.date(L.createdAt))}</p>
        ${flags ? `<div class="notice notice-warn" style="margin:.4rem 0"><ul style="margin:0">${flags}</ul></div>` : ''}
        ${L.rejectReason ? `<p class="small"><strong>Reason on record:</strong> ${esc(L.rejectReason)}</p>` : ''}
        ${mode === 'pending' ? `<p class="small" style="margin:0 0 .3em">${esc([L.accessories && 'Included: ' + L.accessories, L.reason && 'Reason: ' + L.reason].filter(Boolean).join(' | '))}</p>` : ''}
        <div class="item-actions">
          ${['Pending', 'Removed', 'Expired'].includes(L.status) ? `<button class="btn btn-green btn-sm" type="button" data-approve="${esc(L.id)}">Approve</button>` : ''}
          ${L.status === 'Pending' ? `<button class="btn btn-secondary btn-sm" type="button" data-reject="${esc(L.id)}">Send back with a reason</button>` : ''}
          ${['Active', 'Pending'].includes(L.status) ? `<button class="btn btn-danger btn-sm" type="button" data-remove="${esc(L.id)}">Remove</button>` : ''}
          ${L.status === 'Active' ? `<button class="btn btn-secondary btn-sm" type="button" data-check="${esc(L.id)}" data-on="${L.carrierChecked ? '0' : '1'}">${L.carrierChecked ? 'Take off Safety Checked badge' : 'Give Safety Checked badge'}</button>` : ''}
          <button class="btn btn-secondary btn-sm" type="button" data-ban="${esc(L.sellerEmail)}">Ban seller</button></div></div></article>`;
    }
    function wireListingActions(reload) {
      body.onclick = e => {
        const t = e.target.closest('button'); if (!t) { return; }
        if (t.hasAttribute('data-goto')) { render(t.getAttribute('data-goto')); return; }
        if (t.hasAttribute('data-approve')) { act('adminApprove', { id: t.getAttribute('data-approve') }, 'Approved. The seller was emailed.', reload); }
        if (t.hasAttribute('data-reject')) { ask('Send this listing back', 'Tell the seller what to fix (they will see this):', 'Send back').then(v => { if (v) { act('adminReject', { id: t.getAttribute('data-reject'), reason: v }, 'Sent back to the seller.', reload); } }); }
        if (t.hasAttribute('data-remove')) { ask('Remove this listing', 'Reason (the seller will see this):', 'Remove it', true).then(v => { if (v !== null) { act('adminRemoveListing', { id: t.getAttribute('data-remove'), reason: v }, 'Removed.', reload); } }); }
        if (t.hasAttribute('data-check')) { act('adminSetChecked', { id: t.getAttribute('data-check'), checked: t.getAttribute('data-on') === '1' }, 'Updated.', reload); }
        if (t.hasAttribute('data-ban')) { ask('Ban ' + t.getAttribute('data-ban'), 'Reason (kept in the activity log):', 'Ban this member', true).then(v => { if (v !== null) { act('adminBan', { email: t.getAttribute('data-ban'), reason: v }, 'Banned. Their listings were removed.', reload); } }); }
      };
    }
    function tPending() {
      M.api('adminPending', {}).then(r => {
        badge('pending', r.items.length);
        body.innerHTML = `<p class="muted">Check: Do the photos match the description? Does the price look right? Any contact details or payment requests? Is the serial number real? Flags below are automatic hints, not verdicts.</p>` + (r.items.length ? r.items.map(L => listingRow(L, 'pending')).join('') : '<div class="empty"><h2>Nothing waiting</h2></div>');
        wireListingActions(tPending);
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }
    function tListings() {
      body.innerHTML = `<form id="al" class="inline-form card" novalidate><div class="field"><label for="al-q">Search (ID, make, model, serial, city, seller email)</label><input id="al-q" type="search"></div><div class="field"><label for="al-s">Status</label><select id="al-s"><option value="">Any</option><option>Pending</option><option>Active</option><option>Sold</option><option>Expired</option><option>Removed</option></select></div><button class="btn" type="submit">Search</button></form><div id="al-out" style="margin-top:1rem"></div>`;
      function run() {
        const out = $('#al-out'); out.innerHTML = M.loading();
        M.api('adminListings', { q: $('#al-q').value, status: $('#al-s').value }).then(r => {
          out.innerHTML = `<p class="muted">${r.total} found${r.total > 60 ? ' (showing the newest 60)' : ''}.</p>` + r.items.map(L => listingRow(L, 'list')).join('');
        }, err => { out.innerHTML = M.errorBox(err.message); });
      }
      $('#al').addEventListener('submit', e => { e.preventDefault(); run(); });
      wireListingActions(run); run();
    }

    // ------------------------------------------------ reports
    function tReports() {
      M.api('adminReports', {}).then(r => {
        badge('reports', r.items.length);
        if (!r.items.length) { body.innerHTML = '<div class="empty"><h2>No open reports</h2></div>'; return; }
        body.innerHTML = r.items.map(x => `<article class="card" style="margin-bottom:1rem"><h3 style="margin-top:0">${esc(x.reason)} <span class="badge badge-grey">${esc(x.type)}</span></h3>
          <p class="small muted">Reported ${esc(M.ago(x.createdAt))} by ${esc(x.reporterEmail)}</p>${x.details ? `<p>${M.escBr(x.details)}</p>` : ''}
          ${x.listing ? `<p><strong>Listing:</strong> <a href="listing.html?id=${encodeURIComponent(x.listing.id)}" target="_blank">${esc(x.listing.title)}</a> (${esc(x.listing.status)}) &middot; seller ${esc(x.listing.sellerEmail)}</p>` : ''}
          ${x.message ? `<p><strong>Message from ${esc(x.message.fromEmail)}:</strong></p><blockquote style="margin:0 0 .8rem;padding:8px 12px;border-left:4px solid var(--line);background:var(--mist)">${M.escBr(x.message.body)}</blockquote>${(x.context || []).length ? `<details><summary>Conversation context</summary>${x.context.map(c => `<p class="small"><strong>${esc(c.from)}</strong> (${esc(M.dateTime(c.at))}): ${esc(c.body)}</p>`).join('')}</details>` : ''}` : ''}
          <div class="item-actions"><button class="btn btn-secondary btn-sm" data-res="dismiss" data-id="${esc(x.id)}" type="button">Dismiss (no problem)</button><button class="btn btn-danger btn-sm" data-res="remove" data-id="${esc(x.id)}" type="button">Remove the listing</button><button class="btn btn-danger btn-sm" data-res="ban" data-id="${esc(x.id)}" type="button">Remove and ban the member</button></div></article>`).join('');
        body.onclick = e => {
          const b = e.target.closest('[data-res]'); if (!b) { return; }
          const action = b.getAttribute('data-res');
          const go = () => act('adminResolveReport', { id: b.getAttribute('data-id'), action: action }, 'Resolved.', tReports);
          if (action === 'dismiss') { go(); } else { M.confirm(action === 'ban' ? 'Remove and ban? The member loses access and all their live listings are removed.' : 'Remove the listing?', 'Yes, do it', true).then(y => { if (y) { go(); } }); }
        };
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }

    // ------------------------------------------------ deliveries
    const STATUSES = ['Requested', 'Quoted', 'Confirmed', 'Picked Up', 'Delivered', 'Issue', 'Cancelled'];
    function tDeliveries() {
      M.api('adminDeliveries', {}).then(r => {
        if (!r.items.length) { body.innerHTML = '<div class="empty"><h2>No deliveries yet</h2></div>'; return; }
        body.innerHTML = r.items.map(D => `<article class="card" style="margin-bottom:1rem"><h3 style="margin-top:0">${esc(D.listingTitle)} <span class="status-pill status-${esc(D.status.replace(/\s/g, ''))}">${esc(D.status)}</span></h3>
          <p class="small">Buyer: ${esc(D.buyerName)}, ${esc(D.buyerEmail)}, ${esc(D.buyerPhone)}<br>To: ${esc(D.deliveryAddress)} &middot; seller city ${esc(D.sellerCity || D.otherCity)} &middot; ${D.distanceMi ? esc(D.distanceMi) + ' mi' : 'distance unknown'} &middot; zone ${esc(D.zone)}</p>
          <p class="small">Quote ${esc(money(D.quote.total))} ${D.quote.final ? '(final)' : '(not final)'} &middot; referral ${esc(D.referralPct)}% ${D.referralAmount ? '= ' + esc(money(D.referralAmount)) : ''}${D.sellerConfirmed ? ' &middot; seller confirmed pickup' : ' &middot; seller has not confirmed'}</p>
          <p class="small"><button type="button" data-copy="${esc(D.carrierLink)}" ${link}>Copy the Mobility City job link</button> &middot; <a href="${esc(D.carrierLink)}" target="_blank" rel="noopener">Open it</a></p>
          <form class="inline-form" data-id="${esc(D.id)}" novalidate><div class="field"><label>Change status (override)</label><select name="status">${STATUSES.map(s => `<option ${s === D.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="field"><label>Note</label><input name="note" type="text" maxlength="300"></div><button class="btn btn-secondary btn-sm" type="submit">Update</button></form></article>`).join('');
        body.onclick = e => { const c = e.target.closest('[data-copy]'); if (c) { copyText(c.getAttribute('data-copy')); } };
        body.onsubmit = e => {
          e.preventDefault(); const f = e.target;
          M.confirm('Override the status to ' + f.status.value + '? The buyer, seller and carrier may be emailed.', 'Update').then(y => { if (y) { act('adminDeliveryUpdate', { id: f.getAttribute('data-id'), status: f.status.value, note: f.note.value }, 'Updated.', tDeliveries); } });
        };
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }
    function copyText(t) {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(() => M.toast('Copied.', 'ok'), () => M.toast('Could not copy. Select and copy it by hand.', 'error')); }
      else { window.prompt('Copy this link:', t); }
    }

    // ------------------------------------------------ users
    function tUsers() {
      body.innerHTML = `<form id="au" class="inline-form card" novalidate><div class="field"><label for="au-q">Search by email or name</label><input id="au-q" type="search"></div><button class="btn" type="submit">Search</button></form><div id="au-out" style="margin-top:1rem"></div>
        <form id="ab" class="inline-form card" style="margin-top:1rem" novalidate><div class="field"><label for="ab-e">Ban an email address</label><input id="ab-e" type="email"></div><div class="field"><label for="ab-r">Reason</label><input id="ab-r" type="text" maxlength="200"></div><button class="btn btn-danger" type="submit">Ban</button></form>`;
      function run() {
        const out = $('#au-out'); out.innerHTML = M.loading();
        M.api('adminUsers', { q: $('#au-q').value }).then(r => {
          out.innerHTML = `<p class="muted">${r.total} members${r.total > 50 ? ' (showing 50)' : ''}.</p>` + table(['Email', 'Name', 'Role', 'Status', 'Sales', 'Joined', ''], r.items.map(u => `<tr><td>${esc(u.email)}</td><td>${esc(u.name)}</td><td>${esc(u.role)}</td><td>${esc(u.status)}${u.banReason ? '<br><span class="small muted">' + esc(u.banReason) + '</span>' : ''}</td><td>${esc(u.completedSales)}</td><td>${esc(M.date(u.createdAt))}</td><td>${u.status === 'Banned' ? `<button class="btn btn-secondary btn-sm" data-unban="${esc(u.email)}" type="button">Unban</button>` : `<button class="btn btn-danger btn-sm" data-ban="${esc(u.email)}" type="button">Ban</button>`}</td></tr>`));
        }, err => { out.innerHTML = M.errorBox(err.message); });
      }
      $('#au').addEventListener('submit', e => { e.preventDefault(); run(); });
      $('#ab').addEventListener('submit', e => { e.preventDefault(); act('adminBan', { email: $('#ab-e').value, reason: $('#ab-r').value }, 'Banned.', run); });
      body.onclick = e => {
        const b = e.target.closest('button'); if (!b) { return; }
        if (b.hasAttribute('data-unban')) { act('adminUnban', { email: b.getAttribute('data-unban') }, 'Unbanned.', run); }
        if (b.hasAttribute('data-ban')) { ask('Ban ' + b.getAttribute('data-ban'), 'Reason:', 'Ban', true).then(v => { if (v !== null) { act('adminBan', { email: b.getAttribute('data-ban'), reason: v }, 'Banned.', run); } }); }
      };
      run();
    }

    // ------------------------------------------------ rates
    function tRates() {
      M.api('adminRatesGet', {}).then(r => {
        body.innerHTML = `<div class="notice ${r.confirmed ? 'notice-ok' : 'notice-warn'}"><p>${r.confirmed ? 'Prices are marked confirmed. Quotes are final and sent to buyers automatically.' : '<strong>Prices are still placeholders.</strong> Buyers see estimates and the carrier confirms each quote by hand. When you and Mobility City agree on real prices, enter them here, save, then set RATES_CONFIRMED to yes under Settings.'}</p></div>
        <form id="rf" novalidate>${table(['Kind', 'Key', 'Label shown to buyers', 'Amount ($)', 'Up to miles', 'Notes'], r.items.map((x, i) => `<tr><td>${esc(x.type)}</td><td>${esc(x.key)}</td><td><input type="text" data-i="${i}" data-f="label" value="${esc(x.label)}" aria-label="Label for ${esc(x.key)}"></td><td><input type="number" step="0.01" min="0" max="5000" data-i="${i}" data-f="amount" value="${esc(x.amount)}" aria-label="Amount for ${esc(x.key)}" style="width:110px"></td><td>${x.type === 'ZONE' ? `<input type="number" min="0" data-i="${i}" data-f="maxMiles" value="${esc(x.maxMiles)}" aria-label="Max miles for ${esc(x.key)}" style="width:110px">` : ''}</td><td class="small muted">${esc(x.notes)}</td></tr>`))}
        <p style="margin-top:1rem"><button class="btn" type="submit">Save prices</button></p></form>`;
        $('#rf').addEventListener('submit', e => {
          e.preventDefault();
          const rows = r.items.map((x, i) => {
            const g = f => { const el = $(`[data-i="${i}"][data-f="${f}"]`); return el ? el.value : x[f]; };
            return { type: x.type, key: x.key, label: g('label'), amount: g('amount'), maxMiles: x.type === 'ZONE' ? g('maxMiles') : '', notes: x.notes };
          });
          act('adminRatesSave', { rows: rows }, 'Prices saved.', tRates);
        });
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }

    // ------------------------------------------------ partners
    function tPartners() {
      M.api('adminPartnersGet', {}).then(r => {
        body.innerHTML = `<p><button class="btn" type="button" id="p-add">Add a business</button></p>` + table(['Name', 'Type', 'Contact email', 'Store ZIP', 'States', 'Referral %', 'Active', ''], r.items.map((p, i) => `<tr><td>${esc(p.name)}</td><td>${esc(p.type)}</td><td>${esc(p.contactEmail)}</td><td>${esc(p.storeZip)}</td><td>${esc(p.states)}</td><td>${esc(p.referralPct)}</td><td>${p.active ? 'Yes' : 'No'}</td><td><button class="btn btn-secondary btn-sm" data-edit="${i}" type="button">Edit</button></td></tr>`));
        const edit = p => {
          p = p || { id: '', name: '', type: 'repair', contactEmail: '', phone: '', states: 'WI', storeZip: '', website: '', description: '', referralPct: '', active: true };
          const d = M.modal(`<h2>${p.id ? 'Edit' : 'Add'} a business</h2><form novalidate>
            <div class="field"><label for="pe-n">Business name</label><input id="pe-n" type="text" value="${esc(p.name)}" maxlength="100"></div>
            <div class="field"><label for="pe-t">Type</label><select id="pe-t">${['carrier', 'repair', 'refurbisher', 'dealer', 'mover', 'battery'].map(t => `<option ${t === p.type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            <div class="field"><label for="pe-e">Contact email (job and lead emails go here; never shown publicly)</label><input id="pe-e" type="email" value="${esc(p.contactEmail)}"></div>
            <div class="field"><label for="pe-p">Public phone</label><input id="pe-p" type="tel" value="${esc(p.phone)}"></div>
            <div class="field"><label for="pe-s">States served (comma list, or ALL)</label><input id="pe-s" type="text" value="${esc(p.states)}"></div>
            <div class="field"><label for="pe-z">Store or shop ZIP (carriers need this to measure distance)</label><input id="pe-z" type="text" maxlength="5" value="${esc(p.storeZip)}"></div>
            <div class="field"><label for="pe-w">Website (https://...)</label><input id="pe-w" type="url" value="${esc(p.website)}"></div>
            <div class="field"><label for="pe-d">Short description</label><textarea id="pe-d" rows="2" maxlength="300">${esc(p.description)}</textarea></div>
            <div class="field"><label for="pe-r">Referral percent (blank uses the default)</label><input id="pe-r" type="number" min="0" max="100" step="0.5" value="${esc(p.referralPct)}"></div>
            <div class="check"><input type="checkbox" id="pe-a" ${p.active ? 'checked' : ''}><label for="pe-a">Active</label></div>
            <button class="btn btn-block" type="submit">Save</button></form>`);
          const f = d.querySelector('form');
          f.addEventListener('submit', e => {
            e.preventDefault(); M.clearError(f);
            M.api('adminPartnerSave', { id: p.id, name: d.querySelector('#pe-n').value, type: d.querySelector('#pe-t').value, contactEmail: d.querySelector('#pe-e').value, phone: d.querySelector('#pe-p').value, states: d.querySelector('#pe-s').value, storeZip: d.querySelector('#pe-z').value, website: d.querySelector('#pe-w').value, description: d.querySelector('#pe-d').value, referralPct: d.querySelector('#pe-r').value, active: d.querySelector('#pe-a').checked }).then(() => { d.close(); M.toast('Saved.', 'ok'); tPartners(); }, err => M.showError(f, err.message));
          });
        };
        $('#p-add').addEventListener('click', () => edit(null));
        body.onclick = e => { const b = e.target.closest('[data-edit]'); if (b) { edit(r.items[Number(b.getAttribute('data-edit'))]); } };
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }

    // ------------------------------------------------ settings
    function tSettings() {
      M.api('adminConfigGet', {}).then(r => {
        body.innerHTML = `<p class="muted">These settings control the whole site. Change a value, then press Save. Yes/no settings take the words yes or no.</p><form id="cs" novalidate>${table(['Setting', 'Value', 'What it does'], r.items.map((x, i) => `<tr><td><code>${esc(x.key)}</code></td><td>${x.locked ? esc(x.value) : (x.value.length > 80 || /DISCLAIMER|DISCLOSURE|ADDRESS|WORDS/.test(x.key) ? `<textarea data-k="${esc(x.key)}" rows="3" style="min-width:260px" aria-label="${esc(x.key)}">${esc(x.value)}</textarea>` : `<input type="text" data-k="${esc(x.key)}" value="${esc(x.value)}" aria-label="${esc(x.key)}" style="min-width:220px">`)}</td><td class="small muted">${esc(x.notes)}</td></tr>`))}<p style="margin-top:1rem"><button class="btn" type="submit">Save settings</button></p></form>`;
        $('#cs').addEventListener('submit', e => {
          e.preventDefault();
          const values = {};
          r.items.forEach(x => { const el = $(`[data-k="${x.key}"]`); if (el && el.value !== x.value) { values[x.key] = el.value; } });
          if (!Object.keys(values).length) { M.toast('Nothing changed.'); return; }
          act('adminConfigSave', { values: values }, 'Settings saved.', tSettings);
        });
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }

    // ------------------------------------------------ email
    function tEmail() {
      body.innerHTML = `<div class="card"><h2>Weekly newsletter</h2><p>The newsletter is built automatically from new listings and price drops. Preview it, send yourself a test, then queue it for everyone who agreed to receive it. Queued emails go out within Google's daily limit, so a big list can take several days.</p>
        <div class="item-actions"><button class="btn btn-secondary" id="nl-prev" type="button">Preview</button><button class="btn btn-secondary" id="nl-test" type="button">Send me a test</button><button class="btn" id="nl-queue" type="button">Queue for all subscribers</button></div><div id="nl-out" style="margin-top:1rem"></div></div>
        <div class="card" style="margin-top:1rem"><h2>Download subscribers</h2><form id="ex" class="inline-form" novalidate><div class="field"><label for="ex-r">Role</label><select id="ex-r"><option value="">All</option><option>buyer</option><option>seller</option><option>caregiver</option><option>dealer</option></select></div><div class="field"><label for="ex-s">State (optional)</label><input id="ex-s" type="text" maxlength="2" style="max-width:100px"></div><div class="check"><input type="checkbox" id="ex-c" checked><label for="ex-c">Only people who agreed to marketing email</label></div><button class="btn" type="submit">Download CSV</button></form>
        <p class="small muted">Keep this file private. It contains email addresses. Delete it when you are done.</p></div>`;
      const out = $('#nl-out');
      $('#nl-prev').addEventListener('click', () => {
        out.innerHTML = M.loading();
        M.api('adminNewsletter', { mode: 'preview' }).then(r => {
          out.innerHTML = `<p><strong>Subject:</strong> ${esc(r.subject)} (${r.newCount} new, ${r.dropCount} price drops)</p><iframe title="Newsletter preview" sandbox style="width:100%;height:520px;border:2px solid var(--line);border-radius:8px;background:#fff"></iframe>`;
          out.querySelector('iframe').srcdoc = r.html;
        }, err => { out.innerHTML = M.errorBox(err.message); });
      });
      $('#nl-test').addEventListener('click', () => { act('adminNewsletter', { mode: 'test' }, 'Test sent to your email.'); });
      $('#nl-queue').addEventListener('click', () => {
        M.confirm('Queue the newsletter for every subscriber who agreed to it? This cannot be undone.', 'Queue it').then(y => {
          if (!y) { return; }
          M.api('adminNewsletter', { mode: 'queue' }).then(r => M.toast(r.queued + ' emails queued.', 'ok'), err => {
            if (err.code === 'recent') { M.confirm(err.message + ' Send anyway?', 'Send again', true).then(y2 => { if (y2) { act('adminNewsletter', { mode: 'queue', force: true }, 'Queued.'); } }); } else { M.toast(err.message, 'error'); }
          });
        });
      });
      $('#ex').addEventListener('submit', e => {
        e.preventDefault();
        M.api('adminExportSubscribers', { role: $('#ex-r').value, state: $('#ex-s').value, consentedOnly: $('#ex-c').checked }).then(r => {
          const blob = new Blob([r.csv], { type: 'text/csv;charset=utf-8' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'subscribers-' + new Date().toISOString().slice(0, 10) + '.csv';
          document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
          M.toast(r.count + ' subscribers downloaded.', 'ok');
        }, err => M.toast(err.message, 'error'));
      });
    }

    // ------------------------------------------------ leads, estate
    function tRequests() {
      Promise.all([M.api('adminEstate', {}), M.api('adminLeads', {})]).then(arr => {
        body.innerHTML = `<h2>Estate and downsizing requests</h2>` + (arr[0].items.length ? arr[0].items.map(x => `<article class="card" style="margin-bottom:1rem"><h3 style="margin-top:0">${esc(x.name)}${x.org ? ' (' + esc(x.org) + ')' : ''}</h3><p class="small">${esc(x.email)} ${x.phone ? '&middot; ' + esc(x.phone) : ''} &middot; ${esc([x.city, x.state].filter(Boolean).join(', '))} &middot; ${esc(x.count)} items &middot; ${esc(x.timeline)} &middot; ${esc(M.date(x.createdAt))}</p><p>${M.escBr(x.description)}</p></article>`).join('') : '<p class="muted">None yet.</p>') +
          `<h2>Partner leads sent</h2>` + (arr[1].items.length ? table(['When', 'Partner', 'Type', 'Member', 'Listing', 'Status'], arr[1].items.map(x => `<tr><td>${esc(M.date(x.createdAt))}</td><td>${esc(x.partner)}</td><td>${esc(x.type)}</td><td>${esc(x.user)}</td><td>${esc(x.listingId)}</td><td>${esc(x.status)}</td></tr>`)) : '<p class="muted">None yet.</p>');
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }

    // ------------------------------------------------ activity
    function tActivity() {
      M.api('adminAudit', {}).then(r => {
        body.innerHTML = '<p class="muted">The newest 150 actions. This is your record of who did what.</p>' + table(['Time', 'Who', 'Action', 'Target', 'Details'], r.items.map(x => `<tr><td class="nowrap">${esc(M.dateTime(x.time))}</td><td>${esc(x.actor)}</td><td>${esc(x.action)}</td><td>${esc(x.target)}</td><td class="small">${esc(x.details)}</td></tr>`));
      }, err => { body.innerHTML = M.errorBox(err.message); });
    }

    const loaders = { overview: tOverview, pending: tPending, listings: tListings, reports: tReports, deliveries: tDeliveries, users: tUsers, rates: tRates, partners: tPartners, email: tEmail, requests: tRequests, settings: tSettings, activity: tActivity };
    function render(tab) {
      if (!loaders[tab]) { tab = 'overview'; }
      M.$$('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab ? 'true' : 'false'));
      try { window.history.replaceState(null, '', '#' + tab); } catch (e) { /* ignore */ }
      body.onclick = null; body.onsubmit = null;
      body.innerHTML = M.loading();
      loaders[tab]();
    }
    $('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { render(b.getAttribute('data-tab')); } });
    // confirm this person is an administrator before showing anything
    M.api('me', {}).then(r => {
      M.setUser(r.user);
      if (!r.user.isAdmin) { app.innerHTML = '<div class="notice notice-error"><p>This area is only for site administrators.</p></div><p><a class="btn" href="dashboard.html">Go to My account</a></p>'; return; }
      render((window.location.hash || '#overview').replace('#', ''));
      M.api('adminPending', {}).then(p => badge('pending', p.items.length), () => {});
      M.api('adminReports', {}).then(p => badge('reports', p.items.length), () => {});
    }, err => { app.innerHTML = M.errorBox(err.message); });
  };
})();
