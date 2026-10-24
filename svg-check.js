/* svg-check.js — validates RW.ui generated SVGs for every catalog product (run: node svg-check.js)
   Checks: template mapping, structure/a11y (<title>/<desc>/role), viewBox consistency, unique ids,
   product color present, no pure black/white, per-shape data-f feature markers, view distinctness,
   tag view, LOD size budgets, img() cache, and generation timing. */
'use strict';
var path = require('path');
var ROOT = __dirname;

global.window = {};
require(path.join(ROOT, 'data.js'));
function esc(s){
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
window.RW = { util: { esc: esc, normalize: function(s){ return String(s == null ? '' : s); } } };
require(path.join(ROOT, 'engine.js'));

var DATA = window.RW_DATA;
var UI = window.RW.ui;

var FULL_BUDGET = 12000;   /* bytes per full-lod front/back/detail svg */
var CARD_BUDGET = 8000;    /* bytes per card-lod svg */
var AVG_MS_BUDGET = 6;     /* average svgFor() cost in ms */

var passN = 0, failN = 0;
function t(name, cond, extra){
  if (cond){ passN++; console.log('PASS ' + name); }
  else { failN++; console.log('FAIL ' + name + (extra !== undefined ? '  [' + String(extra).slice(0, 300) + ']' : '')); }
}

var products = (DATA.products || []).concat(DATA.myListings || []);
var shapeKeys = UI.shapeKeys();
var REQ = UI.featuresRequired;

t('products loaded (' + products.length + ')', products.length >= 120, products.length);
  t('shapeKeys cover all templates (' + shapeKeys.length + ')', shapeKeys.length === 34, shapeKeys.join(','));

var vbs = { 0: {}, 1: {}, 2: {}, 3: {} };
var maxFull = 0, maxCard = 0, maxFullId = '', maxCardId = '';
var totalMs = 0, genCount = 0;
var structural = 0, colorBad = 0, idBad = 0, markerBad = 0, pureBad = 0, a11yBad = 0, budgetBad = 0, codeBad = 0;
var badSamples = [];

function idsOf(svg){
  var out = [], re = /id="([^"]+)"/g, m;
  while ((m = re.exec(svg))) out.push(m[1]);
  return out;
}

