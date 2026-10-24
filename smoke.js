/* smoke.js — node DOM-shim smoke: loads all site scripts in order, renders every key route,
   asserts no-throw renders, data-action handler coverage, link resolution, script order.
   Run: node smoke.js  (exit 1 on any failure) */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = __dirname;
var SCRIPT_ORDER = ['data.js', 'core.js', 'engine.js', 'views-shop.js', 'views-buy.js', 'views-sell.js', 'views-info.js', 'app.js'];

var pass = 0, fail = 0;
function check(name, ok, detail){
  if (ok){ pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (detail ? ' -> ' + detail : '')); }
}

/* ---------- minimal DOM shim ---------- */
function makeEvent(type, target, extra){
  var e = {
    type: type,
    target: target || null,
    currentTarget: target || null,
    defaultPrevented: false,
    preventDefault: function(){ this.defaultPrevented = true; },
    stopPropagation: function(){},
    stopImmediatePropagation: function(){},
    key: '', code: '', button: 0, deltaY: 0,
    metaKey: false, ctrlKey: false, shiftKey: false, altKey: false
  };
  if (extra) for (var k in extra) e[k] = extra[k];
  return e;
}
function makeElement(tag){
  var attrs = {};
  var listeners = {};
  var node = {
    tagName: String(tag || 'div').toUpperCase(),
    style: {},
    className: '',
    id: '',
    hidden: false,
    textContent: '',
    value: '',
    type: '',
    checked: false,
    children: [],
    parentNode: null,
    _html: '',
    _has: function(c){ return this.className.split(/\s+/).indexOf(c) >= 0; },
    get innerHTML(){ return this._html; },
    set innerHTML(v){ this._html = String(v == null ? '' : v); },
    classList: {
      add: function(){ for (var i = 0; i < arguments.length; i++){ var c = arguments[i]; if (!node._has(c)) node.className = (node.className ? node.className + ' ' : '') + c; } },
      remove: function(){ for (var i = 0; i < arguments.length; i++){ var c = arguments[i]; node.className = node.className.split(/\s+/).filter(function(x){ return x && x !== c; }).join(' '); } },
      toggle: function(c, force){ var on = (force === undefined) ? !node._has(c) : !!force; if (on) node.classList.add(c); else node.classList.remove(c); return on; },
      contains: function(c){ return node._has(c); }
    },
    setAttribute: function(k, v){
      attrs[k] = String(v);
      if (k === 'id') node.id = String(v);
      else if (k === 'class') node.className = String(v);
      else if (k === 'hidden') node.hidden = true;
      else if (k === 'value') node.value = String(v);
    },
    getAttribute: function(k){ return (k in attrs) ? attrs[k] : null; },
    hasAttribute: function(k){ return k in attrs; },
    removeAttribute: function(k){ delete attrs[k]; if (k === 'hidden') node.hidden = false; },
    addEventListener: function(t, fn){ (listeners[t] || (listeners[t] = [])).push(fn); },
    removeEventListener: function(t, fn){ var a = listeners[t]; if (a){ var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
    dispatchEvent: function(e){ var a = (listeners[e && e.type] || []).slice(); for (var i = 0; i < a.length; i++) a[i].call(node, e); return true; },
    appendChild: function(c){
      if (c && c.parentNode) c.parentNode.removeChild(c);
      if (c){ c.parentNode = node; node.children.push(c); }
      return c;
    },
    removeChild: function(c){ var i = node.children.indexOf(c); if (i >= 0) node.children.splice(i, 1); if (c) c.parentNode = null; return c; },
    remove: function(){ if (node.parentNode) node.parentNode.removeChild(node); },
    contains: function(){ return false; },
    querySelector: function(){ return null; },
    querySelectorAll: function(){ return []; },
    closest: function(){ return null; },
    matches: function(){ return false; },
    focus: function(){},
    blur: function(){},
    click: function(){ node.dispatchEvent(makeEvent('click', node)); },
    scrollIntoView: function(){},
    getBoundingClientRect: function(){ return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
  };
  return node;
}

var appEl = makeElement('main');
appEl.setAttribute('id', 'app');

var docListeners = {};
var documentShim = {
  readyState: 'complete',
  title: '',
  activeElement: null,
  addEventListener: function(t, fn){ (docListeners[t] || (docListeners[t] = [])).push(fn); },
  removeEventListener: function(t, fn){
    var a = docListeners[t];
    if (a){ var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }
  },
  dispatchEvent: function(e){
    if (!e || !e.type) return true;
    var a = (docListeners[e.type] || []).slice();
    for (var i = 0; i < a.length; i++) a[i].call(documentShim, e);
    return true;
  },
  getElementById: function(id){ return id === 'app' ? appEl : null; },
  querySelector: function(){ return null; },
  querySelectorAll: function(){ return []; },
  createElement: function(tag){ return makeElement(tag); },
  createTextNode: function(t){ return { nodeType: 3, textContent: String(t) }; }
};
documentShim.body = makeElement('body');
documentShim.documentElement = makeElement('html');

var winListeners = {};
function fireWin(type, ev){
  var a = (winListeners[type] || []).slice();
  for (var i = 0; i < a.length; i++) a[i].call(sandbox, ev);
}
var locationShim = {
  protocol: 'file:',
  host: '',
  hostname: '',
  port: '',
  pathname: '/E:/Aaditya/addy/index.html',
  search: '',
  origin: 'null',
  _hash: '#/',
  get href(){ return 'file:///E:/Aaditya/addy/index.html' + (this._hash || ''); },
  set href(v){ var s = String(v); var i = s.indexOf('#'); setHash(i >= 0 ? s.slice(i) : '#/', true); },
  get hash(){ return this._hash; },
  set hash(v){ setHash(v, true); }
};
function setHash(v, fire){
  var s = !v ? '#/' : (String(v).charAt(0) === '#' ? String(v) : '#' + String(v));
  if (s === locationShim._hash) return;
  locationShim._hash = s;
  if (fire) fireWin('hashchange', makeEvent('hashchange', null));
}

var lsData = new Map();
var localStorageShim = {
  get length(){ return lsData.size; },
  getItem: function(k){ k = String(k); return lsData.has(k) ? lsData.get(k) : null; },
  setItem: function(k, v){ lsData.set(String(k), String(v)); },
  removeItem: function(k){ lsData.delete(String(k)); },
  key: function(i){ var keys = Array.from(lsData.keys()); return (i >= 0 && i < keys.length) ? keys[i] : null; },
  clear: function(){ lsData.clear(); }
};

function EventShim(type, opts){
  this.type = String(type || '');
  this.defaultPrevented = false;
  if (opts) for (var k in opts) this[k] = opts[k];
}
EventShim.prototype.preventDefault = function(){ this.defaultPrevented = true; };
EventShim.prototype.stopPropagation = function(){};
EventShim.prototype.stopImmediatePropagation = function(){};
function CustomEventShim(type, opts){
  EventShim.call(this, type, opts);
  this.detail = (opts && opts.detail !== undefined) ? opts.detail : null;
}
CustomEventShim.prototype = Object.create(EventShim.prototype);
CustomEventShim.prototype.constructor = CustomEventShim;

var sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  queueMicrotask: queueMicrotask,
  document: documentShim,
  location: locationShim,
  localStorage: localStorageShim,
  history: {
    replaceState: function(state, title, url){
      if (url == null) return;
      var s = String(url), i = s.indexOf('#');
      if (i >= 0) locationShim._hash = s.charAt(i) === '#' ? s.slice(i) : '#' + s.slice(i);
    },
    pushState: function(state, title, url){
      if (url == null) return;
      var s = String(url), i = s.indexOf('#');
      if (i >= 0) locationShim._hash = s.charAt(i) === '#' ? s.slice(i) : '#' + s.slice(i);
    }
  },
  navigator: { userAgent: 'node-smoke', language: 'en-IN' },
  Event: EventShim,
  CustomEvent: CustomEventShim,
  requestAnimationFrame: function(cb){ return setTimeout(function(){ cb(Date.now()); }, 0); },
  cancelAnimationFrame: function(id){ clearTimeout(id); },
  getComputedStyle: function(){ return { getPropertyValue: function(){ return ''; } }; },
  scrollTo: function(){},
  scrollX: 0,
  scrollY: 0,
  pageXOffset: 0,
  pageYOffset: 0,
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.addEventListener = function(t, fn){ (winListeners[t] || (winListeners[t] = [])).push(fn); };
sandbox.removeEventListener = function(t, fn){
  var a = winListeners[t];
  if (a){ var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }
};
sandbox.dispatchEvent = function(e){ fireWin(e && e.type, e); return true; };

vm.createContext(sandbox);

/* ---------- load scripts in production order ---------- */
var loadError = null;
for (var i = 0; i < SCRIPT_ORDER.length; i++){
  var f = SCRIPT_ORDER[i];
  var full = path.join(ROOT, f);
  var src;
  try {
    src = fs.readFileSync(full, 'utf8');
    vm.runInContext(src, sandbox, { filename: f });
  } catch (err){
    loadError = f + ' threw at load: ' + (err && err.message);
    break;
  }
}
check('all 8 scripts load without throwing', loadError === null, loadError || '');

var RW = sandbox.window.RW;
check('window.RW exists after load', !!RW, 'RW missing');

/* ---------- index.html structure ---------- */
var indexHtml = '';
try { indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); }
catch (e){ indexHtml = ''; }

(function scriptTagsCheck(){
  var tags = [];
  var re = /<script\s+src="([^"]+)"\s+defer><\/script>/g, m;
  while ((m = re.exec(indexHtml))) tags.push(m[1]);
  var expected = SCRIPT_ORDER.slice();
  var ok = tags.length === expected.length;
  var detail = 'found [' + tags.join(', ') + ']';
  if (ok){
    for (var j = 0; j < expected.length; j++) if (tags[j] !== expected[j]){ ok = false; break; }
  }
  check('index.html script tags: 8 defer tags in order', ok, detail);
  for (var k = 0; k < tags.length; k++){
    var exists = fs.existsSync(path.join(ROOT, tags[k]));
    if (!exists){ check('script file exists: ' + tags[k], false, 'missing'); ok = false; }
  }
})();

