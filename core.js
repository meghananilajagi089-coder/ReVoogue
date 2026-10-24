/* core.js — exports: RW.util (esc, fmtINR, relTime, debounce, clamp, uid, seqId, simpleHash, hashPin, compressImage), RW.validators, RW.storage, RW.store (computeTotals, isFirstOrder), RW.hold, RW.router, RW.toast, RW.modal, RW.confirm, RW.actions, RW.errors */
(function(){
'use strict';
var RW = window.RW = window.RW || {};
var DATA = window.RW_DATA || {};
var CFG = DATA.config || {};

/* ---------- util ---------- */
var escMap = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
function esc(s){
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, function(c){ return escMap[c]; });
}
var inrFmt = null;
function fmtINR(n){
  try {
    if (!inrFmt) inrFmt = new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 });
    return inrFmt.format(Math.round(Number(n) || 0));
  } catch(e){ return '₹' + Math.round(Number(n) || 0); }
}
function relTime(ts){
  var diff = Date.now() - Number(ts);
  var m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  var h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? '1 hour ago' : h + ' hours ago';
  var d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return d + ' days ago';
  var mo = Math.floor(d / 30);
  if (mo < 12) return mo === 1 ? '1 month ago' : mo + ' months ago';
  return Math.floor(mo / 12) + ' years ago';
}
function debounce(fn, ms){
  var t = null;
  return function(){
    var args = arguments, self = this;
    clearTimeout(t);
    t = setTimeout(function(){ fn.apply(self, args); }, ms);
  };
}
function clamp(n, lo, hi){ return Math.min(hi, Math.max(lo, n)); }
var _uidN = 0;
function uid(prefix){
  _uidN++;
  return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + _uidN.toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}
function seqId(prefix, storeKey){
  var n = 1;
  try {
    var cur = RW.storage.get(storeKey, null);
    if (cur !== null) n = Number(cur) + 1;
    RW.storage.set(storeKey, n);
  } catch(e){ n = Math.floor(Math.random() * 9000) + 1000; }
  return (prefix || 'ID-') + n;
}
function simpleHash(str){
  var h1 = 0x811c9dc5, h2 = 0x1b873593;
  var s = String(str);
  for (var i = 0; i < s.length; i++){
    var c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 + c, 0x85ebca6b);
  }
  return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}
function hashPin(pin, salt){
  var raw = String(salt || '') + ':' + String(pin);
  return new Promise(function(resolve){
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest){
        var bytes = new TextEncoder().encode(raw);
        crypto.subtle.digest('SHA-256', bytes).then(function(buf){
          var arr = new Uint8Array(buf), out = '';
          for (var i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, '0');
          resolve(out);
        })['catch'](function(){ resolve(simpleHash(raw)); });
        return;
      }
    } catch(e){}
    resolve(simpleHash(raw));
  });
}

/* Compress an image File for the sell wizard: images only, max 800px long edge, JPEG q 0.65.
   Resolves to a data URL; rejects friendly errors for non-images / unreadable files. */
