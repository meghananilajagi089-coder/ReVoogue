/* validate.js — node data validator. Prints PASS/FAIL per check, exit 1 on any fail. */
'use strict';
global.window = global.window || {};
require('./data.js');

var DATA = global.window.RW_DATA;
var fails = [];
var passes = [];

function check(name, fn){
  try {
    var msg = fn();
    if (msg === true){ passes.push(name); console.log('PASS  ' + name); }
    else { fails.push(name + ': ' + msg); console.log('FAIL  ' + name + ' -> ' + msg); }
  } catch(err){
    fails.push(name + ': threw ' + err.message);
    console.log('FAIL  ' + name + ' -> threw ' + err.message);
  }
}

var REQUIRED = ['id','title','brand','category','sub','size','sizeType','color','colorHex','material','fit','occasion','condition','timesWorn','tagsAttached','mrp','price','discountPct','listingScore','measurements','flaws','reasonForSelling','description','images','sellerId','city','listedAgoHours','status','viewsBase','wishlistBase','keywords'];
var COND_WEAR = { 'Like New': 2, 'Excellent': 3, 'Good': 6 };
var SOLD = { 'RW-1018':1, 'RW-1022':1, 'RW-1033':1, 'RW-1038':1, 'RW-1049':1 };

var products = DATA.products;

check('126 products (56 seed + 70 new), unique ids', function(){
  if (!Array.isArray(products)) return 'products missing';
  if (products.length !== 126) return 'count=' + products.length;
  var seen = {};
  for (var i = 0; i < products.length; i++){
    if (seen[products[i].id]) return 'dup ' + products[i].id;
    seen[products[i].id] = 1;
  }
  return true;
});

check('category split: Women 44, Men 40, Kids 26, Accessories 16 (+20/+20/+20/+10)', function(){
  var want = { Women: 44, Men: 40, Kids: 26, Accessories: 16 };
  var got = {};
  for (var i = 0; i < products.length; i++) got[products[i].category] = (got[products[i].category] || 0) + 1;
  for (var k in want){
    if ((got[k] || 0) !== want[k]) return k + '=' + (got[k] || 0) + ' want ' + want[k];
  }
  return true;
});

check('5 demo Manage listings (RW-19xx): unique, no clash with seeds, seller S13, same rules', function(){
  var mine = DATA.myListings;
  if (!Array.isArray(mine) || mine.length !== 5) return 'count=' + (mine && mine.length);
  var mySellers = DATA.mySellers || [], sIds = {};
  for (var s = 0; s < mySellers.length; s++) sIds[mySellers[s].id] = 1;
  if (!sIds.S13) return 'mySellers missing S13';
  var seedIds = {};
  for (var g = 0; g < products.length; g++) seedIds[products[g].id] = 1;
  var tree = DATA.categoryTree, seen = {};
  for (var i = 0; i < mine.length; i++){
    var p = mine[i];
    if (seen[p.id]) return 'dup ' + p.id;
    seen[p.id] = 1;
    if (seedIds[p.id]) return p.id + ' clashes with a seed product';
    for (var k = 0; k < REQUIRED.length; k++){
      var key = REQUIRED[k];
      if (!(key in p) || p[key] === undefined || p[key] === null) return p.id + ' missing ' + key;
    }
    if (!Array.isArray(p.occasion) || !p.occasion.length) return p.id + ' occasion empty';
    if (!Array.isArray(p.images) || p.images.length !== 3) return p.id + ' images != 3';
    if (!Array.isArray(p.keywords) || !p.keywords.length) return p.id + ' keywords empty';
    if (typeof p.measurements !== 'object' || !Object.keys(p.measurements).length) return p.id + ' measurements empty';
    if (p.price > p.mrp || p.price < 99 || !(p.mrp > 0)) return p.id + ' price band';
    if (p.sellerId !== 'S13') return p.id + ' sellerId=' + p.sellerId;
    if (!tree[p.category] || !tree[p.category].subs[p.sub]) return p.id + ' bad cat/sub';
    if (p.sizeType !== tree[p.category].subs[p.sub].sizeType) return p.id + ' sizeType';
    var w = p.timesWorn, cap = COND_WEAR[p.condition];
    if (cap === undefined || w < 0 || w > 6) return p.id + ' bad condition/worn';
    if (p.condition === 'Good' ? (w < 3 || w > 6) : (w > cap)) return p.id + ' cond vs worn rules';
    if (p.status !== 'available' && p.status !== 'sold') return p.id + ' status=' + p.status;
    if (p.tagsAttached) return p.id + ' tagged (seed tag count must stay 8)';
  }
  return true;
});

