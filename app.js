/* app.js — exports: RW.app.init (bootstrap, header counts, search, storage version) */
(function(){
'use strict';
var RW = window.RW = window.RW || {};
var esc = RW.util.esc;

var SCHEMA_VERSION = 1;

function migrate(){
  var v = RW.storage.get('rw_version', null);
  if (v === null){
    RW.storage.set('rw_version', SCHEMA_VERSION);
    return;
  }
  if (Number(v) < SCHEMA_VERSION){
    /* future migrations go here; bump after applying */
    RW.storage.set('rw_version', SCHEMA_VERSION);
  }
}

function updateCounts(){
  var cart = RW.store.get('rw_cart') || [];
  var wish = RW.store.get('rw_wishlist') || {};
  var wishN = 0;
  for (var k in wish) if (Object.prototype.hasOwnProperty.call(wish, k)) wishN++;
  var cEl = document.getElementById('cart-count');
  var wEl = document.getElementById('wishlist-count');
  if (cEl){ cEl.textContent = String(cart.length); cEl.setAttribute('aria-label', cart.length + ' items in cart'); }
  if (wEl){ wEl.textContent = String(wishN); wEl.setAttribute('aria-label', wishN + ' items in wishlist'); }
}

function setupSearch(){
  var form = document.getElementById('search-form');
  var input = document.getElementById('search-input');
  var box = document.getElementById('autosuggest');
  if (!form || !input || !box) return;
  var sugTimer = null;
  var sugItems = [];
  var sugIdx = -1;

  function closeSuggest(){
    box.hidden = true;
    box.innerHTML = '';
    box.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-expanded', 'false');
    sugItems = [];
    sugIdx = -1;
  }
  function highlight(text){
    var t = esc(text);
    var words = RW.engine.normalize(input.value).split(' ').filter(function(w){ return w.length >= 2; });
    for (var i = 0; i < words.length; i++){
      var w = words[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try { t = t.replace(new RegExp('(' + w + ')', 'ig'), '<mark>$1</mark>'); } catch(e){}
    }
    return t;
  }
  function renderSuggest(q){
    var s = RW.engine.suggest(q);
    sugItems = [];
    sugIdx = -1;
    var html = '';
    if (!q && s.recents.length){
      html += '<div class="sgroup-title">Recent searches</div>';
      for (var r = 0; r < s.recents.length; r++){
        sugItems.push({ type: 'q', value: s.recents[r] });
        html += '<button type="button" role="option" class="s-item" data-si="' + (sugItems.length - 1) + '" aria-selected="false">' + esc(s.recents[r]) + '</button>';
      }
    }
    if (s.products.length){
      html += '<div class="sgroup-title">Products</div>';
      for (var i = 0; i < s.products.length; i++){
        var p = s.products[i];
        sugItems.push({ type: 'product', href: '#/product/' + p.id });
        html += '<button type="button" role="option" class="s-item s-product" data-si="' + (sugItems.length - 1) + '" aria-selected="false">' +
          '<span class="s-thumb" aria-hidden="true">' + RW.ui.img(p, 0, 'card') + '</span>' +
          '<span class="s-text"><span class="s-title">' + highlight(p.title) + '</span>' +
          '<span class="s-sub">' + esc(p.brand) + ' · ' + RW.util.fmtINR(p.price) + '</span></span></button>';
      }
    }
    if (s.categories.length){
      html += '<div class="sgroup-title">Categories</div>';
      for (var c = 0; c < s.categories.length; c++){
        sugItems.push({ type: 'nav', href: s.categories[c].href });
        html += '<button type="button" role="option" class="s-item" data-si="' + (sugItems.length - 1) + '" aria-selected="false">' + highlight(s.categories[c].label) + '</button>';
      }
    }
    if (s.brands.length){
      html += '<div class="sgroup-title">Brands</div>';
      for (var b = 0; b < s.brands.length; b++){
        sugItems.push({ type: 'nav', href: s.brands[b].href });
        html += '<button type="button" role="option" class="s-item" data-si="' + (sugItems.length - 1) + '" aria-selected="false">' + highlight(s.brands[b].label) + '</button>';
      }
    }
    if (!html){
      html = '<div class="s-empty">No suggestions — press Enter to search</div>';
    }
    box.innerHTML = html;
    box.hidden = false;
    box.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-expanded', 'true');
  }
  function applySuggest(item){
    closeSuggest();
    if (!item) return;
    if (item.type === 'q'){ input.value = item.value; form.dispatchEvent(new Event('submit', { cancelable: true })); return; }
    RW.router.navigate(item.href);
    input.blur();
  }
  function moveSuggest(dir){
    if (!sugItems.length) return;
    sugIdx = (sugIdx + dir + sugItems.length + 1) % (sugItems.length + 1) - (dir < 0 && sugIdx <= 0 ? 0 : 0);
    if (sugIdx < 0) sugIdx = sugItems.length - 1;
    if (sugIdx >= sugItems.length) sugIdx = 0;
    var nodes = box.querySelectorAll('.s-item');
    for (var i = 0; i < nodes.length; i++){
      var on = i === sugIdx;
      nodes[i].setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) nodes[i].scrollIntoView({ block: 'nearest' });
    }
  }

  input.addEventListener('focus', function(){ renderSuggest(input.value.trim()); });
  input.addEventListener('input', function(){
    clearTimeout(sugTimer);
    sugTimer = setTimeout(function(){ renderSuggest(input.value.trim()); }, 200);
  });
  input.addEventListener('keydown', function(e){
    if (e.key === 'ArrowDown'){ e.preventDefault(); moveSuggest(1); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); moveSuggest(-1); }
    else if (e.key === 'Escape'){ closeSuggest(); }
    else if (e.key === 'Enter' && sugIdx >= 0 && sugItems[sugIdx]){ e.preventDefault(); applySuggest(sugItems[sugIdx]); }
  });
  box.addEventListener('mousedown', function(e){
    var it = e.target.closest ? e.target.closest('.s-item') : null;
    if (!it) return;
    e.preventDefault();
    applySuggest(sugItems[parseInt(it.getAttribute('data-si'), 10)]);
  });
  document.addEventListener('click', function(e){
    if (!form.contains(e.target)) closeSuggest();
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var q = input.value.trim();
    if (q){
      var recent = RW.store.get('rw_recent_searches') || [];
      recent = [q].concat(recent.filter(function(x){ return x !== q; })).slice(0, 8);
      RW.store.set('rw_recent_searches', recent);
    }
    closeSuggest();
    RW.router.navigate('#/shop' + (q ? '?q=' + encodeURIComponent(q) : ''));
  });
}

/* cart actions guarded until Prompt 3 ships RW.ui.addToCart */
RW.actions['add-to-cart'] = function(el){
  var id = el.getAttribute('data-id');
  if (typeof RW.ui.addToCart === 'function'){ RW.ui.addToCart(id); return; }
  RW.toast('Cart arrives in the next phase');
};
RW.actions['buy-now'] = function(el){
  var id = el.getAttribute('data-id');
  if (typeof RW.ui.addToCart === 'function'){ RW.ui.addToCart(id); RW.router.navigate('#/checkout'); return; }
  RW.toast('Checkout arrives in the next phase');
};

function boot(){
  migrate();
  updateCounts();
  RW.store.subscribe(function(){ updateCounts(); });
  setupSearch();
  RW.router.start();
}

RW.app = { init: boot, version: SCHEMA_VERSION };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