function compressImage(file, opts){
  opts = opts || {};
  var maxDim = opts.max || 800;
  var quality = opts.quality != null ? opts.quality : 0.65;
  return new Promise(function(resolve, reject){
    if (!file || (file.type && file.type.indexOf('image/') !== 0) || (!file.type && !/^image\//.test(file.name || ''))){
      reject(new Error('That file is not an image. Please upload a JPG, PNG or WEBP photo.'));
      return;
    }
    var url = null;
    try { url = URL.createObjectURL(file); } catch(e){ reject(new Error('Could not read that file.')); return; }
    var img = new Image();
    img.onload = function(){
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h){ try { URL.revokeObjectURL(url); } catch(e){} reject(new Error('Could not read that image.')); return; }
      var scale = Math.min(1, maxDim / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
      var canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      try { URL.revokeObjectURL(url); } catch(e){}
      var out = null;
      try { out = canvas.toDataURL('image/jpeg', quality); } catch(e){ reject(new Error('Could not compress that image.')); return; }
      if (!out || out.indexOf('data:image') !== 0){ reject(new Error('Could not compress that image.')); return; }
      resolve(out);
    };
    img.onerror = function(){
      try { URL.revokeObjectURL(url); } catch(e){}
      reject(new Error('That file is not a readable image.'));
    };
    img.src = url;
  });
}

RW.util = { esc: esc, fmtINR: fmtINR, relTime: relTime, debounce: debounce, clamp: clamp, uid: uid, seqId: seqId, simpleHash: simpleHash, hashPin: hashPin, compressImage: compressImage };

/* ---------- validators ---------- */
RW.validators = {
  mobile: function(v){ return /^[6-9]\d{9}$/.test(String(v || '').trim()); },
  pincode: function(v){ return /^\d{6}$/.test(String(v || '').trim()); },
  email: function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()); },
  upi: function(v){ return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(String(v || '').trim()); },
  price: function(v){ var n = Number(v); return isFinite(n) && n >= (CFG.priceMin || 99); },
  required: function(v){ return String(v == null ? '' : v).trim().length > 0; }
};

