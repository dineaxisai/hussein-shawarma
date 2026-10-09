/* Hussein’s Shawarma — site behavior (menu, cart, side picker, checkout).
   You normally don't need to edit this file: settings live in js/config.js. */
(function () {
  'use strict';

  const C = window.HS_CONFIG;
  const O = C.ordering;
  const B = C.business || {};
  const SAVED_KEY = 'hussein-customer-v1';
  const CART_KEY = 'hussein-cart-v1';
  const BLANK = { name: '', phone: '', email: '', street: '', unit: '', city: '', zip: '', dropoff: '', notes: '' };
  const SAVED_FIELDS = ['name', 'phone', 'email', 'street', 'unit', 'city', 'zip', 'dropoff'];
  const FIELD_ORDER = ['name', 'phone', 'email', 'street', 'city', 'zip', 'slot'];
  const FLAME = 'M12 0c2 6 10 10 10 19a10 10 0 0 1-20 0c0-5 3-8 5-11 0 4 2 6 4 6-1-5 0-10 1-14z';

  const svg = (d, size, sw) => `<svg width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 2.4}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    plus: svg('<path d="M12 5v14M5 12h14"/>', 18, 2.6),
    minus: svg('<path d="M5 12h14"/>', 18, 2.6),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 22, 2),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>', 22, 2),
    right: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 18, 2.2),
    left: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', 18, 2.2),
    down: svg('<path d="M12 5v14M6 13l6 6 6-6"/>', 20, 2.2),
    chevDown: svg('<path d="M6 9l6 6 6-6"/>', 16, 2.4),
    chevUp: svg('<path d="M6 15l6-6 6 6"/>', 16, 2.4),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 14, 3),
    again: svg('<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>', 20, 2.2),
    lock: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#E09A62" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;margin-top:2px"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>'
  };

  /* ---------- helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = (v) => (typeof v === 'string' ? v.trim() : '');
  const isUrl = (v) => /^https?:\/\/\S+$/i.test(v || '');
  const cents = (n) => Math.round(Number(n) * 100);
  const money = (c) => '$' + (c / 100).toFixed(2);
  const store = {
    get(k) { try { return JSON.parse(window.localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- menu index ---------- */
  const items = {}; const order = [];
  C.menu.forEach((c) => c.items.forEach((i) => {
    items[i.id] = { id: i.id, name: i.name, cartName: i.cartName || i.name, cents: cents(i.price), category: c.id, desc: i.desc || '', sides: i.sides || 0, group: i.group };
    order.push(i.id);
  }));
  const sideCat = C.menu.find((c) => c.id === C.sideCategory);
  const sideNames = sideCat ? sideCat.items.map((i) => i.name) : [];
  const sideGroups = sideCat ? (sideCat.groups || ['Sides']).map((g) => ({ name: g, items: sideCat.items.filter((i) => (i.group || 'Sides') === g) })).filter((g) => g.items.length) : [];
  const methods = (O.fulfillment && O.fulfillment.length) ? O.fulfillment : ['delivery'];
  const live = !!O.live && typeof O.submitOrder === 'function';
  const FULFILL_LABEL = { delivery: 'Delivery', pickup: 'Pickup' };

  const parseKey = (k) => { const p = k.split('::'); return { id: p[0], sides: p[1] ? p[1].split('|') : [] }; };
  const sidesText = (arr) => {
    const counts = {}; const out = [];
    arr.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
    sideNames.concat(arr).forEach((s) => { if (counts[s]) { out.push(counts[s] > 1 ? s + ' ×' + counts[s] : s); counts[s] = 0; } });
    return out.length ? 'Sides: ' + out.join(', ') : '';
  };

  /* ---------- state ---------- */
  const savedCart = store.get(CART_KEY) || {};
  const cart = {};
  Object.keys(savedCart).forEach((k) => { if (items[parseKey(k).id] && savedCart[k] > 0) cart[k] = savedCart[k]; });
  const S = {
    view: 'home', drawer: false, picker: null, cart: cart,
    form: Object.assign({}, BLANK), touched: {}, submitted: false,
    fulfillment: methods[0], when: 'asap', slot: '',
    activeCat: C.menu[0].id, menuOpen: false, toast: '', bump: 0,
    summaryOpen: false, rememberMe: true, remembered: false,
    placed: null, submitting: false, submitError: '',
    anim: { drawer: false, picker: false }
  };
  const saved = store.get(SAVED_KEY);
  if (saved && (saved.name || saved.phone)) {
    SAVED_FIELDS.forEach((k) => { if (typeof saved[k] === 'string') S.form[k] = saved[k]; });
    S.remembered = true;
  }
  let returnFocus = null; let spyPause = 0; let toastTimer = null;

  /* ---------- derived values ---------- */
  function timeInfo() {
    const H = O.kitchenHours;
    const toMin = (s) => { const q = String(s).split(':'); return (+q[0]) * 60 + (+q[1] || 0); };
    const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
    const openMin = H ? toMin(H.open) : null; const closeMin = H ? toMin(H.close) : null;
    const openNow = !H || (nowMin >= openMin && nowMin < closeMin);
    let start = Math.ceil((nowMin + (O.leadMinutes || 30)) / 15) * 15;
    if (H) start = Math.max(start, Math.ceil(openMin / 15) * 15);
    const end = H ? closeMin : Math.min(start + 240, 23 * 60 + 45);
    const slots = [];
    for (let m = start; m <= end && m < 24 * 60; m += 15) slots.push(m);
    const fmt = (mm) => { const h = Math.floor(mm / 60), mi = mm % 60; return (h % 12 || 12) + ':' + (mi < 10 ? '0' : '') + mi + ' ' + (h >= 12 ? 'PM' : 'AM'); };
    const hhmm = (mm) => { const h = Math.floor(mm / 60), mi = mm % 60; return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi; };
    return { openNow, slots: slots.map((m) => ({ value: hhmm(m), label: fmt(m) })) };
  }

  function derive() {
    const keys = Object.keys(S.cart).filter((k) => S.cart[k] > 0 && items[parseKey(k).id]);
    keys.sort((a, b) => (order.indexOf(parseKey(a).id) - order.indexOf(parseKey(b).id)) || (a < b ? -1 : a > b ? 1 : 0));
    const lines = keys.map((key, idx) => {
      const pk = parseKey(key); const it = items[pk.id]; const q = S.cart[key]; const detail = sidesText(pk.sides);
      return { idx, key, id: pk.id, sides: pk.sides, name: it.cartName, detail, qty: q, unitCents: it.cents, totalCents: it.cents * q };
    });
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const sub = lines.reduce((s, l) => s + l.totalCents, 0);
    const fees = []; let total = sub;
    if (S.fulfillment === 'delivery' && typeof O.deliveryFee === 'number') { const df = cents(O.deliveryFee); fees.push({ label: 'Delivery fee', value: df }); total += df; }
    if (typeof O.taxRate === 'number') { const tx = Math.round(sub * O.taxRate); fees.push({ label: 'Tax', value: tx }); total += tx; }
    const t = timeInfo();
    const when = t.openNow ? S.when : 'later';
    const slot = t.slots.some((s) => s.value === S.slot) ? S.slot : '';
    return { lines, count, sub, fees, total, feesPending: typeof O.taxRate !== 'number', time: t, when, slot };
  }

  function validate(d) {
    const f = S.form; const e = {};
    if (!clean(f.name)) e.name = 'Enter your name.';
    if (clean(f.phone).replace(/\D/g, '').length !== 10) e.phone = 'Enter a 10-digit phone number.';
    if (clean(f.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(f.email))) e.email = 'Enter a valid email or leave it blank.';
    if (S.fulfillment === 'delivery') {
      if (!clean(f.street)) e.street = 'Enter a street address.';
      if (!clean(f.city)) e.city = 'Enter a city.';
      if (!/^\d{5}(-\d{4})?$/.test(clean(f.zip))) e.zip = 'Enter a 5-digit ZIP code.';
    }
    if (d.when === 'later' && !d.slot) e.slot = d.time.slots.length ? 'Choose a time.' : 'No times are left today.';
    return e;
  }
  const errFor = (k, errors) => (errors[k] && (S.touched[k] || S.submitted)) ? errors[k] : '';

  /* ---------- small templates ---------- */
  const lineHTML = (l) => `<li class="line"><span class="line__text"><span><span class="line__qty">${l.qty}×</span> ${esc(l.name)}</span>${l.detail ? `<span class="line__detail">${esc(l.detail)}</span>` : ''}</span><span class="line__total">${money(l.totalCents)}</span></li>`;
  function control(id) {
    const it = items[id]; const label = it.cartName;
    const q = it.sides > 0 ? 0 : (S.cart[id] || 0);
    if (q > 0) {
      return `<div class="stepper stepper--solid" role="group" aria-label="Quantity of ${esc(label)}"><button type="button" id="dec-${id}" data-action="dec" data-key="${id}" aria-label="Remove one ${esc(label)}">${I.minus}</button><span class="stepper__qty">${q}</span><button type="button" id="inc-${id}" data-action="add" data-id="${id}" aria-label="Add one more ${esc(label)}">${I.plus}</button></div>`;
    }
    const aria = it.sides > 0 ? `Add ${label} to order and choose sides` : `Add ${label} to order`;
    return `<button class="round-btn" type="button" id="add-${id}" data-action="add" data-id="${id}" aria-label="${esc(aria)}">${I.plus}</button>`;
  }
  const stepsHTML = (labels, cur, allDone) => labels.map((lb, i) => {
    const done = allDone || i < cur; const current = !allDone && i === cur;
    const dot = done ? `<span class="step-dot step-dot--done" aria-hidden="true">${I.check}</span>` : current ? `<span class="step-dot step-dot--current" aria-hidden="true">${i + 1}</span>` : `<span class="step-dot step-dot--upcoming" aria-hidden="true">${i + 1}</span>`;
    const sr = done ? ' (completed)' : current ? ' (current step)' : '';
    return `<li${current ? ' aria-current="step"' : ''}>${dot}<span>${lb}<span class="sr-only">${sr}</span></span>${i < labels.length - 1 ? '<span class="step-line" aria-hidden="true"></span>' : ''}</li>`;
  }).join('');

  /* ---------- views ---------- */
  function homeHTML() {
    const img = C.images; const alt = C.alt;
    const featured = C.featured.map((f) => {
      const it = items[f.id]; const cat = C.menu.find((c) => c.id === f.category);
      return `<article class="feature-card">
        <div class="feature-card__img"><img src="${esc(img[f.image])}" alt="${esc(alt[f.image])}" width="1168" height="880" loading="lazy" decoding="async"></div>
        <div class="feature-card__body">
          <div class="feature-card__row"><h3 class="feature-card__name">${esc(it.name)}</h3><p class="price" style="margin:0;font-size:32px">${money(it.cents)}</p></div>
          <div class="feature-card__actions">
            <button class="btn btn-primary" type="button" data-action="add" data-id="${f.id}" aria-label="Add ${esc(it.name)} to order">${I.plus} Add to order</button>
            <a class="link-arrow" href="#cat-${f.category}" data-action="jump" data-cat="${f.category}">See ${esc(cat ? cat.name.toLowerCase() : 'menu')}</a>
          </div>
        </div>
      </article>`;
    }).join('');
    const tabs = C.menu.map((c) => `<a class="chip tab${S.activeCat === c.id ? ' is-active' : ''}" id="tab-${c.id}" href="#cat-${c.id}" data-action="jump" data-cat="${c.id}"${S.activeCat === c.id ? ' aria-current="true"' : ''}>${esc(c.name)}</a>`).join('');
    const cats = C.menu.filter((c) => c.id !== C.sideCategory).map((c) => `
      <section class="cat" id="cat-${c.id}" aria-labelledby="cat-title-${c.id}">
        <div class="cat__photo">${c.image ? `<img src="${esc(img[c.image])}" alt="${esc(alt[c.image])}" width="1168" height="880" loading="lazy" decoding="async">` : ''}<h3 class="cat__title" id="cat-title-${c.id}">${esc(c.name)}</h3></div>
        <div class="cat__body">
          ${c.note ? `<p style="margin:0;padding-top:12px;font-weight:600;color:var(--copper-text)">${esc(c.note)}</p>` : ''}
          <ul class="items">${c.items.map((i) => `
            <li class="item">
              <span class="item__text"><span class="item__name">${esc(i.name)}</span>${i.desc ? `<span class="item__desc">${esc(i.desc)}</span>` : ''}</span>
              <span class="price">${money(cents(i.price))}</span>
              <span data-ctl="${i.id}" style="display:contents">${control(i.id)}</span>
            </li>`).join('')}
          </ul>
        </div>
      </section>`).join('');
    const sides = sideCat ? `
      <section class="sides" id="cat-${sideCat.id}" aria-labelledby="cat-title-${sideCat.id}">
        <div class="sides__head"><h3 class="display" id="cat-title-${sideCat.id}" style="font-size:44px;line-height:1">${esc(sideCat.name)}</h3>${sideCat.note ? `<p class="price" style="margin:0">${esc(sideCat.note)}</p>` : ''}</div>
        <div class="sides__grid">${sideGroups.map((g) => `
          <div><h4 class="group-title">${esc(g.name)}</h4>
            <ul class="side-list">${g.items.map((i) => `<li class="side-row"><span class="side-row__name">${esc(i.name)}</span><span data-ctl="${i.id}" style="display:contents">${control(i.id)}</span></li>`).join('')}</ul>
          </div>`).join('')}
        </div>
      </section>` : '';
    return `
    <section class="hero" id="home" aria-labelledby="hero-title">
      <img class="hero__img" src="${esc(img.hero)}" alt="${esc(alt.hero)}" width="1344" height="752" fetchpriority="high" decoding="async">
      <div class="hero__shade" aria-hidden="true"></div>
      <div class="wrap hero__inner"><div class="hero__content">
        <p class="eyebrow rise">${esc(B.name || 'Hussein’s Shawarma')}</p>
        <h1 class="display hero__title rise d1" id="hero-title">Big Flavor. <span>Every Bite.</span></h1>
        <p class="hero__sub rise d2">Shawarma, wings, burgers, and your favorite sides.</p>
        <div class="hero__ctas rise d3"><a class="btn btn-primary btn-lg" href="#menu" data-action="go-menu">View Menu ${I.down}</a></div>
      </div></div>
      <p class="photo-note">Illustrative photo</p>
    </section>
    <section class="section" aria-labelledby="featured-title">
      <div class="wrap stack">
        <div class="section__head">
          <div class="section__titles"><p class="eyebrow">Featured</p><h2 class="display" id="featured-title" style="font-size:clamp(44px,7vw,76px)">Start Here</h2></div>
          <a class="link-arrow" href="#menu" data-action="go-menu">See the full menu ${I.right}</a>
        </div>
        <div class="featured-grid">${featured}</div>
      </div>
    </section>
    <section class="menu" id="menu" aria-labelledby="menu-title">
      <div class="wrap menu__inner">
        <div class="section__titles"><p class="eyebrow">Our Menu</p><h2 class="display" id="menu-title" style="font-size:clamp(56px,10vw,112px)">The Menu</h2></div>
        <nav class="tabbar" aria-label="Menu categories"><div class="scroll-x" id="tabscroll">${tabs}</div></nav>
        <div class="cats">${cats}${sides}</div>
        <div class="menu__foot">
          <p class="muted" style="margin:0;font-size:15px">Prices are listed in US dollars. Photos are illustrative and may not show our actual dishes.</p>
          ${isUrl(B.menuPdfUrl) ? `<a class="link-arrow" href="${esc(B.menuPdfUrl)}" target="_blank" rel="noopener">Download the menu (PDF)</a>` : ''}
        </div>
      </div>
    </section>`;
  }

  function checkoutHTML(d) {
    const f = S.form; const errors = validate(d); const errCount = Object.keys(errors).length;
    const field = (k, label, type, extra, opt) => {
      const err = errFor(k, errors);
      return `<div class="field"><label for="f-${k}">${label}${opt ? ' <span class="opt">(optional)</span>' : ''}</label>
        <input class="input" id="f-${k}" data-field="${k}" type="${type}" value="${esc(f[k])}" ${extra || ''} aria-invalid="${err ? 'true' : 'false'}" aria-describedby="err-${k}">
        <p class="field-error" id="err-${k}">${esc(err)}</p></div>`;
    };
    if (!d.count) {
      return `<section class="checkout fade" aria-labelledby="checkout-title"><div class="wrap stack" style="gap:24px">
        <a class="link-arrow" href="#menu" data-action="go-menu">${I.left} Back to menu</a>
        <h1 class="display checkout__title" id="checkout-title" tabindex="-1">Checkout</h1>
        <div class="notice" style="flex-direction:column;align-items:flex-start;gap:16px;padding:32px"><p style="font-size:20px">Your order is empty.</p><a class="btn btn-primary" href="#menu" data-action="go-menu">Browse the menu</a></div>
      </div></section>`;
    }
    const linesHTML = d.lines.map(lineHTML).join('');
    const feesHTML = d.fees.map((x) => `<div class="totals__row"><span>${x.label}</span><strong>${money(x.value)}</strong></div>`).join('');
    const totalLabel = d.feesPending ? 'Subtotal' : 'Total';
    const placeLabel = S.submitting ? 'Placing order…' : (live ? 'Place order · ' + money(d.total) : 'Place order (preview)');
    const fulfill = methods.length > 1
      ? `<div class="choices" role="group" aria-label="Delivery or pickup">${methods.map((m) => `<button class="choice" type="button" data-action="fulfillment" data-value="${m}" aria-pressed="${S.fulfillment === m}">${FULFILL_LABEL[m] || m}</button>`).join('')}</div>`
      : `<p style="margin:0;font-weight:600">${FULFILL_LABEL[methods[0]] || methods[0]}</p>`;
    const delivery = S.fulfillment === 'delivery' ? `
      ${field('street', 'Street address', 'text', 'autocomplete="address-line1"')}
      <div class="grid-fields grid-fields--3">
        <div class="field"><label for="f-unit">Apt / unit <span class="opt">(optional)</span></label><input class="input" id="f-unit" data-field="unit" type="text" value="${esc(f.unit)}" autocomplete="address-line2"></div>
        ${field('city', 'City', 'text', 'autocomplete="address-level2"')}
        ${field('zip', 'ZIP code', 'text', 'inputmode="numeric" autocomplete="postal-code"')}
      </div>
      <div class="field"><label for="f-dropoff">Drop-off instructions <span class="opt">(optional)</span></label><input class="input" id="f-dropoff" data-field="dropoff" type="text" value="${esc(f.dropoff)}" placeholder="Gate code, leave at door, etc."></div>` : '';
    const pickup = S.fulfillment === 'pickup' && clean(O.pickupAddress) ? `<div class="info-box"><p class="group-title" style="margin:0">Pickup address</p><p style="margin:0;white-space:pre-line">${esc(O.pickupAddress)}</p></div>` : '';
    const whenToggle = d.time.openNow
      ? `<div class="choices" role="group" aria-label="When">${[['asap', 'As soon as possible'], ['later', 'Schedule for later today']].map((w) => `<button class="choice" type="button" data-action="when" data-value="${w[0]}" aria-pressed="${d.when === w[0]}">${w[1]}</button>`).join('')}</div>`
      : '<p class="closed-note">The kitchen is closed right now. Schedule your order for later today.</p>';
    const slotErr = errFor('slot', errors);
    const slots = d.when === 'later' ? `<div class="field">
        <p id="slots-label" style="margin:0;font-weight:600">Pick a time today</p>
        ${d.time.slots.length ? `<div class="scroll-x slots" id="f-slot" tabindex="-1" role="group" aria-labelledby="slots-label" aria-describedby="err-slot">${d.time.slots.map((s) => `<button class="chip" type="button" id="slot-${s.value.replace(':', '')}" data-action="slot" data-value="${s.value}" aria-pressed="${d.slot === s.value}">${s.label}</button>`).join('')}</div>` : '<p style="margin:0">No more times are available today.</p>'}
        <p class="field-error" id="err-slot">${esc(slotErr)}</p></div>` : '';
    return `<section class="checkout fade" aria-labelledby="checkout-title"><div class="wrap stack" style="gap:24px">
      <div class="checkout__top">
        <a class="link-arrow" href="#menu" data-action="go-menu">${I.left} Back to menu</a>
        <ol class="steps" aria-label="Checkout progress">${stepsHTML(['Cart', 'Details', 'Done'], 1, false)}</ol>
      </div>
      <h1 class="display checkout__title" id="checkout-title" tabindex="-1">Checkout</h1>
      ${S.remembered ? `<div class="notice"><p>Welcome back. We filled in your saved details.</p><button class="link-btn" type="button" data-action="clear-saved">Not you? Clear details</button></div>` : ''}
      <div class="mobile-only mobile-summary">
        <button class="mobile-summary__toggle" type="button" data-action="toggle-summary" id="summary-toggle" aria-expanded="${S.summaryOpen}" aria-controls="mobile-summary">
          <span style="display:inline-flex;align-items:center;gap:8px">${S.summaryOpen ? 'Hide order summary ' + I.chevUp : 'Show order summary (' + d.count + ') ' + I.chevDown}</span>
          <span style="color:var(--copper-text)">${money(d.total)}</span>
        </button>
        ${S.summaryOpen ? `<div class="mobile-summary__body fade" id="mobile-summary"><ul class="lines">${linesHTML}</ul>${feesHTML}${d.feesPending ? '<p class="small-note">Taxes and any fees are added at payment.</p>' : ''}<button class="link-btn" type="button" data-action="open-cart" style="align-self:flex-start">Edit order</button></div>` : ''}
      </div>
      <div class="checkout__cols">
        <div class="checkout__form">
          ${S.submitted && errCount ? `<div class="alert" role="alert">${errCount === 1 ? 'One thing needs fixing before you can place your order.' : errCount + ' things need fixing before you can place your order.'}</div>` : ''}
          <fieldset class="panel"><legend>1. Your details</legend>
            ${field('name', 'Full name', 'text', 'autocomplete="name"')}
            <div class="grid-fields">
              ${field('phone', 'Mobile phone', 'tel', 'inputmode="tel" autocomplete="tel-national" placeholder="(555) 123-4567"')}
              ${field('email', 'Email', 'email', 'autocomplete="email"', true)}
            </div>
            <label class="check" for="f-remember"><input id="f-remember" type="checkbox" data-action="remember"${S.rememberMe ? ' checked' : ''}><span>Remember my details on this device</span></label>
          </fieldset>
          <fieldset class="panel"><legend>2. How and when</legend>${fulfill}${delivery}${pickup}${whenToggle}${slots}</fieldset>
          <fieldset class="panel"><legend>3. Order notes</legend>
            <div class="field"><label for="f-notes">Anything the kitchen should know? <span class="opt">(optional)</span></label><textarea class="input" id="f-notes" data-field="notes" rows="3">${esc(f.notes)}</textarea></div>
          </fieldset>
          <fieldset class="panel"><legend>4. Payment</legend>
            <div class="pay-slot" id="payment-slot">${I.lock}<div style="display:flex;flex-direction:column;gap:4px"><p style="font-weight:700">${live ? 'Secure payment' : 'Payment connects with BLOOM'}</p><p class="muted" style="font-size:15px">${live ? 'You’ll confirm payment in the next step.' : 'Card payment will appear here once online ordering is connected. No card details are collected in this preview.'}</p></div></div>
          </fieldset>
        </div>
        <div class="summary-wrap"><aside class="summary" aria-labelledby="summary-title">
          <h2 class="display" id="summary-title" style="font-size:32px;line-height:1">Your order</h2>
          <ul class="lines">${linesHTML}</ul>
          <button class="link-btn" type="button" data-action="open-cart" style="align-self:flex-start">Edit order</button>
          <div class="totals">
            ${d.fees.length ? `<div class="totals__row"><span>Subtotal</span><strong>${money(d.sub)}</strong></div>${feesHTML}` : ''}
            <div class="totals__grand"><span>${totalLabel}</span><span class="price">${money(d.total)}</span></div>
            ${d.feesPending ? '<p class="small-note">Taxes and any fees are added at payment.</p>' : ''}
          </div>
          ${S.submitError ? `<p role="alert" style="margin:0;color:var(--error);font-weight:600">${esc(S.submitError)}</p>` : ''}
          <button class="btn btn-primary btn-lg btn-block" type="button" data-action="place" id="place-desktop"${S.submitting ? ' disabled' : ''}>${placeLabel}</button>
          ${live ? '' : '<p class="small-note" style="text-align:center">Preview only: nothing will be sent or charged.</p>'}
        </aside></div>
      </div>
    </div>
    <div class="place-bar">
      ${S.submitError ? `<p role="alert" style="margin:0 0 8px;color:var(--error);font-weight:600;font-size:15px">${esc(S.submitError)}</p>` : ''}
      <button class="btn btn-primary btn-lg btn-block" type="button" data-action="place" id="place-mobile"${S.submitting ? ' disabled' : ''}>${placeLabel}</button>
      ${live ? '' : '<p class="small-note">Preview only: nothing will be sent or charged.</p>'}
    </div></section>`;
  }

  function confirmHTML() {
    const p = S.placed;
    if (!p) return homeHTML();
    const status = p.statusIdx >= 0 ? `<ol class="status" aria-label="Order status">${p.flow.map((lb, i) => {
      const cls = i < p.statusIdx ? 'done' : i === p.statusIdx ? 'current' : 'upcoming';
      return `<li${i === p.statusIdx ? ' aria-current="step"' : ''}><span class="status-dot status-dot--${cls}" aria-hidden="true"></span><span>${lb}<span class="sr-only">${cls === 'done' ? ' (completed)' : cls === 'current' ? ' (current)' : ''}</span></span>${i < p.flow.length - 1 ? '<span class="step-line" aria-hidden="true"></span>' : ''}</li>`;
    }).join('')}</ol>` : '';
    return `<section class="confirm fade" aria-labelledby="confirm-title"><div class="wrap confirm__inner">
      <ol class="steps" aria-label="Checkout progress">${stepsHTML(['Cart', 'Details', 'Done'], 2, true)}</ol>
      <div class="confirm__badge" aria-hidden="true">${svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 40, 2.6)}</div>
      <h1 class="display confirm__title" id="confirm-title" tabindex="-1">${p.preview ? 'Preview complete' : 'Order received'}</h1>
      <p class="confirm__msg">${esc(p.message)}</p>
      ${p.orderNumber ? `<p style="margin:0;font-size:18px">Order number <strong style="color:var(--copper-text)">${esc(p.orderNumber)}</strong></p>` : ''}
      ${status}
      <div class="confirm__card">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 16px;font-weight:600"><span>${esc(p.fulfillment)}</span><span class="muted">${esc(p.when)}</span></div>
        ${p.address ? `<p style="margin:0;color:var(--cream-2)">${esc(p.address)}</p>` : ''}
        <ul class="lines">${p.lines.map(lineHTML).join('')}</ul>
        <div style="display:flex;justify-content:space-between;gap:12px;font-size:19px;font-weight:700"><span>${p.totalLabel}</span><span style="color:var(--copper-text)">${money(p.total)}</span></div>
      </div>
      <div class="confirm__ctas">
        <button class="btn btn-primary btn-lg" type="button" data-action="order-again">${I.again} Order again</button>
        <a class="btn btn-outline btn-lg" href="#home" data-action="new-order">Back to menu</a>
      </div>
    </div></section>`;
  }

  function footerHTML() {
    const socials = [['Instagram', B.instagram], ['Facebook', B.facebook], ['TikTok', B.tiktok]].filter((s) => isUrl(s[1]));
    const hasPhone = clean(B.phone).replace(/\D/g, '').length >= 7;
    const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(B.email));
    const contact = (hasPhone || hasEmail || socials.length) ? `<div class="footer__col"><h2>Contact</h2>
      ${hasPhone ? `<a href="tel:${esc(clean(B.phone).replace(/[^\d+]/g, ''))}">${esc(B.phone)}</a>` : ''}
      ${hasEmail ? `<a href="mailto:${esc(clean(B.email))}">${esc(B.email)}</a>` : ''}
      ${socials.map((s) => `<a href="${esc(s[1])}" target="_blank" rel="noopener">${s[0]}</a>`).join('')}</div>` : '';
    return `<div class="wrap footer__inner">
      <div class="footer__top">
        <div class="footer__brand">
          <p class="wordmark" role="img" aria-label="Hussein’s Shawarma" style="margin:0"><span class="wordmark__top">Hussein<svg class="wordmark__flame" viewBox="0 0 24 32" aria-hidden="true"><path d="${FLAME}"/></svg>s</span><span class="wordmark__bottom">Shawarma</span><span class="footer__bar" aria-hidden="true"></span></p>
          <p class="muted" style="margin:0">Shawarma, wings, burgers, and your favorite sides.</p>
          ${clean(B.hoursText) ? `<p class="footer__hours"><span>Ordering hours</span>${esc(B.hoursText)}</p>` : ''}
        </div>
        <div class="footer__cols">
          <nav class="footer__col" aria-label="Footer"><h2>Explore</h2>
            <a href="#home" data-action="go-home">Home</a><a href="#menu" data-action="go-menu">Menu</a><a href="#cart" data-action="open-cart">Your Order</a>
          </nav>${contact}
        </div>
      </div>
      <div class="footer__bottom"><p>© ${new Date().getFullYear()} ${esc(B.name || 'Hussein’s Shawarma')}</p><p>Food photos are illustrative.</p></div>
    </div>`;
  }

  function drawerHTML(d) {
    const body = d.count ? `
      <div class="drawer__scroll">
        <ul class="drawer__lines">${d.lines.map((l) => `
          <li class="cart-line">
            <div class="cart-line__top"><span class="line__text"><span class="cart-line__name">${esc(l.name)}</span>${l.detail ? `<span class="line__detail">${esc(l.detail)}</span>` : ''}</span><strong class="line__total">${money(l.totalCents)}</strong></div>
            <div class="cart-line__controls">
              <div class="stepper stepper--outline" role="group" aria-label="Quantity of ${esc(l.name)}">
                <button type="button" id="l-dec-${l.idx}" data-action="dec" data-key="${esc(l.key)}" aria-label="Remove one ${esc(l.name)}">${I.minus}</button>
                <span class="stepper__qty">${l.qty}</span>
                <button type="button" id="l-inc-${l.idx}" data-action="inc" data-key="${esc(l.key)}" aria-label="Add one more ${esc(l.name)}">${I.plus}</button>
              </div>
              <span class="muted" style="font-size:15px">${money(l.unitCents)} each</span>
              <button class="link-btn" type="button" id="l-rm-${l.idx}" data-action="remove" data-key="${esc(l.key)}" aria-label="Remove ${esc(l.name)} from order" style="text-decoration:none">Remove</button>
            </div>
          </li>`).join('')}
        </ul>
        ${sideCat ? `<div class="upsell"><div class="upsell__head"><h3>Add a side?</h3><span class="muted" style="font-size:15px">${esc(sideCat.note || '')}</span></div>
          <div class="scroll-x" role="group" aria-label="Add a side">${sideCat.items.map((i, n) => `<button class="chip" type="button" id="up-${n}" data-action="add" data-id="${i.id}" aria-label="Add a side of ${esc(i.name)}, ${money(cents(i.price))}"><span style="color:var(--copper-text);display:inline-flex">${I.plus}</span>${esc(i.name)}</button>`).join('')}</div></div>` : ''}
      </div>
      <div class="drawer__foot">
        <div class="totals__grand" style="border:0;padding:0"><span>Subtotal</span><span class="price" style="font-size:32px">${money(d.sub)}</span></div>
        <button class="btn btn-primary btn-lg btn-block" type="button" data-action="checkout">Go to checkout ${I.right}</button>
        <button class="btn btn-ghost btn-block" type="button" data-action="keep-browsing">Keep browsing</button>
      </div>` : `
      <div class="drawer__empty"><p style="margin:0;font-size:19px">Your order is empty.</p><a class="btn btn-primary" href="#menu" data-action="go-menu">Browse the menu</a></div>`;
    return `<div class="overlay" data-dialog="drawer">
      <button class="scrim" type="button" tabindex="-1" aria-label="Close your order" data-action="close-cart"${S.anim.drawer ? '' : ' style="animation:none"'}></button>
      <aside class="drawer" id="cart" role="dialog" aria-modal="true" aria-labelledby="cart-title"${S.anim.drawer ? '' : ' style="animation:none"'}>
        <div class="dialog-head"><h2 class="display" id="cart-title">Your Order</h2><button class="icon-btn" type="button" id="cart-close" data-action="close-cart" aria-label="Close your order">${I.close}</button></div>
        ${body}
      </aside>
    </div>`;
  }

  function pickerHTML() {
    const pk = S.picker; const it = items[pk.id]; const need = it.sides; const counts = pk.counts;
    const chosen = sideNames.reduce((s, n) => s + (counts[n] || 0), 0);
    const full = chosen >= need;
    return `<div class="overlay overlay--center" data-dialog="picker">
      <button class="scrim" type="button" tabindex="-1" aria-label="Cancel" data-action="picker-close"${S.anim.picker ? '' : ' style="animation:none"'}></button>
      <div class="picker" role="dialog" aria-modal="true" aria-labelledby="picker-title"${S.anim.picker ? '' : ' style="animation:none"'}>
        <div class="picker__head">
          <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
            <h2 class="display" id="picker-title">${esc(it.cartName)} <span style="color:var(--copper-text)">${money(it.cents)}</span></h2>
            <p class="muted" style="font-size:15px">${esc(it.desc)}</p>
            <p aria-live="polite" style="margin-top:4px;font-weight:700">Choose ${need} ${need === 1 ? 'side' : 'sides'}: ${chosen} of ${need} chosen</p>
          </div>
          <button class="icon-btn" type="button" id="picker-close" data-action="picker-close" aria-label="Cancel">${I.close}</button>
        </div>
        <div class="picker__body">${sideGroups.map((g) => `
          <h3 class="group-title" style="margin-top:16px">${esc(g.name)}</h3>
          <ul class="side-list">${g.items.map((i) => {
            const n = i.name; const c = counts[n] || 0; const ix = sideNames.indexOf(n);
            return `<li class="side-row"><span class="side-row__name">${esc(n)}</span>
              <div class="stepper" role="group" aria-label="${esc(n)}, ${c} chosen">
                <button class="round-btn round-btn--muted" type="button" id="pk-dec-${ix}" data-action="picker-dec" data-name="${esc(n)}" aria-label="Remove ${esc(n)}"${c ? '' : ' disabled'}>${I.minus}</button>
                <span class="picker__count">${c}</span>
                <button class="round-btn" type="button" id="pk-inc-${ix}" data-action="picker-inc" data-name="${esc(n)}" aria-label="Add ${esc(n)}"${full ? ' disabled' : ''}>${I.plus}</button>
              </div></li>`;
          }).join('')}</ul>`).join('')}
        </div>
        <div class="picker__foot"><button class="btn btn-primary btn-lg btn-block" type="button" id="picker-add" data-action="picker-add"${chosen === need ? '' : ' disabled'}>${chosen === need ? 'Add to order · ' + money(it.cents) : 'Choose ' + (need - chosen) + ' more'}</button></div>
      </div>
    </div>`;
  }

  /* ---------- rendering ---------- */
  const main = $('#main');
  function captureFocus() {
    const a = document.activeElement;
    if (!a || a === document.body) return null;
    return { id: a.id, ctl: a.closest && a.closest('[data-ctl]') ? a.closest('[data-ctl]').getAttribute('data-ctl') : null, start: a.selectionStart, end: a.selectionEnd };
  }
  function restoreFocus(f) {
    if (!f) return;
    let el = f.id ? document.getElementById(f.id) : null;
    if (!el && f.ctl) { const box = document.querySelector(`[data-ctl="${f.ctl}"]`); if (box) el = box.querySelector('button:last-of-type'); }
    if (el && document.activeElement !== el) {
      try { el.focus({ preventScroll: true }); if (f.start != null && el.setSelectionRange) el.setSelectionRange(f.start, f.end); } catch (e) {}
    }
  }

  function renderHeader(d) {
    $('#cart-count').textContent = d.count;
    $('#mobile-count').textContent = d.count;
    $('#cart-btn').setAttribute('aria-label', `Your order, ${d.count} ${d.count === 1 ? 'item' : 'items'}`);
    const nav = $('#mobile-nav'); const t = $('#menu-toggle');
    nav.hidden = !S.menuOpen;
    t.setAttribute('aria-expanded', String(S.menuOpen));
    t.setAttribute('aria-label', S.menuOpen ? 'Close menu' : 'Open menu');
    t.innerHTML = S.menuOpen ? I.close : I.menu;
  }
  function bumpBadge() {
    const b = $('#cart-count'); S.bump++;
    b.classList.remove('bump-a', 'bump-b'); void b.offsetWidth; b.classList.add(S.bump % 2 ? 'bump-a' : 'bump-b');
  }
  function renderMain(d) {
    main.innerHTML = S.view === 'checkout' ? checkoutHTML(d) : S.view === 'confirmation' ? confirmHTML() : homeHTML();
  }
  function updateHomeControls() {
    document.querySelectorAll('[data-ctl]').forEach((box) => { box.innerHTML = control(box.getAttribute('data-ctl')); });
  }
  function renderFloating(d) {
    const show = S.view === 'home' && d.count > 0 && !S.drawer && !S.picker;
    $('#floating').innerHTML = show ? `<div class="cart-bar"><button class="btn btn-primary btn-lg btn-block" type="button" data-action="open-cart"><span>View order · ${d.count} ${d.count === 1 ? 'item' : 'items'}</span><span>${money(d.sub)}</span></button></div>` : '';
  }
  function renderOverlays(d) {
    $('#overlays').innerHTML = (S.drawer ? drawerHTML(d) : '') + (S.picker ? pickerHTML() : '');
    S.anim.drawer = false; S.anim.picker = false;
  }
  function renderToast() {
    $('#toast-region').innerHTML = S.toast && !S.drawer && !S.picker ? `<div class="toast fade"><span>Added ${esc(S.toast)}</span><button type="button" data-action="open-cart">View order</button></div>` : '';
  }

  /* opts.main: re-render main view; opts.scrollTop: jump to top */
  function update(opts) {
    opts = opts || {};
    const f = captureFocus();
    const d = derive();
    renderHeader(d);
    if (opts.main || S.view !== 'home') renderMain(d); else updateHomeControls();
    renderFloating(d); renderOverlays(d); renderToast();
    store.set(CART_KEY, S.cart);
    if (opts.scrollTop) window.scrollTo(0, 0);
    if (opts.focus) { const el = document.getElementById(opts.focus); if (el) el.focus(); } else restoreFocus(f);
  }

  /* ---------- actions ---------- */
  function addKey(key) {
    S.cart[key] = (S.cart[key] || 0) + 1;
    S.toast = items[parseKey(key).id].cartName;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = ''; renderToast(); }, 2600);
    bumpBadge();
  }
  function decKey(key) { S.cart[key] = (S.cart[key] || 0) - 1; if (S.cart[key] <= 0) delete S.cart[key]; }
  function jumpTo(cat) {
    spyPause = Date.now() + 1000;
    S.activeCat = cat; S.menuOpen = false; S.drawer = false;
    const go = () => { const el = document.getElementById('cat-' + cat); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); updateTabs(); };
    if (S.view !== 'home') { S.view = 'home'; update({ main: true }); setTimeout(go, 30); } else { update(); go(); }
  }
  function goTo(id) {
    const wasHome = S.view === 'home';
    S.view = 'home'; S.menuOpen = false; S.drawer = false;
    update({ main: !wasHome });
    setTimeout(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, wasHome ? 0 : 30);
  }
  function openCart() { returnFocus = document.activeElement; S.drawer = true; S.anim.drawer = true; S.menuOpen = false; S.toast = ''; update({ focus: 'cart-close' }); }
  function closeDialogs() {
    S.drawer = false; S.picker = null; update();
    if (returnFocus && document.contains(returnFocus)) { try { returnFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  function fmtPhone(raw, prev) {
    let dg = String(raw).replace(/\D/g, '');
    if (dg.length === 11 && dg.charAt(0) === '1') dg = dg.slice(1);
    const pd = String(prev || '').replace(/\D/g, '');
    if (String(raw).length < String(prev || '').length && dg === pd) dg = dg.slice(0, -1);
    dg = dg.slice(0, 10);
    if (!dg) return '';
    if (dg.length < 4) return '(' + dg;
    if (dg.length < 7) return '(' + dg.slice(0, 3) + ') ' + dg.slice(3);
    return '(' + dg.slice(0, 3) + ') ' + dg.slice(3, 6) + '-' + dg.slice(6);
  }
  function snapshot(d, res, preview) {
    const flow = S.fulfillment === 'pickup' ? ['Received', 'Preparing', 'Ready for pickup'] : ['Received', 'Preparing', 'Out for delivery', 'Delivered'];
    const idx = res && res.status ? flow.map((x) => x.toLowerCase()).indexOf(String(res.status).toLowerCase()) : -1;
    const f = S.form;
    const slotLabel = (d.time.slots.find((s) => s.value === d.slot) || {}).label;
    return {
      preview, keys: d.lines.map((l) => ({ key: l.key, qty: l.qty })),
      lines: d.lines.map((l) => ({ name: l.name, qty: l.qty, totalCents: l.totalCents, detail: l.detail })),
      total: d.total, totalLabel: d.feesPending ? 'Subtotal' : 'Total',
      fulfillment: FULFILL_LABEL[S.fulfillment] || S.fulfillment,
      when: d.when === 'later' && slotLabel ? 'Scheduled for ' + slotLabel : 'As soon as possible',
      address: S.fulfillment === 'delivery' ? [f.street, f.unit, f.city, f.zip].map(clean).filter(Boolean).join(', ') : '',
      orderNumber: res && res.orderNumber ? String(res.orderNumber) : '',
      flow, statusIdx: preview ? -1 : idx,
      message: preview ? 'This was a preview of the ordering flow. No order was sent and no payment was taken.'
        : 'Thanks' + (clean(f.name) ? ', ' + clean(f.name).split(' ')[0] : '') + '! Your order has been sent to the kitchen.'
    };
  }
  function saveCustomer() {
    if (S.rememberMe) { const s = {}; SAVED_FIELDS.forEach((k) => { s[k] = clean(S.form[k]); }); store.set(SAVED_KEY, s); } else store.del(SAVED_KEY);
  }
  function placeOrder() {
    const d = derive(); const errors = validate(d);
    if (Object.keys(errors).length) {
      S.submitted = true; update();
      const first = FIELD_ORDER.find((k) => errors[k]);
      const el = document.getElementById('f-' + first) || document.getElementById('err-' + first);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); try { el.focus({ preventScroll: true }); } catch (e) {} }
      return;
    }
    const finish = (res, preview) => {
      saveCustomer();
      S.placed = snapshot(d, res, preview); S.view = 'confirmation'; S.cart = {};
      S.submitted = false; S.touched = {}; S.remembered = false; S.submitting = false;
      update({ main: true, scrollTop: true, focus: 'confirm-title' });
    };
    if (!live) { finish(null, true); return; }
    const f = S.form;
    const payload = {
      lines: d.lines.map((l) => ({ id: l.id, name: l.name, sides: l.sides, qty: l.qty, unitPrice: l.unitCents / 100, lineTotal: l.totalCents / 100 })),
      subtotal: d.sub / 100, fulfillment: S.fulfillment, when: d.when, time: d.when === 'later' ? d.slot : '',
      customer: { name: clean(f.name), phone: clean(f.phone), email: clean(f.email) },
      address: S.fulfillment === 'delivery' ? { street: clean(f.street), unit: clean(f.unit), city: clean(f.city), zip: clean(f.zip), dropoff: clean(f.dropoff) } : null,
      notes: clean(f.notes)
    };
    S.submitting = true; S.submitError = ''; update();
    Promise.resolve().then(() => O.submitOrder(payload))
      .then((res) => finish(res, false))
      .catch(() => { S.submitting = false; S.submitError = 'We couldn’t place your order. Please try again.'; update(); });
  }

  const actions = {
    'go-home': () => goTo('home'),
    'go-menu': () => goTo('menu'),
    'jump': (el) => jumpTo(el.getAttribute('data-cat')),
    'toggle-menu': () => { S.menuOpen = !S.menuOpen; update(); },
    'open-cart': () => openCart(),
    'close-cart': () => closeDialogs(),
    'keep-browsing': () => { S.drawer = false; if (S.view !== 'home') { S.view = 'home'; update({ main: true, scrollTop: true }); } else closeDialogs(); },
    'checkout': () => { S.drawer = false; S.view = 'checkout'; S.summaryOpen = false; update({ main: true, scrollTop: true, focus: 'checkout-title' }); },
    'add': (el) => {
      const id = el.getAttribute('data-id');
      if (items[id].sides > 0) { returnFocus = el; S.picker = { id, counts: {} }; S.anim.picker = true; S.menuOpen = false; update({ focus: 'picker-close' }); return; }
      addKey(id); update();
    },
    'inc': (el) => { addKey(el.getAttribute('data-key')); update(); },
    'dec': (el) => { decKey(el.getAttribute('data-key')); update(); },
    'remove': (el) => { delete S.cart[el.getAttribute('data-key')]; update({ focus: 'cart-close' }); },
    'picker-inc': (el) => { const n = el.getAttribute('data-name'); const need = items[S.picker.id].sides; const chosen = sideNames.reduce((s, x) => s + (S.picker.counts[x] || 0), 0); if (chosen < need) { S.picker.counts[n] = (S.picker.counts[n] || 0) + 1; update(chosen + 1 === need ? { focus: 'picker-add' } : {}); } },
    'picker-dec': (el) => { const n = el.getAttribute('data-name'); if (S.picker.counts[n]) { S.picker.counts[n]--; update(); } },
    'picker-add': () => {
      const arr = []; sideNames.forEach((n) => { for (let k = 0; k < (S.picker.counts[n] || 0); k++) arr.push(n); });
      if (arr.length !== items[S.picker.id].sides) return;
      addKey(S.picker.id + '::' + arr.join('|')); S.picker = null; update();
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
    },
    'picker-close': () => closeDialogs(),
    'fulfillment': (el) => { S.fulfillment = el.getAttribute('data-value'); update(); },
    'when': (el) => { S.when = el.getAttribute('data-value'); update(); },
    'slot': (el) => { S.slot = el.getAttribute('data-value'); S.touched.slot = true; update(); },
    'toggle-summary': () => { S.summaryOpen = !S.summaryOpen; update(); },
    'clear-saved': () => { store.del(SAVED_KEY); S.form = Object.assign({}, BLANK); S.remembered = false; S.touched = {}; S.submitted = false; update({ focus: 'f-name' }); },
    'remember': (el) => { S.rememberMe = el.checked; },
    'place': () => placeOrder(),
    'order-again': () => { const next = {}; (S.placed ? S.placed.keys : []).forEach((k) => { if (items[parseKey(k.key).id]) next[k.key] = k.qty; }); S.cart = next; S.placed = null; S.view = 'home'; returnFocus = null; S.drawer = true; S.anim.drawer = true; update({ main: true, focus: 'cart-close' }); },
    'new-order': () => { S.placed = null; S.when = 'asap'; S.slot = ''; S.view = 'home'; update({ main: true, scrollTop: true }); }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.getAttribute('data-action') === 'remember') return;
    const fn = actions[el.getAttribute('data-action')];
    if (!fn) return;
    if (el.tagName === 'A') e.preventDefault();
    fn(el);
  });
  document.addEventListener('change', (e) => { if (e.target.matches('[data-action="remember"]')) actions.remember(e.target); });

  /* form fields: update state without re-rendering, show errors on blur */
  document.addEventListener('input', (e) => {
    const el = e.target; const k = el.getAttribute && el.getAttribute('data-field');
    if (!k) return;
    if (k === 'phone') { const v = fmtPhone(el.value, S.form.phone); S.form.phone = v; el.value = v; } else S.form[k] = el.value;
    if (S.touched[k] || S.submitted) showFieldError(k);
  });
  document.addEventListener('focusout', (e) => {
    const k = e.target.getAttribute && e.target.getAttribute('data-field');
    if (!k) return;
    S.touched[k] = true; showFieldError(k);
  });
  function showFieldError(k) {
    const d = derive(); const errors = validate(d); const msg = errFor(k, errors);
    const p = document.getElementById('err-' + k); const input = document.getElementById('f-' + k);
    if (p) p.textContent = msg;
    if (input && input.tagName === 'INPUT') input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  /* dialogs: Escape closes, Tab stays inside */
  $('#overlays').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeDialogs(); return; }
    if (e.key !== 'Tab') return;
    const box = e.target.closest('[role="dialog"]'); if (!box) return;
    const f = Array.from(box.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0]; const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* menu tabs follow the scroll */
  function updateTabs() {
    document.querySelectorAll('.tab').forEach((t) => {
      const on = t.id === 'tab-' + S.activeCat;
      t.classList.toggle('is-active', on);
      if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
    });
    const bar = $('#tabscroll'); const tab = document.getElementById('tab-' + S.activeCat);
    if (bar && tab) bar.scrollTo({ left: tab.offsetLeft - bar.clientWidth / 2 + tab.offsetWidth / 2, behavior: 'smooth' });
  }
  let raf = 0;
  window.addEventListener('scroll', () => {
    if (raf || S.view !== 'home') return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (Date.now() < spyPause) return;
      let cur = C.menu[0].id;
      C.menu.forEach((c) => { const el = document.getElementById('cat-' + c.id); if (el && el.getBoundingClientRect().top - 170 <= 0) cur = c.id; });
      if (cur !== S.activeCat) { S.activeCat = cur; updateTabs(); }
    });
  }, { passive: true });

  /* ---------- start ---------- */
  if (!live) $('#banner').innerHTML = '<div class="preview-banner" role="note">Online ordering preview: orders are not sent or charged yet.</div>';
  $('#footer').innerHTML = footerHTML();
  update({ main: true });
  if (location.hash && location.hash.length > 1) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 50);
  }
})();