check('all §7 fields present on every product', function(){
  for (var i = 0; i < products.length; i++){
    var p = products[i];
    for (var k = 0; k < REQUIRED.length; k++){
      var key = REQUIRED[k];
      if (!(key in p)) return p.id + ' missing ' + key;
      if (p[key] === undefined) return p.id + ' undefined ' + key;
      if (p[key] === null) return p.id + ' null ' + key;
    }
    if (!Array.isArray(p.occasion) || !p.occasion.length) return p.id + ' occasion empty';
    if (!Array.isArray(p.images) || p.images.length !== 3) return p.id + ' images != 3';
    if (!Array.isArray(p.keywords) || !p.keywords.length) return p.id + ' keywords empty';
    if (typeof p.measurements !== 'object' || !Object.keys(p.measurements).length) return p.id + ' measurements empty';
  }
  return true;
});

check('price ≤ mrp and ≥ 99', function(){
  for (var i = 0; i < products.length; i++){
    var p = products[i];
    if (p.price > p.mrp) return p.id + ' price>mrp';
    if (p.price < 99) return p.id + ' price<99';
    if (!(p.mrp > 0)) return p.id + ' bad mrp';
  }
  return true;
});

check('tagged ⇒ worn 0', function(){
  for (var i = 0; i < products.length; i++){
    var p = products[i];
    if (p.tagsAttached && p.timesWorn !== 0) return p.id + ' tagged but worn=' + p.timesWorn;
  }
  return true;
});

check('condition vs wears rules (LN≤2, EX≤3, Good 3-6, max 6)', function(){
  for (var i = 0; i < products.length; i++){
    var p = products[i];
    var w = p.timesWorn;
    if (w < 0 || w > 6) return p.id + ' worn out of 0-6';
    var cap = COND_WEAR[p.condition];
    if (cap === undefined) return p.id + ' bad condition ' + p.condition;
    if (p.condition === 'Good'){
      if (w < 3) return p.id + ' Good with worn=' + w;
    } else if (w > cap){
      return p.id + ' ' + p.condition + ' with worn=' + w;
    }
  }
  return true;
});

check('exact sold list', function(){
  var soldNow = {};
  for (var i = 0; i < products.length; i++){
    if (products[i].status === 'sold') soldNow[products[i].id] = 1;
  }
  var a = Object.keys(soldNow).sort().join(',');
  var b = Object.keys(SOLD).sort().join(',');
  if (a !== b) return 'got [' + a + '] want [' + b + ']';
  return true;
});

check('exactly 8 tagged items', function(){
  var n = 0;
  for (var i = 0; i < products.length; i++) if (products[i].tagsAttached) n++;
  if (n !== 8) return 'count=' + n;
  return true;
});

check('discountPct matches formula and buckets 40+/50+/60%/70+ non-empty', function(){
  var b = { 40:0, 50:0, 60:0, 70:0 };
  for (var i = 0; i < products.length; i++){
    var p = products[i];
    var want = Math.round((p.mrp - p.price) / p.mrp * 100);
    if (p.discountPct !== want) return p.id + ' discountPct ' + p.discountPct + ' != ' + want;
    for (var d = 40; d <= 70; d += 10) if (p.discountPct >= d) b[d]++;
  }
  for (var k = 40; k <= 70; k += 10) if (b[k] === 0) return 'bucket ' + k + '+ empty';
  return true;
});

check('all 4 budget bands non-empty', function(){
  var bands = [
    { name:'under500', lo:0, hi:499 },
    { name:'500-1000', lo:500, hi:1000 },
    { name:'1000-2000', lo:1001, hi:2000 },
    { name:'2000-5000', lo:2001, hi:5000 }
  ];
  var counts = {};
  for (var i = 0; i < products.length; i++){
    var pr = products[i].price;
    for (var b = 0; b < bands.length; b++){
      if (pr >= bands[b].lo && pr <= bands[b].hi){
        counts[bands[b].name] = (counts[bands[b].name] || 0) + 1;
        break;
      }
    }
  }
  for (var k = 0; k < bands.length; k++){
    if (!counts[bands[k].name]) return bands[k].name + ' empty';
  }
  return true;
});