/* ---------- PLAN §3 route registrations ---------- */
var PLAN_ROUTES = ['/', '/shop', '/product/:id', '/seller/:id', '/wishlist', '/cart', '/checkout', '/pay/:orderId', '/order/:orderId', '/track', '/sell', '/sell/done/:id', '/manage', '/how-it-works', '/about', '/faq', '/contact', '/policy/:slug'];
(function planRoutesCheck(){
  if (!RW || !RW.router) { check('router present', false, 'RW.router missing'); return; }
  var reg = {};
  var routes = RW.router.routes();
  for (var i = 0; i < routes.length; i++) reg[routes[i].path] = true;
  var missing = PLAN_ROUTES.filter(function(p){ return !reg[p]; });
  check('all PLAN §3 routes registered (' + PLAN_ROUTES.length + ')', missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : '');
})();

function routeMatches(pathStr, routePath){
  var a = pathStr.split('/');
  var b = routePath.split('/');
  if (a.length !== b.length) return false;
  for (var i = 0; i < b.length; i++){
    if (b[i].charAt(0) === ':'){ if (!a[i]) return false; continue; }
    if (a[i] !== b[i]) return false;
  }
  return true;
}
function resolvePath(pathStr){
  if (!RW || !RW.router) return false;
  var routes = RW.router.routes();
  for (var i = 0; i < routes.length; i++) if (routeMatches(pathStr, routes[i].path)) return true;
  return false;
}

