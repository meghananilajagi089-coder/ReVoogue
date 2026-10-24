/* views-info.js — exports: RW.viewsInfo (HowItWorks, About, FAQ, Contact, Policy) */
(function(){
'use strict';
var RW = window.RW = window.RW || {};
var esc = RW.util.esc;
RW.viewsInfo = RW.viewsInfo || {};

function steps(list){
  var html = '<ol>';
  for (var i = 0; i < list.length; i++) html += '<li>' + esc(list[i]) + '</li>';
  return html + '</ol>';
}
function howItWorks(){
  var buy = [
    'Browse the catalogue or search — filter by category, size, condition and price.',
    'Open a listing for measurements, wear count, flaw photos and seller details.',
    'Add to cart and check out with UPI or Cash on Delivery.',
    'Follow the order stage by stage — Placed, Confirmed, Packed, Shipped, Out for delivery, Delivered — on the Track page.',
    'Inspect on arrival; if the piece is not as described, request a return within 3 days.'
  ];
  var sell = [
    'Run the listing wizard: 1-3 photos, brand, size, material and condition.',
    'Declare wear count and flaws — honest listings are what sell in a thrift market.',
    'Set your price against MRP and preview earnings after the platform fee.',
    'Publish to get a listing ID, then edit, price-drop or mark sold any time — manage anytime, no PIN needed.',
    'Orders land on your listing; after delivery the sale settles to you.'
  ];
  var html = '<div class="view"><h1 tabindex="-1">How it works</h1>';
  html += '<p class="muted">ReVogue is a peer-to-peer thrift marketplace: one person\'s cleared-out wardrobe is another\'s find. Nothing new is manufactured — good clothes simply change hands.</p>';
  html += '<section class="hiw-strip"><div class="hiw-grid">';
  html += '<div class="hiw-col"><h3>Buying on ReVogue</h3>' + steps(buy) + '</div>';
  html += '<div class="hiw-col"><h3>Selling on ReVogue</h3>' + steps(sell) + '</div>';
  html += '</div></section>';
  html += '<div class="panel"><h2 class="h3">Good to know</h2>' +
    '<p>Measurements are flat-measured by the seller — compare them with a piece you already own before buying, and read the flaw notes on every listing.</p>' +
    '<p class="muted">This build is a front-end demo: orders, views and payouts are simulated in your browser, and no email is ever sent.</p>' +
    '<p><a class="btn btn-primary" href="#/shop">Browse all</a> <a class="btn btn-secondary" href="#/sell">Start selling</a></p></div>';
  html += '<p class="muted small-note">Still stuck? <a href="#/faq">FAQ</a> · <a href="#/contact">Contact us</a></p>';
  html += '</div>';
  return html;
}
function about(){
  var values = [
    'Honest listings — flaws photographed before they are discovered.',
    'Fair prices — MRP comparison up front and the platform fee shown before you publish.',
    'Privacy by default — no account, no server, everything stays in your browser.',
    'Circular by default — a second life for garments beats a second production run.'
  ];
  var html = '<div class="view"><h1 tabindex="-1">About ReVogue</h1>';
  html += '<div class="panel"><p>ReVogue exists for one reason: clothes with plenty of life left should keep being worn. The fashion industry leans on "new" — we lean on "again". It is a peer-to-peer marketplace where people pass on what they no longer wear and find what they will.</p></div>';
  html += '<div class="panel"><h2 class="h3">Our mission</h2>' +
    '<p>Extend the working life of every garment. A shirt worn eight times and forgotten can be worn eighty more. By making second-hand the easy option — transparent condition, real measurements, fair prices — ReVogue keeps wearable clothes in circulation and out of landfill.</p>' +
    '<p>Nothing here is manufactured for the platform. Every listing is one physical piece that already exists, sold by the person who owned it.</p></div>';
  html += '<div class="panel"><h2 class="h3">What we stand for</h2><ul>';
  for (var i = 0; i < values.length; i++) html += '<li>' + esc(values[i]) + '</li>';
  html += '</ul></div>';
  html += '<div class="panel"><h2 class="h3">How the marketplace works</h2>' +
    '<p>Sellers list with declared wear counts and flaw notes, buyers check measurements before paying, and every order is tracked stage by stage from Placed to Delivered. Returns cover pieces that arrive not as described. The full walk-through is on the <a href="#/how-it-works">How it works</a> page.</p>' +
    '<p class="muted small-note">ReVogue in this repository is a front-end demo: it runs entirely in your browser and all data lives in local storage.</p></div>';
  html += '<p class="muted small-note"><a href="#/how-it-works">How it works</a> · <a href="#/faq">FAQ</a> · <a href="#/contact">Contact us</a></p>';
  html += '</div>';
  return html;
}
function faq(){
  var data = window.RW_DATA || {};
  var html = '<div class="view"><h1 tabindex="-1">FAQ</h1>';
  var list = data.faqs || [];
  for (var i = 0; i < list.length; i++){
    html += '<p><strong>' + esc(list[i].q) + '</strong><br><span class="muted">' + esc(list[i].a) + '</span></p>';
  }
  if (!list.length) html += '<p class="muted">Coming soon.</p>';
  html += '</div>';
  return html;
}
function contact(){
  var topics = ['Order help', 'Listing help', 'Returns &amp; refunds', 'Report a listing', 'Something else'];
  var html = '<div class="view"><h1 tabindex="-1">Contact us</h1>';
  html += '<p class="muted">Tell us what happened and keep the ticket ID — typical reply within 1 business day.</p>';
  html += '<div class="panel" id="contact-panel"><form class="contact-form" data-action="contact-send" novalidate>';
  html += '<div class="field-row">';
  html += '<div class="field"><label for="ct-name">Your name</label><input type="text" id="ct-name" name="name" autocomplete="name" required></div>';
  html += '<div class="field"><label for="ct-email">Email</label><input type="email" id="ct-email" name="email" autocomplete="email" required></div>';
  html += '</div>';
  html += '<div class="field-row">';
  html += '<div class="field"><label for="ct-topic">Topic</label><select id="ct-topic" name="topic">';
  for (var i = 0; i < topics.length; i++) html += '<option>' + topics[i] + '</option>';
  html += '</select></div>';
  html += '<div class="field"><label for="ct-ref">Order or listing ID (optional)</label><input type="text" id="ct-ref" name="ref" placeholder="ORD-5001 / RW-1001" maxlength="16"></div>';
  html += '</div>';
  html += '<div class="field"><label for="ct-msg">Message</label><textarea id="ct-msg" name="message" required></textarea></div>';
  html += '<button type="submit" class="btn btn-primary">Send message</button>';
  html += '<p class="field-error" id="ct-note" aria-live="polite"></p>';
  html += '</form></div>';
  html += '<div class="panel"><h2 class="h3">Before you write</h2><p>' +
    '<a href="#/faq">FAQ</a> — buying, selling, payments and returns.<br>' +
    '<a href="#/track">Track your order</a> — live status for every order.<br>' +
    '<a href="#/policy/returns">Returns policy</a> — the 3-day window in detail.<br>' +
    '<a href="#/manage">Manage a listing</a> — edit, price-drop or mark sold.</p></div>';
  html += '<p class="muted small-note">support@revogue.demo · demo build — the form confirms a ticket ID but nothing is emailed.</p>';
  html += '</div>';
  return html;
}
RW.actions['contact-send'] = function(el){
  function val(sel){ var n = el.querySelector(sel); return n ? String(n.value || '').trim() : ''; }
  var name = val('[name=name]');
  var email = val('[name=email]');
  var msg = val('[name=message]');
  var note = el.querySelector('#ct-note');
  var bad = null;
  if (!name) bad = [el.querySelector('#ct-name'), 'Please add your name.'];
  else if (email.indexOf('@') < 1 || email.indexOf('.', email.indexOf('@')) < 0) bad = [el.querySelector('#ct-email'), 'Please add a valid email address.'];
  else if (msg.length < 10) bad = [el.querySelector('#ct-msg'), 'Please write at least 10 characters so we can help.'];
  var fields = el.querySelectorAll('.field');
  for (var i = 0; i < fields.length; i++) fields[i].classList.remove('is-error');
  if (bad){
    if (bad[0] && bad[0].closest) bad[0].closest('.field').classList.add('is-error');
    if (note) note.textContent = bad[1];
    if (bad[0] && bad[0].focus) bad[0].focus();
    return;
  }
  var topic = val('[name=topic]') || 'Something else';
  var ref = val('[name=ref]');
  var ticket = 'RW-T-' + ('000000' + (Date.now() % 1000000)).slice(-6);
  el.parentNode.innerHTML = '<h2 class="h3">Message received</h2>' +
    '<p>Ticket <strong>' + esc(ticket) + '</strong> — thanks, ' + esc(name) + '. We will reply to ' + esc(email) + ' about ' + esc(topic) + (ref ? ' (ref ' + esc(ref) + ')' : '') + '.</p>' +
    '<p class="muted small-note">Demo note: nothing left your browser — ReVogue has no mail server. Typical reply: within 1 business day.</p>' +
    '<p><a class="btn btn-secondary" href="#/faq">Read the FAQ</a> <a class="btn btn-ghost" href="#/contact">Send another</a></p>';
  RW.toast('Message sent — ticket ' + ticket, 'success');
};

var UPDATED = 'October 2026';
var POLICIES = {
  returns: {
    title: 'Returns & refunds',
    intro: 'Thrift means every piece is one of a kind — so returns cover one thing only: when what arrived is not what was listed.',
    sections: [
      { h: 'Return window', p: 'You have 3 days from delivery to request a return. Open the order on the Track page, choose Request return and tell us what is wrong.' },
      { h: 'When a return applies', list: [
        'A flaw the listing did not disclose (stain, tear, odour, repair).',
        'The piece does not match the stated measurements or size.',
        'Damage that happened in transit.',
        'The wrong item arrived.'
      ]},
      { h: 'When it does not', list: [
        'Changed your mind, or the fit is merely not to taste.',
        'Wear, washing or alteration after delivery.',
        'Flaws and wear counts that were clearly photographed and described up front.'
      ]},
      { h: 'Refunds', p: 'Once a return is approved and the piece is picked up, the item amount returns to the original payment method within 5-7 business days; COD orders are refunded to a UPI ID or bank account you give us. The platform fee is never charged on returned items.' }
    ]
  },
  safety: {
    title: 'Safety & prohibited items',
    intro: 'ReVogue only lists wearable, lawful clothing and accessories. Both sides of the marketplace share the job of keeping it that way.',
    sections: [
      { h: 'Never listed', list: [
        'Underwear, base layers and worn swimwear (hygiene).',
        'Fragrances, cosmetics and anything consumable.',
        'Counterfeit or misleadingly branded items.',
        'Children\'s items with broken zips, sharp edges or loose small parts.',
        'Anything illegal, offensive or restricted.'
      ]},
      { h: 'Quality bar', p: 'Every piece must be clean and wearable, with wear consistent with its condition grade. Photograph the real flaws — listings that hide damage are removed.' },
      { h: 'Trading safely', list: [
        'Keep everything on ReVogue: orders, payments and returns run through the site.',
        'Never pay a seller directly or share bank details.',
        'Check measurements against a garment you own before buying.',
        'Report anything suspicious from the contact form with the listing ID.'
      ]}
    ]
  },
  terms: {
    title: 'Terms of use',
    intro: 'By using ReVogue you agree to these terms. They are written for a peer-to-peer marketplace, not a warehouse.',
    sections: [
      { h: 'The marketplace', p: 'ReVogue connects independent sellers with buyers. The sale contract is between you and the other user; ReVogue operates the storefront, payment flow and order tracking.' },
      { h: 'Selling', p: 'List only what you own and may sell. Descriptions, measurements, wear counts and flaw photos must be accurate. You set the price; the listing summary shows your earnings after the platform fee, and buyers see the full total before placing an order.' },
      { h: 'Buying & payment', p: 'Prices are in rupees with delivery and fees itemised at checkout. Payment is by UPI or Cash on Delivery. Cancelling is free while an order is still Placed or Confirmed — open it on the Track page.' },
      { h: 'Items are second-hand', p: 'Unless a listing says otherwise, every piece is sold as used, in the condition grade shown. Rights covering items not as described are unaffected — see Returns.' },
      { h: 'Demo notice', p: 'This build is a front-end demonstration: orders, payouts and messages are simulated locally, and these terms are sample copy rather than a real offer.' }
    ]
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'Short version: everything ReVogue knows about you stays in your own browser.',
    sections: [
      { h: 'What is stored', p: 'Your cart, wishlist, addresses, listings, orders and search history live in this browser\'s local storage. There is no account system and no server-side copy.' },
      { h: 'What is not done', list: [
        'No tracking, analytics or advertising pixels.',
        'No data sold or shared with third parties.',
        'No real email is sent — the newsletter and contact form are demos.',
        'No card or UPI credentials are collected; checkout only records the method you chose.'
      ]},
      { h: 'Your control', p: 'Clearing this site\'s data in your browser settings erases everything instantly. Because listings and orders are local, that also means they cannot be recovered — copy anything you need first.' },
      { h: 'Questions', p: 'Use the contact form for privacy questions and include the listing or order ID if it is relevant.' }
    ]
  }
};
function policy(query, params){
  params = params || {};
  var p = POLICIES[params.slug];
  if (!p){
    return '<div class="view"><h1 tabindex="-1">Policy</h1><div class="panel"><p class="muted">That policy page does not exist.</p><p><a href="#/faq">FAQ</a> · <a href="#/contact">Contact us</a></p></div></div>';
  }
  var html = '<div class="view"><h1 tabindex="-1">' + esc(p.title) + '</h1>';
  html += '<p class="muted">' + esc(p.intro) + '</p>';
  for (var i = 0; i < p.sections.length; i++){
    var s = p.sections[i];
    html += '<div class="panel"><h2 class="h3">' + esc(s.h) + '</h2>';
    if (s.p) html += '<p>' + esc(s.p) + '</p>';
    if (s.list){
      html += '<ul>';
      for (var j = 0; j < s.list.length; j++) html += '<li>' + esc(s.list[j]) + '</li>';
      html += '</ul>';
    }
    html += '</div>';
  }
  html += '<p class="muted small-note">Last updated ' + UPDATED + ' · <a href="#/faq">FAQ</a> · <a href="#/contact">Contact us</a></p>';
  html += '</div>';
  return html;
}

RW.viewsInfo = { howItWorks: howItWorks, about: about, faq: faq, contact: contact, policy: policy };
RW.router.register('/how-it-works', howItWorks, { title: 'How it works' });
RW.router.register('/about', about, { title: 'About' });
RW.router.register('/faq', faq, { title: 'FAQ' });
RW.router.register('/contact', contact, { title: 'Contact' });
RW.router.register('/policy/:slug', policy, { title: 'Policy' });

})();