check('every sellerId valid and sub valid in category tree', function(){
  var sellerIds = {};
  for (var s = 0; s < DATA.sellers.length; s++) sellerIds[DATA.sellers[s].id] = 1;
  var tree = DATA.categoryTree;
  for (var i = 0; i < products.length; i++){
    var p = products[i];
    if (!sellerIds[p.sellerId]) return p.id + ' bad seller ' + p.sellerId;
    if (!tree[p.category] || !tree[p.category].subs[p.sub]) return p.id + ' bad cat/sub ' + p.category + '>' + p.sub;
    var st = tree[p.category].subs[p.sub].sizeType;
    if (p.sizeType !== st) return p.id + ' sizeType ' + p.sizeType + ' != tree ' + st;
  }
  return true;
});

check('60-80% of products have listingScore ≥ 80 (~70% goal)', function(){
  var n = 0;
  for (var i = 0; i < products.length; i++) if (products[i].listingScore >= 80) n++;
  var pct = n / products.length * 100;
  if (pct < 60 || pct > 80) return 'pct=' + pct.toFixed(1) + ' (' + n + '/' + products.length + ')';
  return true;
});

check('listingScore recomputes per §6.10', function(){
  for (var i = 0; i < products.length; i++){
    var p = products[i];
    var photoPts = (p.images && p.images.length === 3) ? 30 : (p.images && p.images.length === 2) ? 20 : 10;
    var measPts = Object.keys(p.measurements || {}).length >= 2 ? 25 : 0;
    var flawsPts = p.flaws ? 15 : 0;
    var descPts = String(p.description || '').length >= 80 ? 15 : 0;
    var washedPts = p.washed ? 15 : 0;
    var want = photoPts + measPts + flawsPts + descPts + washedPts;
    if (p.listingScore !== want) return p.id + ' score ' + p.listingScore + ' != ' + want;
  }
  return true;
});

check('seeded orders: 6 with pinned status/timeline', function(){
  var orders = DATA.orders;
  if (!orders || orders.length !== 6) return 'count=' + (orders ? orders.length : 0);
  var want = { PLACED:1, CONFIRMED:1, SHIPPED:1, OUT_FOR_DELIVERY:1, DELIVERED:1, CANCELLED:1 };
  for (var i = 0; i < orders.length; i++){
    var o = orders[i];
    if (!o.pinnedStatus || !o.pinnedTimeline || !o.pinnedTimeline.length) return o.orderId + ' missing pins';
    if (!want[o.pinnedStatus]) return o.orderId + ' bad status ' + o.pinnedStatus;
    delete want[o.pinnedStatus];
  }
  var left = Object.keys(want);
  if (left.length) return 'missing statuses: ' + left.join(',');
  return true;
});

check('6 testimonials, 15 FAQs, 10 pincode prefixes, 12 sellers', function(){
  if ((DATA.testimonials || []).length !== 6) return 'testimonials';
  if ((DATA.faqs || []).length !== 15) return 'faqs=' + (DATA.faqs || []).length;
  if (Object.keys(DATA.pincodes || {}).length !== 10) return 'pincodes';
  if ((DATA.sellers || []).length !== 12) return 'sellers';
  return true;
});

check('images are self-contained SVG data URIs (no photo files remain)', function(){
  var fs = require('fs');
  var path = require('path');
  var root = __dirname;
  var strays = fs.readdirSync(root).filter(function(f){ return /^photo-.*\.(jpe?g|png|webp)$/i.test(f); });
  if (strays.length) return 'stray photo files: ' + strays.slice(0, 5).join(', ');
  var eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
  if (eng.indexOf('data:image/svg+xml') < 0) return 'engine.js does not emit data:image/svg+xml';
  if (/photo-[^'"]*\.jpg|imgFail/.test(eng)) return 'engine.js still references photo jpg files or imgFail';
  if (eng.indexOf('function svgFor') < 0 || eng.indexOf('var GARMENTS') < 0) return 'svg illustration generator missing';
  var shop = fs.readFileSync(path.join(root, 'views-shop.js'), 'utf8');
  if (/photo-cat|\.jpg/.test(shop)) return 'views-shop.js still references jpg photos';
  return true;
});

console.log('');
console.log(passes.length + ' passed, ' + fails.length + ' failed');
if (fails.length){
  console.log('ALL PASS: NO');
  process.exit(1);
} else {
  console.log('ALL PASS: YES');
  process.exit(0);
}