/* ---------- render every key route ---------- */
var ROUTE_HASHES = ['#/shop', '#/shop?q=kurti', '#/product/RW-1001', '#/cart', '#/checkout', '#/track', '#/sell', '#/manage', '#/wishlist', '#/faq', '#/how-it-works', '#/about', '#/contact', '#/policy/returns', '#/seller/S-1', '#/nope'];

function renderHash(h){
  try {
    if (sandbox.location.hash === h) RW.router.navigate(h, { replace: true });
    else sandbox.location.hash = h;
    return { ok: true, title: documentShim.title, html: appEl.innerHTML };
  } catch (err){
    return { ok: false, err: (err && err.stack) ? err.stack : String(err) };
  }
}

var rendered = [];
function recordAndCheck(hash, expect404){
  var r = renderHash(hash);
  var label = 'render ' + hash;
  if (!r.ok){ check(label, false, r.err); return; }
  var isError = r.title.indexOf('Error — ReVogue') === 0;
  check(label + ' (no thrown error)', !isError, 'title="' + r.title + '"');
  check(label + ' (html non-empty)', !!(r.html && r.html.length > 0), 'empty html');
  if (expect404){
    check(label + ' renders 404 view', r.title.indexOf('404') >= 0 && r.html.indexOf('404') >= 0, 'title="' + r.title + '"');
  } else {
    check(label + ' is not the 404 view', r.html.indexOf('Page not found') < 0, 'got 404 page');
    check(label + ' has a view title', !!r.title && r.title !== 'ReVogue', 'title="' + r.title + '"');
  }
  rendered.push({ hash: hash, title: r.title, html: r.html });
}

/* initial boot render (home) */
(function bootCheck(){
  var html = appEl.innerHTML;
  check('boot rendered home (#/)', !!(html && html.length > 0), 'app empty at boot');
  check('boot home is not an error view', documentShim.title.indexOf('Error — ReVogue') !== 0, 'title="' + documentShim.title + '"');
  rendered.push({ hash: '#/', title: documentShim.title, html: html });
})();

