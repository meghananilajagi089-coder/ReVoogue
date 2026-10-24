/* views-buy.js — exports: RW.viewsBuy (Product, Seller, Wishlist, Cart, Checkout, Pay, Order, Track), RW.ui.addToCart */
(function(){
'use strict';
var RW = window.RW = window.RW || {};
var esc = RW.util.esc;
var fmt = RW.util.fmtINR;
var rel = RW.util.relTime;
var E = function(){ return RW.engine; };
var CFG = (window.RW_DATA && window.RW_DATA.config) || {};
RW.viewsBuy = RW.viewsBuy || {};

function findOrder(id){
  var orders = RW.store.get('rw_orders') || [];
  for (var i = 0; i < orders.length; i++) if (orders[i].orderId === id) return orders[i];
  return null;
}
function inCart(id){
  var c = RW.store.get('rw_cart') || [];
  for (var i = 0; i < c.length; i++) if (c[i].id === id) return true;
  return false;
}
function isWished(id){ var w = RW.store.get('rw_wishlist') || {}; return !!w[id]; }

/* shared wishlist/cart helpers used by cards + these views */
function pushRecentView(id){
  var rv = RW.store.get('rw_recent_views') || [];
  rv = [id].concat(rv.filter(function(x){ return x !== id; })).slice(0, 12);
  RW.store.set('rw_recent_views', rv);
}

/* ---------- Product detail ---------- */
function condMeter(cond){
  var n = cond === 'Like New' ? 3 : cond === 'Excellent' ? 2 : 1;
  var bars = '';
  for (var i = 1; i <= 3; i++) bars += '<span class="meter-bar' + (i <= n ? ' is-on' : '') + '"></span>';
  return '<div class="cond-meter" role="img" aria-label="Condition ' + esc(cond) + '"><span class="meter-bars">' + bars + '</span><span class="cond-chip cond-' + (cond === 'Like New' ? 'LN' : cond === 'Excellent' ? 'EX' : 'GD') + '">' + esc(cond) + '</span></div>';
}

function similarTo(p){
  var all = E().allProducts().filter(function(x){
    return x.id !== p.id && x.status !== 'sold' && (x.sub === p.sub || x.category === p.category);
  });
  all.sort(function(a, b){
    var sa = (a.brand === p.brand ? 2 : 0) + (a.category === p.category ? 1 : 0) + (Math.abs(a.price - p.price) < 1000 ? 1 : 0);
    var sb = (b.brand === p.brand ? 2 : 0) + (b.category === p.category ? 1 : 0) + (Math.abs(b.price - p.price) < 1000 ? 1 : 0);
    return sb - sa || (b.wishlistBase || 0) - (a.wishlistBase || 0);
  });
  return all.slice(0, 4);
}
function fromSeller(p){
  return E().allProducts().filter(function(x){ return x.sellerId === p.sellerId && x.id !== p.id && x.status !== 'sold'; }).slice(0, 4);
}

function productCardRow(list){
  if (!list.length) return '<p class="muted">Nothing to show here yet.</p>';
  var html = '<div class="product-grid">';
  for (var i = 0; i < list.length; i++) html += RW.ui.card(list[i]);
  html += '</div>';
  return html;
}

function product(query, params){
  params = params || {};
  var p = E().productById(params.id);
  if (!p){
    return '<div class="view error-view"><p class="code">404</p><h1 tabindex="-1">Listing not found</h1>' +
      '<p class="muted">We could not find listing <code>' + esc(params.id) + '</code>.</p>' +
      '<p><a class="btn btn-primary" href="#/shop">Browse shop</a></p></div>';
  }
  pushRecentView(p.id);
  var seller = E().sellerById(p.sellerId) || { name: 'Seller', city: p.city, rating: null, itemsSold: 0, memberSinceYear: 2024 };
  var sold = p.status === 'sold';
  var wished = isWished(p.id);
  var hasCart = inCart(p.id);
  var save = p.mrp - p.price;

  var html = '<div class="view product-view">';
  html += '<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span>' +
    '<a href="#/shop?cat=' + esc(encodeURIComponent(p.category)) + '">' + esc(p.category) + '</a>' +
    '<span aria-hidden="true">/</span><a href="#/shop?cat=' + esc(encodeURIComponent(p.category)) + '&sub=' + esc(encodeURIComponent(p.sub)) + '">' + esc(p.sub) + '</a>' +
    '<span aria-hidden="true">/</span><span>' + esc(p.title) + '</span></nav>';

  html += '<div class="product-layout"><div class="product-main">';
  /* gallery */
  html += '<div class="gallery" data-gallery>';
  html += '<div class="gallery-main" data-action="gallery-zoom" role="button" tabindex="0" aria-label="Click to zoom">' + RW.ui.img(p, 0) + '</div>';
  html += '<div class="gallery-thumbs" role="tablist" aria-label="Product images">';
  var nv = p.tagsAttached ? 4 : 3;
  for (var v = 0; v < nv; v++){
    html += '<button type="button" class="gallery-thumb' + (v === 0 ? ' is-active' : '') + '" data-action="gallery-pick" data-variant="' + v + '" role="tab" aria-selected="' + (v === 0) + '">' + RW.ui.img(p, v) + '</button>';
  }
  html += '</div></div>';
  html += '</div>';

  html += '<div class="product-info">';
  html += '<span class="p-card-brand">' + esc(p.brand) + '</span>';
  html += '<h1 tabindex="-1">' + esc(p.title) + '</h1>';
  html += '<div class="product-meta-row">';
  if (p.listingScore >= 80) html += '<span class="badge badge-complete">Complete listing</span>';
  html += '<span class="muted">Listed ' + esc(rel(Date.now() - (p.listedAgoHours || 0) * 3600 * 1000)) + '</span>';
  html += '</div>';

  html += '<div class="price-block"><span class="price-now big">' + fmt(p.price) + '</span>';
  if (p.mrp > p.price){
    html += '<span class="price-mrp">' + fmt(p.mrp) + '</span><span class="price-off">' + p.discountPct + '% off</span>';
    html += '<span class="you-save">You save ' + fmt(save) + '</span>';
  }
  html += '</div>';

  html += '<dl class="info-inline">';
  html += '<div>' + condMeter(p.condition) + '</div>';
  html += '<div><dt>Times worn</dt><dd>' + (p.timesWorn === 0 ? 'Never worn' : 'Worn ' + p.timesWorn + '×') + '</dd></div>';
  html += '<div><dt>Tags</dt><dd>' + (p.tagsAttached ? 'Original tags attached' : 'No tags') + '</dd></div>';
  html += '<div><dt>Size</dt><dd>' + esc(E().sizeLabel(p)) + ' <button type="button" class="link-btn" data-action="size-guide">Size guide</button></dd></div>';
  html += '</dl>';

  /* measurements */
  var meas = p.measurements || {};
  var mkeys = Object.keys(meas);
  if (mkeys.length){
    html += '<h2 class="h3">Measurements</h2><table class="meas-table"><tbody>';
    for (var mi = 0; mi < mkeys.length; mi++) html += '<tr><th scope="row">' + esc(mkeys[mi]) + '</th><td>' + esc(meas[mkeys[mi]]) + '</td></tr>';
    html += '</tbody></table>';
  }
  html += '<p class="flaws"><strong>Flaws:</strong> ' + esc(p.flaws || 'None') + '</p>';
  html += '<p class="washed"><strong>Care:</strong> ' + (p.washed ? 'Washed / dry-cleaned before listing' : 'Not yet washed') + '</p>';

  /* actions */
  html += '<div class="product-actions">';
  if (sold){
    html += '<button type="button" class="btn btn-lg" disabled>Sold</button>';
    html += '<a class="btn btn-secondary btn-lg" href="#/shop?cat=' + esc(encodeURIComponent(p.category)) + '&sub=' + esc(encodeURIComponent(p.sub)) + '">See similar</a>';
  } else {
    if (hasCart){
      html += '<a class="btn btn-secondary btn-lg" href="#/cart">Go to Cart</a>';
    } else {
      html += '<button type="button" class="btn btn-primary btn-lg" data-action="add-to-cart" data-id="' + esc(p.id) + '">Add to Cart</button>';
    }
    html += '<button type="button" class="btn btn-accent btn-lg" data-action="buy-now" data-id="' + esc(p.id) + '">Buy Now</button>';
  }
  html += '<button type="button" class="p-card-heart big' + (wished ? ' is-on' : '') + '" data-action="toggle-wish" data-id="' + esc(p.id) + '" aria-pressed="' + wished + '" aria-label="' + (wished ? 'Remove from wishlist' : 'Add to wishlist') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="' + (wished ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-4.5-9.5-8.5C.5 9 2.5 5 6.5 5c2 0 3.5 1.2 5.5 3.2C14 6.2 15.5 5 17.5 5c4 0 6 4 4 7.5C19 16.5 12 21 12 21z"/></svg></button>';
  html += '<button type="button" class="btn btn-ghost btn-lg" data-action="share-listing" data-id="' + esc(p.id) + '">Share</button>';
  html += '<button type="button" class="btn btn-ghost" data-action="report-listing" data-id="' + esc(p.id) + '">Report</button>';
  html += '</div>';
  if (!sold) html += '<p class="muted small-note">Each item is one of a kind. Payment options: UPI, Cash on Delivery.</p>';
  html += '</div></div>';

  /* delivery checker */
  html += '<section class="panel deliver-check"><h2 class="h3">Delivery estimate</h2>';
  html += '<form data-action="pincode-check" data-id="' + esc(p.id) + '"><label class="sr-only" for="pin-code">Pincode</label>' +
    '<input type="text" id="pin-code" name="pincode" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit pincode" autocomplete="postal-code">' +
    '<button type="submit" class="btn btn-secondary">Check</button></form><div id="pin-result" aria-live="polite"></div></section>';

  /* offers */
  html += '<section class="panel offers-box"><h2 class="h3">Offers</h2><ul class="offer-list">';
  var coupons = (window.RW_DATA && window.RW_DATA.config && window.RW_DATA.config.coupons) || {};
  for (var ck in coupons){
    html += '<li><code>' + esc(coupons[ck].code) + '</code> — ' + esc(coupons[ck].label) + '</li>';
  }
  html += '</ul></section>';

  /* description + details */
  html += '<section class="panel"><h2 class="h3">Description</h2><p>' + esc(p.description) + '</p>';
  html += '<table class="meas-table detail-table"><tbody>';
  html += '<tr><th scope="row">Material</th><td>' + esc(p.material) + '</td></tr>';
  html += '<tr><th scope="row">Fit</th><td>' + esc(p.fit) + '</td></tr>';
  html += '<tr><th scope="row">Colour</th><td>' + esc(p.color) + '</td></tr>';
  html += '<tr><th scope="row">Occasion</th><td>' + esc((p.occasion || []).join(', ')) + '</td></tr>';
  html += '<tr><th scope="row">Care</th><td>' + (p.washed ? 'Washed / dry-cleaned' : 'Not yet washed') + '</td></tr>';
  html += '<tr><th scope="row">Reason for selling</th><td>' + esc(p.reasonForSelling || '—') + '</td></tr>';
  html += '</tbody></table></section>';

  /* seller card */
  html += '<section class="panel seller-card"><h2 class="h3">Seller</h2>';
  html += '<div class="seller-row"><span class="seller-avatar" style="background:' + esc(seller.avatarColor || '#5C4033') + '" aria-hidden="true">' + esc((seller.name || 'S').charAt(0)) + '</span>';
  html += '<div><a href="#/seller/' + esc(p.sellerId) + '"><strong>' + esc(seller.name) + '</strong></a>';
  html += '<p class="muted">' + esc(seller.city) + ' · ' + (seller.rating != null ? RW.ui.stars(seller.rating) + ' (' + (seller.ratingCount || 0) + ')' : 'New seller') + '</p>';
  html += '<p class="muted small-note">' + (seller.itemsSold || 0) + ' sold · Member since ' + esc(seller.memberSinceYear || 2025) + '</p></div></div>';
  html += '<p class="muted small-note">Seller phone is never shown publicly.</p>';
  html += '</section>';

  /* message seller */
  html += '<section class="panel"><h2 class="h3">Message seller</h2>';
  html += '<form data-action="message-seller" data-id="' + esc(p.id) + '" data-seller="' + esc(p.sellerId) + '">';
  html += '<div class="field"><label for="msg-name">Your name</label><input type="text" id="msg-name" name="name" required maxlength="60"></div>';
  html += '<div class="field"><label for="msg-contact">Mobile or email</label><input type="text" id="msg-contact" name="contact" required maxlength="80"></div>';
  html += '<div class="field"><label for="msg-text">Message</label><textarea id="msg-text" name="text" required maxlength="500" placeholder="Ask about fit, flaws or availability…"></textarea></div>';
  html += '<button type="submit" class="btn btn-secondary">Send message</button>';
  html += '</form></section>';

  /* more sections */
  var more = fromSeller(p);
  if (more.length) html += '<section class="section"><div class="section-head"><h2>More from this seller</h2></div>' + productCardRow(more) + '</section>';
  var sim = similarTo(p);
  if (sim.length) html += '<section class="section"><div class="section-head"><h2>Similar items</h2></div>' + productCardRow(sim) + '</section>';
  var rvIds = RW.store.get('rw_recent_views') || [];
  var rv = [];
  for (var ri = 0; ri < rvIds.length && rv.length < 4; ri++){
    if (rvIds[ri] === p.id) continue;
    var rp = E().productById(rvIds[ri]);
    if (rp) rv.push(rp);
  }
  if (rv.length) html += '<section class="section"><div class="section-head"><h2>Recently viewed</h2></div>' + productCardRow(rv) + '</section>';

  html += '</div>'; /* product-view */

  /* mobile sticky bar */
  html += '<div class="mobile-buybar">';
  if (sold){
    html += '<button type="button" class="btn btn-lg" disabled>Sold</button>';
  } else {
    html += (hasCart ? '<a class="btn btn-secondary" href="#/cart">Go to Cart</a>' : '<button type="button" class="btn btn-secondary" data-action="add-to-cart" data-id="' + esc(p.id) + '">Add to Cart</button>');
    html += '<button type="button" class="btn btn-primary" data-action="buy-now" data-id="' + esc(p.id) + '">Buy Now</button>';
  }
  html += '</div>';
  return html;
}

/* ---------- Seller storefront ---------- */
function seller(query, params){
  params = params || {};
  var s = E().sellerById(params.id);
  if (!s){
    return '<div class="view error-view"><p class="code">404</p><h1 tabindex="-1">Seller not found</h1>' +
      '<p class="muted">Unknown seller <code>' + esc(params.id) + '</code>.</p>' +
      '<p><a class="btn btn-primary" href="#/shop">Browse shop</a></p></div>';
  }
  var items = E().allProducts().filter(function(p){ return p.sellerId === s.id && p.status !== 'sold'; });
  var html = '<div class="view seller-view">';
  html += '<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>' + esc(s.name) + '</span></nav>';
  html += '<header class="seller-head"><span class="seller-avatar lg" style="background:' + esc(s.avatarColor || '#5C4033') + '" aria-hidden="true">' + esc((s.name || 'S').charAt(0)) + '</span>';
  html += '<div><h1 tabindex="-1">' + esc(s.name) + '</h1>';
  html += '<p class="muted">' + esc(s.city) + ' · ' + (s.rating != null ? RW.ui.stars(s.rating) + ' (' + (s.ratingCount || 0) + ' ratings)' : 'New seller') + '</p>';
  html += '<p class="muted small-note">Member since ' + esc(s.memberSinceYear || 2025) + ' · ' + (s.itemsSold || 0) + ' items sold</p></div></header>';
  html += '<section class="section"><div class="section-head"><h2>Available items (' + items.length + ')</h2></div>';
  if (items.length){
    html += '<div class="product-grid">';
    for (var i = 0; i < items.length; i++) html += RW.ui.card(items[i]);
    html += '</div>';
  } else {
    html += '<p class="muted">This seller has no live listings right now.</p>';
  }
  html += '</section></div>';
  return html;
}

/* ---------- Wishlist ---------- */
function wishlist(){
  var w = RW.store.get('rw_wishlist') || {};
  var ids = Object.keys(w);
  var html = '<div class="view wishlist-view"><h1 tabindex="-1">Wishlist</h1>';
  if (!ids.length){
    html += '<div class="empty-state"><h2>Nothing saved yet</h2><p class="muted">Tap the heart on any item to save it for later.</p>' +
      '<p><a class="btn btn-primary" href="#/shop">Browse shop</a></p></div></div>';
    return html;
  }
  html += '<p class="muted">' + ids.length + ' saved item' + (ids.length === 1 ? '' : 's') + '</p>';
  html += '<div class="product-grid">';
  for (var i = 0; i < ids.length; i++){
    var p = E().productById(ids[i]);
    if (!p) continue;
    var saved = w[ids[i]] || {};
    var dropped = saved.price != null && p.price < saved.price;
    var sold = p.status === 'sold';
    var card = RW.ui.card(p, { meta: sold ? 'Sold' : (dropped ? 'Price dropped from ' + fmt(saved.price) : '') });
    if (dropped && !sold) card = card.replace('p-card-badges', 'p-card-badges"><span class="badge badge-soft">Price dropped</span>');
    html += '<div class="wish-wrap">' + card +
      '<div class="wish-actions">' +
      (sold
        ? '<a class="btn btn-sm btn-secondary" href="#/shop?cat=' + esc(encodeURIComponent(p.category)) + '&sub=' + esc(encodeURIComponent(p.sub)) + '">Find similar</a>'
        : '<button type="button" class="btn btn-sm btn-primary" data-action="wish-to-cart" data-id="' + esc(p.id) + '">Move to cart</button>') +
      '<button type="button" class="btn btn-sm btn-ghost" data-action="toggle-wish" data-id="' + esc(p.id) + '">Remove</button>' +
      '</div></div>';
  }
  html += '</div></div>';
  return html;
}
RW.actions['wish-to-cart'] = function(el){
  var id = el.getAttribute('data-id');
  if (RW.ui.addToCart(id)){
    var w = RW.store.get('rw_wishlist') || {};
    delete w[id];
    RW.store.set('rw_wishlist', w);
    RW.router.navigate(location.hash, { replace: true });
  }
};

/* ---------- cart ---------- */
function cartItems(){ return RW.store.get('rw_cart') || []; }
function cartProducts(){
  var c = cartItems(), out = [];
  for (var i = 0; i < c.length; i++){
    var p = E().productById(c[i].id);
    if (p) out.push(p);
  }
  return out;
}
function soldInCart(){
  var ps = cartProducts(), ids = [];
  for (var i = 0; i < ps.length; i++) if (ps[i].status === 'sold') ids.push(ps[i].id);
  return ids;
}
function removeFromCart(ids){
  var c = cartItems();
  RW.store.set('rw_cart', c.filter(function(x){ return ids.indexOf(x.id) < 0; }));
}
function markSold(ids){
  var ov = RW.store.get('rw_status_overrides') || {};
  for (var i = 0; i < ids.length; i++) ov[ids[i]] = Object.assign({}, ov[ids[i]], { status: 'sold' });
  RW.store.set('rw_status_overrides', ov);
}
function markAvailable(ids){
  var ov = RW.store.get('rw_status_overrides') || {};
  for (var i = 0; i < ids.length; i++) ov[ids[i]] = Object.assign({}, ov[ids[i]], { status: 'available' });
  RW.store.set('rw_status_overrides', ov);
}
function idsOf(list){
  var out = [];
  for (var i = 0; i < list.length; i++) out.push(list[i].id);
  return out;
}
function userListingIdsIn(ids){
  var user = RW.store.get('rw_listings_user') || [], set = {};
  for (var i = 0; i < user.length; i++) set[user[i].id] = true;
  var out = [];
  for (var j = 0; j < ids.length; j++) if (set[ids[j]]) out.push(ids[j]);
  return out;
}
function nextOrderId(){
  var orders = RW.store.get('rw_orders') || [], max = 6000;
  for (var i = 0; i < orders.length; i++){
    var n = parseInt(String(orders[i].orderId || '').replace('ORD-', ''), 10);
    if (isFinite(n) && n > max) max = n;
  }
  return 'ORD-' + (max + 1);
}
function saveOrders(){ RW.store.set('rw_orders', RW.store.get('rw_orders') || []); }

RW.ui.addToCart = function(id){
  var p = E().productById(id);
  if (!p){ RW.toast('Listing not found', 'error'); return false; }
  if (p.status === 'sold'){ RW.toast('This item was just sold', 'error'); return false; }
  var c = cartItems();
  for (var i = 0; i < c.length; i++){
    if (c[i].id === id){ RW.toast('Already in your cart'); return false; }
  }
  if (c.length >= (CFG.cartMax || 10)){ RW.toast('Cart is full — each item is one of a kind (max 10)', 'error'); return false; }
  c.push({ id: id, addedAt: Date.now() });
  RW.store.set('rw_cart', c);
  RW.toast('Added to cart', 'success');
  return true;
};

function summaryLine(label, val, cls){
  return '<div class="summary-line' + (cls ? ' ' + cls : '') + '"><span>' + esc(label) + '</span><span>' + esc(val) + '</span></div>';
}
function totalsBlock(t, opts){
  opts = opts || {};
  var html = '<div class="summary-block">';
  html += summaryLine('Price (' + t.itemCount + ' item' + (t.itemCount === 1 ? '' : 's') + ')', fmt(t.subtotal));
  if (t.mrpSave > 0) html += summaryLine('Discount (MRP − price)', '−' + fmt(t.mrpSave), 'is-discount');
  html += summaryLine('Delivery', t.delivery === 0 ? 'FREE' : fmt(t.delivery));
  html += summaryLine('Platform fee', fmt(t.platformFee));
  if (t.couponDiscount > 0) html += summaryLine('Coupon ' + t.couponCode, '−' + fmt(t.couponDiscount), 'is-discount');
  if (opts.cod && t.codFee > 0) html += summaryLine('COD handling fee', fmt(t.codFee));
  html += '<div class="summary-line is-total"><span>Total</span><span>' + fmt(t.total) + '</span></div>';
  if (t.youSave > 0) html += '<p class="you-save-line">You will save ' + fmt(t.youSave) + '</p>';
  html += '</div>';
  return html;
}

function cartFull(){
  RW.hold.expireIfDue();
  var c = cartItems();
  var html = '<div class="view cart-view"><h1 tabindex="-1">Cart</h1>';
  if (!c.length){
    html += '<div class="empty-state"><h2>Your cart is empty</h2>' +
      '<p class="muted">Each item is one of a kind — once it is gone, it is gone.</p>' +
      '<p><a class="btn btn-primary" href="#/shop">Browse shop</a></p></div></div>';
    return html;
  }
  var ps = cartProducts();
  var soldIds = soldInCart();
  html += '<p class="muted small-note">Each item is one of a kind — no quantity stepper needed. Max ' + (CFG.cartMax || 10) + ' items.</p>';
  if (soldIds.length){
    html += '<div class="alert-error" role="alert">Some items are <strong>no longer available</strong>. Remove them to continue.</div>';
  }
  html += '<div class="cart-layout"><div class="cart-rows">';
  for (var i = 0; i < ps.length; i++){
    var p = ps[i];
    var seller = E().sellerById(p.sellerId) || { name: 'Seller' };
    var sold = p.status === 'sold';
    html += '<article class="cart-row' + (sold ? ' is-sold' : '') + '">';
    html += '<a class="cart-thumb" href="#/product/' + esc(p.id) + '" tabindex="-1" aria-hidden="true">' + RW.ui.img(p, 0, 'card') + '</a>';
    html += '<div class="cart-row-body">';
    html += '<h3 class="cart-title"><a href="#/product/' + esc(p.id) + '">' + esc(p.title) + '</a></h3>';
    html += '<p class="muted small-note">' + esc(p.brand) + ' · ' + esc(E().sizeLabel(p)) + ' · ' + esc(seller.name) + '</p>';
    if (sold) html += '<p class="badge badge-error">No longer available</p>';
    html += '<div class="cart-row-actions">';
    html += '<button type="button" class="btn btn-sm btn-ghost" data-action="cart-remove" data-id="' + esc(p.id) + '">Remove</button>';
    if (!sold) html += '<button type="button" class="btn btn-sm btn-secondary" data-action="cart-to-wish" data-id="' + esc(p.id) + '">Move to wishlist</button>';
    html += '</div></div>';
    html += '<div class="cart-row-price"><span class="price-now">' + fmt(p.price) + '</span>';
    if (p.mrp > p.price) html += '<span class="price-mrp">' + fmt(p.mrp) + '</span>';
    html += '</div></article>';
  }
  html += '</div>';

  /* summary + coupon */
  var coupon = RW.store.get('rw_coupon') || null;
  var t = RW.store.computeTotals(ps, { coupon: coupon });
  html += '<aside class="panel cart-summary"><h2 class="h3">Price details</h2>';
  html += totalsBlock(t, {});
  html += '<div class="coupon-box">';
  if (t.couponCode){
    html += '<div class="coupon-applied"><span>Code <strong>' + esc(t.couponCode) + '</strong> applied</span>' +
      '<button type="button" class="btn btn-sm btn-ghost" data-action="remove-coupon">Remove</button></div>';
  } else {
    html += '<form data-action="apply-coupon" class="coupon-row">' +
      '<label class="sr-only" for="coupon-input">Coupon code</label>' +
      '<input type="text" id="coupon-input" name="coupon" placeholder="Coupon code (e.g. REVOGUE10)" maxlength="12" autocomplete="off">' +
      '<button type="submit" class="btn btn-secondary btn-sm">Apply</button></form>';
  }
  if (t.couponNote) html += '<p class="field-error">' + esc(t.couponNote) + '</p>';
  html += '</div>';
  html += '<button type="button" class="btn btn-primary btn-block btn-lg" data-action="go-checkout"' + (soldIds.length ? ' disabled' : '') + '>Proceed to checkout</button>';
  if (soldIds.length) html += '<p class="field-error">Remove unavailable items to check out.</p>';
  html += '</aside></div></div>';
  return html;
}
function cart(){ return cartFull(); }

/* ---------- checkout ---------- */
var coOpen = 'contact';

function fmtTime(ms){
  if (!(ms > 0)) ms = 0;
  var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
  s = s % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}
function etaFor(pincode){
  var pins = (window.RW_DATA && window.RW_DATA.pincodes) || {};
  return pins[String(pincode || '').slice(0, 3)] ? [2, 4] : [4, 7];
}
function readDraft(root){
  var hold = RW.hold.get();
  var d = (hold && hold.buyer) ? Object.assign({}, hold.buyer) : {};
  var fields = ['name','mobile','email','house','area','pincode','city','state','tag','upiId'];
  for (var i = 0; i < fields.length; i++){
    var el = root.querySelector('[name=' + fields[i] + ']');
    if (el) d[fields[i]] = String(el.value || '').trim();
  }
  var m = root.querySelector('[name=pay-method]:checked');
  if (m) d.method = m.value;
  return d;
}
function saveDraftNow(){
  var root = document.querySelector('.checkout-view');
  if (!root) return;
  var hold = RW.hold.get();
  if (!hold || hold.type !== 'checkout') return;
  var d = readDraft(root);
  RW.hold.patch(function(h){ h.buyer = d; return h; });
}
var saveDraftDebounced = RW.util.debounce(saveDraftNow, 400);

function setFieldError(input, msg){
  if (!input) return;
  var f = input.closest('.field');
  if (!f) return;
  f.classList.add('is-error');
  var e = f.querySelector('.field-error');
  if (!e){ e = document.createElement('span'); e.className = 'field-error'; f.appendChild(e); }
  e.textContent = msg;
}
function clearFieldErrors(root){
  var fs = root.querySelectorAll('.field.is-error');
  for (var i = 0; i < fs.length; i++){
    fs[i].classList.remove('is-error');
    var e = fs[i].querySelector('.field-error');
    if (e) e.textContent = '';
  }
}
function validateCheckout(root){
  saveDraftNow();
  clearFieldErrors(root);
  var errs = [];
  function chk(sel, ok, msg){
    var el = root.querySelector(sel);
    if (!el) return;
    if (!ok) errs.push({ id: el.id, msg: msg });
  }
  chk('#co-name', RW.validators.required(root.querySelector('#co-name') && root.querySelector('#co-name').value), 'Please enter your name.');
  chk('#co-mobile', RW.validators.mobile(root.querySelector('#co-mobile') && root.querySelector('#co-mobile').value), 'Enter a valid 10-digit mobile starting with 6-9.');
  var em = root.querySelector('#co-email');
  chk('#co-email', !em || !em.value.trim() || RW.validators.email(em.value), 'Enter a valid email address.');
  chk('#co-house', RW.validators.required(root.querySelector('#co-house') && root.querySelector('#co-house').value), 'Please enter your house / flat number.');
  chk('#co-area', RW.validators.required(root.querySelector('#co-area') && root.querySelector('#co-area').value), 'Please enter your area / landmark.');
  var pin = root.querySelector('#co-pincode');
  var pinOk = RW.validators.pincode(pin && pin.value);
  chk('#co-pincode', pinOk, 'Enter a valid 6-digit pincode.');
  if (pinOk && pin.value.charAt(0) === '9') errs.push({ id: 'co-pincode', msg: 'Sorry — this pincode is not serviceable.' });
  chk('#co-city', RW.validators.required(root.querySelector('#co-city') && root.querySelector('#co-city').value), 'City is required.');
  chk('#co-state', RW.validators.required(root.querySelector('#co-state') && root.querySelector('#co-state').value), 'State is required.');
  if (!errs.length) return true;

  var first = errs[0];
  var panel = document.getElementById(first.id) && document.getElementById(first.id).closest('.step-panel');
  var stepKey = panel ? panel.getAttribute('data-step') : null;
  if (stepKey && stepKey !== coOpen){
    coOpen = stepKey;
    RW.router.navigate(location.hash, { replace: true });
  }
  for (var i = 0; i < errs.length; i++){
    setFieldError(document.getElementById(errs[i].id), errs[i].msg);
  }
  var focusEl = document.getElementById(first.id);
  if (focusEl) focusEl.focus();
  RW.toast('Please fix the highlighted fields', 'error');
  return false;
}

function stepPanel(key, num, title, doneSummary, bodyHTML){
  var isOpen = coOpen === key;
  var html = '<section class="step-panel' + (isOpen ? ' is-open' : '') + (doneSummary && !isOpen ? ' is-done' : '') + '" data-step="' + key + '">';
  html += '<button type="button" class="step-head" data-action="co-toggle" data-step="' + key + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
    '<span class="step-num">' + num + '</span><span class="step-title">' + esc(title) + '</span>' +
    '<span class="step-right">' + (isOpen ? 'Close' : (doneSummary ? 'Change' : 'Open')) + '</span></button>';
  if (!isOpen && doneSummary) html += '<p class="step-summary">' + doneSummary + '</p>';
  /* bodies always rendered (hidden when closed) so drafts + validation work on every step */
  html += '<div class="step-body"' + (isOpen ? '' : ' hidden') + '>' + bodyHTML + '</div>';
  html += '</section>';
  return html;
}

function checkoutGuard(parsed){
  var cartNow = RW.store.get('rw_cart') || [];
  if (!cartNow.length) return '#/cart';
  return true;
}
function checkout(){
  RW.hold.expireIfDue();
  var c = cartItems();
  if (!c.length){ RW.router.navigate('#/cart', { replace: true }); return ''; }
  var soldIds = soldInCart();
  if (soldIds.length){
    RW.toast('This item was just sold', 'error');
    RW.router.navigate('#/cart', { replace: true });
    return '';
  }
  var ids = idsOf(c);
  var hold = RW.hold.get();
  if (!hold || hold.type !== 'checkout' || String(hold.items) !== String(ids)){
    hold = RW.hold.start(ids, { type: 'checkout', minutes: Math.round((CFG.holdMs || 600000) / 60000) });
  }
  var d = hold.buyer || {};
  var ps = cartProducts();
  var coupon = RW.store.get('rw_coupon') || null;
  var method = d.method || 'COD';
  var t = RW.store.computeTotals(ps, { coupon: coupon, cod: method === 'COD' });

  var html = '<div class="view checkout-view"><h1 tabindex="-1">Checkout</h1>';
  html += '<p class="hold-timer" aria-live="polite">Items reserved for <strong id="hold-countdown" data-expires="' + hold.expiresAt + '">' + fmtTime(hold.expiresAt - Date.now()) + '</strong> — finish checkout to keep them.</p>';
  if (hold.expiresAt - Date.now() < 0) html += '<div class="alert-error">Your hold has expired.</div>';
  html += '<form class="checkout-form" data-action="place-order" novalidate>';

  /* step 1 contact */
  var cDone = RW.validators.required(d.name || '') && RW.validators.mobile(d.mobile || '');
  var contactBody =
    '<div class="field"><label for="co-name">Full name</label><input type="text" id="co-name" name="name" maxlength="60" required autocomplete="name" value="' + esc(d.name || '') + '"></div>' +
    '<div class="field"><label for="co-mobile">Mobile</label><input type="text" id="co-mobile" name="mobile" inputmode="numeric" maxlength="10" required autocomplete="tel" placeholder="10-digit mobile" value="' + esc(d.mobile || '') + '"><span class="field-hint">Starts with 6-9 — used to track your order</span></div>' +
    '<div class="field"><label for="co-email">Email (optional)</label><input type="email" id="co-email" name="email" maxlength="80" autocomplete="email" value="' + esc(d.email || '') + '"></div>';
  html += stepPanel('contact', 1, 'Contact', cDone ? esc(d.name) + ' · ' + esc(d.mobile) + (d.email ? ' · ' + esc(d.email) : '') : null, contactBody);

  /* step 2 address */
  var aDone = RW.validators.required(d.house || '') && RW.validators.pincode(d.pincode || '');
  var addressBody =
    '<div class="field"><label for="co-house">House / flat</label><input type="text" id="co-house" name="house" maxlength="80" required autocomplete="address-line1" value="' + esc(d.house || '') + '"></div>' +
    '<div class="field"><label for="co-area">Area / landmark</label><input type="text" id="co-area" name="area" maxlength="80" required autocomplete="address-line2" value="' + esc(d.area || '') + '"></div>' +
    '<div class="field"><label for="co-pincode">Pincode</label><input type="text" id="co-pincode" name="pincode" inputmode="numeric" maxlength="6" required autocomplete="postal-code" placeholder="6-digit pincode" value="' + esc(d.pincode || '') + '"><span class="field-hint">City and state fill in automatically</span></div>' +
    '<div class="field-row"><div class="field"><label for="co-city">City</label><input type="text" id="co-city" name="city" maxlength="60" required value="' + esc(d.city || '') + '"></div>' +
    '<div class="field"><label for="co-state">State</label><input type="text" id="co-state" name="state" maxlength="60" required value="' + esc(d.state || '') + '"></div></div>' +
    '<div class="field"><label for="co-tag">Address type</label><select id="co-tag" name="tag"><option value="Home"' + (d.tag === 'Work' ? '' : ' selected') + '>Home</option><option value="Work"' + (d.tag === 'Work' ? ' selected' : '') + '>Work</option></select></div>';
  html += stepPanel('address', 2, 'Address', aDone ? esc(d.house) + ', ' + esc(d.area || '') + ', ' + esc(d.city || '') + ' ' + esc(d.state || '') + ' — ' + esc(d.pincode) : null, addressBody);

  /* step 3 review */
  var reviewBody = '<div class="review-items">';
  for (var ri = 0; ri < ps.length; ri++){
    var rp = ps[ri];
    reviewBody += '<div class="review-item"><span class="review-thumb">' + RW.ui.img(rp, 0, 'card') + '</span>' +
      '<span class="review-info"><strong>' + esc(rp.title) + '</strong><span class="muted small-note">' + esc(E().sizeLabel(rp)) + ' · ' + fmt(rp.price) + '</span></span>' +
      '<a class="btn btn-sm btn-ghost" href="#/cart">Edit cart</a></div>';
  }
  reviewBody += '</div>' + totalsBlock(t, { cod: method === 'COD' });
  html += stepPanel('review', 3, 'Review', null, reviewBody);

  /* step 4 payment */
  var upiBlock =
    '<div class="upi-block" id="upi-block"' + (method === 'UPI' ? '' : ' hidden') + '>' +
    '<div class="field"><label for="co-upi">UPI ID</label><div class="upi-row">' +
    '<input type="text" id="co-upi" name="upiId" maxlength="40" placeholder="name@bank" value="' + esc(d.upiId || '') + '" autocomplete="off">' +
    '<button type="button" class="btn btn-secondary btn-sm" data-action="upi-verify">Verify</button></div>' +
    '<span class="field-hint" id="upi-status">' + (d.upiId ? 'Verified (demo)' : 'Try demo@upi') + '</span></div>' +
    '<div class="qr-mini"><div class="qr-code small" aria-hidden="true">' + qrSvg() + '</div><p class="muted small-note">Or scan this QR with any UPI app</p></div>' +
    '<div class="upi-apps"><span class="muted small-note">Pay with</span>' +
    '<button type="button" class="btn btn-ghost btn-sm" data-action="upi-app" data-app="Google Pay">Google Pay</button>' +
    '<button type="button" class="btn btn-ghost btn-sm" data-action="upi-app" data-app="PhonePe">PhonePe</button>' +
    '<button type="button" class="btn btn-ghost btn-sm" data-action="upi-app" data-app="Paytm">Paytm</button></div></div>';
  var paymentBody =
    '<div class="pay-methods">' +
    '<label class="radio-row"><input type="radio" name="pay-method" value="COD"' + (method === 'COD' ? ' checked' : '') + '> <span>Cash on Delivery <span class="muted">+ ' + fmt(CFG.codFee || 25) + ' handling · pay on delivery</span></span></label>' +
    '<label class="radio-row"><input type="radio" name="pay-method" value="UPI"' + (method === 'UPI' ? ' checked' : '') + '> <span>UPI <span class="muted">GPay · PhonePe · Paytm · any UPI app</span></span></label>' +
    '</div>' + upiBlock;
  html += stepPanel('payment', 4, 'Payment', null, paymentBody);

  /* place order */
  html += '<div class="place-order-box">' + totalsBlock(t, { cod: method === 'COD' }) +
    '<button type="submit" class="btn btn-primary btn-block btn-lg">Place Order — ' +
    (method === 'COD' ? 'Pay ' + fmt(t.total) + ' on delivery' : 'Pay ' + fmt(t.total) + ' via UPI') + '</button>' +
    '<p class="muted small-note">Demo checkout — no real payment is taken.</p></div>';
  html += '</form></div>';
  return html;
}

function qrSvg(){
  var cells = '';
  for (var y = 0; y < 21; y++){
    for (var x = 0; x < 21; x++){
      var corner = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      var on;
      if (corner){
        var lx = x > 13 ? x - 14 : x, ly = y > 13 ? y - 14 : y;
        on = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx > 1 && lx < 5 && ly > 1 && ly < 5);
      } else {
        on = ((x * 13 + y * 7 + x * y) % 5) < 2;
      }
      if (on) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
  }
  return '<svg viewBox="0 0 21 21" width="132" height="132" role="img" aria-label="UPI QR placeholder"><rect width="21" height="21" fill="#fff"/><g fill="#1E1E1E">' + cells + '</g></svg>';
}

/* ---------- pay (UPI screen) ---------- */
function payGuard(parsed, params){
  var o = findOrder(params.orderId);
  if (!o) return true;
  if (o.status !== 'PAYMENT_PENDING' && o.status !== 'PAYMENT_FAILED') return '#/order/' + o.orderId;
  return true;
}
function pay(query, params){
  params = params || {};
  var o = findOrder(params.orderId);
  if (!o){
    return '<div class="view error-view"><h1 tabindex="-1">Order not found</h1>' +
      '<p class="muted">We could not find order <code>' + esc(params.orderId) + '</code>.</p>' +
      '<p><a class="btn btn-primary" href="#/track">Track an order</a></p></div>';
  }
  if (o.status === 'PAYMENT_FAILED') return payFailedUI(o);
  return payWaitingUI(o);
}
function payWaitingUI(o){
  var expires = o.upiExpiresAt || (Date.now() + (CFG.upiWindowMs || 300000));
  var html = '<div class="view pay-view" id="pay-screen"><h1 tabindex="-1">Complete payment</h1>';
  html += '<div class="panel pay-panel">';
  html += '<p class="pay-amount">' + fmt(o.totals.total) + '</p>';
  html += '<p class="muted">Order <strong>' + esc(o.orderId) + '</strong> · UPI</p>';
  html += '<p class="pay-count-label">Time left to pay</p>';
  html += '<p class="pay-count" id="pay-countdown" data-expires="' + expires + '" aria-live="polite">' + fmtTime(expires - Date.now()) + '</p>';
  html += '<div class="pay-wait"><span class="spinner" aria-hidden="true"></span><p class="muted">Awaiting payment approval in your UPI app…</p></div>';
  html += '<div class="qr-panel"><div class="qr-code">' + qrSvg() + '</div>' +
    '<p class="muted small-note">Scan with any UPI app · UPI ID <code>' + esc(o.payment.upiId || 'demo@upi') + '</code></p></div>';
  html += '<div class="pay-demo"><p class="muted small-note">Demo controls — nothing real happens here.</p>' +
    '<button type="button" class="btn btn-primary" data-action="pay-success" data-id="' + esc(o.orderId) + '">Simulate success</button> ' +
    '<button type="button" class="btn btn-danger" data-action="pay-fail" data-id="' + esc(o.orderId) + '">Simulate failure</button></div>';
  html += '</div></div>';
  return html;
}
function payFailedUI(o){
  var html = '<div class="view pay-view" id="pay-screen"><h1 tabindex="-1">Payment failed</h1>';
  html += '<div class="panel">';
  html += '<div class="alert-error" role="alert">We could not complete the UPI payment for <strong>' + esc(o.orderId) + '</strong>.</div>';
  html += '<p class="muted">No money was taken. Your items stay in your cart until the payment window closes.</p>';
  html += '<div class="pay-fail-actions">' +
    '<button type="button" class="btn btn-primary" data-action="pay-retry" data-id="' + esc(o.orderId) + '">Retry UPI</button> ' +
    '<button type="button" class="btn btn-secondary" data-action="pay-switch-cod" data-id="' + esc(o.orderId) + '">Switch to COD</button> ' +
    '<a class="btn btn-ghost" href="#/cart">Back to cart</a></div>';
  html += '</div></div>';
  return html;
}

/* ---------- order confirmation ---------- */
function orderGuard(parsed, params){
  var o = findOrder(params.orderId);
  if (o && (o.status === 'PAYMENT_PENDING' || o.status === 'PAYMENT_FAILED')) return '#/pay/' + o.orderId;
  return true;
}
function order(query, params){
  params = params || {};
  var o = findOrder(params.orderId);
  if (!o){
    return '<div class="view error-view"><h1 tabindex="-1">Order not found</h1>' +
      '<p class="muted">We could not find order <code>' + esc(params.orderId) + '</code>.</p>' +
      '<p><a class="btn btn-primary" href="#/track">Track an order</a></p></div>';
  }
  return orderConfirmation(o);
}
function orderConfirmation(o){
  var a = (o.buyer && o.buyer.address) || {};
  var eta = o.etaDays || etaFor(a.pincode);
  var metro = eta[0] === 2;
  var m4 = String((o.buyer && o.buyer.mobile) || '').slice(-4);
  var html = '<div class="view order-view invoice">';
  html += '<h1 tabindex="-1">Order ' + esc(o.orderId) + ' confirmed</h1>';
  html += '<p class="success-note">Thank you, ' + esc((o.buyer && o.buyer.name) || 'shopper') + '! Tip: save your Order ID <strong>' + esc(o.orderId) + '</strong> — you need it to track, cancel or return.</p>';

  html += '<div class="panel"><h2 class="h3">Payment</h2>';
  html += '<p>' + esc(o.payment.method) + ' · <strong>' + esc(o.payment.status === 'PAID' ? 'Paid' : o.payment.status === 'PENDING' ? 'Pending' : o.payment.status) + '</strong></p>';
  if (o.payment.method === 'COD') html += '<p class="muted small-note">Pay ' + fmt(o.totals.total) + ' to the delivery partner.</p>';
  else if (o.payment.upiId) html += '<p class="muted small-note">UPI ID: ' + esc(o.payment.upiId) + '</p>';
  if (o.status === 'CANCELLED') html += '<p class="field-error">This order was cancelled.</p>';
  html += '</div>';

  html += '<div class="panel"><h2 class="h3">Delivery address</h2><p>' +
    esc((o.buyer && o.buyer.name) || '') + '<br>' + esc((o.buyer && o.buyer.mobile) || '') +
    ((o.buyer && o.buyer.email) ? '<br>' + esc(o.buyer.email) : '') + '<br>' +
    esc(a.house || '') + ', ' + esc(a.area || '') + '<br>' +
    esc(a.city || '') + ', ' + esc(a.state || '') + ' — ' + esc(a.pincode || '') + '</p>';
  html += '<p class="muted">Expected delivery: <strong>' + eta[0] + '-' + eta[1] + ' days</strong> (' + (metro ? 'metro' : 'others') + ')</p></div>';

  html += '<div class="panel"><h2 class="h3">Items (' + o.items.length + ')</h2><div class="order-items">';
  for (var i = 0; i < o.items.length; i++){
    var it = o.items[i];
    var live = E().productById(it.id);
    html += '<div class="order-item"><span class="review-thumb">' + RW.ui.img(live || it, 0, 'card') + '</span>' +
      '<span class="review-info"><strong>' + esc(it.title) + '</strong>' +
      '<span class="muted small-note">' + esc(it.brand) + ' · Size ' + esc(it.size) + ' · ' + esc(it.condition || '') + '</span></span>' +
      '<span class="price-now">' + fmt(it.price) + '</span></div>';
  }
  html += '</div></div>';

  html += '<div class="panel"><h2 class="h3">Order summary</h2>';
  html += totalsBlock(o.totals, { cod: o.totals.codFee > 0 });
  html += '</div>';

  html += '<div class="order-actions no-print">' +
    '<a class="btn btn-primary" href="#/track?o=' + esc(encodeURIComponent(o.orderId)) + '&m=' + esc(encodeURIComponent(m4)) + '">Track order</a> ' +
    '<a class="btn btn-secondary" href="#/shop">Continue shopping</a> ' +
    '<button type="button" class="btn btn-ghost" data-action="print-invoice">Print invoice</button></div>';
  html += '</div>';
  return html;
}

/* ---------- track order ---------- */
var STAGES = [
  { key: 'PLACED', label: 'Placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PACKED', label: 'Packed' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { key: 'DELIVERED', label: 'Delivered' }
];
var STAGE_MS = [0, 3600000, 6 * 3600000, 24 * 3600000, 36 * 3600000, 48 * 3600000];
var STAGE_MS_DEMO = [0, 30000, 60000, 90000, 120000, 150000];
function stageIndex(key){
  for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === key) return i;
  return -1;
}
function derivedStatus(o, demo){
  if (['CANCELLED','PAYMENT_PENDING','PAYMENT_FAILED','RETURN_REQUESTED','RETURN_APPROVED'].indexOf(o.status) >= 0) return o.status;
  var offs = demo ? STAGE_MS_DEMO : STAGE_MS;
  var last = 'PLACED';
  for (var i = 0; i < STAGES.length; i++){
    if (o.createdAt + offs[i] <= Date.now()) last = STAGES[i].key;
    else break;
  }
  return last;
}
function effectiveStatus(o, demo){
  if (o.seeded) return o.pinnedStatus || o.status;
  return derivedStatus(o, demo);
}
function timelineData(o, demo){
  var times = {}, cancelled = null;
  if (o.seeded && o.pinnedTimeline){
    for (var i = 0; i < o.pinnedTimeline.length; i++){
      var e = o.pinnedTimeline[i];
      var ts = o.createdAt + (Number(e.agoHours) || 0) * 3600000;
      if (e.stage === 'CANCELLED') cancelled = ts;
      else times[e.stage] = ts;
    }
  } else {
    var offs = demo ? STAGE_MS_DEMO : STAGE_MS;
    for (var s = 0; s < STAGES.length; s++) times[STAGES[s].key] = o.createdAt + offs[s];
    if (o.status === 'CANCELLED' || o.cancelledAt) cancelled = o.cancelledAt || null;
  }
  return { times: times, cancelled: cancelled };
}
function deliveredAt(o, demo){
  var td = timelineData(o, demo);
  return td.times.DELIVERED || null;
}
function fmtTs(ts){
  var d = new Date(ts);
  try {
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch(e){ return d.toDateString(); }
}
function prettyStatus(s){
  var st = null;
  for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === s) st = STAGES[i].label;
  if (st) return st;
  return String(s || '').replace(/_/g, ' ').toLowerCase().replace(/^./, function(c){ return c.toUpperCase(); });
}
function trackGuard(){ return true; }
function track(query){
  query = query || {};
  var oid = String(query.o || '').trim().toUpperCase();
  var demo = query.demo === '1';
  var orders = (RW.store.get('rw_orders') || []).slice();
  orders.sort(function(a, b){ return (b.createdAt || 0) - (a.createdAt || 0); });
  var html = '<div class="view track-view"><h1 tabindex="-1">Track your orders</h1>';

  if (oid){
    var o = findOrder(oid);
    if (!o){
      html += '<div class="panel"><p class="field-error">No order found with ID ' + esc(oid) + '.</p>' +
        '<p class="muted small-note">Orders placed in this browser are listed below.</p></div>';
    } else {
      html += trackResult(o, demo);
    }
  }

  html += '<div class="track-list-head"><h2 class="h3">' + (orders.length === 1 ? '1 order' : orders.length + ' orders') + '</h2>' +
    '<p class="muted small-note">' + (oid ? '<a href="#/track">Back to all orders</a>' : 'Newest first · open an order for its full timeline') + '</p></div>';

  if (!orders.length){
    html += '<div class="panel track-empty"><p class="muted">No orders yet — place an order and it will appear here with live status.</p>' +
      '<p><a class="btn btn-primary" href="#/shop">Start shopping</a></p></div>';
  } else {
    html += '<div class="track-list">';
    for (var i = 0; i < orders.length; i++) html += trackRow(orders[i]);
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function trackRow(o){
  var cancelled = o.status === 'CANCELLED';
  var st = cancelled ? 'CANCELLED' : effectiveStatus(o, false);
  var td = timelineData(o, false);
  var items = o.items || [];
  var first = items[0] || {};
  var esc2 = esc;
  var itemLine = (first.title ? esc2(first.title) : 'Item') + (items.length > 1 ? ' <span class="muted">+ ' + (items.length - 1) + ' more</span>' : '');
  var total = o.totals ? o.totals.total : null;

  var html = '<article class="track-row">';
  html += '<div class="track-row-top"><p class="track-row-oid"><a href="#/track?o=' + encodeURIComponent(o.orderId) + '">' + esc2(o.orderId) + '</a></p>' +
    '<span class="badge status-' + esc2(st) + '">' + esc2(prettyStatus(st)) + '</span></div>';
  html += '<p class="track-items">' + itemLine + '</p>';
  html += '<div class="track-mini">';
  if (cancelled){
    html += '<span class="tm-dot is-cancel" aria-hidden="true"></span><span class="tm-label">Cancelled' + (td.cancelled ? ' · ' + fmtTs(td.cancelled) : '') + '</span>';
  } else {
    for (var i = 0; i < STAGES.length; i++){
      var ts = td.times[STAGES[i].key];
      var done = ts != null && ts <= Date.now();
      html += '<span class="tm-dot' + (done ? ' is-done' : '') + '" aria-hidden="true"></span>';
    }
    html += '<span class="tm-label">' + esc2(prettyStatus(st)) + '</span>';
  }
  html += '</div>';
  html += '<div class="track-row-foot"><span>' + (o.createdAt ? fmtTs(o.createdAt) : '') + '</span>' +
    '<span>' + (total != null ? fmt(total) : '') + (items.length ? ' · ' + items.length + ' item' + (items.length === 1 ? '' : 's') : '') + '</span>' +
    '<a class="btn btn-ghost btn-sm" href="#/track?o=' + encodeURIComponent(o.orderId) + '">View timeline</a></div>';
  html += '</article>';
  return html;
}

function trackResult(o, demo){
  var st = effectiveStatus(o, demo);
  var td = timelineData(o, demo);
  var curIdx = stageIndex(st);
  var html = '<div class="panel track-result">';
  html += '<div class="track-head"><div><p class="muted small-note">Order</p><p class="track-oid">' + esc(o.orderId) + '</p></div>' +
    '<span class="badge status-' + esc(st) + '">' + esc(prettyStatus(st)) + '</span></div>';

  /* timeline */
  html += '<ol class="timeline">';
  var now = Date.now();
  for (var i = 0; i < STAGES.length; i++){
    var key = STAGES[i].key, ts = td.times[key];
    var done;
    if (o.seeded) done = ts != null;
    else if (o.status === 'CANCELLED') done = ts != null && ts <= now && (td.cancelled == null || ts <= td.cancelled);
    else done = ts != null && ts <= now;
    var cls = done ? ' is-done' : (i === 0 && !done ? ' is-current' : '');
    html += '<li class="tl-item' + cls + '"><span class="tl-dot" aria-hidden="true"></span>' +
      '<div class="tl-body"><strong>' + esc(STAGES[i].label) + '</strong>' +
      '<span class="muted small-note">' + (done && ts ? fmtTs(ts) : (ts && ts > now ? 'Expected ' + fmtTs(ts) : 'Pending')) + '</span></div></li>';
  }
  if (td.cancelled != null){
    html += '<li class="tl-item is-cancel"><span class="tl-dot" aria-hidden="true"></span>' +
      '<div class="tl-body"><strong>Cancelled</strong><span class="muted small-note">' + fmtTs(td.cancelled) + '</span></div></li>';
  }
  var rr = o.returnRequest;
  if (rr){
    html += '<li class="tl-item ' + (rr.status === 'RETURN_APPROVED' ? 'is-done' : 'is-current') + '"><span class="tl-dot" aria-hidden="true"></span>' +
      '<div class="tl-body"><strong>Return ' + esc(rr.status === 'RETURN_APPROVED' ? 'approved' : 'requested') + '</strong>' +
      '<span class="muted small-note">' + fmtTs(rr.approvedAt || rr.at) + ' · ' + esc(rr.reason || 'not as described') + '</span></div></li>';
  }
  html += '</ol>';

  /* ETA + actions */
  var a = (o.buyer && o.buyer.address) || {};
  var eta = o.etaDays || etaFor(a.pincode);
  if (curIdx >= 0 && st !== 'DELIVERED' && o.status !== 'CANCELLED'){
    html += '<p class="muted">Expected delivery: <strong>' + eta[0] + '-' + eta[1] + ' days</strong></p>';
  }

  var canCancel = !o.seeded && ['PLACED','CONFIRMED','PACKED'].indexOf(st) >= 0 && o.status !== 'CANCELLED' && !rr;
  if (canCancel){
    html += '<div class="track-actions no-print"><button type="button" class="btn btn-danger" data-action="order-cancel" data-id="' + esc(o.orderId) + '">Cancel order</button></div>';
  }
  if (o.status === 'CANCELLED'){
    html += '<p class="field-error">This order was cancelled. Items are available again.</p>';
  }

  /* after delivery: rate + return */
  if (st === 'DELIVERED' && o.status !== 'CANCELLED'){
    if (o.rating){
      html += '<div class="rating-done"><p class="muted small-note">You rated this order</p>' + RW.ui.stars(o.rating.stars) +
        (o.rating.comment ? '<p>' + esc(o.rating.comment) + '</p>' : '') + '</div>';
    } else {
      html += '<form class="panel rate-form" data-action="rate-form" data-id="' + esc(o.orderId) + '">';
      html += '<h3 class="h3">Rate the seller</h3>';
      html += '<div class="star-pick" role="group" aria-label="Choose a rating">';
      for (var s = 1; s <= 5; s++){
        html += '<button type="button" class="star-btn" data-action="rate-pick" data-n="' + s + '" aria-label="' + s + ' stars" data-on="0">★</button>';
      }
      html += '</div>';
      html += '<div class="field"><label for="rate-comment">Comment (optional)</label><textarea id="rate-comment" maxlength="300" placeholder="How was the item and the seller?"></textarea></div>';
      html += '<button type="submit" class="btn btn-primary btn-sm">Submit rating</button></form>';
    }
    if (!rr){
      var dt = deliveredAt(o, demo);
      var days = CFG.returnWindowDays || 3;
      if (dt && now - dt <= days * 86400000){
        html += '<div class="track-actions no-print"><button type="button" class="btn btn-secondary" data-action="return-request" data-id="' + esc(o.orderId) + '">Request return (within ' + days + ' days)</button></div>';
      } else if (dt){
        html += '<p class="muted small-note">Return window closed ' + days + ' days after delivery.</p>';
      }
    } else if (rr.status === 'RETURN_REQUESTED'){
      html += '<div class="panel return-panel"><p class="badge badge-soft">Return requested</p>' +
        '<p class="muted small-note">Reason: ' + esc(rr.reason) + ' · requested ' + fmtTs(rr.at) + '</p>' +
        '<button type="button" class="btn btn-secondary btn-sm no-print" data-action="return-approve" data-id="' + esc(o.orderId) + '">Simulate approval</button></div>';
    } else if (rr.status === 'RETURN_APPROVED'){
      html += '<div class="panel return-panel"><p class="badge badge-success">Return approved</p>' +
        '<p class="muted small-note">Your refund would be processed to the original payment method. The item is available again.</p></div>';
    }
  }
  html += '</div>';
  return html;
}

/* ---------- product actions ---------- */
RW.actions['gallery-pick'] = function(el){
  var view = el.closest('.product-view');
  if (!view) return;
  var v = parseInt(el.getAttribute('data-variant'), 10) || 0;
  var id = (location.hash.match(/RW-\d+/) || [''])[0];
  var p = E().productById(id);
  if (!p) return;
  var main = view.querySelector('.gallery-main');
  if (main) main.innerHTML = RW.ui.img(p, v);
  var thumbs = view.querySelectorAll('.gallery-thumb');
  for (var i = 0; i < thumbs.length; i++){
    var on = i === v;
    thumbs[i].classList.toggle('is-active', on);
    thumbs[i].setAttribute('aria-selected', on ? 'true' : 'false');
  }
};
RW.actions['gallery-zoom'] = function(el){
  var svg = el.querySelector('svg, img');
  var wrap = document.createElement('div');
  wrap.innerHTML = svg ? svg.outerHTML : '';
  RW.modal.open({ title: 'Zoom', bodyHTML: '<div class="zoom-wrap">' + (svg ? svg.outerHTML : '') + '</div>', wide: true, actions: [{ label: 'Close', cls: 'btn-secondary' }] });
};
RW.actions['size-guide'] = function(){
  RW.modal.open({
    title: 'Size guide',
    bodyHTML: '<table class="meas-table"><thead><tr><th>Label</th><th>Meaning</th></tr></thead><tbody>' +
      '<tr><td>Waist 32</td><td>Waist ~32 in / 81 cm (bottoms, belts)</td></tr>' +
      '<tr><td>Chest 40</td><td>Chest ~40 in / 102 cm (ethnic, formal, outerwear)</td></tr>' +
      '<tr><td>Collar 40</td><td>Collar ~40 in / 102 cm (shirts)</td></tr>' +
      '<tr><td>S / M / L / XL</td><td>Brand letter sizes — check measurements below each listing</td></tr>' +
      '<tr><td>Free</td><td>One size (sarees, stoles, ties, bags)</td></tr>' +
      '<tr><td>6-7 yrs</td><td>Kids age band</td></tr>' +
      '</tbody></table><p class="muted small-note">Every listing includes garment measurements — always compare those.</p>',
    actions: [{ label: 'Close', cls: 'btn-secondary' }]
  });
};
RW.actions['share-listing'] = function(el){
  var id = el.getAttribute('data-id');
  var p = E().productById(id);
  if (!p) return;
  var isFile = location.protocol === 'file:';
  if (!isFile && navigator.share){
    navigator.share({ title: p.title, url: location.href })['catch'](function(){});
    return;
  }
  var text = isFile ? (p.id + ' - ' + p.title) : location.href;
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){
      RW.toast(isFile ? 'Links work only when hosted' : 'Link copied');
    })['catch'](function(){ RW.toast(isFile ? (p.id + ' - ' + p.title) : 'Links work only when hosted'); });
  } else {
    RW.toast(isFile ? (p.id + ' - ' + p.title) : 'Links work only when hosted');
  }
};
RW.actions['report-listing'] = function(el){
  var id = el.getAttribute('data-id');
  var reports = RW.store.get('rw_reports') || [];
  for (var i = 0; i < reports.length; i++){
    if (reports[i].listingId === id){ RW.toast('You already reported this listing'); return; }
  }
  var reasons = ['Counterfeit', 'Prohibited item', 'Wrong info', 'Spam', 'Other'];
  var html = '<div class="field"><label for="rep-reason">Reason</label><select id="rep-reason">';
  for (var r = 0; r < reasons.length; r++) html += '<option>' + reasons[r] + '</option>';
  html += '</select></div><div class="field"><label for="rep-note">Note (optional)</label><textarea id="rep-note" maxlength="300"></textarea></div>';
  RW.modal.open({
    title: 'Report listing',
    bodyHTML: html,
    actions: [
      { label: 'Cancel', cls: 'btn-ghost' },
      { label: 'Submit report', cls: 'btn-danger', onClick: function(){
        var sel = document.getElementById('rep-reason');
        var note = document.getElementById('rep-note');
        var rid = 'REP-' + Math.floor(1000 + Math.random() * 9000);
        reports.push({ id: rid, listingId: id, reason: sel ? sel.value : 'Other', note: note ? note.value : '', createdAt: Date.now() });
        RW.store.set('rw_reports', reports);
        RW.toast('Report ' + rid + ' received. Thanks!', 'success');
      } }
    ]
  });
};

/* pincode delivery check */
RW.actions['pincode-check'] = function(form, ev){
  if (ev && ev.preventDefault) ev.preventDefault();
  var input = form.querySelector('input[name="pincode"]');
  var out = document.getElementById('pin-result');
  var val = input ? String(input.value || '').trim() : '';
  if (!/^\d{6}$/.test(val)){ if (out) out.innerHTML = '<p class="field-error">Enter a valid 6-digit pincode.</p>'; return; }
  var pins = (window.RW_DATA && window.RW_DATA.pincodes) || {};
  var regions = (window.RW_DATA && window.RW_DATA.pinRegions) || {};
  if (val.charAt(0) === '9'){
    if (out) out.innerHTML = '<p class="field-error">Sorry — this pincode is not serviceable.</p>';
    return;
  }
  var info = pins[val.slice(0, 3)] || regions[val.charAt(0)] || { city: 'your area', state: 'India' };
  var days = pins[val.slice(0, 3)] ? '2-4' : '4-7';
  if (out) out.innerHTML = '<p class="success-note">Delivers to ' + esc(info.city) + ' in ~' + days + ' days.</p>';
};

/* message seller */
RW.actions['message-seller'] = function(form, ev){
  if (ev && ev.preventDefault) ev.preventDefault();
  var name = form.querySelector('[name=name]');
  var contact = form.querySelector('[name=contact]');
  var text = form.querySelector('[name=text]');
  if (!name.value.trim() || !contact.value.trim() || !text.value.trim()){ RW.toast('Please fill all fields', 'error'); return; }
  var msgs = RW.store.get('rw_messages') || [];
  msgs.push({
    id: 'MSG-' + Math.floor(1000 + Math.random() * 9000),
    listingId: form.getAttribute('data-id'),
    sellerId: form.getAttribute('data-seller'),
    fromName: name.value.trim().slice(0, 60),
    contact: contact.value.trim().slice(0, 80),
    text: text.value.trim().slice(0, 500),
    createdAt: Date.now()
  });
  RW.store.set('rw_messages', msgs);
  form.reset();
  RW.toast('Message sent to the seller', 'success');
};

/* gallery keyboard */
document.addEventListener('keydown', function(e){
  if (e.key !== 'Enter' && e.key !== ' ') return;
  var el = e.target;
  if (el && el.getAttribute && el.getAttribute('data-action') === 'gallery-zoom'){
    e.preventDefault();
    RW.actions['gallery-zoom'](el, e);
  }
});

/* ---------- cart actions ---------- */
RW.actions['cart-remove'] = function(el){
  var id = el.getAttribute('data-id');
  removeFromCart([id]);
  var hold = RW.hold.get();
  if (hold && hold.type === 'checkout') RW.hold.clear();
  RW.toast('Removed from cart');
  RW.router.navigate(location.hash, { replace: true });
};
RW.actions['cart-to-wish'] = function(el){
  var id = el.getAttribute('data-id');
  var w = RW.store.get('rw_wishlist') || {};
  if (!w[id]) w[id] = { price: (E().productById(id) || {}).price, at: Date.now() };
  RW.store.set('rw_wishlist', w);
  removeFromCart([id]);
  var hold = RW.hold.get();
  if (hold && hold.type === 'checkout') RW.hold.clear();
  RW.toast('Moved to wishlist', 'success');
  RW.router.navigate(location.hash, { replace: true });
};
RW.actions['go-checkout'] = function(){
  if (soldInCart().length){ RW.toast('Remove unavailable items first', 'error'); return; }
  RW.router.navigate('#/checkout');
};
RW.actions['apply-coupon'] = function(el, ev){
  var input = el.querySelector('input[name=coupon]');
  var code = String(input ? input.value : '').trim().toUpperCase();
  if (!code){ RW.toast('Enter a coupon code', 'error'); return; }
  RW.store.set('rw_coupon', code);
  var ps = cartProducts();
  var t = RW.store.computeTotals(ps, { coupon: code });
  if (t.couponCode) RW.toast('Coupon ' + t.couponCode + ' applied', 'success');
  else RW.toast(t.couponNote || 'Coupon not applied', 'error');
  RW.router.navigate(location.hash, { replace: true });
};
RW.actions['remove-coupon'] = function(){
  RW.store.set('rw_coupon', null);
  RW.toast('Coupon removed');
  RW.router.navigate(location.hash, { replace: true });
};

/* ---------- checkout actions ---------- */
RW.actions['co-toggle'] = function(el){
  saveDraftNow();
  var step = el.getAttribute('data-step');
  coOpen = (coOpen === step) ? null : step;
  RW.router.navigate(location.hash, { replace: true });
  var panel = document.querySelector('.step-panel.is-open');
  if (panel){
    var inp = panel.querySelector('input, select, textarea');
    if (inp) inp.focus();
  }
};
RW.actions['upi-verify'] = function(){
  var input = document.getElementById('co-upi');
  var status = document.getElementById('upi-status');
  if (!input) return;
  if (RW.validators.upi(input.value)){
    if (status){ status.textContent = 'Verified (demo)'; status.className = 'field-hint success-note'; }
    RW.toast('UPI ID verified (demo)', 'success');
    saveDraftNow();
  } else {
    if (status){ status.textContent = 'Enter a valid UPI ID like name@bank'; status.className = 'field-hint field-error'; }
    input.focus();
  }
};
RW.actions['upi-app'] = function(el){
  var input = document.getElementById('co-upi');
  var status = document.getElementById('upi-status');
  var banks = { 'Google Pay': 'okaxis', 'PhonePe': 'ybl', 'Paytm': 'paytm' };
  var app = el.getAttribute('data-app') || 'upi';
  if (input){
    input.value = 'demo@' + (banks[app] || 'upi');
    if (status){ status.textContent = 'Verified (demo) · ' + app; status.className = 'field-hint success-note'; }
  }
  RW.toast(app + ' selected (demo)');
  saveDraftNow();
};
RW.actions['place-order'] = function(el, ev){
  var root = document.querySelector('.checkout-view');
  if (!root) return;
  if (!validateCheckout(root)) return;
  /* freshness: re-read storage so another tab's purchase is seen before placing */
  RW.store.reload();
  var c = cartItems();
  var ps = cartProducts();
  if (!c.length || !ps.length || ps.length !== c.length || soldInCart().length){
    RW.toast('This item was just sold', 'error');
    RW.router.navigate('#/cart');
    return;
  }
  var d = readDraft(root);
  var method = d.method || 'COD';
  var upiId = d.upiId || '';
  var upiInput = document.getElementById('co-upi');
  if (method === 'UPI' && !RW.validators.upi(upiId)){
    if (upiInput){
      var f = upiInput.closest('.field');
      if (f) f.classList.add('is-error');
      upiInput.focus();
    }
    RW.toast('Enter a valid UPI ID (e.g. demo@upi)', 'error');
    return;
  }
  if (method === 'COD' && RW.hold.get() && RW.hold.get().type === 'checkout'){
    RW.hold.patch(function(h){ h.buyer = d; return h; });
  }

  var coupon = RW.store.get('rw_coupon') || null;
  var t = RW.store.computeTotals(ps, { coupon: coupon, cod: method === 'COD' });
  var addr = { house: d.house, area: d.area, pincode: d.pincode, city: d.city, state: d.state, tag: d.tag || 'Home' };
  var items = [];
  for (var i = 0; i < ps.length; i++) items.push(snapshotItem(ps[i]));

  var order = {
    orderId: nextOrderId(),
    seeded: false,
    items: items,
    buyer: { name: d.name, mobile: d.mobile, email: d.email || '', address: addr },
    payment: method === 'COD' ? { method: 'COD', status: 'PAID', upiId: null } : { method: 'UPI', status: 'PENDING', upiId: upiId },
    totals: t,
    coupon: t.couponCode,
    createdAt: Date.now(),
    status: method === 'COD' ? 'PLACED' : 'PAYMENT_PENDING',
    timeline: [],
    rating: null,
    returnRequest: null,
    userListingIds: userListingIdsIn(idsOf(ps)),
    etaDays: etaFor(addr.pincode),
    upiExpiresAt: method === 'UPI' ? Date.now() + (CFG.upiWindowMs || 300000) : null
  };
  var orders = (RW.store.get('rw_orders') || []).slice();
  orders.push(order);
  RW.store.set('rw_orders', orders);

  var ids = idsOf(ps);
  if (method === 'COD'){
    markSold(ids);
    removeFromCart(ids);
    RW.store.set('rw_coupon', null);
    RW.hold.clear();
    coOpen = 'contact';
    RW.toast('Order placed — ' + order.orderId, 'success');
    RW.router.navigate('#/order/' + order.orderId);
  } else {
    RW.hold.start(ids, { type: 'upi', orderId: order.orderId, minutes: Math.round((CFG.upiWindowMs || 300000) / 60000), buyer: d });
    RW.router.navigate('#/pay/' + order.orderId);
  }
};
function snapshotItem(p){
  var seller = E().sellerById(p.sellerId) || {};
  return {
    id: p.id, title: p.title, brand: p.brand, price: p.price, mrp: p.mrp,
    size: p.size, sellerId: p.sellerId, sellerName: seller.name || '',
    colorHex: p.colorHex, shape: p.shape, image: p.image, condition: p.condition
  };
}

/* checkout field listeners: draft autosave + pincode auto-fill + method switch */
document.addEventListener('input', function(e){
  var el = e.target;
  if (!el || !el.closest) return;
  if (el.id === 'co-pincode'){
    var v = String(el.value || '').replace(/\D/g, '').slice(0, 6);
    if (el.value !== v) el.value = v;
    var f = el.closest('.field');
    if (f){
      f.classList.remove('is-error');
      var err = f.querySelector('.field-error');
      if (err) err.textContent = '';
    }
    if (v.length === 6){
      if (v.charAt(0) === '9'){ setFieldError(el, 'Sorry — this pincode is not serviceable.'); }
      else {
        var pins = (window.RW_DATA && window.RW_DATA.pincodes) || {};
        var regions = (window.RW_DATA && window.RW_DATA.pinRegions) || {};
        var info = pins[v.slice(0, 3)] || regions[v.charAt(0)];
        var city = document.getElementById('co-city'), state = document.getElementById('co-state');
        if (info && city && !city.dataset.touched) city.value = info.city;
        if (info && state && !state.dataset.touched) state.value = info.state;
      }
    }
  }
  if (el.closest('.checkout-view')) saveDraftDebounced();
});
document.addEventListener('input', function(e){
  var el = e.target;
  if (el && (el.id === 'co-city' || el.id === 'co-state')) el.dataset.touched = '1';
});
document.addEventListener('change', function(e){
  var el = e.target;
  if (!el || !el.closest || !el.closest('.checkout-view')) return;
  if (el.name === 'pay-method'){
    saveDraftNow();
    coOpen = 'payment';
    RW.router.navigate(location.hash, { replace: true });
    var block = document.getElementById('upi-block');
    if (block && el.value === 'UPI') block.focus && block.focus();
  }
});

/* ---------- pay actions ---------- */
function currentOrder(id){ return findOrder(id); }
RW.actions['pay-success'] = function(el){
  var o = currentOrder(el.getAttribute('data-id'));
  if (!o || o.status !== 'PAYMENT_PENDING') return;
  var ids = idsOf(o.items);
  var blocked = false;
  for (var i = 0; i < ids.length; i++){
    var p = E().productById(ids[i]);
    if (!p || p.status === 'sold') blocked = true;
  }
  if (blocked){
    RW.toast('This item was just sold', 'error');
    RW.router.navigate('#/cart');
    return;
  }
  markSold(ids);
  removeFromCart(ids);
  RW.store.set('rw_coupon', null);
  RW.hold.clear();
  o.status = 'PLACED';
  o.payment.status = 'PAID';
  o.upiExpiresAt = null;
  saveOrders();
  var box = document.getElementById('pay-screen');
  if (box){
    box.innerHTML = '<div class="pay-success"><div class="tick" aria-hidden="true">✓</div>' +
      '<h1 tabindex="-1">Payment successful</h1><p class="muted">Taking you to your confirmation…</p></div>';
    var h1 = box.querySelector('h1');
    if (h1) h1.focus();
  }
  RW.toast('Payment successful', 'success');
  setTimeout(function(){ RW.router.navigate('#/order/' + o.orderId); }, 1200);
};
RW.actions['pay-fail'] = function(el){
  var o = currentOrder(el.getAttribute('data-id'));
  if (!o || o.status !== 'PAYMENT_PENDING') return;
  o.status = 'PAYMENT_FAILED';
  o.payment.status = 'FAILED';
  saveOrders();
  RW.router.navigate(location.hash, { replace: true });
};
RW.actions['pay-retry'] = function(el){
  var o = currentOrder(el.getAttribute('data-id'));
  if (!o) return;
  o.status = 'PAYMENT_PENDING';
  o.payment.status = 'PENDING';
  o.upiExpiresAt = Date.now() + (CFG.upiWindowMs || 300000);
  saveOrders();
  RW.hold.start(idsOf(o.items), { type: 'upi', orderId: o.orderId, minutes: Math.round((CFG.upiWindowMs || 300000) / 60000) });
  RW.toast('UPI request sent again');
  RW.router.navigate(location.hash, { replace: true });
};
RW.actions['pay-switch-cod'] = function(el){
  var o = currentOrder(el.getAttribute('data-id'));
  if (!o) return;
  var ids = idsOf(o.items);
  var blocked = false;
  for (var i = 0; i < ids.length; i++){
    var p = E().productById(ids[i]);
    if (!p || p.status === 'sold') blocked = true;
  }
  if (blocked){
    RW.toast('This item was just sold', 'error');
    RW.router.navigate('#/cart');
    return;
  }
  o.payment = { method: 'COD', status: 'PAID', upiId: o.payment ? o.payment.upiId : null };
  o.totals = RW.store.computeTotals(o.items, { coupon: o.coupon, cod: true });
  o.status = 'PLACED';
  o.upiExpiresAt = null;
  markSold(ids);
  removeFromCart(ids);
  RW.store.set('rw_coupon', null);
  RW.hold.clear();
  saveOrders();
  RW.toast('Switched to COD — order placed', 'success');
  RW.router.navigate('#/order/' + o.orderId);
};

/* ---------- order actions ---------- */
RW.actions['print-invoice'] = function(){ window.print(); };

/* ---------- track actions ---------- */
RW.actions['order-cancel'] = function(el){
  var o = findOrder(el.getAttribute('data-id'));
  if (!o) return;
  RW.confirm('Cancel order ' + o.orderId + '? The items become available again.', function(){
    o.status = 'CANCELLED';
    o.cancelledAt = Date.now();
    o.timeline = (o.timeline || []).concat([{ stage: 'CANCELLED', at: Date.now() }]);
    markAvailable(idsOf(o.items));
    saveOrders();
    RW.toast('Order cancelled', 'success');
    RW.router.navigate(location.hash, { replace: true });
  }, { danger: true, yes: 'Cancel order' });
};
RW.actions['rate-pick'] = function(el){
  var n = el.getAttribute('data-n');
  var group = el.closest('.star-pick');
  if (!group) return;
  var btns = group.querySelectorAll('.star-btn');
  for (var i = 0; i < btns.length; i++){
    var on = Number(btns[i].getAttribute('data-n')) <= Number(n);
    btns[i].classList.toggle('is-on', on);
    btns[i].setAttribute('data-on', on ? '1' : '0');
  }
  group.setAttribute('data-value', n);
};
RW.actions['rate-form'] = function(el, ev){
  var o = findOrder(el.getAttribute('data-id'));
  if (!o) return;
  var group = el.querySelector('.star-pick');
  var val = group ? Number(group.getAttribute('data-value') || 0) : 0;
  if (val < 1 || val > 5){ RW.toast('Choose 1-5 stars', 'error'); return; }
  var comment = el.querySelector('#rate-comment');
  o.rating = { stars: val, comment: comment ? comment.value.trim().slice(0, 300) : '', at: Date.now() };
  if (o.items && o.items[0]) applyRating(o.items[0].sellerId, val);
  saveOrders();
  RW.toast('Thanks for rating!', 'success');
  RW.router.navigate(location.hash, { replace: true });
};
function applyRating(sellerId, stars){
  if (!sellerId) return;
  var base = E().sellerById(sellerId) || { rating: 4, ratingCount: 0 };
  var ov = RW.store.get('rw_seller_overrides') || {};
  var cur = ov[sellerId] || { rating: base.rating != null ? base.rating : 4, ratingCount: base.ratingCount || 0 };
  var n = cur.ratingCount || 0;
  var newRating = ((cur.rating || 0) * n + stars) / (n + 1);
  ov[sellerId] = { rating: Math.round(newRating * 10) / 10, ratingCount: n + 1 };
  RW.store.set('rw_seller_overrides', ov);
}
RW.actions['return-request'] = function(el){
  var o = findOrder(el.getAttribute('data-id'));
  if (!o) return;
  RW.confirm('Request a return for ' + o.orderId + '? Reason: not as described.', function(){
    o.returnRequest = { status: 'RETURN_REQUESTED', at: Date.now(), reason: 'not as described' };
    saveOrders();
    RW.toast('Return requested', 'success');
    RW.router.navigate(location.hash, { replace: true });
  }, { yes: 'Request return' });
};
RW.actions['return-approve'] = function(el){
  var o = findOrder(el.getAttribute('data-id'));
  if (!o || !o.returnRequest) return;
  o.returnRequest.status = 'RETURN_APPROVED';
  o.returnRequest.approvedAt = Date.now();
  markAvailable(idsOf(o.items));
  saveOrders();
  RW.toast('Return approved — item is available again', 'success');
  RW.router.navigate(location.hash, { replace: true });
};

/* ---------- countdown timers (display only; expiry computed on read) ---------- */
var tickTimer = null;
document.addEventListener('rw:rendered', function(){
  if (tickTimer){ clearInterval(tickTimer); tickTimer = null; }
  var nodes = document.querySelectorAll('[data-expires]');
  if (!nodes.length) return;
  var els = [];
  for (var i = 0; i < nodes.length; i++) els.push(nodes[i]);
  tickTimer = setInterval(function(){
    var alive = false;
    for (var i = 0; i < els.length; i++){
      if (!els[i].isConnected) continue;
      alive = true;
      var left = Number(els[i].getAttribute('data-expires')) - Date.now();
      if (left <= 0){
        clearInterval(tickTimer); tickTimer = null;
        RW.hold.expireIfDue();
        if (location.hash.indexOf('#/checkout') === 0){
          RW.toast('Your 10-minute hold expired — items are back in your cart.', 'error');
          RW.router.navigate('#/cart');
        } else {
          RW.router.navigate(location.hash, { replace: true });
        }
        return;
      }
      els[i].textContent = fmtTime(left);
    }
    if (!alive && tickTimer){ clearInterval(tickTimer); tickTimer = null; }
  }, 1000);
});

/* seller ratings merge (rate updates the average shown everywhere) */
(function(){
  var base = E().sellerById;
  E().sellerById = function(id){
    var s = base(id);
    if (!s) return s;
    var ov = RW.store.get('rw_seller_overrides') || {};
    if (!ov[id]) return s;
    var m = Object.assign({}, s);
    if (ov[id].rating != null) m.rating = ov[id].rating;
    if (ov[id].ratingCount != null) m.ratingCount = ov[id].ratingCount;
    return m;
  };
})();

/* cross-tab: re-render cart when another tab changes it (sold elsewhere etc.) */
RW.store.subscribe(function(state, fromStorage){
  if (!fromStorage) return;
  var p = RW.router.current().path;
  if (p === '/cart') RW.router.navigate(location.hash, { replace: true });
});

RW.viewsBuy = { product: product, seller: seller, wishlist: wishlist, cart: cart, checkout: checkout, pay: pay, order: order, track: track };

RW.router.register('/product/:id', product, { title: function(p){ var it = E().productById(p.id); return it ? it.title : 'Listing'; } });
RW.router.register('/seller/:id', seller, { title: function(p){ var s = E().sellerById(p.id); return s ? s.name : 'Seller'; } });
RW.router.register('/wishlist', wishlist, { title: 'Wishlist' });
RW.router.register('/cart', cart, { title: 'Cart' });
RW.router.register('/checkout', checkout, { title: 'Checkout', guard: checkoutGuard });
RW.router.register('/pay/:orderId', pay, { title: 'Payment', guard: payGuard });
RW.router.register('/order/:orderId', order, { title: 'Order', guard: orderGuard });
RW.router.register('/track', track, { title: 'Track order' });

})();