for (var i = 0; i < products.length; i++){
  var p = products[i];
  var key = UI.shapeKey(p);
  if (shapeKeys.indexOf(key) < 0) badSamples.push(p.id + ' bad-shape ' + key);

  var views = [0, 1, 2];
  if (p.tagsAttached) views.push(3);
  var svgs = {};
  for (var vi = 0; vi < views.length; vi++){
    var v = views[vi];
    var t0 = Date.now();
    var svg = UI.svgFor(key, p.colorHex || '#8A8A8A', 'Product ' + p.id, v,
      { cat: p.category, cond: p.condition, mat: p.material, title: p.title });
    var dt = Date.now() - t0;
    totalMs += dt; genCount++;
    svgs[v] = svg;

    if (!(svg.indexOf('<svg') === 0 && svg.indexOf('</svg>') > 0 && svg.indexOf('<path') > 0 &&
        svg.indexOf('linearGradient') > 0 && svg.indexOf('xmlns="http://www.w3.org/2000/svg"') > 0 &&
        svg.indexOf('width="600"') > 0 && svg.indexOf('height="750"') > 0)){
      structural++; if (badSamples.length < 8) badSamples.push(p.id + ' v' + v + ' structure');
    }
    if (!(svg.indexOf('<title>') > 0 && svg.indexOf('</title>') > 0 && svg.indexOf('<desc>') > 0 &&
        svg.indexOf('role="img"') > 0 && svg.indexOf('aria-label=') > 0)){
      a11yBad++; if (badSamples.length < 8) badSamples.push(p.id + ' v' + v + ' a11y');
    }
    if (/function\s*\(|\bundefined\b|\[object |=>|\bNaN\b/.test(svg)){
      codeBad++; if (badSamples.length < 8) badSamples.push(p.id + ' v' + v + ' leaked code/invalid token in svg');
    }
    var vb = (svg.match(/viewBox="([^"]+)"/) || [])[1] || '';
    vbs[v][vb] = (vbs[v][vb] || 0) + 1;
    if ((v === 0 || v === 1 || v === 3) && vb !== '0 0 400 500'){
      if (badSamples.length < 8) badSamples.push(p.id + ' v' + v + ' vb ' + vb);
      structural++;
    }
    var ids = idsOf(svg);
    var uniq = {};
    for (var q = 0; q < ids.length; q++){
      if (uniq[ids[q]]){ idBad++; if (badSamples.length < 8) badSamples.push(p.id + ' v' + v + ' dup id ' + ids[q]); break; }
      uniq[ids[q]] = 1;
    }
    var hex = String(p.colorHex || '').toLowerCase();
    if (hex && svg.toLowerCase().indexOf(hex) < 0){
      colorBad++; if (badSamples.length < 8) badSamples.push(p.id + ' v' + v + ' color ' + hex + ' missing');
    }
    if (/#ffffff\b|#000000\b|rgba\(255,255,255,|rgba\(0,0,0,/.test(svg.toLowerCase())){
      pureBad++; if (badSamples.length < 8) badSamples.push(p.id + ' v' + v + ' pure black/white token');
    }
    if (v === 0){
      var req = REQ[key] || [];
      for (var f = 0; f < req.length; f++){
        if (svg.indexOf('data-f="' + req[f] + '"') < 0){
          markerBad++; if (badSamples.length < 8) badSamples.push(p.id + ' missing data-f=' + req[f]);
        }
      }
      if (svg.length > maxFull){ maxFull = svg.length; maxFullId = p.id; }
      if (svg.length > FULL_BUDGET) budgetBad++;
    } else if (v !== 3 && svg.length > maxFull){
      maxFull = svg.length; maxFullId = p.id + ' v' + v;
    }
    if (v === 3 && svg.indexOf('data-f="tag"') < 0){
      markerBad++; if (badSamples.length < 8) badSamples.push(p.id + ' tag view missing tag');
    }
  }
  if (vbs[0]['0 0 400 500'] !== undefined && svgs[0] === svgs[1]){
    structural++; if (badSamples.length < 8) badSamples.push(p.id + ' front==back');
  }
  if (svgs[0] === svgs[2]){ structural++; if (badSamples.length < 8) badSamples.push(p.id + ' front==detail'); }

  /* card LOD: smaller than full, under budget */
  var card = UI.svgFor(key, p.colorHex || '#8A8A8A', 'Product ' + p.id, 0,
    { lod: 'card', cat: p.category, cond: p.condition, mat: p.material, title: p.title });
  if (card.length > maxCard){ maxCard = card.length; maxCardId = p.id; }
  if (card.length > CARD_BUDGET) budgetBad++;
  if (card.length >= svgs[0].length){
    budgetBad++; if (badSamples.length < 8) badSamples.push(p.id + ' card not smaller than full');
  }
}

t('all svgs structurally valid (paths, gradients, 600x750, xmlns)', structural === 0, 'bad=' + structural + ' ' + badSamples.join(' | '));
t('a11y: <title>/<desc>/role/aria-label on every svg', a11yBad === 0, 'bad=' + a11yBad);
t('no leaked JS source or invalid tokens in generated svg', codeBad === 0, 'bad=' + codeBad + ' ' + badSamples.join(' | '));
t('viewBox: front/back/tag all 0 0 400 500; detail crops per-shape (<=24 variants)',
  vbs[0]['0 0 400 500'] === products.length && vbs[1]['0 0 400 500'] === products.length &&
  Object.keys(vbs[2]).length <= 24,
  JSON.stringify({ v0: vbs[0], v1: vbs[1], v2Variants: Object.keys(vbs[2]).length, v3: vbs[3] }));
t('no duplicate element ids within any svg', idBad === 0, 'bad=' + idBad);
t('every product colorHex appears in its svg fill palette', colorBad === 0, 'bad=' + colorBad);
t('no pure black/white tokens (#fff/#000/rgba)', pureBad === 0, 'bad=' + pureBad);
t('per-shape data-f feature markers all present', markerBad === 0, 'bad=' + markerBad);
t('size budgets: full<=' + FULL_BUDGET + 'B, card<=' + CARD_BUDGET + 'B, card<full', budgetBad === 0,
  'over=' + budgetBad + ' maxFull=' + maxFull + '(' + maxFullId + ') maxCard=' + maxCard + '(' + maxCardId + ')');

/* img() cache: same product+view+lod returns the same data URI */
var p0 = products[0];
var im1 = UI.img(p0, 0, 'card'), im2 = UI.img(p0, 0, 'card');
t('img() returns cached identical string for repeat calls', im1 === im2 && im1.indexOf('data:image/svg+xml,') > 0, im1.slice(0, 60));

/* pseudo-product (category tile) with missing fields must not crash */
var tile = UI.img({ shape: 'dress', colorHex: '#4A5D4E', title: 'Women', brand: '' }, 0, 'card');
t('pseudo-product (cat tile) renders safely', typeof tile === 'string' && tile.indexOf('<img') === 0, tile.slice(0, 60));

var avg = genCount ? (totalMs / genCount) : 0;
t('generation timing avg ' + avg.toFixed(2) + 'ms < ' + AVG_MS_BUDGET + 'ms (' + genCount + ' svgs in ' + totalMs + 'ms)', avg < AVG_MS_BUDGET, avg);

console.log('');
console.log('sizes: maxFull=' + maxFull + 'B (' + maxFullId + ')  maxCard=' + maxCard + 'B (' + maxCardId + ')');
console.log(passN + ' passed, ' + failN + ' failed');
process.exit(failN ? 1 : 0);