for (var ri = 0; ri < ROUTE_HASHES.length; ri++) recordAndCheck(ROUTE_HASHES[ri], ROUTE_HASHES[ri] === '#/nope');

/* ---------- data-action coverage: index.html + JS sources + every rendered page ---------- */
(function actionCoverage(){
  var actions = RW && RW.actions ? RW.actions : {};
  var sources = [];
  try { sources.push({ name: 'index.html', text: indexHtml }); } catch(e){}
  for (var i = 0; i < SCRIPT_ORDER.length; i++){
    try { sources.push({ name: SCRIPT_ORDER[i], text: fs.readFileSync(path.join(ROOT, SCRIPT_ORDER[i]), 'utf8') }); } catch(e){}
  }
  for (var j = 0; j < rendered.length; j++) sources.push({ name: 'render ' + rendered[j].hash, text: rendered[j].html });

  var missing = [];
  var seen = {};
  var re = /data-action=(?:"([^"]+)"|'([^']+)')/g;
  for (var s = 0; s < sources.length; s++){
    re.lastIndex = 0;
    var m;
    while ((m = re.exec(sources[s].text))){
      var name = m[1] !== undefined ? m[1] : m[2];
      if (seen[name]) continue;
      seen[name] = true;
      if (typeof actions[name] !== 'function') missing.push(name + ' (in ' + sources[s].name + ')');
    }
  }
  var total = Object.keys(seen).length;
  check('every data-action has an RW.actions handler (' + total + ' names)', missing.length === 0, missing.join('; '));
})();

/* ---------- link resolution: every internal href matches a route ---------- */
(function linkCheck(){
  var sources = [{ name: 'index.html', text: indexHtml }];
  for (var j = 0; j < rendered.length; j++) sources.push({ name: 'render ' + rendered[j].hash, text: rendered[j].html });
  var bad = [];
  var re = /href=(?:"(#[^"]*)"|'(#[^']*)')/g;
  for (var s = 0; s < sources.length; s++){
    re.lastIndex = 0;
    var m;
    while ((m = re.exec(sources[s].text))){
      var href = m[1] !== undefined ? m[1] : m[2];
      if (href === '#' || href.indexOf('#/') !== 0) continue;
      var pathPart = href.slice(1).split('?')[0];
      if (pathPart.length > 1 && pathPart.charAt(pathPart.length - 1) === '/') pathPart = pathPart.slice(0, -1);
      if (!resolvePath(pathPart)) bad.push(href + ' (in ' + sources[s].name + ')');
    }
  }
  check('every internal link resolves to a registered route', bad.length === 0, bad.join('; '));
})();

/* ---------- action wiring smoke: invoke handlers directly, assert state ---------- */
(function actionWiring(){
  var checksRun = 0;
  try {
    var cartBefore = (RW.store.get('rw_cart') || []).length;
    var btn = makeElement('button');
    btn.setAttribute('data-id', 'RW-1001');
    RW.actions['add-to-cart'](btn, makeEvent('click', btn));
    var cartAfter = (RW.store.get('rw_cart') || []).length;
    check('action add-to-cart adds RW-1001 to cart', cartAfter === cartBefore + 1, 'before=' + cartBefore + ' after=' + cartAfter);
    checksRun++;

    var wishBefore = Object.keys(RW.store.get('rw_wishlist') || {}).length;
    var heart = makeElement('button');
    heart.setAttribute('data-id', 'RW-1002');
    RW.actions['toggle-wish'](heart, makeEvent('click', heart));
    var wishAfter = Object.keys(RW.store.get('rw_wishlist') || {});
    check('action toggle-wish saves RW-1002', wishAfter.length === wishBefore + 1 && wishAfter.indexOf('RW-1002') >= 0, 'keys=' + wishAfter.join(','));

    var r2 = renderHash('#/cart');
    check('render #/cart with item (no error)', r2.ok && r2.title.indexOf('Error — ReVogue') !== 0, r2.ok ? 'title="' + r2.title + '"' : String(r2.err));
    var r3 = renderHash('#/checkout');
    check('render #/checkout with item (no error)', r3.ok && r3.title.indexOf('Error — ReVogue') !== 0, r3.ok ? 'title="' + r3.title + '"' : String(r3.err));
    var r4 = renderHash('#/wishlist');
    check('render #/wishlist with item (no error)', r4.ok && r4.title.indexOf('Error — ReVogue') !== 0, r4.ok ? 'title="' + r4.title + '"' : String(r4.err));
  } catch (err){
    check('action wiring smoke', false, (err && err.stack) ? err.stack : String(err));
  }
})();

/* ---------- summary ---------- */
console.log('');
console.log('smoke: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