/* ---------- storage ---------- */
var mem = {};
var storageOk = true;
RW.storage = {
  available: function(){ return storageOk; },
  get: function(k, def){
    try {
      var v = localStorage.getItem(k);
      if (v === null) return (k in mem) ? mem[k] : def;
      return JSON.parse(v);
    } catch(e){
      return (k in mem) ? mem[k] : def;
    }
  },
  set: function(k, v){
    mem[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch(e){ storageOk = false; return false; }
  },
  remove: function(k){
    delete mem[k];
    try { localStorage.removeItem(k); } catch(e){}
  }
};

/* ---------- store ---------- */
var KEYS = ['rw_listings_user','rw_status_overrides','rw_cart','rw_wishlist','rw_orders','rw_sellers_user','rw_seller_overrides','rw_reports','rw_messages','rw_recent_views','rw_recent_searches','rw_sell_draft','rw_coupon','rw_lockout','rw_hold','rw_deleted','rw_listings_seeded'];
var defaults = {
  rw_listings_user: [], rw_status_overrides: {}, rw_cart: [], rw_wishlist: {},
  rw_orders: null, rw_sellers_user: [], rw_seller_overrides: {}, rw_reports: [], rw_messages: [],
  rw_recent_views: [], rw_recent_searches: [], rw_sell_draft: null, rw_coupon: null,
  rw_lockout: null, rw_hold: null, rw_deleted: null, rw_listings_seeded: false
};
function seedDemoCloset(st){
  var i;
  var list = st.rw_listings_user || [];
  var have = {};
  for (i = 0; i < list.length; i++) have[list[i].id] = 1;
  var demos = DATA.myListings || [];
  for (i = 0; i < demos.length; i++) if (!have[demos[i].id]) list.push(Object.assign({}, demos[i]));
  var sellers = st.rw_sellers_user || [];
  var haveS = {};
  for (i = 0; i < sellers.length; i++) haveS[sellers[i].id] = 1;
  var mine = DATA.mySellers || [];
  for (i = 0; i < mine.length; i++) if (!haveS[mine[i].id]) sellers.push(Object.assign({}, mine[i]));
  st.rw_listings_user = list;
  st.rw_sellers_user = sellers;
  st.rw_listings_seeded = true;
  RW.storage.set('rw_listings_user', list);
  RW.storage.set('rw_sellers_user', sellers);
  RW.storage.set('rw_listings_seeded', true);
}
function loadAll(){
  var st = {};
  for (var i = 0; i < KEYS.length; i++) st[KEYS[i]] = RW.storage.get(KEYS[i], defaults[KEYS[i]]);
  if (st.rw_orders === null) st.rw_orders = (DATA.orders || []).slice();
  /* first run only: add the 5 demo closet listings + their seller, then never again */
  if (!st.rw_listings_seeded) seedDemoCloset(st);
  return st;
}
var state = loadAll();
var subs = [];
function notify(fromStorage){
  for (var i = 0; i < subs.length; i++){
    try { subs[i](state, fromStorage); } catch(e){}
  }
}
RW.store = {
  get: function(key){ return key ? state[key] : state; },
  set: function(key, val){
    state[key] = val;
    RW.storage.set(key, val);
    notify(false);
  },
  update: function(key, fn){
    var v = fn(state[key]);
    RW.store.set(key, v);
  },
  subscribe: function(fn){ subs.push(fn); return function(){ var i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; },
  reload: function(){ state = loadAll(); notify(true); },

  /* FIRST100 "first order": no non-seeded order that is not CANCELLED/PAYMENT_FAILED */
  isFirstOrder: function(){
    var orders = state.rw_orders || [];
    for (var i = 0; i < orders.length; i++){
      var o = orders[i];
      if (o.seeded) continue;
      if (o.status === 'CANCELLED' || o.status === 'PAYMENT_FAILED') continue;
      return false;
    }
    return true;
  },

  /* THE totals function — cart, checkout and order confirmation all use this.
     Order: subtotal -> free-delivery + coupon minimums on PRE-coupon subtotal
     -> total = subtotal - coupon + delivery + platform fee (+ COD fee). */
  computeTotals: function(items, opts){
    opts = opts || {};
    items = items || [];
    var freeAbove = CFG.deliveryFreeAbove != null ? CFG.deliveryFreeAbove : 999;
    var delFee = CFG.deliveryFee != null ? CFG.deliveryFee : 49;
    var platFee = CFG.platformFee != null ? CFG.platformFee : 5;
    var codFeeCfg = CFG.codFee != null ? CFG.codFee : 25;

    var subtotal = 0, mrpSave = 0;
    for (var i = 0; i < items.length; i++){
      var it = items[i] || {};
      subtotal += Number(it.price) || 0;
      mrpSave += Math.max(0, (Number(it.mrp) || 0) - (Number(it.price) || 0));
    }

    /* free delivery from pre-coupon subtotal; a coupon never removes free delivery */
    var delivery = items.length ? (subtotal >= freeAbove ? 0 : delFee) : 0;
    var platformFee = items.length ? platFee : 0;
    var codFee = opts.cod ? codFeeCfg : 0;

    var code = opts.coupon ? String(opts.coupon).toUpperCase().trim() : null;
    var coupons = CFG.coupons || {};
    var couponDiscount = 0, couponNote = null, couponApplied = false, freeship = false;

    if (code && items.length){
      var c = coupons[code];
      if (!c){
        couponNote = 'Unknown coupon code.';
        code = null;
      } else if (c.type === 'freeship'){
        if (subtotal >= freeAbove){
          couponNote = 'Free delivery already applies.';
        } else {
          /* valid only when delivery would otherwise cost money */
          freeship = true;
          delivery = 0;
          couponApplied = true;
        }
      } else if (subtotal < (c.min || 0)){
        couponNote = 'Add ' + fmtINR((c.min || 0) - subtotal) + ' more to use ' + code + ' (min ' + fmtINR(c.min || 0) + ').';
        code = null;
      } else if (c.firstOrderOnly && !RW.store.isFirstOrder()){
        couponNote = code + ' is valid on your first order only.';
        code = null;
      } else {
        if (c.type === 'pct') couponDiscount = Math.min(c.cap != null ? c.cap : Infinity, Math.floor(subtotal * (c.pct || 0) / 100));
        else couponDiscount = Number(c.amount) || 0;
        if (couponDiscount > 0) couponApplied = true;
        else { couponNote = 'Coupon could not be applied.'; code = null; }
      }
    } else if (code && !items.length){
      couponNote = 'Your cart is empty.';
      code = null;
    }

    var total = subtotal - couponDiscount + delivery + platformFee + codFee;
    return {
      itemCount: items.length,
      subtotal: subtotal,
      mrpSave: mrpSave,
      couponCode: couponApplied ? code : null,
      couponDiscount: couponDiscount,
      couponNote: couponNote,
      freeship: freeship,
      delivery: delivery,
      platformFee: platformFee,
      codFee: codFee,
      total: total,
      youSave: mrpSave + couponDiscount
    };
  }
};

/* ---------- soft reservation (rw_hold) ----------
   Hold holds items for checkout (10 min) or the UPI window (5 min).
   Expiry is always computed on read from expiresAt — timers only display. */
RW.hold = {
  get: function(){ return state.rw_hold || null; },
  start: function(itemIds, opts){
    opts = opts || {};
    var prev = state.rw_hold;
    var minutes = opts.minutes != null ? opts.minutes : Math.round((CFG.holdMs || 600000) / 60000);
    var h = {
      type: opts.type || 'checkout',
      items: (itemIds || []).slice(),
      expiresAt: Date.now() + minutes * 60000,
      orderId: opts.orderId || null,
      buyer: opts.buyer || (prev && prev.buyer) || null
    };
    RW.store.set('rw_hold', h);
    return h;
  },
  patch: function(fn){
    var h = state.rw_hold;
    if (!h) return null;
    h = fn(h) || h;
    RW.store.set('rw_hold', h);
    return h;
  },
  clear: function(){ RW.store.set('rw_hold', null); },
  /* expire if due; returns the expired hold (or null). Marks UPI orders PAYMENT_FAILED. */
  expireIfDue: function(){
    var h = state.rw_hold;
    if (!h) return null;
    if (Date.now() < h.expiresAt) return null;
    RW.store.set('rw_hold', null);
    if (h.orderId){
      var orders = (state.rw_orders || []).slice();
      for (var i = 0; i < orders.length; i++){
        if (orders[i].orderId === h.orderId && orders[i].status === 'PAYMENT_PENDING'){
          orders[i].status = 'PAYMENT_FAILED';
          if (orders[i].payment) orders[i].payment.status = 'FAILED';
        }
      }
      RW.store.set('rw_orders', orders);
    }
    return h;
  },
  /* called on every route change; returns 'redirect-cart' when a checkout hold expired */
  checkOnRoute: function(parsed){
    var h = this.expireIfDue();
    if (!h) return null;
    if (h.type === 'upi') return 'upi-expired';
    RW.toast('Your 10-minute hold expired — items are back in your cart.', 'error');
    var path = parsed ? parsed.path : '';
    if (path === '/cart' || path === '/order' || path.indexOf('/order/') === 0 || path.indexOf('/pay/') === 0) return 'cart';
    return 'redirect-cart';
  }
};
window.addEventListener('storage', function(e){
  if (!e.key || e.key.indexOf('rw_') !== 0) return;
  state[e.key] = RW.storage.get(e.key, defaults[e.key]);
  if (e.key === 'rw_orders') state.rw_orders = RW.storage.get('rw_orders', (DATA.orders || []).slice());
  notify(true);
  /* cross-tab: expire hold on read (no redirect from a background tab) */
  if (RW.hold) RW.hold.expireIfDue();
});

/* ---------- toast ---------- */
function toast(msg, type){
  var region = document.getElementById('toast-region');
  if (!region) return;
  var el = document.createElement('div');
  el.className = 'toast' + (type === 'success' ? ' is-success' : type === 'error' ? ' is-error' : '');
  el.innerHTML = '<span>' + esc(msg) + '</span>';
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'toast-close'; btn.setAttribute('aria-label', 'Dismiss');
  btn.textContent = '×';
  btn.addEventListener('click', function(){ el.remove(); });
  el.appendChild(btn);
  region.appendChild(el);
  setTimeout(function(){ if (el.parentNode) el.remove(); }, 3800);
}
RW.toast = toast;

/* ---------- modal (focus trap) ---------- */
var modalPrevFocus = null;
function openModal(opts){
  var region = document.getElementById('modal-region');
  if (!region) return null;
  modalPrevFocus = document.activeElement;
  region.innerHTML = '';
  region.hidden = false;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('data-action', 'close-modal');
  var box = document.createElement('div');
  box.className = 'modal' + (opts.wide ? ' modal-wide' : '');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  var titleId = 'modal-title-' + Math.floor(Math.random() * 1e6);
  box.setAttribute('aria-labelledby', titleId);
  var html = '<h2 class="modal-title" id="' + titleId + '">' + esc(opts.title || 'Dialog') + '</h2>';
  html += '<div class="modal-body">' + (opts.bodyHTML || '') + '</div>';
  if (opts.actions && opts.actions.length){
    html += '<div class="modal-actions">';
    for (var i = 0; i < opts.actions.length; i++){
      var a = opts.actions[i];
      html += '<button type="button" class="btn ' + esc(a.cls || 'btn-ghost') + '" data-modal-idx="' + i + '">' + esc(a.label) + '</button>';
    }
    html += '</div>';
  }
  box.innerHTML = html;
  region.appendChild(overlay);
  region.appendChild(box);
  box.addEventListener('click', function(e){
    var b = e.target.closest('[data-modal-idx]');
    if (!b) return;
    var a = opts.actions[Number(b.getAttribute('data-modal-idx'))];
    if (a && a.onClick) a.onClick();
    if (!a || a.keepOpen !== true) closeModal();
  });
  var focusables = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusables.length) focusables[0].focus();
  else { box.setAttribute('tabindex', '-1'); box.focus(); }
  function onKey(e){
    if (e.key === 'Escape'){ closeModal(); return; }
    if (e.key !== 'Tab') return;
    var f = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', onKey);
  openModal._onKey = onKey;
  return box;
}
function closeModal(){
  var region = document.getElementById('modal-region');
  if (!region) return;
  if (openModal._onKey) document.removeEventListener('keydown', openModal._onKey);
  region.innerHTML = '';
  region.hidden = true;
  if (modalPrevFocus && modalPrevFocus.focus) { try { modalPrevFocus.focus(); } catch(e){} }
  modalPrevFocus = null;
}
function confirmDialog(msg, onYes, opts){
  opts = opts || {};
  openModal({
    title: opts.title || 'Please confirm',
    bodyHTML: '<p>' + esc(msg) + '</p>',
    actions: [
      { label: 'Cancel', cls: 'btn-ghost' },
      { label: opts.yes || 'Yes, continue', cls: opts.danger ? 'btn-danger' : 'btn-primary', onClick: onYes }
    ]
  });
}
RW.modal = { open: openModal, close: closeModal };
RW.confirm = confirmDialog;

/* ---------- error view ---------- */
function errorView(err){
  var msg = (err && err.message) ? err.message : String(err || 'Unknown error');
  return '<div class="view error-view"><p class="code">!</p><h1 tabindex="-1">Something went wrong</h1>' +
    '<p class="muted">The page could not be rendered: ' + esc(msg) + '</p>' +
    '<p><a class="btn btn-primary" href="#/">Back to home</a> <a class="btn btn-ghost" href="#/shop">Browse shop</a></p></div>';
}
RW.errors = { view: errorView };

/* ---------- router ---------- */
var routes = [];
var lastRenderedHash = null;
var scrollMem = {};
var appEl = null;

function parseHash(hash){
  var h = String(hash || '').replace(/^#/, '');
  if (!h || h === '/') h = '/';
  var qi = h.indexOf('?');
  var path = qi >= 0 ? h.slice(0, qi) : h;
  var qs = qi >= 0 ? h.slice(qi + 1) : '';
  var query = {};
  if (qs){
    var pairs = qs.split('&');
    for (var i = 0; i < pairs.length; i++){
      if (!pairs[i]) continue;
      var kv = pairs[i].split('=');
      var k = decodeURIComponent(kv[0] || '');
      var v = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
      if (k) query[k] = v;
    }
  }
  if (path.length > 1 && path.charAt(path.length - 1) === '/') path = path.slice(0, -1);
  return { path: path, query: query, full: h };
}
function matchRoute(path){
  var parts = path.split('/');
  for (var i = 0; i < routes.length; i++){
    var r = routes[i];
    var rp = r.path.split('/');
    if (rp.length !== parts.length) continue;
    var params = {}, ok = true;
    for (var j = 0; j < rp.length; j++){
      if (rp[j].charAt(0) === ':'){ params[rp[j].slice(1)] = decodeURIComponent(parts[j]); }
      else if (rp[j] !== parts[j]){ ok = false; break; }
    }
    if (ok) return { route: r, params: params };
  }
  return null;
}
function notFoundView(path){
  return '<div class="view error-view"><p class="code">404</p><h1 tabindex="-1">Page not found</h1>' +
    '<p class="muted">We could not find <code>' + esc(path) + '</code>.</p>' +
    '<p><a class="btn btn-primary" href="#/">Go home</a> <a class="btn btn-ghost" href="#/shop">Browse shop</a></p></div>';
}
function setActiveNav(path){
  var links = document.querySelectorAll('.bottom-nav a[data-nav]');
  for (var i = 0; i < links.length; i++) links[i].classList.remove('is-active');
  var key = null;
  if (path === '/') key = 'home';
  else if (path.indexOf('/shop') === 0) key = 'shop';
  else if (path.indexOf('/sell') === 0) key = 'sell';
  else if (path.indexOf('/wishlist') === 0) key = 'wishlist';
  else if (path.indexOf('/cart') === 0) key = 'cart';
  if (key){
    var el = document.querySelector('.bottom-nav a[data-nav="' + key + '"]');
    if (el) el.classList.add('is-active');
  }
}
function focusHeading(){
  var h1 = appEl && appEl.querySelector('h1');
  if (h1){ h1.setAttribute('tabindex', '-1'); try { h1.focus({ preventScroll: true }); } catch(e){ h1.focus(); } }
}

/* ---------- multi-page file routing (each route family owns an .html file) ---------- */
var MULTI_PROTO = { 'file:': 1, 'http:': 1, 'https:': 1 };
var knownFiles = null;

function currentFile(){
  try { return String(location.pathname || '').split('/').pop() || ''; } catch(e){ return ''; }
}
function fileForRoute(routePath){
  var segs = String(routePath || '').split('/');
  var out = [];
  for (var i = 0; i < segs.length; i++) if (segs[i] && segs[i].charAt(0) !== ':') out.push(segs[i]);
  return out.length ? out.join('-') + '.html' : 'index.html';
}
function fileForPath(path){
  var matched = matchRoute(path);
  if (!matched) return null;
  return fileForRoute(matched.route.path);
}
function canMultiPage(){
  if (!MULTI_PROTO[String(location.protocol || '')]) return false;
  if (typeof location.assign !== 'function') return false;
  if (!knownFiles){
    knownFiles = {};
    for (var i = 0; i < routes.length; i++) knownFiles[fileForRoute(routes[i].path)] = 1;
    knownFiles['index.html'] = 1;
  }
  return knownFiles[currentFile()] === 1;
}
function defaultHashForFile(file){
  for (var i = 0; i < routes.length; i++){
    var rp = routes[i].path;
    if (rp.indexOf(':') < 0 && fileForRoute(rp) === file) return rp;
  }
  return null;
}
function rewriteLinks(){
  if (!canMultiPage()) return;
  var cur = currentFile();
  var els = document.querySelectorAll('a[href^="#/"]');
  for (var i = 0; i < els.length; i++){
    var href = els[i].getAttribute('href') || '';
    var parsed = parseHash(href);
    var tf = fileForPath(parsed.path);
    if (tf && tf !== cur) els[i].setAttribute('href', tf + href);
  }
}
/* toasts shown just before a cross-file navigation survive it: stash, replay on next boot */
function stashToastsForNav(){
  try {
    var region = document.getElementById('toast-region');
    if (!region) return;
    var els = region.querySelectorAll('.toast');
    var msgs = [];
    for (var i = 0; i < els.length; i++){
      var span = els[i].querySelector('span');
      if (!span) continue;
      var cls = els[i].className || '';
      msgs.push({ m: span.textContent, t: cls.indexOf('is-success') >= 0 ? 'success' : cls.indexOf('is-error') >= 0 ? 'error' : null });
    }
    if (msgs.length) RW.storage.set('rw_nav_toasts', msgs);
  } catch(e){}
}
function consumeNavToasts(){
  try {
    var msgs = RW.storage.get('rw_nav_toasts', null);
    RW.storage.set('rw_nav_toasts', null);
    if (!msgs || !msgs.length) return;
    for (var i = 0; i < msgs.length; i++) toast(msgs[i].m, msgs[i].t);
  } catch(e){}
}
function renderCurrent(hash){
  if (!appEl) appEl = document.getElementById('app');
  var parsed = parseHash(hash);
  /* expire soft hold on read; a lapsed checkout hold returns the user to cart */
  if (RW.hold && RW.hold.checkOnRoute){
    if (RW.hold.checkOnRoute(parsed) === 'redirect-cart'){
      lastRenderedHash = null;
      navigate('#/cart', { replace: true });
      return;
    }
  }
  var prev = window.pageYOffset || 0;
  if (lastRenderedHash !== null) scrollMem[lastRenderedHash] = prev;
  var matched = matchRoute(parsed.path);
  var html, title = 'ReVogue', route = null;
  try {
    if (!matched){
      html = notFoundView(parsed.path);
      title = '404 — ReVogue';
    } else {
      route = matched.route;
      if (route.guard){
        var g = route.guard(parsed, matched.params);
        if (typeof g === 'string'){
          var target = g;
          lastRenderedHash = null;
          navigate(target, { replace: true });
          return;
        }
      }
      html = route.view(parsed.query, matched.params);
      var t = route.title;
      if (typeof t === 'function') title = t(matched.params, parsed.query) + ' — ReVogue';
      else if (t) title = t + ' — ReVogue';
      else title = 'ReVogue';
    }
  } catch(err){
    html = errorView(err);
    title = 'Error — ReVogue';
  }
  lastRenderedHash = parsed.full;
  document.title = title;
  appEl.innerHTML = html;
  appEl.className = 'view container';
  setActiveNav(parsed.path);
  rewriteLinks();
  try {
    if (typeof CustomEvent !== 'undefined') document.dispatchEvent(new CustomEvent('rw:rendered', { detail: { hash: parsed.full, path: parsed.path } }));
  } catch(e){}
  var restore = scrollMem[parsed.full];
  if (typeof restore === 'number' && restore > 0) window.scrollTo(0, restore);
  else window.scrollTo(0, 0);
  focusHeading();
}
function navigate(hash, opts){
  opts = opts || {};
  var target = String(hash || '#/');
  var fm = /^([A-Za-z0-9_-]+\.html)#([\s\S]*)$/.exec(target);
  if (fm) target = '#' + fm[2];
  if (target.charAt(0) !== '#') target = '#' + target;
  var parsed = parseHash(target);
  var normalized = '#' + parsed.full;
  var multi = canMultiPage() && !opts.inPage;
  if (multi && fm && fm[1] !== currentFile()){
    var dest = fm[1] + normalized;
    stashToastsForNav();
    if (opts.replace) location.replace(dest); else location.assign(dest);
    return;
  }
  if (normalized === location.hash){
    renderCurrent(normalized);
    return;
  }
  if (multi){
    var tf = fileForPath(parsed.path);
    if (tf && tf !== currentFile()){
      var dest2 = tf + normalized;
      stashToastsForNav();
      if (opts.replace) location.replace(dest2); else location.assign(dest2);
      return;
    }
  }
  if (opts.replace){
    var url = location.href.replace(/#.*$/, '') + normalized;
    try { history.replaceState(null, '', url); } catch(e){ location.hash = parsed.full; return; }
    lastRenderedHash = parsed.full;
    renderCurrent(normalized);
  } else {
    location.hash = parsed.full;
  }
}
function register(path, view, opts){
  opts = opts || {};
  routes.push({ path: path, view: view, title: opts.title || null, guard: opts.guard || null });
}
RW.router = {
  register: register,
  navigate: navigate,
  parseHash: parseHash,
  start: function(){
    consumeNavToasts();
    appEl = document.getElementById('app');
    window.addEventListener('hashchange', function(){
      var h = '#' + parseHash(location.hash).full;
      if (h === lastRenderedHash) return;
      renderCurrent(h);
    });
    if (!location.hash){
      if (canMultiPage()){
        var def = defaultHashForFile(currentFile());
        if (def) navigate('#' + def, { replace: true });
        else if (currentFile() !== 'index.html') location.replace('index.html');
        else navigate('#/', { replace: true });
      } else navigate('#/', { replace: true });
    } else renderCurrent(location.hash);
    rewriteLinks();
  },
  current: function(){ return parseHash(location.hash); },
  routes: function(){ return routes.slice(); }
};

/* ---------- delegated actions framework ---------- */
RW.actions = RW.actions || {};
function delegate(type, attr){
  document.addEventListener(type, function(e){
    var el = e.target && e.target.closest ? e.target.closest('[' + attr + ']') : null;
    if (!el) return;
    if (type === 'click' && el.tagName === 'FORM') return;
    if (type === 'click' && el.tagName === 'SELECT') return;
    if (type === 'change' && el.tagName !== 'SELECT') return;
    var name = el.getAttribute(attr);
    var fn = RW.actions[name];
    if (typeof fn === 'function'){
      if (type === 'submit') e.preventDefault();
      fn(el, e);
    }
  });
}
delegate('click', 'data-action');
delegate('submit', 'data-action');
delegate('change', 'data-action');
RW.actions['noop'] = function(){};
RW.actions['noop-key'] = function(){};

/* skip link */
document.addEventListener('click', function(e){
  var a = e.target && e.target.closest ? e.target.closest('a[href="#main"]') : null;
  if (!a) return;
  e.preventDefault();
  var main = document.getElementById('app') || document.getElementById('main');
  if (main){ main.setAttribute('tabindex', '-1'); try { main.focus(); } catch(err){} }
});

/* drawer helpers used by app.js */
RW.actions['close-drawer'] = function(){
  var d = document.getElementById('drawer'), o = document.getElementById('drawer-overlay'), b = document.getElementById('hamburger');
  if (d){ d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); }
  if (o) o.hidden = true;
  if (b) b.setAttribute('aria-expanded', 'false');
};
RW.actions['toggle-drawer'] = function(){
  var d = document.getElementById('drawer'), o = document.getElementById('drawer-overlay'), b = document.getElementById('hamburger');
  if (!d) return;
  var open = !d.classList.contains('is-open');
  d.classList.toggle('is-open', open);
  d.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (o) o.hidden = !open;
  if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
};
RW.actions['close-modal'] = function(){ closeModal(); };
document.addEventListener('rw:rendered', function(){
  RW.actions['close-drawer']();
  document.body.classList.remove('no-scroll');
});
RW.actions['reset-demo'] = function(){
  confirmDialog('Reset all local demo data (cart, wishlist, orders, listings)? This cannot be undone.', function(){
    try {
      RW.storage.set('rw_version', (RW.storage.get('rw_version', 0) || 0) + 1);
      var all = [];
      try {
        for (var i = 0; i < localStorage.length; i++){
          var k = localStorage.key(i);
          if (k && k.indexOf('rw_') === 0) all.push(k);
        }
      } catch(e){}
      for (var j = 0; j < all.length; j++) RW.storage.remove(all[j]);
    } catch(e){}
    toast('Demo data reset. Reloading…', 'success');
    setTimeout(function(){ location.hash = '#/'; location.reload(); }, 400);
  }, { danger: true, yes: 'Reset everything' });
};
RW.actions['fake-subscribe'] = function(){ toast('Thanks! (Demo — no email was sent.)', 'success'); };

})();
