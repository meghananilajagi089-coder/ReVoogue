/* views-shop.js — exports: RW.viewsShop (Home, Shop), RW.ui.card (shared product card) */
(function(){
'use strict';
var RW = window.RW = window.RW || {};
var esc = RW.util.esc;
var fmt = RW.util.fmtINR;
var rel = RW.util.relTime;
var E = function(){ return RW.engine; };
RW.viewsShop = RW.viewsShop || {};

/* ---------- shared product card ---------- */
function isWished(id){
  var w = RW.store.get('rw_wishlist') || {};
  return !!w[id];
}
function inCart(id){
  var c = RW.store.get('rw_cart') || [];
  for (var i = 0; i < c.length; i++) if (c[i].id === id) return true;
  return false;
}
function card(p, opts){
  opts = opts || {};
  var listMode = opts.list;
  var wished = isWished(p.id);
  var sold = p.status === 'sold';
  var justListed = (p.listedAgoHours || 0) < 72;
  var condCls = p.condition === 'Like New' ? 'LN' : p.condition === 'Excellent' ? 'EX' : 'GD';
  var html = '<article class="p-card' + (listMode ? ' p-card-list' : '') + (sold ? ' is-sold' : '') + '">';
  html += '<div class="p-card-media">';
  if (sold) html += '<div class="sold-overlay">SOLD</div>';
  html += '<a href="#/product/' + esc(p.id) + '" tabindex="-1" aria-hidden="true">' + RW.ui.img(p, 0, 'card') + '</a>';
  html += '<button type="button" class="p-card-heart' + (wished ? ' is-on' : '') + '" data-action="toggle-wish" data-id="' + esc(p.id) + '" aria-pressed="' + (wished ? 'true' : 'false') + '" aria-label="' + (wished ? 'Remove from wishlist' : 'Add to wishlist') + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="' + (wished ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-4.5-9.5-8.5C.5 9 2.5 5 6.5 5c2 0 3.5 1.2 5.5 3.2C14 6.2 15.5 5 17.5 5c4 0 6 4 4 7.5C19 16.5 12 21 12 21z"/></svg></button>';
  html += '<div class="p-card-badges">';
  if (p.discountPct >= 40) html += '<span class="badge badge-discount">' + p.discountPct + '% off</span>';
  if (justListed && !sold) html += '<span class="badge badge-just">Just listed</span>';
  html += '</div></div>';
  html += '<div class="p-card-body">';
  html += '<span class="p-card-brand">' + esc(p.brand) + '</span>';
  html += '<h3 class="p-card-title"><a href="#/product/' + esc(p.id) + '">' + esc(p.title) + '</a></h3>';
  html += '<div class="p-card-meta"><span class="cond-chip cond-' + condCls + '">' + esc(p.condition) + '</span>';
  html += '<span>' + (p.timesWorn === 0 ? 'Never worn' : 'Worn ' + p.timesWorn + '×') + '</span>';
  if (p.tagsAttached) html += '<span class="badge badge-soft">Tags attached</span>';
  html += '<span>' + esc(RW.ui.sizeLabel(p)) + '</span></div>';
  html += '<div class="p-card-price"><span class="price-now">' + fmt(p.price) + '</span>';
  if (p.mrp > p.price) html += '<span class="price-mrp">' + fmt(p.mrp) + '</span><span class="price-off">' + p.discountPct + '% off</span>';
  html += '</div>';
  if (p.price >= 999) html += '<span class="p-card-del">Free delivery</span>';
  html += '<span class="p-card-avail">Only 1 available</span>';
  if (opts.meta) html += '<span class="p-card-avail muted">' + esc(opts.meta) + '</span>';
  html += '</div></article>';
  return html;
}
RW.ui.card = card;
RW.ui.inCart = inCart;

/* ---------- shop param helpers ---------- */
function qList(q, key){
  if (!q[key]) return [];
  return String(q[key]).split(',').filter(Boolean);
}
function withParam(q, key, vals){
  var nq = {};
  for (var k in q) if (Object.prototype.hasOwnProperty.call(q, k)) nq[k] = q[k];
  var s = vals.filter(Boolean).join(',');
  if (s) nq[key] = s; else delete nq[key];
  delete nq.page;
  return nq;
}
function shopHref(q){
  var qs = E().buildQuery(q);
  return '#/shop' + (qs ? '?' + qs : '');
}
function setShopParam(q, key, vals, push){
  RW.router.navigate(shopHref(withParam(q, key, vals)), { replace: !push });
}
function toggleMulti(q, key, val){
  var cur = qList(q, key);
  var i = cur.indexOf(val);
  if (i >= 0) cur.splice(i, 1); else cur.push(val);
  setShopParam(q, key, cur, false);
}

/* ---------- filter groups ---------- */
function group(id, title, bodyHtml, open){
  return '<details class="f-group"' + (open ? ' open' : '') + ' data-group="' + esc(id) + '">' +
    '<summary>' + esc(title) + '</summary><div class="f-group-body">' + bodyHtml + '</div></details>';
}
function chipRow(q, key, options, labelFn, open){
  var cur = qList(q, key);
  var html = '<div class="f-chips">';
  for (var i = 0; i < options.length; i++){
    var o = options[i];
    if (o.count === 0 && cur.indexOf(o.val) < 0) continue;
    var on = cur.indexOf(o.val) >= 0;
    html += '<button type="button" class="chip' + (on ? ' is-active' : '') + '" data-action="shop-toggle" data-key="' + esc(key) + '" data-val="' + esc(o.val) + '" aria-pressed="' + on + '">' +
      esc(labelFn ? labelFn(o) : o.val) + ' <span class="f-count">' + o.count + '</span></button>';
  }
  html += '</div>';
  return group(key, titleOf(key), html, open);
}
var TITLES = {
  cat: 'Category', sub: 'Sub-category', coll: 'Collection', price: 'Price', size: 'Size',
  cond: 'Condition', worn: 'Times worn', tagged: 'Tags attached', disc: 'Discount',
  brand: 'Brand', color: 'Colour', occ: 'Occasion', mat: 'Material', rating: 'Seller rating',
  city: 'Seller city', listed: 'Listed within', sold: 'Availability'
};
function titleOf(k){ return TITLES[k] || k; }

function facetOpts(facets, key){
  var src = facets[key] || {};
  var out = [];
  for (var v in src) out.push({ val: v, count: src[v] });
  out.sort(function(a, b){ return b.count - a.count || (a.val < b.val ? -1 : 1); });
  return out;
}

function sizeOptions(q, facets){
  /* derived from cat/sub selection; no cat -> letters/Free/age only */
  var cat = qList(q, 'cat')[0];
  var sub = qList(q, 'sub')[0];
  var base = E().allProducts();
  var catSubs = facets._catSubs || {};
  var tree = facets._tree || {};
  var sizeTypes = {};
  if (cat){
    var subs = catSubs[cat] || {};
    for (var s in subs){
      if (sub && s !== sub) continue;
      var st = tree[cat] && tree[cat].subs[s] && tree[cat].subs[s].sizeType;
      if (st) sizeTypes[st] = 1;
    }
  }
  var allowLetters = !cat || !!sizeTypes.letter;
  var allowFree = !cat || !!sizeTypes.free;
  var allowAge = !cat || !!sizeTypes.age;
  var numeric = !!sizeTypes.waist || !!sizeTypes.chest || !!sizeTypes.collar;
  var counts = {};
  for (var i = 0; i < base.length; i++){
    var p = base[i];
    if (cat && p.category !== cat) continue;
    if (sub && p.sub !== sub) continue;
    var st2 = p.sizeType;
    var keep = (st2 === 'letter' && allowLetters) || (st2 === 'free' && allowFree) || (st2 === 'age' && allowAge) || numeric;
    if (!keep) continue;
    counts[String(p.size) + '|' + st2] = (counts[String(p.size) + '|' + st2] || 0) + 1;
  }
  var opts = [];
  var seen = {};
  for (var key in counts){
    var parts = key.split('|');
    var val = parts[0], st3 = parts[1];
    if (seen[val]) continue;
    seen[val] = 1;
    opts.push({ val: val, count: counts[key], sizeType: st3 });
  }
  opts.sort(function(a, b){
    var na = parseInt(a.val, 10), nb = parseInt(b.val, 10);
    if (isFinite(na) && isFinite(nb)) return na - nb;
    return a.val < b.val ? -1 : 1;
  });
  return opts;
}
function sizeLabelOpt(o){
  var st = o.sizeType;
  if (st === 'waist') return 'Waist ' + o.val;
  if (st === 'chest') return 'Chest ' + o.val;
  if (st === 'collar') return 'Collar ' + o.val;
  return o.val;
}

function brandGroup(q, facets){
  var cur = qList(q, 'brand');
  var opts = facetOpts(facets, 'brand');
  var html = '<div class="f-brand-search"><label class="sr-only" for="brand-filter-q">Search brands</label>' +
    '<input type="search" id="brand-filter-q" placeholder="Search brands" data-action="noop-key" autocomplete="off"></div>';
  html += '<div class="f-chips f-brand-list">';
  for (var i = 0; i < opts.length; i++){
    var o = opts[i];
    if (o.count === 0 && cur.indexOf(o.val) < 0) continue;
    var on = cur.indexOf(o.val) >= 0;
    html += '<button type="button" class="chip' + (on ? ' is-active' : '') + '" data-action="shop-toggle" data-key="brand" data-val="' + esc(o.val) + '" data-brand="' + esc(o.val.toLowerCase()) + '" aria-pressed="' + on + '">' +
      esc(o.val) + ' <span class="f-count">' + o.count + '</span></button>';
  }
  html += '</div>';
  return group('brand', 'Brand', html, false);
}

function colorGroup(q, facets){
  var cur = qList(q, 'color');
  var opts = facetOpts(facets, 'color');
  var html = '<div class="f-swatches">';
  for (var i = 0; i < opts.length; i++){
    var o = opts[i];
    var p0 = null;
    var all = E().allProducts();
    for (var j = 0; j < all.length; j++) if (all[j].color === o.val){ p0 = all[j]; break; }
    var hex = p0 ? p0.colorHex : '#888';
    var on = cur.indexOf(o.val) >= 0;
    html += '<button type="button" class="f-swatch' + (on ? ' is-active' : '') + '" data-action="shop-toggle" data-key="color" data-val="' + esc(o.val) + '" aria-pressed="' + on + '" title="' + esc(o.val) + ' (' + o.count + ')">' +
      '<span class="swatch-dot" style="background:' + esc(hex) + '"></span><span class="sr-only">' + esc(o.val) + '</span>' +
      '<span class="swatch-count">' + o.count + '</span></button>';
  }
  html += '</div>';
  return group('color', 'Colour', html, false);
}

function priceGroup(q, facets, bounds){
  var pp = q.price ? String(q.price).split('-') : [];
  var lo = pp[0] ? parseInt(pp[0], 10) : bounds.min;
  var hi = (pp[1] && pp[1] !== '*') ? parseInt(pp[1], 10) : bounds.max;
  if (!isFinite(lo)) lo = bounds.min;
  if (!isFinite(hi)) hi = bounds.max;
  var html = '<div class="f-price">';
  html += '<div class="f-price-sliders">' +
    '<label class="sr-only" for="price-lo">Minimum price</label><input type="range" id="price-lo" min="' + bounds.min + '" max="' + bounds.max + '" step="50" value="' + lo + '" data-action="shop-price-range">' +
    '<label class="sr-only" for="price-hi">Maximum price</label><input type="range" id="price-hi" min="' + bounds.min + '" max="' + bounds.max + '" step="50" value="' + hi + '" data-action="shop-price-range">' +
    '</div>';
  html += '<div class="f-price-inputs">' +
    '<label class="sr-only" for="price-min">Min ₹</label><input type="number" id="price-min" class="f-price-min" min="' + bounds.min + '" max="' + bounds.max + '" value="' + lo + '">' +
    '<span aria-hidden="true">–</span>' +
    '<label class="sr-only" for="price-max">Max ₹</label><input type="number" id="price-max" class="f-price-max" min="' + bounds.min + '" max="' + bounds.max + '" value="' + hi + '">' +
    '<button type="button" class="btn btn-sm btn-secondary" data-action="shop-price-apply">Apply</button></div>';
  html += '<div class="f-price-bands">';
  var bands = [['0-499', 'Under ₹500'], ['500-1000', '₹500–1,000'], ['1000-2000', '₹1,000–2,000'], ['2000-5000', '₹2,000–5,000']];
  for (var i = 0; i < bands.length; i++){
    var on = q.price === bands[i][0];
    html += '<button type="button" class="chip' + (on ? ' is-active' : '') + '" data-action="shop-band" data-val="' + bands[i][0] + '">' + bands[i][1] + '</button>';
  }
  html += '</div></div>';
  return group('price', 'Price', html, true);
}

function activeChips(q){
  var chips = [];
  function add(key, val, label){
    chips.push('<button type="button" class="chip chip-removable is-active" data-action="shop-remove" data-key="' + esc(key) + '" data-val="' + esc(val) + '">' +
      esc(label || val) + ' <span aria-hidden="true">×</span><span class="sr-only">Remove filter</span></button>');
  }
  if (q.q) add('q', q.q, '“' + q.q + '”');
  var labels = { cond: titleOf, worn: function(v){ return v === 'never' ? 'Never worn' : v === 'once' ? 'Once' : v; }, disc: function(v){ return v + '+% off'; }, rating: function(v){ return v + '+ stars'; }, listed: function(v){ return 'Within ' + v; } };
  var multiKeys = ['cat', 'sub', 'coll', 'size', 'cond', 'worn', 'disc', 'brand', 'color', 'occ', 'mat', 'rating', 'city', 'listed'];
  for (var i = 0; i < multiKeys.length; i++){
    var k = multiKeys[i];
    var vals = qList(q, k);
    for (var j = 0; j < vals.length; j++){
      var lab = null;
      if (labels[k]) lab = labels[k](vals[j]);
      if (k === 'cat' || k === 'sub') lab = vals[j];
      add(k, vals[j], lab);
    }
  }
  if (q.tagged === '1') chips.push('<button type="button" class="chip chip-removable is-active" data-action="shop-remove" data-key="tagged" data-val="1">Tags attached <span aria-hidden="true">×</span></button>');
  if (q.price) chips.push('<button type="button" class="chip chip-removable is-active" data-action="shop-remove" data-key="price" data-val="' + esc(q.price) + '">Price ' + esc(q.price.replace('-', '–')) + ' <span aria-hidden="true">×</span></button>');
  if (!chips.length) return '';
  return '<div class="active-chips">' + chips.join('') +
    ' <button type="button" class="link-btn" data-action="shop-clear">Clear all</button></div>';
}

function priceBounds(){
  var base = E().allProducts();
  var lo = Infinity, hi = 0;
  for (var i = 0; i < base.length; i++){
    if (base[i].price < lo) lo = base[i].price;
    if (base[i].price > hi) hi = base[i].price;
  }
  if (!isFinite(lo)) lo = 0;
  return { min: Math.floor(lo / 50) * 50, max: Math.ceil(hi / 50) * 50 };
}

/* ---------- Shop view ---------- */
var SORT_LABELS = [
  ['relevance', 'Relevance'], ['newest', 'Newest'], ['price_low', 'Price: low to high'],
  ['price_high', 'Price: high to low'], ['discount', 'Biggest discount'],
  ['popularity', 'Popularity'], ['least_worn', 'Least worn']
];

function sidebar(q, res){
  var f = res.facets;
  var bounds = priceBounds();
  var html = '';
  html += priceGroup(q, f, bounds);
  html += chipRow(q, 'cat', facetOpts(f, 'cat'), null, true);
  html += chipRow(q, 'sub', facetOpts(f, 'sub'), null, !!qList(q, 'cat').length);
  html += chipRow(q, 'coll', facetOpts(f, 'coll'), null, false);
  html += (function(){
    var opts = sizeOptions(q, f);
    var cur = qList(q, 'size');
    var inner = '<div class="f-chips">';
    for (var i = 0; i < opts.length; i++){
      var o = opts[i];
      var on = cur.indexOf(o.val) >= 0;
      inner += '<button type="button" class="chip' + (on ? ' is-active' : '') + '" data-action="shop-toggle" data-key="size" data-val="' + esc(o.val) + '" aria-pressed="' + on + '">' + esc(sizeLabelOpt(o)) + ' <span class="f-count">' + o.count + '</span></button>';
    }
    inner += '</div>';
    return group('size', 'Size', inner, false);
  })();
  html += chipRow(q, 'cond', facetOpts(f, 'cond'), function(o){ return o.val === 'like-new' ? 'Like New' : o.val === 'excellent' ? 'Excellent' : 'Good'; }, false);
  html += chipRow(q, 'worn', facetOpts(f, 'worn'), function(o){ return o.val === 'never' ? 'Never worn' : o.val === 'once' ? 'Once' : o.val; }, false);
  html += (function(){
    var on = q.tagged === '1';
    var html2 = '<div class="f-chips"><button type="button" class="chip' + (on ? ' is-active' : '') + '" data-action="shop-toggle" data-key="tagged" data-val="1" aria-pressed="' + on + '">Tags attached <span class="f-count">' + (f.tagged || 0) + '</span></button></div>';
    return group('tagged', 'Tags attached', html2, false);
  })();
  html += chipRow(q, 'disc', facetOpts(f, 'disc'), function(o){ return o.val + '+ %'; }, false);
  html += brandGroup(q, f);
  html += colorGroup(q, f);
  html += chipRow(q, 'occ', facetOpts(f, 'occ'), null, false);
  html += chipRow(q, 'mat', facetOpts(f, 'mat'), null, false);
  html += chipRow(q, 'rating', facetOpts(f, 'rating'), function(o){ return o.val + '+ stars'; }, false);
  html += chipRow(q, 'city', facetOpts(f, 'city'), null, false);
  html += chipRow(q, 'listed', facetOpts(f, 'listed'), function(o){ return 'Within ' + o.val; }, false);
  html += (function(){
    var html3 = '<div class="f-chips"><button type="button" class="chip' + (q.hideSold !== '0' ? ' is-active' : '') + '" data-action="shop-hide-sold" aria-pressed="' + (q.hideSold !== '0') + '">Hide sold items</button></div>';
    return group('sold', 'Availability', html3, false);
  })();
  return html;
}

function pagination(res, q){
  if (res.pages <= 1) return '';
  var html = '<nav class="pagination" aria-label="Pagination">';
  function pg(n, label, cur, dis){
    if (dis) return '<span class="page-btn is-disabled" aria-disabled="true">' + label + '</span>';
    var nq = {};
    for (var k in q) nq[k] = q[k];
    nq.page = n;
    return '<a class="page-btn' + (cur ? ' is-current' : '') + '" href="' + esc(shopHref(nq)) + '"' + (cur ? ' aria-current="page"' : '') + '>' + label + '</a>';
  }
  html += pg(Math.max(1, res.page - 1), 'Prev', false, res.page <= 1);
  var start = Math.max(1, res.page - 2), end = Math.min(res.pages, start + 4);
  start = Math.max(1, end - 4);
  if (start > 1) html += pg(1, '1', res.page === 1, false);
  if (start > 2) html += '<span class="page-ellipsis">…</span>';
  for (var i = start; i <= end; i++) html += pg(i, String(i), res.page === i, false);
  if (end < res.pages - 1) html += '<span class="page-ellipsis">…</span>';
  if (end < res.pages) html += pg(res.pages, String(res.pages), res.page === res.pages, false);
  html += pg(Math.min(res.pages, res.page + 1), 'Next', false, res.page >= res.pages);
  html += '</nav>';
  return html;
}

function sortBar(q, res){
  var html = '<div class="sort-bar">';
  html += '<button type="button" class="btn btn-ghost btn-sm shop-filter-open" data-action="shop-open-filters">Filters</button>';
  html += '<label class="sort-label" for="sort-select">Sort</label>';
  html += '<select id="sort-select" data-action="shop-sort">';
  for (var i = 0; i < SORT_LABELS.length; i++){
    html += '<option value="' + SORT_LABELS[i][0] + '"' + (q.sort === SORT_LABELS[i][0] ? ' selected' : '') + '>' + SORT_LABELS[i][1] + '</option>';
  }
  html += '</select>';
  html += '<label class="per-label" for="per-select">Per page</label>';
  html += '<select id="per-select" data-action="shop-per">';
  var perOpts = [12, 24, 48];
  for (var j = 0; j < perOpts.length; j++){
    html += '<option value="' + perOpts[j] + '"' + (res.per === perOpts[j] ? ' selected' : '') + '>' + perOpts[j] + '</option>';
  }
  html += '</select>';
  html += '<div class="view-toggle" role="group" aria-label="View mode">';
  html += '<button type="button" class="chip' + (q.view !== 'list' ? ' is-active' : '') + '" data-action="shop-view" data-val="grid" aria-pressed="' + (q.view !== 'list') + '">Grid</button>';
  html += '<button type="button" class="chip' + (q.view === 'list' ? ' is-active' : '') + '" data-action="shop-view" data-val="list" aria-pressed="' + (q.view === 'list') + '">List</button>';
  html += '</div>';
  html += '</div>';
  return html;
}

function emptyState(q){
  var suggestions = [];
  if (qList(q, 'brand').length) suggestions.push(['brand', 'brand filter']);
  if (qList(q, 'color').length) suggestions.push(['color', 'colour filter']);
  if (q.price) suggestions.push(['price', 'price range']);
  if (q.q) suggestions.push(['q', 'search']);
  if (q.tagged === '1') suggestions.push(['tagged', 'tags filter']);
  if (qList(q, 'size').length) suggestions.push(['size', 'size filter']);
  if (qList(q, 'cond').length) suggestions.push(['cond', 'condition filter']);
  var html = '<div class="empty-state"><h2>No items match those filters</h2>';
  html += '<p class="muted">Try removing a filter or two:</p><div class="active-chips">';
  for (var i = 0; i < suggestions.length; i++){
    html += '<button type="button" class="chip chip-removable is-active" data-action="shop-remove" data-key="' + esc(suggestions[i][0]) + '" data-val="">Remove ' + esc(suggestions[i][1]) + ' <span aria-hidden="true">×</span></button>';
  }
  html += '</div>';
  html += '<p><button type="button" class="btn btn-secondary" data-action="shop-clear">Clear all filters</button></p>';
  html += '<h3>You might also like</h3><div class="product-grid">';
  var popular = E().allProducts().filter(function(p){ return p.status !== 'sold'; })
    .sort(function(a, b){ return (b.wishlistBase || 0) - (a.wishlistBase || 0); }).slice(0, 4);
  for (var j = 0; j < popular.length; j++) html += card(popular[j]);
  html += '</div></div>';
  return html;
}

function shop(query){
  var res = E().run(query || {});
  var q = res.q;
  var title = q.q ? 'Results for “' + q.q + '”' : (qList(q, 'cat').length === 1 ? qList(q, 'cat')[0] : 'Shop');
  var html = '<div class="view shop-view">';
  html += '<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>' + esc(title) + '</span></nav>';
  html += '<div class="shop-head"><h1 tabindex="-1">' + esc(title) + '</h1>';
  html += '<p class="result-count" aria-live="polite">' + res.total + ' item' + (res.total === 1 ? '' : 's') + '</p></div>';
  html += activeChips(q);
  html += sortBar(q, res);
  html += '<div class="shop-layout">';
  html += '<aside class="filter-sidebar" aria-label="Filters">' + sidebar(q, res) + '</aside>';
  html += '<div class="shop-results">';
  if (!res.items.length){
    html += emptyState(q);
  } else {
    html += '<div class="product-grid' + (q.view === 'list' ? ' is-list' : '') + '">';
    for (var i = 0; i < res.items.length; i++) html += card(res.items[i], { list: q.view === 'list' });
    html += '</div>';
    html += pagination(res, q);
  }
  html += '</div></div>';
  /* mobile filter sheet */
  html += '<div class="filter-sheet" id="filter-sheet" aria-hidden="true">';
  html += '<div class="filter-sheet-head"><h2>Filters</h2><button type="button" class="icon-btn" data-action="shop-close-filters" aria-label="Close filters">×</button></div>';
  html += '<div class="filter-sheet-body">' + sidebar(q, res) + '</div>';
  html += '<div class="filter-sheet-foot"><button type="button" class="btn btn-primary btn-block" data-action="shop-close-filters">Show ' + res.total + ' items</button></div>';
  html += '</div><div class="filter-sheet-overlay" data-action="shop-close-filters" hidden></div>';
  html += '</div>';
  return html;
}

/* ---------- Home ---------- */
function sectionRow(title, items, moreHref, moreLabel){
  if (!items.length) return '';
  var html = '<section class="section"><div class="section-head"><h2>' + esc(title) + '</h2>';
  if (moreHref) html += '<a href="' + esc(moreHref) + '">' + esc(moreLabel || 'See all') + '</a>';
  html += '</div><div class="product-grid">';
  for (var i = 0; i < items.length; i++) html += card(items[i]);
  html += '</div></section>';
  return html;
}

function home(){
  var all = E().allProducts();
  var available = all.filter(function(p){ return p.status !== 'sold'; });
  var html = '<div class="view home-view">';
  /* category tiles */
  var cats = ['Women', 'Men', 'Kids', 'Accessories'];
  html += '<section class="section"><div class="section-head"><h2>Shop by category</h2></div><div class="cat-tiles">';
  var catShapes = { Women: 'dress', Men: 'shirt', Kids: 'kids', Accessories: 'accessory' };
  for (var i = 0; i < cats.length; i++){
    var c = cats[i];
    var n = available.filter(function(p){ return p.category === c; }).length;
    html += '<a class="cat-tile" href="#/shop?cat=' + encodeURIComponent(c) + '">' +
      '<span class="cat-tile-art">' + RW.ui.img({ shape: catShapes[c], colorHex: '#4A5D4E', title: c, brand: '', photo: RW.ui.catPhoto(c) }, 0, 'card') + '</span>' +
      '<span class="cat-tile-label">' + esc(c) + ' <span class="muted">(' + n + ')</span></span></a>';
  }
  html += '</div></section>';
  /* budget strip */
  var bands = [['0-499', 'Under ₹500'], ['500-1000', '₹500–1,000'], ['1000-2000', '₹1,000–2,000'], ['2000-5000', '₹2,000–5,000']];
  html += '<section class="section budget-strip"><h2>Shop by budget</h2><div class="budget-row">';
  for (var b = 0; b < bands.length; b++){
    html += '<a class="budget-chip" href="#/shop?price=' + bands[b][0] + '">' + bands[b][1] + '</a>';
  }
  html += '</div></section>';
  /* just listed + trending */
  var just = available.slice().sort(function(a, c){ return (a.listedAgoHours || 0) - (c.listedAgoHours || 0); }).slice(0, 4);
  html += sectionRow('Just listed', just, '#/shop?sort=newest', 'See all new arrivals');
  var trending = available.slice().sort(function(a, c){ return (c.wishlistBase || 0) - (a.wishlistBase || 0); }).slice(0, 4);
  html += sectionRow('Trending now', trending, '#/shop?sort=popularity', 'See all trending');
  /* occasion */
  var occs = ['Wedding', 'Party', 'Festive', 'Office', 'Casual', 'Winter'];
  html += '<section class="section"><div class="section-head"><h2>Shop by occasion</h2></div><div class="occ-row">';
  for (var o = 0; o < occs.length; o++){
    html += '<a class="chip" href="#/shop?occ=' + encodeURIComponent(occs[o]) + '">' + esc(occs[o]) + '</a>';
  }
  html += '</div></section>';
  /* how it works */
  html += '<section class="section hiw-strip"><div class="section-head"><h2>How it works</h2><a href="#/how-it-works">Learn more</a></div>';
  html += '<div class="hiw-grid">';
  html += '<div class="hiw-col"><h3>Buy</h3><ol><li>Find a piece you love</li><li>Check measurements &amp; flaws</li><li>Pay by UPI or COD</li></ol></div>';
  html += '<div class="hiw-col"><h3>Sell</h3><ol><li>Snap 1–3 photos</li><li>Set your price</li><li>Manage it anytime, no PIN</li></ol></div>';
  html += '</div></section>';
  /* sell CTA */
  html += '<section class="sell-cta"><div><h2>Turn your unworn clothes into cash</h2>' +
    '<p class="muted">List in minutes. 8% flat fee. Every item is one of a kind.</p>' +
    '<a class="btn btn-accent" href="#/sell">Start selling</a></div></section>';
  html += '</div>';
  return html;
}

/* ---------- shop actions (delegated) ---------- */
RW.actions['shop-toggle'] = function(el){
  var q = E().parseParams(RW.router.parseHash(location.hash).query);
  var key = el.getAttribute('data-key');
  var val = el.getAttribute('data-val');
  if (key === 'tagged'){
    toggleMulti(q, 'tagged', '1');
    return;
  }
  toggleMulti(q, key, val);
};
RW.actions['shop-remove'] = function(el){
  var q = E().parseParams(RW.router.parseHash(location.hash).query);
  var key = el.getAttribute('data-key');
  if (key === 'tagged' || key === 'q' || key === 'price' || key === 'hideSold' || key === 'view'){
    var nq = {};
    for (var k in q) if (Object.prototype.hasOwnProperty.call(q, k) && k !== key) nq[k] = q[k];
    RW.router.navigate(shopHref(nq), { replace: true });
    return;
  }
  var val = el.getAttribute('data-val');
  var cur = qList(q, key);
  setShopParam(q, key, cur.filter(function(v){ return v !== val; }), false);
};
RW.actions['shop-clear'] = function(){
  RW.router.navigate('#/shop', { replace: true });
};
RW.actions['shop-band'] = function(el){
  var q = E().parseParams(RW.router.parseHash(location.hash).query);
  var val = el.getAttribute('data-val');
  var nq = {};
  for (var k in q) if (Object.prototype.hasOwnProperty.call(q, k) && k !== 'price' && k !== 'page') nq[k] = q[k];
  if (q.price !== val) nq.price = val;
  RW.router.navigate(shopHref(nq), { replace: true });
};
RW.actions['shop-price-apply'] = function(){
  var lo = parseInt((document.getElementById('price-min') || {}).value, 10);
  var hi = parseInt((document.getElementById('price-max') || {}).value, 10);
  var q = E().parseParams(RW.router.parseHash(location.hash).query);
  var nq = {};
  for (var k in q) if (Object.prototype.hasOwnProperty.call(q, k) && k !== 'price' && k !== 'page') nq[k] = q[k];
  if (isFinite(lo) && isFinite(hi) && hi >= lo) nq.price = lo + '-' + hi;
  RW.router.navigate(shopHref(nq), { replace: true });
};
RW.actions['shop-price-range'] = function(el, ev){
  if (!ev || (ev.type !== 'change' && ev.type !== 'input')) return;
  var lo = document.getElementById('price-lo'), hi = document.getElementById('price-hi');
  if (!lo || !hi) return;
  var lv = parseInt(lo.value, 10), hv = parseInt(hi.value, 10);
  if (lv > hv){ var t = lv; lv = hv; hv = t; }
  var q = E().parseParams(RW.router.parseHash(location.hash).query);
  var nq = {};
  for (var k in q) if (Object.prototype.hasOwnProperty.call(q, k) && k !== 'price' && k !== 'page') nq[k] = q[k];
  var bounds = priceBounds();
  if (lv > bounds.min || hv < bounds.max) nq.price = lv + '-' + hv;
  RW.router.navigate(shopHref(nq), { replace: true });
};
RW.actions['shop-hide-sold'] = function(){
  var q = E().parseParams(RW.router.parseHash(location.hash).query);
  var nq = {};
  for (var k in q) if (Object.prototype.hasOwnProperty.call(q, k) && k !== 'hideSold') nq[k] = q[k];
  /* show sold when currently hiding; re-hide when currently showing */
  if (q.hideSold === '0') nq.hideSold = '1'; else nq.hideSold = '0';
  RW.router.navigate(shopHref(nq), { replace: true });
};
RW.actions['shop-sort'] = function(el){
  var q = E().parseParams(RW.router.parseHash(location.hash).query);
  var nq = {};
  for (var k in q) if (Object.prototype.hasOwnProperty.call(q, k) && k !== 'sort' && k !== 'page') nq[k] = q[k];
  var v = el.value;
  if (v && v !== 'relevance') nq.sort = v;
  RW.router.navigate(shopHref(nq), { replace: true });
};
RW.actions['shop-per'] = function(el){
  var q = E().parseParams(RW.router.parseHash(location.hash).query);
  var nq = {};
  for (var k in q) if (Object.prototype.hasOwnProperty.call(q, k) && k !== 'per' && k !== 'page') nq[k] = q[k];
  var v = parseInt(el.value, 10);
  if (v && v !== 12) nq.per = v;
  RW.router.navigate(shopHref(nq), { replace: true });
};
RW.actions['shop-view'] = function(el){
  var q = E().parseParams(RW.router.parseHash(location.hash).query);
  var nq = {};
  for (var k in q) if (Object.prototype.hasOwnProperty.call(q, k) && k !== 'view') nq[k] = q[k];
  if (el.getAttribute('data-val') === 'list') nq.view = 'list';
  RW.router.navigate(shopHref(nq), { replace: true });
};
RW.actions['shop-open-filters'] = function(){
  var sheet = document.getElementById('filter-sheet');
  var overlay = document.querySelector('.filter-sheet-overlay');
  if (sheet){ sheet.classList.add('is-open'); sheet.setAttribute('aria-hidden', 'false'); }
  if (overlay) overlay.hidden = false;
  document.body.classList.add('no-scroll');
};
RW.actions['shop-close-filters'] = function(){
  var sheet = document.getElementById('filter-sheet');
  var overlay = document.querySelector('.filter-sheet-overlay');
  if (sheet){ sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true'); }
  if (overlay) overlay.hidden = true;
  document.body.classList.remove('no-scroll');
};

/* wishlist heart (works on any page with cards) */
RW.actions['toggle-wish'] = function(el){
  var id = el.getAttribute('data-id');
  var p = E().productById(id);
  if (!p) return;
  var w = RW.store.get('rw_wishlist') || {};
  if (w[id]){
    delete w[id];
    RW.store.set('rw_wishlist', w);
    RW.toast('Removed from wishlist');
  } else {
    w[id] = { id: id, price: p.price, savedAt: Date.now() };
    RW.store.set('rw_wishlist', w);
    RW.toast('Saved to wishlist', 'success');
  }
  el.classList.toggle('is-on', !!w[id]);
  el.setAttribute('aria-pressed', w[id] ? 'true' : 'false');
  var svg = el.querySelector('svg');
  if (svg) svg.setAttribute('fill', w[id] ? 'currentColor' : 'none');
};

/* ---------- shop inputs (delegated non-click) ---------- */
document.addEventListener('change', function(e){
  var el = e.target;
  if (!el || !el.getAttribute) return;
  var a = el.getAttribute('data-action');
  if (a && RW.actions[a] && (el.tagName === 'SELECT')) RW.actions[a](el, e);
});
document.addEventListener('input', function(e){
  var el = e.target;
  if (!el || !el.getAttribute) return;
  var a = el.getAttribute('data-action');
  if (a === 'shop-price-range'){
    var lo = document.getElementById('price-lo'), hi = document.getElementById('price-hi');
    var minEl = document.getElementById('price-min'), maxEl = document.getElementById('price-max');
    if (!lo || !hi) return;
    var lv = parseInt(lo.value, 10), hv = parseInt(hi.value, 10);
    if (lv > hv){ if (el === lo){ hv = lv; hi.value = String(hv); } else { lv = hv; lo.value = String(lv); } }
    if (minEl) minEl.value = String(lv);
    if (maxEl) maxEl.value = String(hv);
  }
  if (a === 'brand-filter-q' || el.id === 'brand-filter-q'){
    var q2 = normalizeLocal(el.value);
    var chips = document.querySelectorAll('.f-brand-list .chip');
    for (var i = 0; i < chips.length; i++){
      var b = chips[i].getAttribute('data-brand') || '';
      chips[i].style.display = (!q2 || b.indexOf(q2) >= 0) ? '' : 'none';
    }
  }
});
document.addEventListener('keyup', function(e){
  var el = e.target;
  if (el && el.id === 'price-min' || el && el.id === 'price-max'){
    if (e.key === 'Enter'){
      var apply = document.querySelector('[data-action="shop-price-apply"]');
      if (apply) apply.click();
    }
  }
});
function normalizeLocal(s){ return E().normalize(s || ''); }

/* price range slider commit on change */
document.addEventListener('change', function(e){
  var el = e.target;
  if (el && el.getAttribute && el.getAttribute('data-action') === 'shop-price-range'){
    RW.actions['shop-price-range'](el, e);
  }
});

/* hidden dev contact sheet: every garment at 64/150/300px for LOD + realism QA (open #/dev/svg-sheet) */
function svgSheet(){
  var all = E().allProducts();
  var sizes = [64, 150, 300];
  var html = '<div class="view svg-sheet-view">' +
    '<h1 tabindex="-1">SVG contact sheet <span class="muted">(dev)</span></h1>' +
    '<p class="muted">Every catalog garment at 64 / 150 / 300 px — LOD, colour and realism QA. Not linked from navigation.</p>';
  for (var i = 0; i < all.length; i++){
    var p = all[i];
    html += '<figure class="svg-sheet-item"><div class="svg-sheet-ims">';
    for (var s = 0; s < sizes.length; s++){
      html += '<span class="svg-sheet-im" style="width:' + sizes[s] + 'px">' +
        RW.ui.img(p, 0, sizes[s] <= 150 ? 'card' : 'full') + '</span>';
    }
    html += '</div><figcaption>' + esc(p.id) + ' · ' + esc(p.title) + ' · ' + esc(p.colorHex || '') +
      ' · ' + esc(p.material || '') + ' · ' + esc(p.condition || '') + ' · ' + esc(RW.ui.shapeKey(p)) +
      ' · ' + esc(p.category || '') + '</figcaption></figure>';
  }
  return html + '</div>';
}

RW.viewsShop = { home: home, shop: shop, card: card };
RW.router.register('/', home, { title: 'Home' });
RW.router.register('/shop', shop, { title: 'Shop' });
RW.router.register('/dev/svg-sheet', svgSheet, { title: 'SVG sheet (dev)' });

})();
