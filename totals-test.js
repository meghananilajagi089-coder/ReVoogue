/* totals-test.js — assertions for RW.store.computeTotals (PLAN §6.5 / §11)
   Run: node totals-test.js  (from the project root) */
'use strict';

/* --- minimal browser stubs so core.js loads in node --- */
function memStorage(){
  var d = {};
  return {
    getItem: function(k){ return (k in d) ? d[k] : null; },
    setItem: function(k, v){ d[k] = String(v); },
    removeItem: function(k){ delete d[k]; },
    key: function(i){ return Object.keys(d)[i] || null; },
    get length(){ return Object.keys(d).length; }
  };
}
global.window = {
  addEventListener: function(){},
  location: { hash: '', href: 'file:///index.html', protocol: 'file:' },
  pageYOffset: 0,
  scrollTo: function(){}
};
global.document = {
  addEventListener: function(){},
  getElementById: function(){ return null; },
  querySelector: function(){ return null; },
  querySelectorAll: function(){ return []; },
  createElement: function(){ return { style: {}, appendChild: function(){}, addEventListener: function(){} }; },
  title: ''
};
global.localStorage = memStorage();
global.location = global.window.location;
global.history = { replaceState: function(){}, pushState: function(){} };
global.CustomEvent = function(){};
global.Event = function(){};

require('./data.js');
require('./core.js');

var RW = global.window.RW;
var DATA = global.window.RW_DATA;
var seeds = DATA.orders || [];
var passed = 0, failed = 0;
function t(name, cond, extra){
  if (cond){ passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (extra !== undefined ? '  [' + extra + ']' : '')); }
}
function item(price, mrp){ return { id: 'RW-X', price: price, mrp: mrp != null ? mrp : price }; }
function reset(){
  RW.store.set('rw_orders', seeds.slice());
  RW.store.set('rw_coupon', null);
}

/* ---- 1. free-delivery boundary uses subtotal BEFORE coupon ---- */
reset();
var a = RW.store.computeTotals([item(998)], { coupon: null });
t('₹998 subtotal charges ₹49 delivery', a.delivery === 49 && a.total === 998 + 49 + 5, a.total);
var b = RW.store.computeTotals([item(1000)], { coupon: null });
t('₹1,000 subtotal is free delivery', b.delivery === 0 && b.total === 1005, b.total);

/* ---- 2. REVOGUE10: 10% capped at ₹150, min ₹799 ---- */
reset();
var c = RW.store.computeTotals([item(2000)], { coupon: 'REVOGUE10' });
t('REVOGUE10 caps at ₹150 on ₹2,000', c.couponDiscount === 150 && c.couponCode === 'REVOGUE10', c.couponDiscount);
var d = RW.store.computeTotals([item(800)], { coupon: 'REVOGUE10' });
t('REVOGUE10 = ₹80 on ₹800 (10%)', d.couponDiscount === 80, d.couponDiscount);
var e = RW.store.computeTotals([item(700)], { coupon: 'REVOGUE10' });
t('REVOGUE10 rejected below ₹799 with reason', e.couponDiscount === 0 && !!e.couponNote && /799/.test(e.couponNote), e.couponNote);
var e2 = RW.store.computeTotals([item(700)], { coupon: 'REVOGUE10' });
t('coupon min uses PRE-coupon subtotal (700 < 799 even after no discount)', e2.couponNote.indexOf('Add') === 0, e2.couponNote);

