/* engine.js — exports: RW.engine (catalog, parseParams, search, facets, pipeline, suggest), RW.ui (img, svgFor, stars, sizeLabel, highlight, shapeKey, shapeKeys, featuresRequired) */
(function(){
'use strict';
var RW = window.RW = window.RW || {};
var DATA = window.RW_DATA || {};
var esc = RW.util.esc;
var CFG = DATA.config || {};

/* ---------- catalog merge (seeds + user listings + status overrides) ---------- */
function allProducts(){
  var seeds = DATA.products || [];
  var user = RW.store.get('rw_listings_user') || [];
  var overrides = RW.store.get('rw_status_overrides') || {};
  var out = seeds.concat(user);
  for (var i = 0; i < out.length; i++){
    var p = out[i];
    if (overrides[p.id]) p = Object.assign({}, p, overrides[p.id]);
    out[i] = p;
  }
  return out;
}
function productById(id){
  var all = allProducts();
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
}
function sellerById(id){
  var seeds = DATA.sellers || [];
  for (var i = 0; i < seeds.length; i++) if (seeds[i].id === id) return seeds[i];
  var user = RW.store.get('rw_sellers_user') || [];
  for (var j = 0; j < user.length; j++) if (user[j].id === id) return user[j];
  return null;
}

/* ---------- search normalisation ---------- */
function normalize(s){
  s = String(s == null ? '' : s).toLowerCase();
  try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch(e){}
  s = s.replace(/[’']/g, '').replace(/&/g, ' and ').replace(/[.\-_/]/g, ' ').replace(/[^a-z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
function stem(w){
  /* light plural stemming so "jean"~"jeans", "shirt"~"shirts", "kurti"~"kurtis".
     Never strip a lone "s" that is part of the word (e.g. "tshirt" is left alone). */
  if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (w.length > 4 && /(ses|xes|zes|ches|shes)$/.test(w)) return w.slice(0, -2);
  if (w.length > 4 && /s$/.test(w) && !/ss$/.test(w) && !/(us|is|ts|ds)$/.test(w)) return w.slice(0, -1);
  return w;
}
function tokenize(s){
  var n = normalize(s);
  if (!n) return [];
  return n.split(' ').filter(Boolean).map(stem);
}
function expandSynonym(w){
  var syn = DATA.synonyms || {};
  var out = [w];
  for (var k in syn){
    var sk = stem(k), sv = stem(syn[k]);
    if (sk === w) out.push(sv);
    if (sv === w) out.push(sk);
  }
  return out;
}
function brandFromQuery(q){
  var aliases = DATA.brandAliases || {};
  var nq = normalize(q);
  if (!nq) return null;
  var best = null;
  for (var k in aliases){
    var nk = normalize(k);
    if (nk && nq.indexOf(nk) >= 0){
      if (!best || nk.length > best.len) best = { brand: aliases[k], len: nk.length };
    }
  }
  return best ? best.brand : null;
}

/* Per-product token index with field weights: title > brand > category > keywords > description */
function indexFor(p){
  if (p._idx) return p._idx;
  function toks(s){ return tokenize(s); }
  var idx = {
    title: toks(p.title),
    brand: toks(p.brand),
    cat: toks(p.category + ' ' + p.sub),
    kw: toks((p.keywords || []).join(' ')),
    desc: toks(p.description || ''),
    brandRaw: normalize(p.brand)
  };
  /* Also index adjacent-word joins so "t shirt"/"tshirt" both match "T-shirt". */
  var joins = [];
  var all = idx.title.concat(idx.cat, idx.kw);
  for (var ai = 0; ai < all.length - 1; ai++) joins.push(all[ai] + all[ai + 1]);
  idx.joined = joins;
  try { Object.defineProperty(p, '_idx', { value: idx, enumerable: false }); } catch(e){ p._idx = idx; }
  return idx;
}
var FIELD_W = { title: 10, brand: 6, cat: 4, kw: 3, desc: 1, joined: 5 };

function tokenHits(idx, t){
  /* returns weight of best field hit for token t (exact word), 0 if none */
  var best = 0;
  for (var f in FIELD_W){
    var arr = idx[f];
    for (var i = 0; i < arr.length; i++){
      if (arr[i] === t){ if (FIELD_W[f] > best) best = FIELD_W[f]; break; }
    }
  }
  return best;
}
function tokenHitsPrefix(idx, t){
  var best = 0;
  for (var f in FIELD_W){
    var arr = idx[f];
    for (var i = 0; i < arr.length; i++){
      if (arr[i].indexOf(t) === 0){ if (FIELD_W[f] > best) best = FIELD_W[f]; break; }
    }
  }
  return best;
}
/* last-token substring match, so "tshirt" finds "T-shirts" and "shirt" finds "T-shirt" */
function tokenHitsSub(idx, t){
  var best = 0;
  for (var f in FIELD_W){
    var arr = idx[f];
    for (var i = 0; i < arr.length; i++){
      if (arr[i].indexOf(t) >= 0){ if (FIELD_W[f] > best) best = FIELD_W[f]; break; }
    }
  }
  return best;
}

/* Score a product against query tokens. All tokens must match (AND).
   Earlier tokens = whole word (after stemming/synonyms); last token also allows prefix (min 2 chars). */
function searchScore(p, tokens, raw){
  if (!tokens.length) return 1;
  var idx = indexFor(p);
  var score = 0;
  var last = tokens.length - 1;
  for (var i = 0; i < tokens.length; i++){
    var t = tokens[i];
    var variants = expandSynonym(t);
    var best = 0;
    for (var v = 0; v < variants.length; v++){
      var hit = tokenHits(idx, variants[v]);
      if (hit > best) best = hit;
      if (i === last && variants[v].length >= 2){
        var ph = tokenHitsPrefix(idx, variants[v]);
        if (ph > best) best = ph;
        if (best === 0){
          var sh = tokenHitsSub(idx, variants[v]);
          if (sh > best) best = sh;
        }
      }
    }
    if (best === 0) return 0;
    score += best;
  }
  var ba = brandFromQuery(raw);
  if (ba && normalize(ba) === idx.brandRaw) score += 8;
  return score;
}
function matchesSearch(p, tokens, raw){
  return searchScore(p, tokens, raw) > 0;
}
function productText(p){
  return normalize([p.title, p.brand, p.category, p.sub, p.material, p.color, (p.occasion || []).join(' '), (p.keywords || []).join(' ')].join(' '));
}

/* ---------- filter predicates (OR within group, AND across) ---------- */
var CONDS = { 'like-new': 'Like New', 'excellent': 'Excellent', 'good': 'Good' };
var WARNS = { 'never': 'never', 'once': 'once', '2-3': '2-3', '4-6': '4-6' };

function multi(q){
  /* several select params may be comma-separated -> array */
  var out = {};
  var keys = ['cat','sub','coll','size','cond','worn','disc','brand','color','occ','mat','rating','city','listed'];
  for (var i = 0; i < keys.length; i++){
    var k = keys[i];
    if (!q[k]) continue;
    out[k] = String(q[k]).split(',').map(function(s){ return s.trim(); }).filter(Boolean);
  }
  return out;
}
function wornMatches(p, list){
  for (var i = 0; i < list.length; i++){
    var w = p.timesWorn, k = list[i];
    if (k === 'never' && w === 0) return true;
    if (k === 'once' && w === 1) return true;
    if (k === '2-3' && w >= 2 && w <= 3) return true;
    if (k === '4-6' && w >= 4 && w <= 6) return true;
  }
  return false;
}
function priceMatches(p, bands){
  if (!bands) return true;
  if (bands.min !== null && p.price < bands.min) return false;
  if (bands.max !== null && p.price > bands.max) return false;
  return true;
}
function listedHours(p, list){
  var maxs = { '24h':24, '7d':168, '30d':720 };
  for (var i = 0; i < list.length; i++){
    var lim = maxs[list[i]];
    if (lim && p.listedAgoHours <= lim) return true;
  }
  return false;
}
function sellerRating(p, list){
  var s = sellerById(p.sellerId);
  for (var i = 0; i < list.length; i++){
    var min = parseFloat(String(list[i]).replace(/[^\d.]/g, ''));
    if (isFinite(min) && s && s.rating >= min) return true;
  }
  return false;
}
function collMatches(p, list){
  var colls = DATA.collections || {};
  for (var i = 0; i < list.length; i++){
    var re = colls[list[i]];
    if (!re) continue;
    var hay = p.title + ' ' + (p.occasion || []).join(' ') + ' ' + p.sub;
    if (re.test(hay)) return true;
  }
  return false;
}

/* Does p match the filter set m (parsed multi)? group = which group to ignore (for facets). */
function passFilters(p, m, q, ignoreGroup){
  if (q.hideSold !== '0' && p.status === 'sold') return false;
  if (ignoreGroup !== 'cat' && ignoreGroup !== 'sub'){
    if (m.cat && m.cat.indexOf(p.category) < 0) return false;
    if (m.sub && m.sub.indexOf(p.sub) < 0) return false;
  }
  if (ignoreGroup !== 'coll' && m.coll && !collMatches(p, m.coll)) return false;
  if (ignoreGroup !== 'size' && m.size && m.size.indexOf(String(p.size)) < 0) return false;
  if (ignoreGroup !== 'price' && !priceMatches(p, q._price)) return false;
  if (ignoreGroup !== 'cond' && m.cond && m.cond.indexOf(String(p.condition).toLowerCase().replace(/\s+/g, '-')) < 0) return false;
  if (ignoreGroup !== 'worn' && m.worn && !wornMatches(p, m.worn)) return false;
  if (ignoreGroup !== 'tagged' && q.tagged === '1' && !p.tagsAttached) return false;
  if (ignoreGroup !== 'disc' && m.disc){
    var ok = false;
    for (var d = 0; d < m.disc.length; d++){
      var n = parseInt(m.disc[d], 10);
      if (isFinite(n) && p.discountPct >= n){ ok = true; break; }
    }
    if (!ok) return false;
  }
  if (ignoreGroup !== 'brand' && m.brand && m.brand.indexOf(p.brand) < 0) return false;
  if (ignoreGroup !== 'color' && m.color && m.color.indexOf(p.color) < 0) return false;
  if (ignoreGroup !== 'occ' && m.occ){
    var occOk = false;
    for (var o = 0; o < m.occ.length; o++){
      if ((p.occasion || []).indexOf(m.occ[o]) >= 0){ occOk = true; break; }
    }
    if (!occOk) return false;
  }
  if (ignoreGroup !== 'mat' && m.mat && m.mat.indexOf(p.material) < 0) return false;
  if (ignoreGroup !== 'city' && m.city && m.city.indexOf(p.city) < 0) return false;
  if (ignoreGroup !== 'rating' && m.rating && !sellerRating(p, m.rating)) return false;
  if (ignoreGroup !== 'listed' && m.listed && !listedHours(p, m.listed)) return false;
  return true;
}

/* ---------- parseParams: strict whitelist + validation + clamps ---------- */
var SORTS = CFG.sorts || ['relevance','newest','price_low','price_high','discount','popularity','least_worn'];
var PER_OPTS = CFG.perPageOptions || [12,24,48];
var MAX_PAGE = 9999;

function parsePrice(v){
  if (!v) return null;
  var m = /^(\d+)-(\d+|\*)$/.exec(String(v).trim());
  if (!m) return null;
  var lo = parseInt(m[1], 10), hi = m[2] === '*' ? null : parseInt(m[2], 10);
  if (!isFinite(lo)) return null;
  if (hi !== null && hi < lo) return null;
  return { min: lo, max: hi };
}
function parseParams(raw){
  var q = raw || {};
  var out = {};
  if (q.q != null && q.q !== '') out.q = String(q.q).slice(0, 120);
  /* whitelisted multi-value selects */
  var multiKeys = { cat:1, sub:1, coll:1, size:1, cond:1, worn:1, disc:1, brand:1, color:1, occ:1, mat:1, rating:1, city:1, listed:1 };
  for (var k in multiKeys){
    if (q[k]){
      var parts = String(q[k]).split(',').map(function(s){ return s.trim(); }).filter(Boolean).slice(0, 12);
      if (parts.length) out[k] = parts.join(',');
    }
  }
  if (out.cond){
    out.cond = out.cond.split(',').filter(function(c){ return CONDS[c]; }).join(',');
    if (!out.cond) delete out.cond;
  }
  if (out.worn){
    out.worn = out.worn.split(',').filter(function(c){ return WARNS[c]; }).join(',');
    if (!out.worn) delete out.worn;
  }
  if (out.disc){
    out.disc = out.disc.split(',').filter(function(c){ return ['40','50','60','70'].indexOf(c) >= 0; }).join(',');
    if (!out.disc) delete out.disc;
  }
  if (out.rating){
    out.rating = out.rating.split(',').filter(function(c){ return ['4','4.5'].indexOf(c) >= 0; }).join(',');
    if (!out.rating) delete out.rating;
  }
  if (out.listed){
    out.listed = out.listed.split(',').filter(function(c){ return ['24h','7d','30d'].indexOf(c) >= 0; }).join(',');
    if (!out.listed) delete out.listed;
  }
  if (q.price){
    var pp = parsePrice(q.price);
    if (pp) out.price = q.price;
  }
  if (q.tagged === '1' || q.tagged === '0') out.tagged = q.tagged;
  if (q.hideSold === '0' || q.hideSold === '1'){
    if (q.hideSold === '0') out.hideSold = '0';
  }
  if (q.sort && SORTS.indexOf(q.sort) >= 0) out.sort = q.sort;
  if (q.per){
    var per = parseInt(q.per, 10);
    if (PER_OPTS.indexOf(per) >= 0) out.per = per;
  }
  if (q.page){
    var pg = parseInt(q.page, 10);
    if (isFinite(pg) && pg >= 1) out.page = Math.min(pg, MAX_PAGE);
  }
  if (q.view === 'list') out.view = 'list';
  return out;
}
/* Build hash query string from a param object, skipping empties/defaults. */
function buildQuery(p){
  var parts = [];
  for (var k in p){
    if (!Object.prototype.hasOwnProperty.call(p, k)) continue;
    var v = p[k];
    if (v === undefined || v === null || v === '') continue;
    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
  }
  return parts.join('&');
}

/* ---------- facets (count per option, ignoring that group's own selection) ---------- */
function facetCounts(base, m, q, tokens){
  function count(group, fn){
    var n = 0;
    for (var i = 0; i < base.length; i++){
      var p = base[i];
      if (tokens.length && !matchesSearch(p, tokens, q.q)) continue;
      if (!passFilters(p, m, q, group)) continue;
      if (fn(p)) n++;
    }
    return n;
  }
  var facets = { cat:{}, sub:{}, coll:{}, size:{}, cond:{}, worn:{}, tagged:0, disc:{}, brand:{}, color:{}, occ:{}, mat:{}, rating:{}, city:{}, listed:{} };
  var catSubs = {};
  var tree = DATA.categoryTree || {};
  for (var i = 0; i < base.length; i++){
    var p = base[i];
    if (!catSubs[p.category]) catSubs[p.category] = {};
    catSubs[p.category][p.sub] = 1;
  }
  function bump(obj, key){ obj[key] = (obj[key] || 0) + 1; }
  for (var ci = 0; ci < base.length; ci++){
    var pr = base[ci];
    if (tokens.length && !matchesSearch(pr, tokens, q.q)) continue;
    if (pr.status === 'sold' && q.hideSold !== '0'){ /* still counted in hide-sold group? sold hidden entirely */ }
    /* category tree: count under ignore cat/sub */
    if (passFilters(pr, m, q, 'cat')){ bump(facets.cat, pr.category); }
    if (passFilters(pr, m, q, 'sub')){
      if (!facets.sub[pr.category]) facets.sub[pr.category] = {};
      bump(facets.sub[pr.category], pr.sub);
    }
    if (passFilters(pr, m, q, 'coll')){
      var colls = DATA.collections || {};
      var hay = pr.title + ' ' + (pr.occasion || []).join(' ') + ' ' + pr.sub;
      for (var ck in colls){ if (colls[ck].test(hay)) bump(facets.coll, ck); }
    }
    if (passFilters(pr, m, q, 'size')) bump(facets.size, String(pr.size));
    if (passFilters(pr, m, q, 'price')){ /* price handled via range, no per-value facets */ }
    if (passFilters(pr, m, q, 'cond')) bump(facets.cond, String(pr.condition).toLowerCase().replace(/\s+/g, '-'));
    if (passFilters(pr, m, q, 'worn')){
      var w = pr.timesWorn;
      bump(facets.worn, w === 0 ? 'never' : w === 1 ? 'once' : w <= 3 ? '2-3' : '4-6');
    }
    if (passFilters(pr, m, q, 'tagged') && pr.tagsAttached) facets.tagged++;
    if (passFilters(pr, m, q, 'disc')){
      for (var dd = 40; dd <= 70; dd += 10) if (pr.discountPct >= dd) bump(facets.disc, String(dd));
    }
    if (passFilters(pr, m, q, 'brand')) bump(facets.brand, pr.brand);
    if (passFilters(pr, m, q, 'color')) bump(facets.color, pr.color);
    if (passFilters(pr, m, q, 'occ')){
      var oc = pr.occasion || [];
      for (var oi = 0; oi < oc.length; oi++) bump(facets.occ, oc[oi]);
    }
    if (passFilters(pr, m, q, 'mat')) bump(facets.mat, pr.material);
    if (passFilters(pr, m, q, 'city')) bump(facets.city, pr.city);
    if (passFilters(pr, m, q, 'rating')){
      var sl = sellerById(pr.sellerId);
      if (sl){ if (sl.rating >= 4.5) bump(facets.rating, '4.5'); if (sl.rating >= 4) bump(facets.rating, '4'); }
    }
    if (passFilters(pr, m, q, 'listed')){
      var lh = pr.listedAgoHours;
      if (lh <= 24) bump(facets.listed, '24h');
      if (lh <= 168) bump(facets.listed, '7d');
      if (lh <= 720) bump(facets.listed, '30d');
    }
  }
  facets._catSubs = catSubs;
  facets._tree = tree;
  return facets;
}

/* ---------- sort (stable, ties newest) ---------- */
function sortList(list, sort, q, tokens){
  var arr = list.slice();
  for (var i = 0; i < arr.length; i++) arr[i]._ord = i;
  function newest(a, b){ return (a.listedAgoHours || 0) - (b.listedAgoHours || 0) || a._ord - b._ord; }
  arr.sort(function(a, b){
    var d = 0;
    switch (sort){
      case 'newest': d = (a.listedAgoHours || 0) - (b.listedAgoHours || 0); break;
      case 'price_low': d = a.price - b.price; break;
      case 'price_high': d = b.price - a.price; break;
      case 'discount': d = b.discountPct - a.discountPct; break;
      case 'popularity': d = (b.wishlistBase || 0) - (a.wishlistBase || 0); break;
      case 'least_worn': d = (a.timesWorn || 0) - (b.timesWorn || 0); break;
      default:
        if (tokens && tokens.length){
          d = searchScore(b, tokens, q.q) - searchScore(a, tokens, q.q);
        } else d = 0;
    }
    return d || newest(a, b);
  });
  for (var j = 0; j < arr.length; j++) delete arr[j]._ord;
  return arr;
}

/* ---------- main pipeline ---------- */
function run(raw){
  var q = parseParams(raw);
  q.sort = q.sort || 'relevance';
  q.per = q.per || 12;
  q.page = q.page || 1;
  q._price = parsePrice(q.price);
  var m = multi(q);
  var tokens = q.q ? tokenize(q.q) : [];
  var base = allProducts();
  var searched = [];
  for (var i = 0; i < base.length; i++){
    var p = base[i];
    if (tokens.length && !matchesSearch(p, tokens, q.q)) continue;
    if (!passFilters(p, m, q, null)) continue;
    searched.push(p);
  }
  var facets = facetCounts(base, m, q, tokens);
  var sorted = sortList(searched, q.sort, q, tokens);
  var total = sorted.length;
  var pages = Math.max(1, Math.ceil(total / q.per));
  if (q.page > pages) q.page = pages;
  var start = (q.page - 1) * q.per;
  var items = sorted.slice(start, start + q.per);
  return { q: q, m: m, items: items, all: sorted, total: total, pages: pages, page: q.page, per: q.per, facets: facets, tokens: tokens };
}

/* size label: numeric sizes carry a sizeType */
function sizeLabel(p){
  var s = String(p == null ? '' : p.size);
  var st = p && p.sizeType;
  if (st === 'waist') return 'Waist ' + s;
  if (st === 'chest') return 'Chest ' + s;
  if (st === 'collar') return 'Collar ' + s;
  if (st === 'age') return s;
  if (st === 'free') return 'Free';
  if (/^\d+$/.test(s)) return st === 'chest' ? 'Chest ' + s : s;
  return s;
}

/* ---------- autosuggest ---------- */
function suggest(rawQ){
  var nq = normalize(rawQ);
  if (!nq || nq.length < 1) return { products: [], categories: [], brands: [], recents: [] };
  var tokens = tokenize(rawQ);
  var last = tokens.length ? tokens[tokens.length - 1] : '';
  var base = allProducts();
  var prods = [];
  for (var i = 0; i < base.length; i++){
    var p = base[i];
    var sc = searchScore(p, tokens, rawQ);
    if (sc > 0) prods.push({ p: p, sc: sc });
  }
  prods.sort(function(a, b){ return b.sc - a.sc || (a.p.listedAgoHours || 0) - (b.p.listedAgoHours || 0); });
  prods = prods.slice(0, 6).map(function(x){ return x.p; });
  /* categories: match category/sub names by last-token prefix */
  var cats = [];
  var tree = DATA.categoryTree || {};
  for (var c in tree){
    if (last && (normalize(c).indexOf(last) === 0 || tokenHits({ cat: tokenize(c), title:[], brand:[], kw:[], desc:[], joined:[] }, last))) cats.push({ label: c, href: '#/shop?cat=' + encodeURIComponent(c) });
    for (var s in tree[c].subs){
      var st = tree[c].subs[s];
      var hay = normalize(c + ' ' + s);
      if (last && hay.indexOf(last) >= 0 && cats.length < 5) cats.push({ label: s + ' (' + c + ')', href: '#/shop?cat=' + encodeURIComponent(c) + '&sub=' + encodeURIComponent(s) });
    }
  }
  cats = cats.slice(0, 4);
  var brands = [];
  var brandCount = {};
  for (var bi = 0; bi < base.length; bi++) brandCount[base[bi].brand] = (brandCount[base[bi].brand] || 0) + 1;
  var ba = brandFromQuery(rawQ);
  if (ba) brands.push({ label: ba, href: '#/shop?brand=' + encodeURIComponent(ba) });
  for (var b in brandCount){
    if (brands.length >= 4) break;
    var nb = normalize(b);
    if (!last) break;
    if (nb.indexOf(last) === 0 || (last.length >= 3 && nb.indexOf(last) >= 0)){
      var dup = false;
      for (var k = 0; k < brands.length; k++) if (brands[k].label === b) dup = true;
      if (!dup) brands.push({ label: b, href: '#/shop?brand=' + encodeURIComponent(b) });
    }
  }
  var recents = [];
  if (!nq){
    recents = (RW.store.get('rw_recent_searches') || []).slice(0, 6);
  }
  return { products: prods, categories: cats, brands: brands, recents: recents };
}

RW.engine = {
  allProducts: allProducts,
  productById: productById,
  sellerById: sellerById,
  normalize: normalize,
  tokenize: tokenize,
  parseParams: parseParams,
  buildQuery: buildQuery,
  searchScore: searchScore,
  matchesSearch: matchesSearch,
  productText: productText,
  sizeLabel: sizeLabel,
  run: run,
  suggest: suggest,
  /* back-compat aliases */
  sanitizeQuery: parseParams,
  runPipeline: run
};

/* ---------- RW.ui: modern SVG garment illustrations (data-URI, no photos) ---------- */
function hexRgb(h){
  h = String(h == null ? '' : h).replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6) return [138, 138, 138];
  var n = parseInt(h, 16);
  return isNaN(n) ? [138, 138, 138] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shadeHex(hex, amt){
  var c = hexRgb(hex), t = amt < 0 ? 0 : 255, k = Math.abs(amt), out = [];
  for (var i = 0; i < 3; i++){
    var v = Math.round(c[i] + (t - c[i]) * k);
    out.push((v < 16 ? '0' : '') + v.toString(16));
  }
  return '#' + out.join('');
}
function lumOf(hex){ var c = hexRgb(hex); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function hashStr(s){
  var h = 5381;
  s = String(s == null ? '' : s);
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}
function rgb2hsl(r, g, b){
  r /= 255; g /= 255; b /= 255;
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
  if (d){
    s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hsl2rgb(h, s, l){
  h = (((h % 360) + 360) % 360) / 360;
  if (!s){ var v = Math.round(l * 255); return [v, v, v]; }
  var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  function tc(t){
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  return [Math.round(tc(h + 1 / 3) * 255), Math.round(tc(h) * 255), Math.round(tc(h - 1 / 3) * 255)];
}
function toHex(r, g, b){
  function hx(v){ v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
  return '#' + hx(r) + hx(g) + hx(b);
}
/* HSL shift: dl lightness, ds saturation, dh hue — highlight warms, shadow cools */
function tint(hex, dl, ds, dh){
  var c = hexRgb(hex), hs = rgb2hsl(c[0], c[1], c[2]);
  var rgb = hsl2rgb(hs[0] + dh, Math.max(0, Math.min(1, hs[1] + ds)), Math.max(.04, Math.min(.96, hs[2] + dl)));
  return toHex(rgb[0], rgb[1], rgb[2]);
}
/* per-render palette: base + directional light/shadow tints (never pure black/white) */
function pal(hex){
  var base = /^#[0-9a-fA-F]{3,8}$/.test(String(hex || '')) ? hex : '#8A8A8A';
  return {
    base: base,
    lighter: shadeHex(base, .3),
    light: shadeHex(base, .15),
    dark: shadeHex(base, -.22),
    darker: shadeHex(base, -.42),
    edge: tint(base, -.5, .05, 10),
    hi: tint(base, .34, -.14, -10),
    sh: tint(base, -.3, .1, 12),
    shDeep: tint(base, -.5, .1, 14),
    hiW: '#FFFDF6',
    stitch: lumOf(base) > 140 ? 'rgba(52,44,36,.55)' : 'rgba(255,250,238,.55)'
  };
}

/* bow detail (title "bow") shared by dress/top fronts — dark tints only, button-safe */
var BOW_D = '<path data-f="neck" d="M196 82 C176 66 164 80 170 96 C175 108 190 96 197 85 Z" fill="rgba(27,27,27,.2)" stroke="rgba(27,27,27,.35)" stroke-width="1.8"/><path data-f="neck" d="M204 82 C224 66 236 80 230 96 C225 108 210 96 203 85 Z" fill="rgba(27,27,27,.2)" stroke="rgba(27,27,27,.35)" stroke-width="1.8"/><path data-f="neck" d="M197 87 L185 118 L196 109 Z" fill="rgba(27,27,27,.16)"/><path data-f="neck" d="M203 87 L215 118 L204 109 Z" fill="rgba(27,27,27,.16)"/><circle data-f="neck" cx="200" cy="84" r="6.5" fill="rgba(27,27,27,.32)" stroke="rgba(27,27,27,.42)"/>';
/* strap-style dresses (slip/gown/cocktail/bodycon) hang sleeveless on straps */
function strapDress(t){ return /slip|gown|cocktail|bodycon|spaghetti|bikini/i.test(String(t || '')); }

/* body: path element(s), inherit fill/stroke from wrapper | folds: crease anchors (dark+light taper pairs) */
/* front/back: detail elements with data-f feature markers | hang: on hanger | hy: shadow y | df/dv: detail focus/crop */
var GARMENTS = {
  dress: { hang: 1, hy: 462, df: [200, 64], dv: '118 24 164 205',
    body: function(o){
      if (strapDress(o && o.title)) return '<path d="M170 44 L183 44 C185 62 191 78 200 78 C209 78 215 62 217 44 L230 44 L256 76 L264 152 C270 224 276 312 292 414 Q200 450 108 414 C124 312 130 224 136 152 L144 76 Z"/>';
      return '<path d="M148 66 L174 50 Q200 72 226 50 L252 66 L306 120 L276 144 L256 118 C264 196 274 306 292 414 Q200 450 108 414 C126 306 136 196 144 118 L124 144 L94 120 Z"/>';
    },
    folds: ['M174 150 C166 240 178 332 170 420', 'M230 150 C240 244 228 336 236 420', 'M202 232 C196 296 206 352 200 410'],
    stitch: ['M118 424 Q200 456 282 424'],
    front: function(o){
      var t = String((o && o.title) || '');
      var s = strapDress(t) ? '<path data-f="neck" d="M183 44 C186 62 192 76 200 78 C208 76 214 62 217 44"/>' : '<path data-f="neck" d="M176 54 Q200 78 224 54"/>';
      s += '<path data-f="waist" d="M148 218 Q200 242 252 218" stroke-dasharray="7 5"/>';
      if (/wrap/i.test(t)) s += '<path d="M176 58 L246 220" stroke-dasharray="7 5"/>';
      if (/tier/i.test(t)) s += '<path d="M134 268 Q200 292 266 268" stroke-dasharray="7 5"/><path d="M122 348 Q200 374 278 348" stroke-dasharray="7 5"/>';
      if (/bow/i.test(t)) s += BOW_D;
      return s;
    },
    back: function(o){
      if (strapDress(o && o.title)) return '<path data-f="neck" d="M183 44 C186 62 192 76 200 78 C208 76 214 62 217 44" stroke-dasharray="6 5"/><path data-f="zip" d="M197 86 h6 v20 h-6 z"/>';
      return '<path data-f="neck" d="M176 52 Q200 62 224 52"/><path data-f="zip" d="M197 44 h6 v18 h-6 z"/>';
    } },
  top: { hang: 1, hy: 350, df: [200, 64],
    body: '<path d="M148 66 L174 50 Q200 70 226 50 L252 66 L310 118 L280 144 L258 120 L266 302 Q200 324 134 302 L142 120 L120 144 L90 118 Z"/>',
    folds: ['M168 140 C160 208 172 264 166 308', 'M236 140 C246 210 234 268 240 308'],
    stitch: ['M142 310 Q200 332 258 310'],
    front: function(o){
      var s = '<path data-f="neck" d="M176 54 Q200 76 224 54"/><path d="M176 54 Q200 66 224 54" stroke-dasharray="5 4" stroke-width="1.8"/>';
      if (/bow/i.test(String((o && o.title) || ''))) s += BOW_D;
      return s;
    },
    back: '<path data-f="neck" d="M176 52 Q200 62 224 52"/><path d="M196 46 h8 v14 h-8 z"/>' },
  tee: { hang: 1, hy: 352, df: [200, 64],
    body: '<path d="M148 64 Q174 48 200 48 Q226 48 252 64 L330 106 L294 154 L260 126 L266 304 Q200 326 134 304 L140 126 L106 154 L70 106 Z"/>',
    folds: ['M170 150 C162 214 174 268 168 310', 'M234 150 C244 214 232 270 238 310'],
    stitch: ['M140 312 Q200 334 260 312', 'M80 114 L108 150', 'M320 114 L292 150'],
    front: function(o){
      var t = String((o && o.title) || '');
      var s = '';
      if (/polo/i.test(t)) {
        s = '<path data-f="neck" d="M174 46 Q200 76 226 46" fill="none" stroke-width="5" stroke="rgba(27,27,27,.35)"/><path data-f="neck" d="M176 50 L200 82 L192 110 L166 60 Z" fill="rgba(27,27,27,.18)"/><path data-f="neck" d="M224 50 L200 82 L208 110 L234 60 Z" fill="rgba(27,27,27,.18)"/><path data-f="placket" d="M193 86 L193 134"/><path data-f="placket" d="M207 86 L207 134"/><circle cx="200" cy="100" r="3.2" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="126" r="3.2" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/>';
      } else {
        s = '<path data-f="neck" d="M172 54 Q200 88 228 54"/><path data-f="neck" d="M172 54 Q200 78 228 54"/><path d="M176 58 Q200 83 224 58" stroke-dasharray="5 4" stroke-width="1.8"/>';
      }
      if (/graphic|printed|logo/i.test(t)) {
        s += '<path data-f="graphic" d="M174 150 h52 v62 h-52 z" fill="rgba(27,27,27,.10)" stroke-dasharray="7 5" stroke="rgba(27,27,27,.4)"/><path data-f="graphic" d="M192 170 L208 170 L200 196 Z" fill="rgba(27,27,27,.35)"/>';
      }
      return s;
    },
    back: '<path data-f="neck" d="M174 54 Q200 74 226 54"/><path d="M187 72 h26 v13 h-26 z"/>' },
  shirt: { hang: 1, hy: 396, df: [200, 76],
    body: '<path d="M150 68 L176 48 L200 78 L224 48 L250 68 L306 118 L278 146 L256 122 L264 326 Q200 348 136 326 L144 122 L122 146 L94 118 Z"/>',
    folds: ['M168 152 C160 220 172 280 166 332', 'M236 152 C246 220 234 282 240 332'],
    stitch: ['M142 334 Q200 356 258 334'],
    front: '<path data-f="collar" d="M176 48 L200 78 L190 106 L162 64 Z" fill="rgba(27,27,27,.16)"/><path data-f="collar" d="M224 48 L200 78 L210 106 L238 64 Z" fill="rgba(27,27,27,.16)"/><path data-f="placket" d="M190 82 L190 342"/><path data-f="placket" d="M210 82 L210 342"/><circle cx="200" cy="102" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="150" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="198" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="246" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="294" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/>',
    back: '<path data-f="yoke" d="M152 104 L248 104" stroke-dasharray="7 5"/><path d="M200 104 L200 196" stroke-dasharray="7 5"/><path d="M196 58 h8 v16 h-8 z"/>' },
  kurta: { hang: 1, hy: 454, df: [200, 92],
    body: '<path d="M150 66 L176 50 Q200 68 224 50 L250 66 L300 114 L274 142 L254 118 L262 394 Q200 416 138 394 L146 118 L126 142 L100 114 Z"/>',
    folds: ['M170 152 C162 236 174 322 168 402', 'M234 152 C244 240 232 324 238 402'],
    stitch: ['M144 402 Q200 424 256 402'],
    front: function(o){
      var collar = '<path data-f="collar" d="M176 50 Q176 34 200 32 Q224 34 224 50 Q200 68 176 50 Z" fill="rgba(27,27,27,.16)"/>';
      var slits = '<path data-f="slit" d="M146 358 L146 396"/><path data-f="slit" d="M254 358 L254 396"/>';
      if (/angrakha/i.test(String((o && o.title) || ''))) {
        return collar +
          '<path data-f="placket" d="M186 68 C206 112 222 158 230 210" stroke-dasharray="8 6" stroke-width="3.4"/>' +
          '<path data-f="placket" d="M230 210 C234 238 234 264 232 290"/>' +
          '<circle data-f="buttons" cx="197" cy="96" r="3.6" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/>' +
          '<circle data-f="buttons" cx="212" cy="140" r="3.6" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/>' +
          '<circle data-f="buttons" cx="225" cy="184" r="3.6" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/>' +
          '<path d="M232 290 C244 300 250 314 248 330" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="248" cy="336" r="4.5" fill="rgba(27,27,27,.25)"/>' +
          slits;
      }
      return collar + '<path data-f="placket" d="M188 66 L188 180 L212 180 L212 66"/>' + slits +
        '<circle cx="200" cy="84" r="3.6" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="120" r="3.6" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="156" r="3.6" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/>';
    },
    back: '<path data-f="neck" d="M176 50 Q200 60 224 50"/><path d="M197 44 h6 v16 h-6 z"/>' },
  saree: { hang: 1, hy: 468, df: [264, 236], dv: '184 56 190 238',
    body: '<path d="M152 64 L178 48 Q200 64 222 48 L248 64 L296 112 L272 138 L252 116 C258 204 262 322 268 406 Q200 444 132 406 C138 322 142 204 148 116 L128 138 L104 112 Z"/>',
    folds: ['M176 240 C170 320 180 384 174 426', 'M200 252 L200 434', 'M224 240 C232 318 222 386 228 426'],
    stitch: ['M140 414 Q200 450 260 414'],
    front: '<path data-f="neck" d="M178 52 Q200 72 222 52"/><path data-f="waist" d="M144 156 Q200 178 256 156" stroke-dasharray="7 5"/><path data-f="pallu" d="M248 64 C288 96 304 162 300 244 C296 322 282 376 272 410 L216 404 C238 330 246 242 238 170 C233 126 240 88 245 66 Z" fill="rgba(27,27,27,.3)"/><path d="M272 410 Q244 426 216 404" stroke-dasharray="7 5" stroke="rgba(255,255,255,.55)"/><path d="M262 396 Q238 410 222 396" stroke="rgba(255,255,255,.35)"/>',
    back: '<path data-f="neck" d="M178 52 Q200 62 222 52"/><path d="M196 46 h8 v14 h-8 z"/><path data-f="pallu" d="M248 64 C288 96 304 162 300 244 C296 322 282 376 272 410 L216 404 C238 330 246 242 238 170 C233 126 240 88 245 66 Z" fill="rgba(27,27,27,.3)"/>' },
  lehenga: { hang: 0, hy: 496, df: [200, 70],
    body: '<path d="M158 66 L180 50 Q200 68 220 50 L242 66 L288 110 L264 136 L248 114 L252 200 Q200 214 148 200 L152 114 L136 136 L112 110 Z"/><path d="M150 196 L250 196 C278 292 308 394 334 440 Q200 484 66 440 C92 394 122 292 150 196 Z"/>',
    folds: ['M172 232 C152 320 126 404 100 450', 'M200 232 L200 470', 'M228 232 C248 320 274 404 300 450'],
    stitch: ['M78 446 Q200 490 322 446'],
    front: '<path data-f="neck" d="M180 54 Q200 74 220 54"/><path data-f="waist" d="M152 200 Q200 216 248 200" stroke-dasharray="7 5"/>',
    back: '<path data-f="neck" d="M180 52 Q200 62 220 52"/><path d="M170 66 L230 66" stroke-width="6" stroke="rgba(27,27,27,.3)"/>' },
  trousers: { hang: 0, hy: 458, df: [200, 96], dv: '126 50 148 185',
    body: function(o){
      if (/palazzo|wide.?leg/i.test(String((o && o.title) || ''))) return '<path d="M136 60 L264 60 L276 112 L300 444 L216 444 L206 220 L194 220 L184 444 L100 444 L124 112 Z"/>';
      return '<path d="M136 60 L264 60 L274 112 L262 444 L216 444 L206 220 L194 220 L184 444 L138 444 L126 112 Z"/>';
    },
    folds: function(o){
      if (/palazzo|wide.?leg/i.test(String((o && o.title) || ''))) return ['M164 140 C158 240 164 340 154 434', 'M236 140 C244 240 238 340 246 434', 'M142 210 C130 290 122 366 116 434', 'M258 210 C270 290 278 366 284 434'];
      return ['M164 140 C158 240 164 340 160 434', 'M236 140 C244 240 238 340 242 434'];
    },
    stitch: function(o){
      if (/palazzo|wide.?leg/i.test(String((o && o.title) || ''))) return ['M106 428 L194 428', 'M206 428 L294 428'];
      return ['M142 428 L194 428', 'M206 428 L258 428'];
    },
    front: '<path data-f="waist" d="M136 60 L264 60 L266 92 L134 92 Z" fill="rgba(27,27,27,.16)"/><circle cx="200" cy="76" r="3.6" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><path data-f="fly" d="M200 92 C196 120 194 142 196 158" stroke-dasharray="7 5"/><path data-f="pocket" d="M146 98 Q172 124 198 104" stroke-dasharray="6 5"/><path data-f="pocket" d="M254 98 Q228 124 202 104" stroke-dasharray="6 5"/><path d="M200 158 L206 220"/><path data-f="belt" d="M158 60 v32" stroke-width="5"/><path data-f="belt" d="M242 60 v32" stroke-width="5"/>',
    back: '<path data-f="waist" d="M136 60 L264 60 L266 92 L134 92 Z" fill="rgba(27,27,27,.16)"/><path data-f="pocket" d="M144 104 h56 v56 h-56 z" stroke-dasharray="7 5"/><path data-f="pocket" d="M200 104 h56 v56 h-56 z" stroke-dasharray="7 5"/>' },
  jacket: { hang: 1, hy: 376, df: [200, 150],
    body: '<path d="M150 66 L176 48 L200 74 L224 48 L250 66 L308 118 L278 148 L256 122 L266 330 Q200 352 134 330 L144 122 L122 148 L92 118 Z"/>',
    folds: ['M168 152 C160 220 172 284 166 338', 'M236 152 C246 220 234 286 240 338'],
    stitch: [],
    front: '<path data-f="lapel" d="M176 48 L200 74 L224 48 L234 60 Q200 90 166 60 Z" fill="rgba(27,27,27,.16)"/><path data-f="zip" d="M200 74 L200 348" stroke-width="6" stroke="rgba(27,27,27,.45)"/><path data-f="zip" d="M200 74 L200 348" stroke-width="3" stroke-dasharray="4 7" stroke="rgba(255,255,255,.6)"/><path data-f="zip" d="M194 148 h12 v14 h-12 z" fill="rgba(196,188,170,.95)" stroke-width="1.6"/><path data-f="zip" d="M200 162 v12" stroke-width="3"/><circle cx="200" cy="178" r="3.6" fill="rgba(196,188,170,.95)" stroke-width="1.6"/><path data-f="hem" d="M134 312 Q200 334 266 312 L266 330 Q200 352 134 330 Z" fill="rgba(27,27,27,.18)"/><path data-f="pocket" d="M154 296 L188 288"/><path data-f="pocket" d="M246 296 L212 288"/>',
    back: '<path data-f="lapel" d="M176 48 L200 74 L224 48 L234 60 Q200 90 166 60 Z" fill="rgba(27,27,27,.16)"/><path d="M200 76 L200 330" stroke-dasharray="7 5"/><path data-f="hem" d="M134 312 Q200 334 266 312 L266 330 Q200 352 134 330 Z" fill="rgba(27,27,27,.18)"/>' },
  coat: { hang: 1, hy: 478, df: [216, 194], dv: '150 40 160 200',
    body: '<path d="M146 64 L174 46 L200 72 L226 46 L254 64 L314 122 L282 152 L258 124 L270 432 Q200 456 130 432 L142 124 L118 152 L86 122 Z"/>',
    folds: ['M170 170 C162 260 174 350 168 440', 'M234 170 C244 262 232 352 238 440'],
    stitch: ['M140 442 Q200 466 260 442'],
    front: '<path data-f="lapel" d="M174 46 L200 72 L190 150 L154 76 Z" fill="rgba(27,27,27,.16)"/><path data-f="lapel" d="M226 46 L200 72 L210 150 L246 76 Z" fill="rgba(27,27,27,.16)"/><path data-f="belt" d="M132 250 h136 v26 h-136 z" fill="rgba(27,27,27,.2)"/><path data-f="belt" d="M188 244 h24 v38 h-24 z" fill="none" stroke="rgba(27,27,27,.55)" stroke-width="4"/><circle data-f="buttons" cx="216" cy="172" r="5" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle data-f="buttons" cx="216" cy="216" r="5" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><path data-f="pocket" d="M150 306 L188 296"/><path data-f="pocket" d="M250 306 L212 296"/>',
    back: '<path d="M174 46 L200 72 L226 46" fill="none"/><path data-f="belt" d="M134 252 h132 v24 h-132 z" fill="rgba(27,27,27,.2)"/><path d="M200 330 L200 450" stroke-dasharray="8 6"/>' },
  suit: { hang: 0, hy: 492, df: [214, 190],
    body: '<path d="M150 344 L250 344 L256 362 L246 474 L214 474 L204 392 L196 392 L186 474 L154 474 L144 362 Z"/><path d="M150 66 L176 48 L200 76 L224 48 L250 66 L306 118 L278 148 L256 122 L264 348 Q200 368 136 348 L144 122 L122 148 L94 118 Z"/>',
    folds: ['M170 170 C164 240 174 300 168 352', 'M234 170 C242 242 232 302 238 352', 'M172 380 C168 420 172 450 170 470', 'M230 380 C234 420 230 450 232 470'],
    stitch: ['M152 470 L188 470', 'M212 470 L248 470'],
    front: '<path data-f="lapel" d="M176 48 L200 76 L188 144 L156 78 Z" fill="rgba(27,27,27,.16)"/><path data-f="lapel" d="M224 48 L200 76 L212 144 L244 78 Z" fill="rgba(27,27,27,.16)"/><circle data-f="buttons" cx="214" cy="168" r="5" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle data-f="buttons" cx="214" cy="212" r="5" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><path data-f="pocket" d="M148 272 h44 v16 h-44 z" stroke-dasharray="6 5"/><path data-f="pocket" d="M208 272 h44 v16 h-44 z" stroke-dasharray="6 5"/>',
    back: '<path d="M200 78 L200 346" stroke-dasharray="8 6"/><path d="M200 392 L200 474" stroke-dasharray="8 6"/><path d="M196 58 h8 v16 h-8 z"/>' },
  ethnic: { hang: 1, hy: 496, df: [200, 96],
    body: '<path d="M154 344 L246 344 L238 456 Q232 480 216 480 L206 480 Q202 456 200 424 Q198 456 194 480 L184 480 Q168 480 162 456 Z"/><path d="M150 66 L176 50 Q200 66 224 50 L250 66 L300 114 L274 142 L254 118 L262 352 Q200 372 138 352 L146 118 L126 142 L100 114 Z"/>',
    folds: ['M170 160 C162 240 174 310 168 360', 'M234 160 C244 242 232 312 238 360', 'M172 400 C170 430 174 456 172 474', 'M228 400 C230 430 226 456 228 474'],
    stitch: ['M144 360 Q200 382 256 360'],
    front: '<path data-f="collar" d="M176 50 Q176 36 200 34 Q224 36 224 50 Q200 66 176 50 Z" fill="rgba(27,27,27,.16)"/><path data-f="placket" d="M188 64 L188 168 L212 168 L212 64"/><circle cx="200" cy="82" r="3.6" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="118" r="3.6" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/>',
    back: '<path data-f="neck" d="M176 50 Q200 60 224 50"/><path d="M197 44 h6 v16 h-6 z"/>' },
  kids: { hang: 1, hy: 360, df: [200, 86],
    body: '<path d="M158 78 Q180 60 200 60 Q220 60 242 78 L304 124 L276 154 L254 132 L264 310 Q200 336 136 310 L146 132 L124 154 L96 124 Z"/>',
    folds: ['M174 160 C166 226 178 282 172 316', 'M230 160 C240 228 228 284 236 316'],
    stitch: ['M142 318 Q200 344 258 318', 'M150 300 Q200 326 250 300'],
    front: '<path data-f="neck" d="M178 66 Q200 92 222 66"/><path d="M188 128 l14 -10 v20 z" fill="rgba(255,255,255,.6)"/><path d="M212 128 l-14 -10 v20 z" fill="rgba(255,255,255,.6)"/><circle data-f="buttons" cx="200" cy="128" r="5" fill="rgba(255,255,255,.75)" stroke="rgba(27,27,27,.4)"/>',
    back: '<path data-f="neck" d="M178 64 Q200 76 222 64"/><path d="M190 84 h20 v26 h-20 z" stroke-dasharray="5 4"/>' },
  accessory: { hang: 0, hy: 438, df: [200, 246], tagThread: 'M234 100 C250 104 262 106 270 104',
    body: '<path d="M110 168 L290 168 L304 200 L304 372 Q200 416 96 372 L96 200 Z"/>',
    folds: ['M140 240 C134 300 138 350 134 388', 'M260 240 C266 300 262 352 266 388'],
    stitch: ['M108 384 Q200 424 292 384'],
    front: '<path data-f="handle" d="M154 168 C154 94 246 94 246 168" stroke-width="14" stroke="rgba(27,27,27,.42)" fill="none"/><path d="M154 168 C154 94 246 94 246 168" stroke-width="4" stroke="rgba(255,255,255,.35)" fill="none"/><path data-f="flap" d="M110 168 L290 168 L290 254 Q200 280 110 254 Z" fill="rgba(27,27,27,.14)"/><path data-f="clasp" d="M186 246 h28 v22 h-28 z" fill="rgba(255,255,255,.55)" stroke="rgba(27,27,27,.45)" stroke-width="2"/><path d="M110 254 Q200 280 290 254" stroke-dasharray="7 5"/>',
    back: '<path data-f="handle" d="M154 168 C154 94 246 94 246 168" stroke-width="14" stroke="rgba(27,27,27,.42)" fill="none"/><path data-f="pocket" d="M138 296 h124 v72 h-124 z" stroke-dasharray="7 5"/>' },
  scarf: { hang: 0, hy: 466, df: [148, 300], dv: '100 230 180 160',
    body: '<path d="M118 104 L118 380 C118 428 154 460 200 460 C246 460 282 428 282 380 L282 104 L222 104 L222 374 C222 404 214 428 200 428 C186 428 178 404 178 374 L178 104 Z"/>',
    folds: ['M148 140 C142 240 152 330 146 404', 'M252 140 C258 240 248 330 254 404', 'M170 438 C186 452 214 452 230 438'],
    stitch: ['M118 122 L178 122', 'M222 122 L282 122', 'M126 398 C134 434 164 454 200 454 C236 454 266 434 274 398'],
    front: '<path data-f="fringe" d="M130 88 v16 M142 88 v16 M154 88 v16 M166 88 v16 M230 88 v16 M242 88 v16 M254 88 v16 M266 88 v16" stroke-width="3"/><path data-f="stripe" d="M118 296 L178 296 M222 296 L282 296" stroke-width="14" stroke="rgba(27,27,27,.2)"/><path data-f="stripe" d="M118 324 L178 324 M222 324 L282 324" stroke-width="6" stroke="rgba(27,27,27,.2)"/>',
    back: '<path data-f="fringe" d="M130 88 v16 M142 88 v16 M154 88 v16 M166 88 v16 M230 88 v16 M242 88 v16 M254 88 v16 M266 88 v16" stroke-width="3"/><path data-f="stripe" d="M118 310 L178 310 M222 310 L282 310" stroke-width="10" stroke="rgba(27,27,27,.2)"/>' },
  dupatta: { hang: 0, hy: 466, df: [200, 440], dv: '130 360 140 110',
    body: '<path d="M144 80 C128 156 160 216 146 286 C134 350 158 404 150 446 Q200 466 250 446 C242 404 266 350 254 286 C240 216 272 156 256 80 Q200 62 144 80 Z"/>',
    folds: ['M172 130 C164 220 176 320 168 434', 'M232 130 C240 224 228 324 236 434', 'M202 150 C198 260 204 350 200 444'],
    stitch: ['M154 96 C142 164 168 216 156 284 C146 346 166 400 158 438', 'M246 96 C258 164 232 216 244 284 C254 346 234 400 242 438', 'M154 438 Q200 458 246 438'],
    front: '<path data-f="border" d="M162 108 C150 172 176 226 164 292 C156 348 174 398 168 430" fill="none" stroke-width="5" stroke="rgba(27,27,27,.3)" stroke-dasharray="10 7"/><path data-f="border" d="M238 108 C250 172 224 226 236 292 C244 348 226 398 232 430" fill="none" stroke-width="5" stroke="rgba(27,27,27,.3)" stroke-dasharray="10 7"/><path data-f="fringe" d="M162 450 v12 M176 454 v12 M190 456 v12 M204 456 v12 M218 454 v12 M232 452 v12 M244 448 v12" stroke-width="3"/>',
    back: '<path data-f="border" d="M162 108 C150 172 176 226 164 292" fill="none" stroke-width="5" stroke="rgba(27,27,27,.3)" stroke-dasharray="10 7"/><path data-f="fringe" d="M162 450 v12 M176 454 v12 M190 456 v12 M204 456 v12 M218 454 v12 M232 452 v12 M244 448 v12" stroke-width="3"/>' },
  belt: { hang: 0, hy: 444, df: [200, 252], dv: '148 168 104 164',
    body: '<path d="M176 116 L224 116 L218 428 Q200 444 182 428 Z"/>',
    folds: ['M190 140 C188 240 192 330 190 418', 'M212 140 C214 240 210 330 212 418'],
    stitch: ['M184 124 L187 424', 'M216 124 L213 424'],
    front: '<path data-f="buckle" d="M164 64 L236 64 Q244 64 244 72 L244 118 Q244 126 236 126 L164 126 Q156 126 156 118 L156 72 Q156 64 164 64 Z" fill="none" stroke="rgba(120,110,100,.85)" stroke-width="7"/><path data-f="buckle" d="M164 95 C182 99 206 101 226 99" fill="none" stroke="rgba(120,110,100,.85)" stroke-width="4"/><path data-f="keeper" d="M180 136 h40 v26 h-40 z" fill="rgba(27,27,27,.3)"/><circle data-f="holes" cx="200" cy="192" r="6" fill="rgba(27,27,27,.42)"/><circle data-f="holes" cx="200" cy="252" r="6" fill="rgba(27,27,27,.42)"/><circle data-f="holes" cx="200" cy="312" r="6" fill="rgba(27,27,27,.42)"/><circle data-f="holes" cx="200" cy="372" r="6" fill="rgba(27,27,27,.42)"/>',
    back: '<path data-f="buckle" d="M164 64 L236 64 Q244 64 244 72 L244 118 Q244 126 236 126 L164 126 Q156 126 156 118 L156 72 Q156 64 164 64 Z" fill="none" stroke="rgba(120,110,100,.85)" stroke-width="7"/><path data-f="keeper" d="M180 136 h40 v26 h-40 z" fill="rgba(27,27,27,.3)"/><path data-f="holes" d="M194 192 h12 M194 252 h12 M194 312 h12" fill="none" stroke-width="3"/>' },
  tie: { hang: 0, hy: 424, df: [200, 220], dv: '150 104 100 200',
    body: function(o){
      var xs = /set|\(3\)|three/i.test(String((o && o.title) || '')) ? [130, 270, 200] : [200], s = '', i, x;
      for (i = 0; i < xs.length; i++){
        x = xs[i];
        s += '<path d="M' + (x - 24) + ' 74 L' + (x + 24) + ' 74 L' + (x + 27) + ' 106 Q' + x + ' 120 ' + (x - 27) + ' 106 Z"/>';
        s += '<path d="M' + (x - 26) + ' 104 L' + (x + 26) + ' 104 L' + (x + 16) + ' 140 L' + (x + 38) + ' 372 Q' + x + ' 414 ' + (x - 38) + ' 372 L' + (x - 16) + ' 140 Z"/>';
      }
      return s;
    },
    folds: ['M200 150 L200 396', 'M178 160 C174 260 178 330 176 384', 'M222 160 C226 260 222 332 224 384'],
    stitch: ['M200 376 Q200 404 200 410'],
    front: function(o){
      var xs = /set|\(3\)|three/i.test(String((o && o.title) || '')) ? [130, 270, 200] : [200], s = '', i, x;
      for (i = 0; i < xs.length; i++){
        x = xs[i];
        s += '<path data-f="knot" d="M' + (x - 24) + ' 74 L' + (x + 24) + ' 74 L' + (x + 27) + ' 106 Q' + x + ' 120 ' + (x - 27) + ' 106 Z" fill="rgba(27,27,27,.2)"/>';
        s += '<path data-f="knot" d="M' + x + ' 124 L' + x + ' 360" fill="none" stroke-dasharray="8 7" stroke-width="1.8"/>';
      }
      return s;
    },
    back: function(o){
      var xs = /set|\(3\)|three/i.test(String((o && o.title) || '')) ? [130, 270, 200] : [200], s = '', i, x;
      for (i = 0; i < xs.length; i++){
        x = xs[i];
        s += '<path data-f="knot" d="M' + (x - 24) + ' 74 L' + (x + 24) + ' 74 L' + (x + 27) + ' 106 Q' + x + ' 120 ' + (x - 27) + ' 106 Z" fill="rgba(27,27,27,.26)"/>';
        s += '<path data-f="loop" d="M' + (x - 9) + ' 128 h18 v20 h-18 z" fill="rgba(27,27,27,.28)"/>';
      }
      return s;
    } },
  clutch: { hang: 0, hy: 358, df: [200, 256], dv: '158 198 84 96',
    body: '<path d="M76 186 L324 186 Q336 186 336 198 L336 322 Q336 344 314 348 L86 348 Q64 344 64 322 L64 198 Q64 186 76 186 Z"/>',
    folds: ['M104 216 C98 264 102 306 98 342', 'M296 216 C302 264 298 308 302 342'],
    stitch: ['M76 330 Q200 344 324 330'],
    front: '<path data-f="flap" d="M64 186 L336 186 L336 252 Q200 278 64 252 Z" fill="rgba(27,27,27,.14)"/><path d="M64 252 Q200 278 336 252" fill="none" stroke-dasharray="7 5"/><rect data-f="clasp" x="184" y="248" width="32" height="26" rx="5" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.5)" stroke-width="2.4"/><path data-f="strap" d="M332 214 C362 222 372 254 360 278 C352 294 340 302 328 304" fill="none" stroke-width="9" stroke="rgba(27,27,27,.45)"/>',
    back: '<path data-f="strap" d="M332 214 C362 222 372 254 360 278 C352 294 340 302 328 304" fill="none" stroke-width="9" stroke="rgba(27,27,27,.45)"/><path data-f="pocket" d="M136 272 h128 v52 h-128 z" fill="none" stroke-dasharray="7 5"/>' },
  tote: { hang: 0, hy: 452, df: [200, 168], dv: '74 106 252 132',
    body: '<path d="M92 148 L308 148 L286 400 Q200 444 114 400 Z"/>',
    folds: ['M136 184 C130 264 136 344 132 408', 'M264 184 C270 264 264 346 268 408', 'M200 200 C198 280 202 360 200 430'],
    stitch: ['M104 172 L296 172', 'M126 410 Q200 438 274 410'],
    front: '<path data-f="hem" d="M92 148 L308 148 L304 190 L96 190 Z" fill="rgba(27,27,27,.14)"/><path d="M96 190 L304 190" fill="none" stroke-dasharray="7 5"/><path data-f="handle" d="M124 150 C126 90 184 88 186 150" fill="none" stroke-width="13" stroke="rgba(27,27,27,.42)"/><path d="M124 150 C126 90 184 88 186 150" fill="none" stroke-width="4" stroke="rgba(255,255,255,.35)"/><path data-f="handle" d="M214 150 C216 90 274 90 276 150" fill="none" stroke-width="13" stroke="rgba(27,27,27,.42)"/><path d="M214 150 C216 90 274 90 276 150" fill="none" stroke-width="4" stroke="rgba(255,255,255,.35)"/>',
    back: '<path data-f="hem" d="M92 148 L308 148 L304 190 L96 190 Z" fill="rgba(27,27,27,.14)"/><path data-f="handle" d="M124 150 C126 90 184 88 186 150" fill="none" stroke-width="13" stroke="rgba(27,27,27,.42)"/><path data-f="handle" d="M214 150 C216 90 274 90 276 150" fill="none" stroke-width="13" stroke="rgba(27,27,27,.42)"/><path data-f="pocket" d="M150 240 h100 v70 h-100 z" fill="none" stroke-dasharray="7 5"/>' },
  sling: { hang: 0, hy: 428, df: [200, 274], dv: '148 212 104 108',
    body: '<path d="M128 212 Q200 182 272 212 L282 240 L284 372 Q200 416 116 372 L118 240 Z"/>',
    folds: ['M148 250 C142 308 148 358 144 396', 'M252 250 C258 308 252 360 256 396'],
    stitch: ['M124 384 Q200 412 276 384'],
    front: '<path data-f="strap" d="M128 214 C96 130 140 62 214 58 C288 54 334 104 326 172 C322 200 306 212 274 216" fill="none" stroke-width="13" stroke="rgba(27,27,27,.45)"/><path d="M128 214 C96 130 140 62 214 58 C288 54 334 104 326 172 C322 200 306 212 274 216" fill="none" stroke-width="4" stroke="rgba(255,255,255,.32)"/><rect data-f="strap" x="154" y="54" width="30" height="20" rx="4" fill="rgba(120,110,100,.85)" stroke="rgba(27,27,27,.45)" stroke-width="2.4"/><path data-f="flap" d="M126 210 Q200 182 274 210 L276 266 Q200 292 124 266 Z" fill="rgba(27,27,27,.14)"/><path d="M124 266 Q200 292 276 266" fill="none" stroke-dasharray="7 5"/><rect data-f="clasp" x="185" y="262" width="30" height="24" rx="5" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.5)" stroke-width="2.4"/>',
    back: '<path data-f="strap" d="M128 214 C96 130 140 62 214 58 C288 54 334 104 326 172 C322 200 306 212 274 216" fill="none" stroke-width="13" stroke="rgba(27,27,27,.45)"/><rect data-f="strap" x="154" y="54" width="30" height="20" rx="4" fill="rgba(120,110,100,.85)" stroke="rgba(27,27,27,.45)" stroke-width="2.4"/><path data-f="pocket" d="M152 306 h96 v52 h-96 z" fill="none" stroke-dasharray="7 5"/>' },
  pocket: { hang: 0, hy: 364, df: [200, 250], dv: '58 148 284 206',
    body: '<path d="M188 307 L71 282 L96 165 L213 190 Z"/><path d="M326 313 L207 330 L190 211 L309 194 Z"/>',
    folds: ['M130 210 C138 250 136 282 130 304', 'M252 232 C260 262 258 294 252 318'],
    stitch: ['M104 176 L203 198', 'M199 224 L300 206', 'M178 296 L84 275'],
    front: '<path data-f="fold" d="M96 165 L166 178 L124 224 Z" fill="rgba(27,27,27,.16)"/><path data-f="fold" d="M309 194 L250 204 L296 246 Z" fill="rgba(27,27,27,.16)"/>',
    back: '<path data-f="label" d="M232 250 h56 v34 h-56 z" fill="none" stroke-dasharray="6 5"/><path d="M110 250 L170 262" fill="none" stroke-dasharray="6 5"/>' },
  sharara: { hang: 0, hy: 488, df: [200, 110], dv: '148 46 104 134',
    body: '<path d="M150 244 L250 244 L254 302 L300 458 Q266 470 236 456 L214 320 L186 320 L164 456 Q134 470 100 458 L146 302 Z"/><path d="M150 66 L174 50 Q200 72 226 50 L250 66 L306 118 L276 144 L256 118 L264 288 Q200 310 136 288 L144 118 L124 144 L94 118 Z"/>',
    folds: ['M170 330 C160 380 146 424 134 454', 'M230 330 C240 380 254 424 266 454', 'M172 150 C166 210 174 258 170 302', 'M232 150 C238 210 230 260 234 302'],
    stitch: ['M142 296 Q200 318 258 296', 'M106 454 Q138 466 162 452', 'M238 452 Q262 466 294 454'],
    front: '<path data-f="neck" d="M176 54 Q200 78 224 54"/><path data-f="placket" d="M191 76 L191 190"/><path data-f="placket" d="M209 76 L209 190"/><circle cx="200" cy="96" r="3.8" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="132" r="3.8" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="168" r="3.8" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><path d="M200 320 L200 458" stroke-dasharray="7 5"/>',
    back: '<path data-f="neck" d="M176 52 Q200 62 224 52"/><path d="M197 44 h6 v16 h-6 z"/><path d="M200 320 L200 456" stroke-dasharray="7 5"/>' },
  vest: { hang: 1, hy: 326, df: [200, 186], dv: '148 128 104 156',
    body: '<path d="M154 78 L180 54 Q200 78 220 54 L246 78 L254 100 C264 150 268 230 264 288 Q200 312 136 288 C132 230 136 150 146 100 Z"/>',
    folds: ['M168 146 C162 200 172 250 166 292', 'M232 146 C238 200 228 252 234 292'],
    stitch: ['M140 294 Q200 318 260 294'],
    front: function(o){
      var t = String((o && o.title) || '');
      var btn = /nehru|waistcoat|button/i.test(t);
      var s = btn
        ? '<path data-f="collar" d="M174 52 L226 52 L226 66 Q200 82 174 66 Z" fill="rgba(27,27,27,.18)"/><path data-f="placket" d="M193 84 L193 286"/><path data-f="placket" d="M207 84 L207 286"/><circle cx="200" cy="114" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="158" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="202" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="246" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/>'
        : '<path data-f="collar" d="M180 54 Q180 40 200 38 Q220 40 220 54 Q200 78 180 54 Z" fill="rgba(27,27,27,.16)"/><path data-f="zip" d="M200 78 L200 302" stroke-width="6" stroke="rgba(27,27,27,.45)"/><path data-f="zip" d="M200 78 L200 302" stroke-width="3" stroke-dasharray="4 7" stroke="rgba(255,255,255,.6)"/>';
      return s + '<path data-f="hem" d="M136 274 Q200 300 264 274 L264 288 Q200 312 136 288 Z" fill="rgba(27,27,27,.18)"/><path data-f="armhole" d="M146 100 C138 148 136 206 138 254" fill="none" stroke-dasharray="7 5"/><path data-f="armhole" d="M254 100 C262 148 264 206 262 254" fill="none" stroke-dasharray="7 5"/><path data-f="pocket" d="M152 250 L186 242"/><path data-f="pocket" d="M248 250 L214 242"/>';
    },
    back: '<path data-f="collar" d="M180 54 Q200 66 220 54"/><path d="M200 80 L200 294" stroke-dasharray="7 5"/><path data-f="hem" d="M136 274 Q200 300 264 274 L264 288 Q200 312 136 288 Z" fill="rgba(27,27,27,.18)"/><path data-f="armhole" d="M146 100 C138 148 136 206 138 254" fill="none" stroke-dasharray="7 5"/><path data-f="armhole" d="M254 100 C262 148 264 206 262 254" fill="none" stroke-dasharray="7 5"/>' },
  anarkali: { hang: 1, hy: 486, df: [200, 78], dv: '148 34 104 116',
    body: '<path d="M150 66 L174 50 Q200 72 226 50 L250 66 L306 118 L276 144 L256 118 L254 200 Q200 218 146 200 L144 118 L124 144 L94 118 Z"/><path d="M146 198 Q200 216 254 198 C268 282 302 384 334 444 Q200 488 66 444 C98 384 132 282 146 198 Z"/>',
    folds: ['M176 240 C160 320 130 400 106 452', 'M200 232 L200 476', 'M224 240 C240 320 270 400 294 452', 'M156 244 C148 306 154 366 148 428', 'M244 244 C252 306 246 366 252 428'],
    stitch: ['M78 450 Q200 492 322 450'],
    front: '<path data-f="neck" d="M176 54 Q200 78 224 54"/><path data-f="waist" d="M146 200 Q200 218 254 200" stroke-dasharray="7 5"/>',
    back: '<path data-f="neck" d="M176 52 Q200 62 224 52"/><path d="M197 44 h6 v16 h-6 z"/><path d="M200 224 L200 470" stroke-dasharray="8 6"/>' },
  shirtdress: { hang: 1, hy: 410, df: [200, 140], dv: '150 56 100 180',
    body: '<path d="M150 66 L176 50 L200 76 L224 50 L250 66 L302 118 L276 146 L256 122 L264 388 Q200 412 136 388 L144 122 L122 146 L98 118 Z"/>',
    folds: ['M170 150 C162 230 174 320 168 396', 'M232 150 C240 232 228 322 234 396', 'M202 240 C198 300 204 356 200 400'],
    stitch: ['M144 396 Q200 420 256 396'],
    front: '<path data-f="collar" d="M176 50 L200 76 L190 104 L162 62 Z" fill="rgba(27,27,27,.16)"/><path data-f="collar" d="M224 50 L200 76 L210 104 L238 62 Z" fill="rgba(27,27,27,.16)"/><path data-f="placket" d="M190 80 L190 396"/><path data-f="placket" d="M210 80 L210 396"/><circle cx="200" cy="104" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="152" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="200" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="248" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="296" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle cx="200" cy="344" r="4" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><path data-f="pocket" d="M152 244 L186 236"/><path data-f="pocket" d="M248 244 L214 236"/>',
    back: '<path data-f="yoke" d="M152 104 L248 104" stroke-dasharray="7 5"/><path d="M200 104 L200 396" stroke-dasharray="7 5"/><path d="M196 58 h8 v16 h-8 z"/>' },
  culotte: { hang: 0, hy: 356, df: [200, 96], dv: '118 46 164 130',
    body: '<path d="M136 60 L264 60 L276 112 L292 336 L218 336 L206 216 L194 216 L182 336 L108 336 L124 112 Z"/>',
    folds: ['M160 140 C152 220 156 284 150 330', 'M240 140 C248 220 244 286 250 330'],
    stitch: ['M114 324 L184 324', 'M216 324 L286 324'],
    front: '<path data-f="waist" d="M136 60 L264 60 L266 92 L134 92 Z" fill="rgba(27,27,27,.16)"/><circle cx="200" cy="76" r="3.6" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><path data-f="fly" d="M200 92 C196 120 194 142 196 158" stroke-dasharray="7 5"/><path data-f="pocket" d="M146 98 Q172 124 198 104" stroke-dasharray="6 5"/><path data-f="pocket" d="M254 98 Q228 124 202 104" stroke-dasharray="6 5"/><path d="M200 158 L206 216"/><path data-f="belt" d="M158 60 v32" stroke-width="5"/><path data-f="belt" d="M242 60 v32" stroke-width="5"/>',
    back: '<path data-f="waist" d="M136 60 L264 60 L266 92 L134 92 Z" fill="rgba(27,27,27,.16)"/><path data-f="pocket" d="M144 104 h56 v52 h-56 z" stroke-dasharray="7 5"/><path data-f="pocket" d="M200 104 h56 v52 h-56 z" stroke-dasharray="7 5"/>' },
  peplum: { hang: 1, hy: 352, df: [200, 248], dv: '124 196 152 140',
    body: '<path d="M150 66 L174 50 Q200 70 226 50 L250 66 L304 116 L276 144 L256 120 L262 238 L296 320 Q200 350 104 320 L138 238 L144 120 L124 144 L94 116 Z"/>',
    folds: ['M170 130 C164 180 170 212 166 240', 'M232 130 C238 180 232 214 236 240', 'M180 254 C170 290 156 316 142 334', 'M220 254 C230 290 244 316 258 334'],
    stitch: ['M112 326 Q200 356 288 326'],
    front: '<path data-f="neck" d="M174 54 Q200 76 226 54"/><path data-f="waist" d="M138 238 Q200 258 262 238" stroke-dasharray="7 5"/>',
    back: '<path data-f="neck" d="M174 52 Q200 62 226 52"/><path d="M196 46 h8 v14 h-8 z"/><path data-f="waist" d="M138 238 Q200 258 262 238" stroke-dasharray="7 5"/>' },
  offshoulder: { hang: 1, hy: 334, df: [200, 100], dv: '96 56 208 116',
    body: '<path d="M124 96 Q200 74 276 96 L318 130 C326 160 322 190 310 206 L286 192 L272 134 L270 306 Q200 328 130 306 L128 134 L114 192 L90 206 C78 190 74 160 82 130 Z"/>',
    folds: ['M164 150 C158 210 166 264 160 312', 'M238 150 C244 212 236 266 242 312'],
    stitch: ['M136 314 Q200 336 264 314'],
    front: '<path data-f="neck" d="M124 96 Q200 74 276 96" fill="none" stroke-width="7" stroke="rgba(27,27,27,.3)"/><path data-f="neck" d="M130 114 Q200 92 270 114" fill="none" stroke-dasharray="8 6"/>',
    back: '<path data-f="neck" d="M124 96 Q200 74 276 96" fill="none" stroke-width="7" stroke="rgba(27,27,27,.3)"/><path d="M200 92 L200 300" stroke-dasharray="7 5"/>' },
  blazer: { hang: 0, hy: 368, df: [214, 190], dv: '148 52 134 180',
    body: '<path d="M150 66 L176 48 L200 76 L224 48 L250 66 L306 118 L278 148 L256 122 L264 348 Q200 368 136 348 L144 122 L122 148 L94 118 Z"/>',
    folds: ['M170 170 C164 240 174 300 168 352', 'M234 170 C242 242 232 302 238 352'],
    stitch: ['M144 356 Q200 376 256 356'],
    front: '<path data-f="lapel" d="M176 48 L200 76 L188 144 L156 78 Z" fill="rgba(27,27,27,.16)"/><path data-f="lapel" d="M224 48 L200 76 L212 144 L244 78 Z" fill="rgba(27,27,27,.16)"/><circle data-f="buttons" cx="214" cy="168" r="5" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><circle data-f="buttons" cx="214" cy="212" r="5" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><path data-f="pocket" d="M148 272 h44 v16 h-44 z" stroke-dasharray="6 5"/><path data-f="pocket" d="M208 272 h44 v16 h-44 z" stroke-dasharray="6 5"/>',
    back: '<path d="M200 78 L200 346" stroke-dasharray="8 6"/><path d="M174 46 L200 72 L226 46" fill="none"/>' },
  hoodie: { hang: 1, hy: 358, df: [200, 150], dv: '130 40 140 170',
    body: '<path d="M158 64 C152 32 248 32 242 64 C252 78 258 92 254 102 L146 102 C142 92 148 78 158 64 Z"/><path d="M150 96 L176 76 Q200 98 224 76 L250 96 L314 132 L286 178 L258 150 L266 330 Q200 352 134 330 L142 150 L114 178 L86 132 Z"/>',
    folds: ['M166 150 C158 216 170 280 164 336', 'M236 150 C244 218 232 282 238 336', 'M200 210 L200 340'],
    stitch: ['M138 338 Q200 360 262 338'],
    front: '<path data-f="hood" d="M158 76 Q200 112 242 76" fill="none" stroke-width="8" stroke="rgba(27,27,27,.35)"/><path d="M158 76 Q200 112 242 76" fill="none" stroke-width="3" stroke="rgba(255,255,255,.3)"/><path data-f="hood" d="M184 104 C182 126 180 144 182 158" fill="none" stroke-width="4" stroke="rgba(27,27,27,.4)"/><path data-f="hood" d="M216 104 C218 126 220 144 218 158" fill="none" stroke-width="4" stroke="rgba(27,27,27,.4)"/><circle cx="182" cy="162" r="4" fill="rgba(120,110,100,.85)"/><circle cx="218" cy="162" r="4" fill="rgba(120,110,100,.85)"/><path data-f="pocket" d="M156 256 L244 256 L252 318 L148 318 Z" fill="rgba(27,27,27,.12)" stroke-dasharray="8 6"/><path data-f="hem" d="M134 314 Q200 338 266 314 L266 330 Q200 352 134 330 Z" fill="rgba(27,27,27,.18)"/><path data-f="hem" d="M96 142 L126 166" stroke-width="6"/><path data-f="hem" d="M304 142 L274 166" stroke-width="6"/>',
    back: '<path data-f="hood" d="M158 64 C152 32 248 32 242 64 C248 78 252 92 250 102 L150 102 C148 92 152 78 158 64 Z" fill="rgba(27,27,27,.22)"/><path d="M200 40 L200 102" stroke-dasharray="7 5"/><path data-f="hem" d="M134 314 Q200 338 266 314 L266 330 Q200 352 134 330 Z" fill="rgba(27,27,27,.18)"/><path data-f="pocket" d="M156 256 L244 256 L252 318 L148 318 Z" fill="rgba(27,27,27,.12)" stroke-dasharray="8 6"/>' },
  jogger: { hang: 0, hy: 456, df: [200, 96], dv: '126 46 148 130',
    body: '<path d="M136 60 L264 60 L272 112 L264 424 L216 424 L206 220 L194 220 L184 424 L136 424 L128 112 Z"/>',
    folds: ['M162 150 C156 250 160 340 156 416', 'M238 150 C244 250 240 342 244 416'],
    stitch: ['M140 410 L180 410', 'M220 410 L260 410'],
    front: '<path data-f="waist" d="M136 60 L264 60 L266 96 L134 96 Z" fill="rgba(27,27,27,.16)"/><path data-f="waist" d="M150 64 v28 M166 64 v28 M182 64 v28 M198 64 v28 M214 64 v28 M230 64 v28 M246 64 v28" stroke-width="2" stroke="rgba(27,27,27,.25)"/><path data-f="pocket" d="M146 102 Q172 130 198 110" stroke-dasharray="6 5"/><path data-f="pocket" d="M254 102 Q228 130 202 110" stroke-dasharray="6 5"/><path d="M194 96 C192 112 190 124 192 136" fill="none" stroke-width="3.5" stroke="rgba(27,27,27,.45)"/><path d="M206 96 C208 112 210 124 208 136" fill="none" stroke-width="3.5" stroke="rgba(27,27,27,.45)"/><path data-f="cuff" d="M136 424 L184 424 L182 452 Q160 458 138 452 Z" fill="rgba(27,27,27,.16)"/><path data-f="cuff" d="M216 424 L264 424 L262 452 Q240 458 218 452 Z" fill="rgba(27,27,27,.16)"/><path data-f="cuff" d="M144 430 v18 M156 430 v20 M168 430 v20 M178 430 v18 M224 430 v18 M236 430 v20 M248 430 v20 M256 430 v18" stroke-width="2" stroke="rgba(27,27,27,.3)"/>',
    back: '<path data-f="waist" d="M136 60 L264 60 L266 96 L134 96 Z" fill="rgba(27,27,27,.16)"/><path data-f="pocket" d="M168 106 h64 v44 h-64 z" stroke-dasharray="7 5"/><path data-f="cuff" d="M136 424 L184 424 L182 452 Q160 458 138 452 Z" fill="rgba(27,27,27,.16)"/><path data-f="cuff" d="M216 424 L264 424 L262 452 Q240 458 218 452 Z" fill="rgba(27,27,27,.16)"/>' },
  skirt: { hang: 0, hy: 356, df: [200, 110], dv: '118 46 164 130',
    body: function(o){
      var t = String((o && o.title) || '');
      if (/tutu|tulle|puffy/i.test(t)) return '<path d="M136 60 L264 60 L272 108 C298 170 308 246 312 318 Q200 350 88 318 C92 246 102 170 128 108 Z"/>';
      return '<path d="M136 60 L264 60 L276 112 L300 330 Q200 356 100 330 L124 112 Z"/>';
    },
    folds: ['M162 140 C152 220 146 284 140 334', 'M238 140 C248 220 254 286 260 334', 'M200 150 L200 344'],
    stitch: ['M108 334 Q200 360 292 334'],
    front: function(o){
      var t = String((o && o.title) || '');
      var waist = '<path data-f="waist" d="M136 60 L264 60 L266 92 L134 92 Z" fill="rgba(27,27,27,.16)"/>';
      if (/tutu|tulle|puffy/i.test(t)){
        return waist + '<path data-f="hem" d="M104 268 Q200 300 296 268" stroke-dasharray="7 5"/><path data-f="hem" d="M94 300 Q200 332 306 300 L312 318 Q200 350 88 318 Z" fill="rgba(27,27,27,.12)"/><path d="M104 306 Q124 322 144 306 Q164 322 184 306 Q204 322 224 306 Q244 322 264 306 Q284 322 300 306" fill="none" stroke-dasharray="6 5"/>';
      }
      return waist + '<circle cx="200" cy="76" r="3.6" fill="rgba(255,255,255,.6)" stroke="rgba(27,27,27,.4)"/><path data-f="zip" d="M200 92 C197 118 196 138 198 154" stroke-dasharray="7 5"/><path data-f="pocket" d="M146 98 Q172 124 198 104" stroke-dasharray="6 5"/><path data-f="pocket" d="M254 98 Q228 124 202 104" stroke-dasharray="6 5"/><path data-f="hem" d="M104 318 Q200 344 296 318 L300 330 Q200 356 100 330 Z" fill="rgba(27,27,27,.14)"/>';
    },
    back: function(o){
      var t = String((o && o.title) || '');
      var waist = '<path data-f="waist" d="M136 60 L264 60 L266 92 L134 92 Z" fill="rgba(27,27,27,.16)"/>';
      if (/tutu|tulle|puffy/i.test(t)){
        return waist + '<path data-f="hem" d="M94 300 Q200 332 306 300 L312 318 Q200 350 88 318 Z" fill="rgba(27,27,27,.12)"/>';
      }
      return waist + '<path data-f="pocket" d="M168 104 h64 v52 h-64 z" stroke-dasharray="7 5"/><path data-f="zip" d="M200 94 L200 330" stroke-dasharray="7 5"/><path data-f="hem" d="M104 318 Q200 344 296 318 L300 330 Q200 356 100 330 Z" fill="rgba(27,27,27,.14)"/>';
    } },
  dungaree: { hang: 0, hy: 344, df: [200, 58], dv: '140 2 120 170',
    body: '<path d="M136 60 L264 60 L272 110 L266 330 L216 330 L206 208 L194 208 L184 330 L134 330 L128 110 Z"/><path data-f="bib" d="M156 20 L244 20 L246 100 L154 100 Z"/><path data-f="strap" d="M156 20 C151 13 148 7 147 3 L166 3 C166 10 170 16 176 20 Z"/><path data-f="strap" d="M244 20 C249 13 252 7 253 3 L234 3 C234 10 230 16 224 20 Z"/>',
    folds: ['M164 140 C158 220 164 284 160 322', 'M236 140 C244 220 238 286 242 322'],
    stitch: ['M140 316 L178 316', 'M222 316 L260 316'],
    front: '<path data-f="waist" d="M136 60 L264 60 L266 92 L134 92 Z" fill="rgba(27,27,27,.16)"/><path data-f="fly" d="M200 100 C196 124 194 142 196 156" stroke-dasharray="7 5"/><path data-f="pocket" d="M146 98 Q172 124 198 108" stroke-dasharray="6 5"/><path data-f="pocket" d="M254 98 Q228 124 202 108" stroke-dasharray="6 5"/><path d="M200 156 L206 208"/><path data-f="pocket" d="M176 44 h48 v30 h-48 z" stroke-dasharray="6 5"/><path data-f="cuff" d="M133 302 L185 302 L184 330 L134 330 Z" fill="rgba(27,27,27,.14)"/><path data-f="cuff" d="M215 302 L267 302 L266 330 L216 330 Z" fill="rgba(27,27,27,.14)"/><path data-f="cuff" d="M144 306 v20 M158 306 v22 M172 306 v22 M228 306 v22 M242 306 v22 M256 306 v20" stroke-width="2" stroke="rgba(27,27,27,.3)"/>',
    back: '<path data-f="waist" d="M136 60 L264 60 L266 92 L134 92 Z" fill="rgba(27,27,27,.16)"/><path data-f="pocket" d="M144 104 h56 v52 h-56 z" stroke-dasharray="7 5"/><path data-f="pocket" d="M200 104 h56 v52 h-56 z" stroke-dasharray="7 5"/><path data-f="cuff" d="M133 302 L185 302 L184 330 L134 330 Z" fill="rgba(27,27,27,.14)"/><path data-f="cuff" d="M215 302 L267 302 L266 330 L216 330 Z" fill="rgba(27,27,27,.14)"/>' }
};

function refineShape(p, k){
  var t = String((p && p.title) || '');
  if (/shirt.?dress/i.test(t)) return 'shirtdress';
  if (/sharara/i.test(t)) return 'sharara';
  if (/anarkali/i.test(t)) return 'anarkali';
  if (/\bvest\b|gilet|nehru|waistcoat/i.test(t)) return 'vest';
  if (/culotte/i.test(t)) return 'culotte';
  if (/\bshorts\b/i.test(t)) return 'culotte';
  if (/\bskirt\b/i.test(t)) return 'skirt';
  if (/\bsherwani\b/i.test(t)) return 'ethnic';
  if (/dungaree|overall/i.test(t)) return 'dungaree';
  if (/leggings/i.test(t)) return 'ethnic';
  if (/night.?suit/i.test(t)) return 'sharara';
  if (/track ?pant/i.test(t)) return 'jogger';
  if (k === 'kurta' && /\bset\b/i.test(t)) return 'ethnic';
  if (/peplum/i.test(t)) return 'peplum';
  if (/off.?shoulder|bardot/i.test(t)) return 'offshoulder';
  if (/blazer|tuxedo/i.test(t)) return 'blazer';
  if (/hoodie|sweatshirt/i.test(t)) return 'hoodie';
  if (k === 'kids' && /puffer|jacket|bomber|\bcoat\b/i.test(t)) return 'jacket';
  if (k === 'kids' && /overshirt/i.test(t)) return 'shirt';
  if (k === 'kids' && /\bshirt\b/i.test(t) && !/t-?shirt/i.test(t)) return 'shirt';
  if (k === 'coat' && /puffer|bomber|liner|quarter.?zip|windbreaker/i.test(t)) return 'jacket';
  if (k === 'ethnic' && /kurta/i.test(t) && !/set|pyjama|sherwani/i.test(t)) return 'kurta';
  if (/jogger/i.test(t)) return 'jogger';
  if (k === 'top' && /\bshirt\b/i.test(t)) return 'shirt';
  return k;
}

function accessoryShape(p){
  var t = String((p && p.title) || ''), s = String((p && p.sub) || '');
  if (/pocket square/i.test(t)) return 'pocket';
  if (/dupatta/i.test(t) || s === 'Dupattas') return 'dupatta';
  if (/\bbelt\b/i.test(t) || s === 'Belts') return 'belt';
  if (/\btie\b/i.test(t) || s === 'Ties') return 'tie';
  if (/clutch/i.test(t)) return 'clutch';
  if (/tote|shopper/i.test(t)) return 'tote';
  if (/sling|crossbody/i.test(t)) return 'sling';
  if (/stole|scarf|muffler|wrap/i.test(t) || s === 'Stoles & Scarves') return 'scarf';
  if (/bag|satchel|handbag|purse/i.test(t) || s === 'Bags') return 'accessory';
  return 'accessory';
}

function shapeKey(p){
  if (p && p.shape === 'accessory') return accessoryShape(p);
  var k = '';
  if (p && p.shape && GARMENTS[p.shape]) k = p.shape;
  else {
    var sub = (p && p.sub) || '';
    if (/Dress/i.test(sub)) k = 'dress';
    else if (/Saree/i.test(sub)) k = 'saree';
    else if (/Lehenga/i.test(sub)) k = 'lehenga';
    else if (/Bottom/i.test(sub)) k = 'trousers';
    else if (/Jacket/i.test(sub)) k = 'jacket';
    else if (/Shirt/i.test(sub)) k = 'shirt';
    else if (/T-shirt/i.test(sub)) k = 'tee';
    else if (/Kurta/i.test(sub)) k = 'kurta';
    else k = 'top';
  }
  return refineShape(p, k);
}

/* feature markers each template must render (data-f attributes) — asserted by svg-check.js */
var FEATURES_REQUIRED = {
  dress: ['waist'], top: ['neck'], tee: ['neck'], shirt: ['collar', 'placket', 'buttons'],
  kurta: ['collar', 'placket', 'buttons', 'slit'], saree: ['pallu', 'waist'], lehenga: ['waist'],
  trousers: ['waist', 'belt', 'pocket', 'fly'], jacket: ['lapel', 'zip', 'hem', 'pocket'],
  coat: ['lapel', 'belt', 'buttons', 'pocket'], suit: ['lapel', 'buttons', 'pocket'],
  ethnic: ['collar', 'placket', 'buttons'], kids: ['neck', 'buttons'],
  accessory: ['handle', 'flap', 'clasp'], scarf: ['fringe', 'stripe'], dupatta: ['fringe', 'border'],
  belt: ['buckle', 'keeper', 'holes'], tie: ['knot'], clutch: ['flap', 'clasp', 'strap'],
  tote: ['handle', 'hem'], sling: ['strap', 'flap', 'clasp'], pocket: ['fold'],
  sharara: ['neck', 'placket', 'buttons'], vest: ['collar', 'hem', 'pocket', 'armhole'],
  anarkali: ['neck', 'waist'], shirtdress: ['collar', 'placket', 'buttons', 'pocket'],
  culotte: ['waist', 'belt', 'pocket', 'fly'], peplum: ['neck', 'waist'], offshoulder: ['neck'],
  blazer: ['lapel', 'buttons', 'pocket'], hoodie: ['hood', 'pocket', 'hem'],
  jogger: ['waist', 'pocket', 'cuff'], skirt: ['waist', 'hem'],
  dungaree: ['bib', 'strap', 'waist', 'pocket', 'fly']
};

/* material/texture recipes: {defs, over, struct, stitch} driven by product material/title */
function texFor(p, k, P, lod){
  var mat = String((p && (p.material || p.mat)) || '');
  var ttl = String((p && p.title) || '');
  var full = lod !== 'card';
  var defs = '', over = '', struct = '', stitch = '', n = 0;
  function pat(w, h, body){
    n++;
    defs += '<pattern id="' + k + 't' + n + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse">' + body + '</pattern>';
    over += '<rect x="-10" y="-10" width="420" height="520" fill="url(#' + k + 't' + n + ')"/>';
  }
  function sheen(op){
    defs += '<linearGradient id="' + k + 'sh" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="' + P.hiW + '" stop-opacity="0"/><stop offset=".45" stop-color="' + P.hiW + '" stop-opacity="' + op + '"/><stop offset=".64" stop-color="' + P.hiW + '" stop-opacity="0"/><stop offset="1" stop-color="' + P.hiW + '" stop-opacity="0"/></linearGradient>';
    over += '<rect x="-10" y="-10" width="420" height="520" fill="url(#' + k + 'sh)"/>';
  }
  if (/Denim/i.test(mat)){
    pat(7, 7, '<path d="M0 7 L7 0 M-7 7 L7 -7 M0 14 L14 0" stroke="' + P.sh + '" stroke-width="1" opacity=".45"/>');
    stitch = 'rgba(201,164,92,.8)';
  } else if (/Satin|Silk|Crepe|Georgette|Chanderi|Organza|Viscose/i.test(mat)){
    sheen(full ? .34 : .26);
  } else if (/Sequin/i.test(mat)){
    pat(9, 9, '<circle cx="2" cy="2" r="1.3" fill="' + P.hiW + '" opacity=".55"/><circle cx="6.5" cy="6.5" r="1.1" fill="' + P.hi + '" opacity=".5"/>');
    sheen(full ? .3 : .22);
  } else if (/Brocade/i.test(mat)){
    pat(14, 14, '<path d="M7 2 L12 7 L7 12 L2 7 Z" fill="none" stroke="' + P.hi + '" stroke-width="1.1" opacity=".5"/>');
    sheen(.24);
  } else if (/Velvet/i.test(mat)){
    pat(8, 8, '<rect width="3" height="8" fill="' + P.dark + '" opacity=".24"/><rect x="4.5" width="1" height="8" fill="' + P.hiW + '" opacity=".14"/>');
    sheen(full ? .36 : .28);
  } else if (/Wool|Pashmina/i.test(mat)){
    pat(10, 10, '<circle cx="2.5" cy="3" r="1.3" fill="' + P.dark + '" opacity=".3"/><circle cx="7" cy="8" r="1.5" fill="' + P.hi + '" opacity=".3"/>');
  } else if (/Fleece/i.test(mat)){
    pat(8, 8, '<circle cx="2" cy="2" r="1.8" fill="' + P.hi + '" opacity=".35"/><circle cx="6" cy="5.5" r="1.4" fill="' + P.dark + '" opacity=".28"/>');
  } else if (/Leather/i.test(mat)){
    pat(8, 8, '<circle cx="2" cy="2" r="1.7" fill="' + P.dark + '" opacity=".32"/><circle cx="6" cy="6" r="1.7" fill="' + P.sh + '" opacity=".3"/>');
    sheen(full ? .3 : .2);
  } else if (/Linen/i.test(mat)){
    pat(12, 6, '<path d="M1 2 h5" stroke="' + P.hi + '" stroke-width="1" opacity=".5"/><path d="M7 4 h4" stroke="' + P.dark + '" stroke-width="1" opacity=".4"/>');
  } else if (/Straw/i.test(mat)){
    pat(8, 8, '<rect width="4" height="4" fill="' + P.dark + '" opacity=".22"/><rect x="4" y="4" width="4" height="4" fill="' + P.dark + '" opacity=".22"/>');
  } else if (/Net/i.test(mat)){
    pat(7, 7, '<path d="M0 0 H7 M0 0 V7" stroke="' + P.dark + '" stroke-width="1.2" opacity=".5"/>');
  } else if (/Nylon|Polyester|Poly Blend|Poly Viscose|Fabric/i.test(mat)){
    sheen(.14);
  } else {
    pat(6, 6, '<path d="M0 0 H6" stroke="' + P.hi + '" stroke-width=".8" opacity=".22"/><path d="M0 0 V6" stroke="' + P.dark + '" stroke-width=".8" opacity=".18"/>');
  }
  if (/stud/i.test(ttl)){
    pat(400, 40, '<circle cx="190" cy="20" r="4.4" fill="' + P.hiW + '" opacity=".8"/><circle cx="190" cy="20" r="2.2" fill="' + P.hi + '"/><circle cx="210" cy="20" r="4.4" fill="' + P.hiW + '" opacity=".8"/><circle cx="210" cy="20" r="2.2" fill="' + P.hi + '"/>');
  }
  if (/bandhani/i.test(ttl)){
    pat(16, 16, '<circle cx="4" cy="4" r="2.6" fill="none" stroke="' + P.hiW + '" stroke-width="1.6" opacity=".6"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="' + P.hiW + '" stroke-width="1.6" opacity=".6"/>');
  }
  if (/phulkari/i.test(ttl)){
    pat(12, 12, '<path d="M6 1 L11 6 L6 11 L1 6 Z" fill="none" stroke="' + P.hi + '" stroke-width="1.4" opacity=".65"/>');
  }
  if (/plaid|check/i.test(ttl)){
    pat(36, 36, '<rect y="8" width="36" height="7" fill="' + P.dark + '" opacity=".3"/><rect x="8" width="7" height="36" fill="' + P.dark + '" opacity=".3"/><rect y="26" width="36" height="2.5" fill="' + P.hiW + '" opacity=".55"/><rect x="26" width="2.5" height="36" fill="' + P.hiW + '" opacity=".55"/>');
  }
  if (/embroider|zari|gota|chikankari/i.test(ttl)){
    pat(14, 14, '<path d="M7 3 L9.4 7 L7 11 L4.6 7 Z" fill="' + P.hi + '" opacity=".7"/><path d="M0 0 L2 0 M0 0 L0 2 M14 14 L12 14 M14 14 L14 12" stroke="' + P.hiW + '" stroke-width="1.4" opacity=".5"/>');
  }
  if (/block.?print/i.test(ttl)){
    pat(18, 18, '<rect x="3" y="3" width="7" height="7" fill="none" stroke="' + P.hi + '" stroke-width="1.3" opacity=".75"/><circle cx="14" cy="14" r="1.9" fill="' + P.hi + '" opacity=".6"/><path d="M12 3 h4 M3 12 v4" stroke="' + P.hiW + '" stroke-width="1.2" opacity=".5"/>');
  }
  if (/sweater|cardigan|jumper|knit|turtleneck|cowl|hoodie/i.test(ttl)){
    pat(7, 7, '<path d="M0 0 V7" stroke="' + P.dark + '" stroke-width="1.8" opacity=".3"/><path d="M3.5 0 V7" stroke="' + P.hi + '" stroke-width="1.2" opacity=".32"/>');
  }
  if (/puffer|quilted|gilet/i.test(ttl)){
    var ch = '', y;
    for (y = 42; y < 470; y += 34) ch += '<path d="M-10 ' + y + ' H410"/>';
    struct = '<g fill="none" stroke="' + P.shDeep + '" stroke-width="3" opacity=".4">' + ch + '</g>' +
      '<g fill="none" stroke="' + P.hiW + '" stroke-width="2" opacity=".3" transform="translate(0,3.5)">' + ch + '</g>';
  }
  return { defs: defs, over: over, struct: struct, stitch: stitch };
}
/* tapered crease pairs: wide soft shadow + stronger mid accent + offset highlight, varied per product */
function foldLayer(fd, P, k, dens, full, seed){
  var dark = '', mid = '', light = '';
  for (var i = 0; i < fd.length; i++){
    var d = fd[i];
    var j = hashStr(seed + ':' + i);
    var a = 8 + (j % 18);
    var b = 34 + ((j >> 4) % 26);
    var c2 = 6 + ((j >> 9) % 14);
    var len = 44 + ((j >> 13) % 20);
    var o1 = Math.min(.3, (.09 + (j % 4) * .025) * dens).toFixed(3);
    var o2 = Math.min(.34, (.13 + ((j >> 6) % 4) * .03) * dens).toFixed(3);
    var o3 = Math.min(.5, .3 * dens).toFixed(3);
    var fl = full ? ' filter="url(#' + k + 'b1)"' : '';
    dark += '<path d="' + d + '" stroke-opacity="' + o1 + '"' + fl + '/>';
    if (full) mid += '<path d="' + d + '" pathLength="100" stroke-dasharray="0 ' + a + ' ' + b + ' 100" stroke-opacity="' + o2 + '"' + fl + '/>';
    light += '<path d="' + d + '" transform="translate(-2.4,-1.8)" pathLength="100" stroke-dasharray="0 ' + c2 + ' ' + len + ' 100" stroke-opacity="' + o3 + '"/>';
  }
  return { dark: dark, mid: mid, light: light };
}
/* warm-shift detail colors; center buttons become metallic; dx shifts closure side by category */
function detailMarkup(s, P, dx, k){
  if (!s) return '';
  s = s.replace(/rgba\(255,255,255,/g, 'rgba(255,253,246,');
  s = s.replace(/rgba\(27,27,27,/g, 'rgba(34,28,24,');
  s = s.replace(/rgba\(0,0,0,/g, 'rgba(28,22,18,');
  s = s.replace(/<circle cx="200" cy="(\d+(?:\.\d+)?)" r="([\d.]+)" fill="rgba\(255,253,246,\.6\)" stroke="rgba\(34,28,24,\.4\)"\/>/g,
    function(m, cy, r){
      var x = 200 + dx;
      return '<g data-f="buttons"><circle cx="' + x + '" cy="' + cy + '" r="' + r + '" fill="url(#' + k + 'bt)" stroke="rgba(34,28,24,.5)" stroke-width="1.2"/><circle cx="' + x + '" cy="' + cy + '" r="' + (Math.round(r * 4) / 10).toFixed(1) + '" fill="none" stroke="rgba(34,28,24,.55)" stroke-width="1"/></g>';
    });
  return s;
}
/* optional hang-tag view (tagsAttached products) — tag carries no text */
function tagOverlay(g, P){
  var th = g.tagThread || 'M204 66 C230 80 252 90 270 102';
  return '<g data-f="tag">' +
    '<path d="' + th + '" fill="none" stroke="#8E8270" stroke-width="2.4" stroke-linecap="round"/>' +
    '<g transform="rotate(-7 276 142)">' +
      '<rect x="248" y="104" width="56" height="78" rx="7" fill="' + P.light + '" stroke="' + P.edge + '" stroke-width="2"/>' +
      '<rect x="254" y="110" width="44" height="66" rx="4" fill="none" stroke="' + P.dark + '" stroke-width="1.4" stroke-dasharray="5 4"/>' +
      '<circle cx="276" cy="118" r="5.5" fill="#ECE6DA" stroke="' + P.edge + '" stroke-width="1.6"/>' +
    '</g></g>';
}

function svgFor(shape, hex, label, v, opts){
  opts = opts || {};
  var g = GARMENTS[shape] || GARMENTS.top;
  var bodyS = typeof g.body === 'function' ? g.body(opts) : (g.body || '');
  var frontS = typeof g.front === 'function' ? g.front(opts) : (g.front || '');
  var backS = typeof g.back === 'function' ? g.back(opts) : (g.back || '');
  var P = pal(hex);
  var base = P.base;
  var full = opts.lod !== 'card';
  var back = v === 1;
  var tagView = v === 3;
  var cat = String(opts.cat || '');
  var kids = shape === 'kids' || /Kids/.test(cat);
  var dx = kids ? 0 : cat === 'Women' ? -3 : cat === 'Men' ? 3 : 0;
  var cond = String(opts.cond || '');
  var dens = /like new/i.test(cond) ? .72 : /good/i.test(cond) ? 1.2 : 1;
  var alt = esc(label || 'Garment illustration');
  var k = 'i' + (hashStr(shape + '|' + base + '|' + v + '|' + (opts.lod || '') + '|' + (opts.title || '')) % 2176782336).toString(36);
  var dv = g.dv || '96 26 208 260';
  var vb = v === 2 ? dv : '0 0 400 500';
  var df = g.df || [196, 92];
  var rot = ((hashStr(shape + base + (opts.title || '')) % 9) - 4) * .09;
  var bits = ['Generated garment illustration'];
  if (opts.mat) bits.push(String(opts.mat));
  if (cat) bits.push(cat);
  if (cond) bits.push(cond + ' condition');
  var desc = esc(bits.join(', '));
  var i, m, ds = [], re = /d="([^"]+)"/g;
  while ((m = re.exec(bodyS))) ds.push(m[1]);
  var clipP = '', aoP = '', rimP = '';
  for (i = 0; i < ds.length; i++){
    clipP += '<path d="' + ds[i] + '"/>';
    aoP += '<path d="' + ds[i] + '"/>';
    rimP += '<path d="' + ds[i] + '"/>';
  }
  var tex = texFor(opts, k, P, full ? 'full' : 'card');
  if (tex.stitch) P.stitch = tex.stitch;
  var defs = '<defs>' +
    '<linearGradient id="' + k + 'b" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="' + P.lighter + '"/><stop offset=".42" stop-color="' + P.base + '"/><stop offset="1" stop-color="' + P.dark + '"/></linearGradient>' +
    '<linearGradient id="' + k + 's" x1="0" y1="0" x2="1" y2=".35"><stop offset="0" stop-color="' + P.hiW + '" stop-opacity=".34"/><stop offset=".38" stop-color="' + P.hiW + '" stop-opacity="0"/><stop offset=".7" stop-color="' + P.shDeep + '" stop-opacity="0"/><stop offset="1" stop-color="' + P.shDeep + '" stop-opacity=".34"/></linearGradient>' +
    '<radialGradient id="' + k + 'l" cx=".33" cy=".17" r=".82"><stop offset="0" stop-color="' + P.hiW + '" stop-opacity=".55"/><stop offset="1" stop-color="' + P.hiW + '" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="' + k + 'v" cx=".5" cy=".45" r=".78"><stop offset=".55" stop-color="#241E18" stop-opacity="0"/><stop offset="1" stop-color="#241E18" stop-opacity=".16"/></radialGradient>' +
    '<radialGradient id="' + k + 'f" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#241E18" stop-opacity=".34"/><stop offset="1" stop-color="#241E18" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="' + k + 'f2" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#241E18" stop-opacity=".16"/><stop offset="1" stop-color="#241E18" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="' + k + 'g" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#FBF9F4"/><stop offset="1" stop-color="#ECE6DA"/></linearGradient>' +
    '<radialGradient id="' + k + 'p" cx=".45" cy=".42" r=".55"><stop offset="0" stop-color="#FFFDF6" stop-opacity=".9"/><stop offset="1" stop-color="#FFFDF6" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="' + k + 'bt" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="' + P.hiW + '"/><stop offset=".5" stop-color="' + P.light + '"/><stop offset="1" stop-color="' + P.dark + '"/></radialGradient>' +
    '<filter id="' + k + 'a" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>' +
    '<filter id="' + k + 'b1" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2"/></filter>' +
    tex.defs +
    '<clipPath id="' + k + 'c">' + clipP + '</clipPath>' +
    '</defs>';
  if (full){
    defs += '<defs>' +
      '<linearGradient id="' + k + 'r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + P.hiW + '" stop-opacity=".55"/><stop offset=".4" stop-color="' + P.hiW + '" stop-opacity=".12"/><stop offset="1" stop-color="' + P.hiW + '" stop-opacity="0"/></linearGradient>' +
      '<filter id="' + k + 'n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.16 0 0 0 0 0.14 0 0 0 0 0.11 0 0 0 1 0"/></filter>' +
      '</defs>';
  }
  var foldsS = typeof g.folds === 'function' ? g.folds(opts) : (g.folds || []);
  var f = foldLayer(foldsS, P, k, dens, full, shape + base);
  var det = detailMarkup(back ? backS : frontS, P, dx, k);
  var stitches = (typeof g.stitch === 'function' ? g.stitch(opts) : (g.stitch || [])).join('');
  var hanger = g.hang ?
    '<g fill="none" stroke="rgba(58,44,26,.9)" stroke-width="7.2" stroke-linecap="round">' +
      '<path d="M200 54 C200 35 221 32 223 45 C225 58 209 64 203 55"/>' +
      '<path d="M200 58 L120 88"/><path d="M200 58 L280 88"/></g>' +
    '<g fill="none" stroke="#B49A6B" stroke-width="4.6" stroke-linecap="round">' +
      '<path d="M200 54 C200 35 221 32 223 45 C225 58 209 64 203 55"/>' +
      '<path d="M200 58 L120 88"/><path d="M200 58 L280 88"/></g>' +
    '<g fill="none" stroke="rgba(246,231,196,.85)" stroke-width="1.5" stroke-linecap="round">' +
      '<path d="M198 52 C198 38 215 36 218 46"/><path d="M198 62 L126 87"/><path d="M202 62 L274 87"/></g>' +
    '<circle cx="200" cy="58" r="5.6" fill="#8E7A55" stroke="rgba(58,44,26,.95)" stroke-width="1.8"/>' +
    '<circle cx="198.2" cy="56.2" r="1.6" fill="rgba(246,231,196,.8)"/>' : '';
  var garment = '<g' + (back ? ' transform="translate(400,0) scale(-1,1)"' : '') + '>' +
    '<g transform="rotate(' + rot.toFixed(2) + ' 200 280)">' +
      '<g fill="url(#' + k + 'b)" stroke="' + P.edge + '" stroke-width="2.4" stroke-linejoin="round">' + bodyS + '</g>' +
      '<g clip-path="url(#' + k + 'c)">' +
        '<rect x="-10" y="-10" width="420" height="520" fill="url(#' + k + 's)"/>' +
        '<rect x="-10" y="-10" width="420" height="520" fill="url(#' + k + 'l)"/>' +
        tex.over +
        tex.struct +
        '<g fill="none" stroke="' + P.shDeep + '" stroke-width="11" opacity=".24" filter="url(#' + k + 'a)">' + aoP + '</g>' +
        '<g fill="none" stroke="' + P.sh + '" stroke-width="8.5" stroke-linecap="round">' + f.dark + '</g>' +
        '<g fill="none" stroke="' + P.shDeep + '" stroke-width="3.6" stroke-linecap="round">' + f.mid + '</g>' +
        '<g fill="none" stroke="' + P.hiW + '" stroke-width="2.4" stroke-linecap="round">' + f.light + '</g>' +
        '<g fill="none" stroke="' + P.stitch + '" stroke-width="1.6" stroke-dasharray="7 5" stroke-linecap="round">' + stitches + '</g>' +
        (full ? '<g fill="none" stroke="url(#' + k + 'r)" stroke-width="3">' + rimP + '</g>' : '') +
      '</g>' +
      '<g fill="none" stroke="rgba(34,28,24,.55)" stroke-width="2.2" stroke-linejoin="round">' + det + '</g>' +
    '</g>' +
  '</g>';
  var tints = { Women: '#FBF4E8', Men: '#EDF0F2', Kids: '#FDF7E4', Accessories: '#F1EFEA' };
  var bg = '<rect width="400" height="500" fill="url(#' + k + 'g)"/>' +
    (tints[cat] ? '<rect width="400" height="500" fill="' + tints[cat] + '" opacity=".55"/>' : '') +
    '<rect width="400" height="500" fill="url(#' + k + 'p)"/>' +
    '<ellipse cx="200" cy="' + (g.hy || 468) + '" rx="172" ry="27" fill="url(#' + k + 'f2)"/>' +
    '<ellipse cx="200" cy="' + (g.hy || 468) + '" rx="130" ry="16" fill="url(#' + k + 'f)"/>';
  var dvp = dv.split(/\s+/);
  var ring = v === 2 ?
    '<circle cx="' + df[0] + '" cy="' + df[1] + '" r="' + Math.round(Math.min(Number(dvp[2]), Number(dvp[3])) * .27) +
    '" fill="none" stroke="rgba(34,28,24,.55)" stroke-width="4" stroke-dasharray="12 9"/>' : '';
  var grain = full ? '<rect width="400" height="500" filter="url(#' + k + 'n)" opacity=".1"/>' : '';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="600" height="750" role="img" aria-label="' + alt + '">' +
    '<title>' + alt + '</title><desc>' + desc + '</desc>' +
    defs + bg + hanger + garment +
    (tagView ? tagOverlay(g, P) : '') +
    ring + grain +
    '<rect width="400" height="500" fill="url(#' + k + 'v)"/></svg>';
}

var svgCache = {};
var PCFG = DATA.photoCfg || { map: {} };
var photoReg = {};

function svgUri(p, v, ld, alt){
  var key = (p.id || p.title || 'x') + '|' + v + '|' + ld + '|' + (p.colorHex || '') + '|' + (p.shape || '') + '|' + (p.material || '') + '|' + (p.category || '') + '|' + (p.condition || '');
  var svg = svgCache[key];
  if (!svg){
    svg = svgFor(shapeKey(p), p.colorHex || '#8A8A8A', alt, v,
      { lod: ld, cat: p.category, cond: p.condition, mat: p.material, title: p.title });
    var n = 0;
    for (var z in svgCache) n++;
    if (n > 600) svgCache = {};
    svgCache[key] = svg;
  }
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/* photo file(s) for product p, variant v: [file] from PHOTO_CFG.map, or [] = SVG only */
function photoCandidates(p, v){
  if (!p) return [];
  if (v === 0 && p.photo) return [p.photo];
  var m = p.id && PCFG.map && PCFG.map[p.id];
  return (m && m[v]) ? [m[v]] : [];
}
function catPhoto(c){ return (PCFG.cats && PCFG.cats[c]) || ''; }

function img(p, variantIdx, lod){
  if (!p) return '';
  var v = variantIdx || 0;
  var ld = lod === 'card' ? 'card' : 'full';
  var alt = (p.brand ? p.brand + ' ' : '') + (p.title || 'Item') +
    (v === 1 ? ' (back view)' : v === 2 ? ' (detail view)' : v === 3 ? ' (tags attached)' : ' (front view)');
  /* seller-uploaded photos (data: URLs) */
  if (p.images && p.images.length && /^data:/.test(String(p.images[0] || ''))){
    var src = p.images[Math.min(v, p.images.length - 1)] || p.images[0];
    return '<img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" width="400" height="500">';
  }
  var cands = photoCandidates(p, v);
  if (!cands.length){
    return '<img class="rw-photo" src="' + svgUri(p, v, ld, alt) + '" alt="' + esc(alt) + '" width="600" height="750">';
  }
  var rk = (p.id || p.title || 'x') + '|' + v + '|' + ld;
  photoReg[rk] = { p: { id: p.id, title: p.title, brand: p.brand, colorHex: p.colorHex, shape: p.shape, material: p.material, category: p.category, condition: p.condition }, v: v, ld: ld, alt: alt, c: cands };
  return '<img class="rw-photo" src="' + esc(cands[0]) + '" data-rwp="' + esc(rk) + '" data-rwi="1" alt="' + esc(alt) + '" loading="lazy" width="600" height="750">';
}

/* a photo failed to load: try next extension, then fall back to the generated SVG */
document.addEventListener('error', function(e){
  var t = e.target;
  if (!t || t.tagName !== 'IMG' || !t.getAttribute('data-rwp')) return;
  var r = photoReg[t.getAttribute('data-rwp')];
  if (!r){ t.removeAttribute('data-rwp'); return; }
  var i = parseInt(t.getAttribute('data-rwi'), 10) || 0;
  if (i < r.c.length){
    t.setAttribute('data-rwi', String(i + 1));
    t.src = r.c[i];
    return;
  }
  t.removeAttribute('data-rwp');
  t.src = svgUri(r.p, r.v, r.ld, r.alt);
}, true);

function stars(rating){
  var r = Math.round(Number(rating) || 0);
  var out = '';
  for (var i = 1; i <= 5; i++) out += '<span class="star" aria-hidden="true">' + (i <= r ? '★' : '☆') + '</span>';
  return '<span class="star-wrap" role="img" aria-label="' + r + ' out of 5 stars">' + out + '</span>';
}

function highlight(text, q){
  var t = esc(text);
  var nq = normalize(q);
  if (!nq) return t;
  var words = nq.split(' ').filter(Boolean);
  for (var i = 0; i < words.length; i++){
    var w = words[i];
    if (w.length < 2) continue;
    var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    t = t.replace(re, '<mark>$1</mark>');
  }
  return t;
}

RW.ui = { img: img, catPhoto: catPhoto, svgFor: svgFor, stars: stars, shapeKey: shapeKey, sizeLabel: sizeLabel, highlight: highlight,
  shapeKeys: function(){ return Object.keys(GARMENTS); }, featuresRequired: FEATURES_REQUIRED };

})();