/* ---- 3. FIRST100: ignores seeded orders, needs a real first order ---- */
reset();
var f = RW.store.computeTotals([item(750)], { coupon: 'FIRST100' });
t('FIRST100 applies with only seeded orders present (₹100 off)', f.couponDiscount === 100 && f.couponCode === 'FIRST100', JSON.stringify([f.couponDiscount, f.couponNote]));
var orders = seeds.slice();
orders.push({ orderId: 'ORD-9001', seeded: false, status: 'PLACED', items: [], buyer: {}, payment: {}, totals: {}, createdAt: Date.now() });
RW.store.set('rw_orders', orders);
var g = RW.store.computeTotals([item(750)], { coupon: 'FIRST100' });
t('FIRST100 rejected once a real order exists', g.couponDiscount === 0 && /first order/.test(g.couponNote || ''), g.couponNote);
orders[orders.length - 1].status = 'CANCELLED';
var g2 = RW.store.computeTotals([item(750)], { coupon: 'FIRST100' });
t('FIRST100 returns after a CANCELLED order', g2.couponDiscount === 100, g2.couponNote);
orders[orders.length - 1].status = 'PAYMENT_FAILED';
var g3 = RW.store.computeTotals([item(750)], { coupon: 'FIRST100' });
t('FIRST100 returns after a PAYMENT_FAILED order', g3.couponDiscount === 100, g3.couponNote);

/* ---- 4. FREESHIP rules ---- */
reset();
var h = RW.store.computeTotals([item(500)], { coupon: 'FREESHIP' });
t('FREESHIP frees ₹49 delivery below ₹999', h.delivery === 0 && h.couponCode === 'FREESHIP' && h.total === 505, JSON.stringify([h.delivery, h.total]));
var i2 = RW.store.computeTotals([item(1500)], { coupon: 'FREESHIP' });
t('FREESHIP at ₹999+ says "Free delivery already applies"', i2.delivery === 0 && /Free delivery already applies/.test(i2.couponNote || '') && i2.couponCode === null, i2.couponNote);

/* ---- 5. multi-seller cart: ONE delivery + ONE platform fee ---- */
reset();
var j = RW.store.computeTotals([item(300), item(250), item(200)], { coupon: null });
t('multi-seller: one ₹49 delivery + one ₹5 fee', j.delivery === 49 && j.platformFee === 5 && j.total === 750 + 49 + 5, JSON.stringify([j.delivery, j.platformFee, j.total]));
var j2 = RW.store.computeTotals([item(400), item(450), item(200)], { coupon: null });
t('multi-seller above ₹999 still has a single platform fee', j2.delivery === 0 && j2.platformFee === 5 && j2.total === 1050 + 5, j2.total);

/* ---- 6. COD fee: added once, only at checkout ---- */
reset();
var k = RW.store.computeTotals([item(500)], { coupon: null, cod: true });
t('COD adds exactly ₹25', k.codFee === 25 && k.total === 500 + 49 + 5 + 25, k.total);
var k2 = RW.store.computeTotals([item(500)], { coupon: null, cod: false });
t('UPI/COD-less total has no COD fee', k2.codFee === 0 && k2.total === 554, k2.total);

/* ---- 7. full order math: total = subtotal - coupon + delivery + fee (+ COD) ---- */
reset();
var l = RW.store.computeTotals([item(1200, 3000), item(599, 1499)], { coupon: 'REVOGUE10', cod: true });
var expect = 1799 - 150 + 0 + 5 + 25;
t('order formula: 1799 - 150 + 0 + 5 + 25', l.total === expect && l.subtotal === 1799, JSON.stringify([l.total, expect]));
t('You will save = MRP savings + coupon (2700 + 150)', l.youSave === 2700 + 150, l.youSave);

/* ---- 8. unknown coupon keeps totals honest ---- */
reset();
var m = RW.store.computeTotals([item(999)], { coupon: 'NOPE123' });
t('unknown coupon → no discount, reason shown', m.couponDiscount === 0 && !!m.couponNote && m.total === 999 + 0 + 5, m.total);

/* ---- 9. empty cart ---- */
reset();
var n = RW.store.computeTotals([], { coupon: 'REVOGUE10' });
t('empty cart totals all zero', n.subtotal === 0 && n.delivery === 0 && n.platformFee === 0 && n.total === 0, n.total);

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed) process.exitCode = 1;
