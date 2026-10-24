/* views-sell.js — exports: RW.viewsSell (Sell, SellDone, Manage) */
(function(){
'use strict';
var RW = window.RW = window.RW || {};
var esc = RW.util.esc;
var fmt = RW.util.fmtINR;
var rel = RW.util.relTime;
var E = function(){ return RW.engine; };
var DATA = window.RW_DATA || {};
var CFG = DATA.config || {};
RW.viewsSell = RW.viewsSell || {};

/* ---------- option lists ---------- */
var STEP_NAMES = ['Basics', 'Details', 'Condition', 'Photos', 'Price', 'Seller info', 'Review'];
var COLORS = [
  { name:'Black', hex:'#2B2B2B' }, { name:'White', hex:'#F4F1EA' }, { name:'Navy', hex:'#243B63' },
  { name:'Blue', hex:'#3B6FB5' }, { name:'Sky Blue', hex:'#9BC4E2' }, { name:'Red', hex:'#C0392B' },
  { name:'Maroon', hex:'#7B2436' }, { name:'Pink', hex:'#E38AAE' }, { name:'Orange', hex:'#E07B39' },
  { name:'Mustard', hex:'#D9A420' }, { name:'Green', hex:'#2E7D32' }, { name:'Olive', hex:'#6B7A3A' },
  { name:'Teal', hex:'#1F7A72' }, { name:'Purple', hex:'#8E6BBF' }, { name:'Beige', hex:'#D8C6A5' },
  { name:'Cream', hex:'#F0E6CF' }, { name:'Grey', hex:'#9AA0A6' }, { name:'Charcoal', hex:'#4A4E52' },
  { name:'Brown', hex:'#8A6A4F' }, { name:'Tan', hex:'#C09A6B' }, { name:'Wine', hex:'#722F4E' },
  { name:'Multi', hex:'#8E6BBF' }
];
var MATERIALS = ['Cotton','Linen','Silk','Denim','Wool','Polyester','Viscose','Rayon','Chanderi','Georgette','Net','Leather','Faux Leather','Sequin','Fleece','Nylon','Cotton Blend','Poly Blend','Linen Blend','Brocade','Pashmina','Satin','Crepe','Wool Blend'];
var FITS = ['Regular','Relaxed','Slim','Straight'];
var OCCASIONS = ['Casual','Party','Office','Wedding','Festive','Sports','Winter','Date','Birthday','Vacation','Puja'];
var REASONS = ['Upgraded my wardrobe','Does not fit anymore','Barely worn, relocating cities','Bought the same piece twice','Style no longer suits me','Gifting surplus','Needed a smaller size'];
var GRADES = [
  { v:'Like New', desc:'Barely used — up to 2 wears, may still have tags.' },
  { v:'Excellent', desc:'Gently used — up to 3 wears, no visible flaws.' },
  { v:'Good', desc:'Loved and worn 3-6 times, minor disclosed flaws.' }
];
var SELLER_PALETTE = ['#5C4033','#4A5D4E','#1B1B1B','#7A6C5C','#4A3327','#3C4C40','#8E372C','#2E2620'];

/* ---------- working draft ---------- */
function newDraft(){
  return {
    title:'', brand:'', category:'', sub:'', size:'', color:'', material:'', fit:'',
    occasion:[], description:'', measurements:{}, condition:'', timesWorn:'', tagsAttached:false,
    flaws:'', washed:false, reason:'', photos:[], mrp:'', price:'',
    sellerName:'', sellerMobile:'', sellerEmail:'', sellerCity:'', sellerPincode:'', pickupNotes:'', terms:false,
    step:1, maxStep:1, savedAt:0
  };
}
var wd = null;              /* wizard working copy */
var bannerResolved = false; /* restore prompt answered this session */
var quotaWarned = false;

function draftHasContent(d){
  if (!d) return false;
  return !!(String(d.title || '').trim() || String(d.brand || '').trim() || (d.photos && d.photos.length) ||
    String(d.category || '').trim() || String(d.mrp || '').trim() || String(d.price || '').trim() ||
    String(d.description || '').trim() || String(d.sellerName || '').trim());
}
function savedDraft(){
  var d = RW.storage.get('rw_sell_draft', null);
  return draftHasContent(d) ? d : null;
}
function saveDraft(root){
  if (!wd) return;
  if (root && root.getAttribute && root.getAttribute('data-buf') === 'edit') return; /* manage edit forms never touch the sell draft */
  if (!bannerResolved && savedDraft()) return; /* never clobber a draft the user has not chosen about */
  wd.savedAt = Date.now();
  var ok = RW.storage.set('rw_sell_draft', wd);
  if (!ok && !quotaWarned){
    quotaWarned = true;
    RW.toast('Not enough browser storage for that photo. Try fewer or smaller images.', 'error');
  }
}
var saveDraftDebounced = RW.util.debounce(saveDraft, 500);
function ensureDraft(){
  if (!wd) wd = newDraft();
  return wd;
}

/* ---------- field errors ---------- */
function setErr(input, msg){
  if (!input) return;
  var f = input.closest('.field');
  if (!f){
    /* element outside a .field wrapper (e.g. photo dropzone) — show a standalone error after it */
    var next = input.nextElementSibling;
    if (!next || !next.classList || !next.classList.contains('field-error')){
      next = document.createElement('span');
      next.className = 'field-error';
      input.parentNode.insertBefore(next, input.nextSibling);
    }
    next.textContent = msg;
    return;
  }
  f.classList.add('is-error');
  var e = f.querySelector('.field-error');
  if (!e){ e = document.createElement('span'); e.className = 'field-error'; f.appendChild(e); }
  e.textContent = msg;
}
function clearErrs(root){
  if (!root) return;
  var fs = root.querySelectorAll('.field.is-error');
  for (var i = 0; i < fs.length; i++){
    fs[i].classList.remove('is-error');
    var e = fs[i].querySelector('.field-error');
    if (e) e.textContent = '';
  }
  /* standalone errors (outside .field wrappers) */
  var ss = root.querySelectorAll('.field-error');
  for (var j = 0; j < ss.length; j++) if (!ss[j].closest('.field')) ss[j].textContent = '';
}
function focusFirst(root, errs){
  if (!errs.length) return;
  var el = root.querySelector(errs[0].sel);
  if (el && el.focus){ try { el.focus({ preventScroll: false }); } catch(e){ el.focus(); } }
}

/* ---------- option/derivation helpers ---------- */
function subMeta(cat, sub){
  var tree = DATA.categoryTree || {};
  return (tree[cat] && tree[cat].subs && tree[cat].subs[sub]) ? tree[cat].subs[sub] : null;
}
function sizeOptionsFor(sizeType){
  switch (sizeType){
    case 'waist': return ['28','30','32','34','36','38'];
    case 'collar': return ['14','15','16','17','18'];
    case 'age': return ['2-3 yrs','4-5 yrs','6-7 yrs','8-9 yrs'];
    case 'free': return ['Free'];
    case 'chest': return ['S','M','L','XL','XXL','40','42'];
    default: return ['S','M','L','XL','XXL'];
  }
}
function colorHexOf(name){
  for (var i = 0; i < COLORS.length; i++) if (COLORS[i].name === name) return COLORS[i].hex;
  return '#8A8A8A';
}
function brandHints(){
  var out = [], seen = {};
  var ps = DATA.products || [];
  for (var i = 0; i < ps.length; i++){
    if (!seen[ps[i].brand]){ seen[ps[i].brand] = true; out.push(ps[i].brand); }
  }
  out.sort();
  return out;
}
function discountOf(mrp, price){
  mrp = Number(mrp) || 0; price = Number(price) || 0;
  if (mrp <= 0 || price <= 0 || price > mrp) return 0;
  return Math.round((mrp - price) / mrp * 100);
}

/* ---------- condition consistency (§6.10) ---------- */
function wornOf(buf){
  var n = parseInt(buf.timesWorn, 10);
  if (!isFinite(n) || n < 0) n = 0;
  if (n > 6) n = 6;
  return n;
}
function condAllowed(cond, worn, tags){
  if (tags) return cond === 'Like New';
  if (cond === 'Like New') return worn <= 2;
  if (cond === 'Excellent') return worn <= 3;
  if (cond === 'Good') return worn >= 3 && worn <= 6;
  return false;
}
/* tags attached force wears = 0 + Like New; conflicting grade is cleared */
function normalizeCondition(buf){
  var tags = !!buf.tagsAttached;
  var worn = wornOf(buf);
  if (tags){ worn = 0; buf.timesWorn = '0'; buf.condition = 'Like New'; return buf; }
  buf.timesWorn = String(worn);
  if (buf.condition && !condAllowed(buf.condition, worn, false)) buf.condition = '';
  return buf;
}

/* ---------- price suggestion (§6.10: grade share, -3%/wear beyond 2, +5% tags) ---------- */
function suggestRange(buf){
  var mrp = Number(buf.mrp) || 0;
  var base = buf.condition === 'Like New' ? [0.30, 0.65] :
             buf.condition === 'Excellent' ? [0.25, 0.60] :
             buf.condition === 'Good' ? [0.20, 0.55] : [0.25, 0.60];
  var penalty = Math.min(0.12, Math.max(0, wornOf(buf) - 2) * 0.03);
  var lo = base[0] - penalty, hi = base[1] - penalty;
  if (buf.tagsAttached){ lo += 0.05; hi += 0.05; }
  lo = Math.max(0.05, lo); hi = Math.min(0.95, hi);
  if (!mrp) return { lo: 0, hi: 0, loPct: Math.round(lo * 100), hiPct: Math.round(hi * 100) };
  return { lo: Math.round(mrp * lo), hi: Math.round(mrp * hi), loPct: Math.round(lo * 100), hiPct: Math.round(hi * 100) };
}

/* ---------- listing score (§6.10: photos 30, measurements 25, flaws 15, description 15, washed 15) ---------- */
function scoreOf(buf){
  var n = buf.photos ? buf.photos.length : 0;
  var photoPts = n >= 3 ? 30 : n === 2 ? 20 : n === 1 ? 10 : 0;
  var meta = subMeta(buf.category, buf.sub);
  var fields = (meta && meta.measurements) ? meta.measurements : [];
  var filled = 0;
  for (var i = 0; i < fields.length; i++){
    var v = buf.measurements ? buf.measurements[fields[i]] : '';
    if (v != null && String(v).trim()) filled++;
  }
  var measPts = fields.length ? Math.round(25 * filled / fields.length) : 0;
  var flawsPts = String(buf.flaws || '').trim() ? 15 : 0;
  var descPts = String(buf.description || '').length >= 80 ? 15 : 0;
  var washedPts = buf.washed ? 15 : 0;
  var total = photoPts + measPts + flawsPts + descPts + washedPts;
  return {
    total: total, complete: total >= 80,
    parts: [
      { label:'Photos', got: photoPts, max: 30, note: n + ' of 3' },
      { label:'Measurements', got: measPts, max: 25, note: filled + ' of ' + fields.length + ' filled' },
      { label:'Flaws disclosed', got: flawsPts, max: 15, note: flawsPts ? 'Filled' : 'Add a flaws line' },
      { label:'Description', got: descPts, max: 15, note: String(buf.description || '').length + ' / 80 characters' },
      { label:'Washed declaration', got: washedPts, max: 15, note: washedPts ? 'Confirmed' : 'Not confirmed' }
    ]
  };
}

/* ---------- per-step validation ---------- */
/* reads values from the buffer (so cross-step checks work when a step is not rendered) */
function strVal(buf, key){ return String(buf && buf[key] != null ? buf[key] : '').trim(); }
function fieldChecks(buf, step){
  var m = [];
  function add(st, sel, ok, msg){ if (step != null && step !== st) return; if (!ok) m.push({ sel: sel, msg: msg }); }

  /* 1 basics */
  add(1, '#sl-title', strVal(buf, 'title').length >= 4, 'Title needs at least 4 characters.');
  add(1, '#sl-brand', strVal(buf, 'brand').length > 0, 'Please enter a brand (or type your own).');
  add(1, '#sl-cat', !!buf.category, 'Choose a category.');
  add(1, '#sl-sub', !!buf.sub, 'Choose a sub-category.');
  /* 2 details */
  add(2, '#sl-size', !!buf.size, 'Choose a size.');
  add(2, '#sl-color', !!buf.color, 'Choose a colour.');
  add(2, '#sl-material', !!buf.material, 'Choose a material.');
  add(2, '#sl-fit', !!buf.fit, 'Choose a fit.');
  add(2, '#sl-occ-0', (buf.occasion || []).length > 0, 'Pick at least one occasion.');
  add(2, '#sl-desc', strVal(buf, 'description').length >= 30, 'Description needs at least 30 characters (80+ scores higher).');
  /* 3 condition */
  if (step == null || step === 3){
    var worn = wornOf(buf);
    if (!buf.condition) m.push({ sel: '#sl-cond-0', msg: 'Choose a condition grade that fits the wear count.' });
    else if (!condAllowed(buf.condition, worn, !!buf.tagsAttached)) m.push({ sel: '#sl-cond-0', msg: 'That grade conflicts with the wear count — pick a compatible one.' });
    if (!buf.tagsAttached && strVal(buf, 'timesWorn') === '') m.push({ sel: '#sl-worn', msg: 'Tell us how many times it was worn.' });
    add(3, '#sl-flaws', strVal(buf, 'flaws').length > 0, 'List flaws (write "None" if there are none).');
    add(3, '#sl-washed', !!buf.washed, 'Please confirm the washed / dry-cleaned declaration.');
    add(3, '#sl-reason', !!buf.reason, 'Choose a reason for selling.');
  }
  /* 4 photos */
  if (step == null || step === 4){
    var n = (buf.photos || []).length;
    if (n < 1) m.push({ sel: '#photo-drop', msg: 'Add at least 1 photo (up to 3).' });
    else if (n > 3) m.push({ sel: '#photo-drop', msg: 'You can add up to 3 photos.' });
  }
  /* 5 price */
  var mrp = Number(buf.mrp), price = Number(buf.price);
  add(5, '#sl-mrp', isFinite(mrp) && strVal(buf, 'mrp') !== '' && mrp >= 99, 'Enter the original MRP (at least ₹99).');
  add(5, '#sl-price', isFinite(price) && strVal(buf, 'price') !== '' && price >= 99, 'Asking price must be at least ₹99.');
  if (step == null || step === 5){
    if (isFinite(mrp) && isFinite(price) && mrp >= 99 && price > mrp){
      m.push({ sel: '#sl-price', msg: 'Price cannot be above the MRP.' });
    }
  }
  /* 6 seller */
  add(6, '#sl-seller-name', strVal(buf, 'sellerName').length >= 2, 'Please enter your name.');
  add(6, '#sl-seller-mobile', RW.validators.mobile(strVal(buf, 'sellerMobile')), 'Enter a valid 10-digit mobile starting with 6-9.');
  var em = strVal(buf, 'sellerEmail');
  add(6, '#sl-seller-email', !em || RW.validators.email(em), 'Enter a valid email address.');
  add(6, '#sl-seller-city', strVal(buf, 'sellerCity').length >= 2, 'City is required.');
  add(6, '#sl-seller-pin', RW.validators.pincode(strVal(buf, 'sellerPincode')), 'Enter a valid 6-digit pincode.');
  add(6, '#sl-terms', !!buf.terms, 'Please accept the selling terms.');
  return m;
}
/* validates step(s) against the live form; shows errors, focuses the first one */
function validateBuf(root, step){
  clearErrs(root);
  var b = bufOf(root);
  if (b) normalizeCondition(b);
  var errs = fieldChecks(b || ensureDraft(), step);
  for (var i = 0; i < errs.length; i++) setErr(root.querySelector(errs[i].sel), errs[i].msg);
  if (errs.length){
    focusFirst(root, errs);
    RW.toast('Please fix the highlighted fields', 'error');
    return false;
  }
  return true;
}
/* which buffer is this form editing? (wizard draft or manage edit) */
function bufOf(root){
  if (!root) return null;
  var scope = root.getAttribute('data-buf');
  if (scope === 'edit') return editBuf;
  return ensureDraft();
}

/* ---------- shared field builders (wizard + manage edit) ---------- */
function inputField(id, name, label, buf, key, opts){
  opts = opts || {};
  var v = esc(String(buf && buf[key] != null ? buf[key] : ''));
  var h = '<div class="field"><label for="' + id + '">' + esc(label) + '</label>';
  h += '<input type="' + (opts.type || 'text') + '" id="' + id + '" name="' + esc(name || key) + '" value="' + v + '"' +
    (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '') +
    (opts.maxlength ? ' maxlength="' + opts.maxlength + '"' : '') +
    (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : '') +
    (opts.list ? ' list="' + opts.list + '"' : '') +
    (opts.autocomplete ? ' autocomplete="' + opts.autocomplete + '"' : ' autocomplete="off"') + '>';
  if (opts.hint) h += '<span class="field-hint">' + esc(opts.hint) + '</span>';
  h += '<span class="field-error"></span></div>';
  return h;
}
function textareaField(id, name, label, buf, key, opts){
  opts = opts || {};
  var v = esc(String(buf && buf[key] != null ? buf[key] : ''));
  var h = '<div class="field"><label for="' + id + '">' + esc(label) + '</label>';
  h += '<textarea id="' + id + '" name="' + esc(name || key) + '" rows="' + (opts.rows || 3) + '"' +
    (opts.maxlength ? ' maxlength="' + opts.maxlength + '"' : '') +
    (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '') + '>' + v + '</textarea>';
  if (opts.hint) h += '<span class="field-hint">' + esc(opts.hint) + '</span>';
  h += '<span class="field-error"></span></div>';
  return h;
}
function selectField(id, name, label, buf, key, options, opts){
  opts = opts || {};
  var cur = String(buf && buf[key] != null ? buf[key] : '');
  var h = '<div class="field"><label for="' + id + '">' + esc(label) + '</label>';
  h += '<select id="' + id + '" name="' + esc(name || key) + '"' + (opts.disabled ? ' disabled' : '') + '>';
  h += '<option value="">' + esc(opts.placeholder || 'Select…') + '</option>';
  for (var i = 0; i < options.length; i++){
    var o = String(options[i]);
    h += '<option value="' + esc(o) + '"' + (cur === o ? ' selected' : '') + '>' + esc(o) + '</option>';
  }
  h += '</select>';
  if (opts.hint) h += '<span class="field-hint">' + esc(opts.hint) + '</span>';
  h += '<span class="field-error"></span></div>';
  return h;
}
function checkField(id, name, label, buf, key, opts){
  opts = opts || {};
  var on = !!buf && !!buf[key];
  var h = '<div class="field field-check' + (opts.block ? ' is-block' : '') + '">';
  h += '<label class="check-row" for="' + id + '"><input type="checkbox" id="' + id + '" name="' + esc(name || key) + '"' + (on ? ' checked' : '') + '>';
  h += '<span>' + esc(label) + '</span></label>';
  if (opts.hint) h += '<span class="field-hint">' + esc(opts.hint) + '</span>';
  h += '<span class="field-error"></span></div>';
  return h;
}

/* ---------- step 1: Basics ---------- */
function subOptions(cat, cur){
  var tree = DATA.categoryTree || {};
  var subs = (tree[cat] && tree[cat].subs) ? Object.keys(tree[cat].subs) : [];
  var h = '<option value="">Select a sub-category…</option>';
  for (var i = 0; i < subs.length; i++){
    h += '<option value="' + esc(subs[i]) + '"' + (cur === subs[i] ? ' selected' : '') + '>' + esc(subs[i]) + '</option>';
  }
  return h;
}
function stepBasics(buf){
  var tree = DATA.categoryTree || {};
  var cats = Object.keys(tree);
  var brands = brandHints();
  var h = '<div class="field-row">';
  h += inputField('sl-title', 'title', 'Title', buf, 'title', { maxlength: 80, ph: 'e.g. Cotton floral wrap dress' });
  h += inputField('sl-brand', 'brand', 'Brand', buf, 'brand', { maxlength: 40, ph: 'Zara, H&M… or your own label', list: 'sl-brands' });
  h += '</div>';
  h += '<datalist id="sl-brands">';
  for (var i = 0; i < brands.length; i++) h += '<option value="' + esc(brands[i]) + '"></option>';
  h += '</datalist>';
  h += '<div class="field-row">';
  h += '<div class="field"><label for="sl-cat">Category</label><select id="sl-cat" name="category"><option value="">Select a category…</option>';
  for (var c = 0; c < cats.length; c++) h += '<option value="' + esc(cats[c]) + '"' + (buf.category === cats[c] ? ' selected' : '') + '>' + esc(cats[c]) + '</option>';
  h += '</select><span class="field-error"></span></div>';
  h += '<div class="field"><label for="sl-sub">Sub-category</label><select id="sl-sub" name="sub">' + subOptions(buf.category, buf.sub) + '</select><span class="field-hint">Kids &gt; Boys/Girls sets size and age.</span><span class="field-error"></span></div>';
  h += '</div>';
  return h;
}

/* ---------- step 2: Details ---------- */
function measFieldsHTML(buf){
  var meta = subMeta(buf.category, buf.sub);
  var fields = (meta && meta.measurements) ? meta.measurements : [];
  if (!fields.length) return '<p class="muted small-note" id="sl-meas-empty">Choose a category and sub-category in Basics to see the right measurement fields.</p>';
  var h = '<div class="meas-grid">';
  for (var i = 0; i < fields.length; i++){
    var v = esc(String((buf.measurements && buf.measurements[fields[i]]) || ''));
    h += '<div class="field"><label for="sl-meas-' + i + '">' + esc(fields[i]) + '</label>' +
      '<input type="text" inputmode="decimal" id="sl-meas-' + i + '" data-meas="' + esc(fields[i]) + '" value="' + v + '" maxlength="12" placeholder="e.g. 96">' +
      '<span class="field-error"></span></div>';
  }
  h += '</div>';
  return h;
}
function stepDetails(buf){
  var meta = subMeta(buf.category, buf.sub);
  var sizeType = meta ? meta.sizeType : 'letter';
  var h = '<div class="field-row">';
  h += selectField('sl-size', 'size', 'Size', buf, 'size', sizeOptionsFor(sizeType), { placeholder: 'Select a size…', hint: 'Options match ' + buf.sub + (sizeType !== 'letter' && sizeType !== 'free' ? ' (' + sizeType + ' sizing)' : '') });
  h += selectField('sl-color', 'color', 'Colour', buf, 'color', COLORS.map(function(c){ return c.name; }), { placeholder: 'Select a colour…' });
  h += '</div>';
  h += '<div class="field-row">';
  h += selectField('sl-material', 'material', 'Material', buf, 'material', MATERIALS, { placeholder: 'Select a material…' });
  h += selectField('sl-fit', 'fit', 'Fit', buf, 'fit', FITS, { placeholder: 'Select a fit…' });
  h += '</div>';
  h += '<fieldset class="field fieldset" id="occ-group"><legend>Occasion <span class="req">*</span></legend><div class="check-grid">';
  for (var i = 0; i < OCCASIONS.length; i++){
    var on = (buf.occasion || []).indexOf(OCCASIONS[i]) >= 0;
    h += '<label class="check-row"><input type="checkbox" name="occasion" id="sl-occ-' + i + '" value="' + esc(OCCASIONS[i]) + '"' + (on ? ' checked' : '') + '><span>' + esc(OCCASIONS[i]) + '</span></label>';
  }
  h += '</div><span class="field-error"></span></fieldset>';
  h += textareaField('sl-desc', 'description', 'Description', buf, 'description', { rows: 4, maxlength: 600, ph: 'Fit, fabric feel, why you loved it, why you are selling…', hint: '80+ characters scores full points (currently ' + String(buf.description || '').length + ').' });
  h += '<div class="field"><span class="h4-label">Measurements <span class="muted small-note">(optional — boosts your listing score)</span></span><div id="sl-meas">' + measFieldsHTML(buf) + '</div></div>';
  return h;
}

/* ---------- step 3: Condition ---------- */
function stepCondition(buf){
  normalizeCondition(buf);
  var worn = wornOf(buf);
  var tags = !!buf.tagsAttached;
  var h = '<fieldset class="field fieldset" id="cond-group"><legend>Condition grade <span class="req">*</span></legend><div class="grade-list">';
  for (var i = 0; i < GRADES.length; i++){
    var g = GRADES[i];
    var allowed = condAllowed(g.v, worn, tags);
    var on = buf.condition === g.v;
    h += '<label class="grade-row' + (on ? ' is-on' : '') + (allowed ? '' : ' is-disabled') + '">' +
      '<input type="radio" name="condition" id="sl-cond-' + i + '" value="' + esc(g.v) + '"' + (on ? ' checked' : '') + (allowed ? '' : ' disabled') + '>' +
      '<span class="grade-name">' + esc(g.v) + '</span><span class="grade-desc">' + esc(g.desc) + '</span>' +
      (allowed ? '' : '<span class="grade-why">' + (tags ? 'Tags force Like New' : 'Conflicts with wear count') + '</span>') + '</label>';
  }
  h += '</div><span class="field-error"></span></fieldset>';
  h += '<div class="field-row">';
  h += '<div class="field"><label for="sl-worn">Times worn (0-6)</label><select id="sl-worn" name="timesWorn"' + (tags ? ' disabled' : '') + '>';
  for (var w = 0; w <= 6; w++) h += '<option value="' + w + '"' + (String(worn) === String(w) && !tags ? ' selected' : (tags && w === 0 ? ' selected' : '')) + '>' + (w === 0 ? '0 — never worn' : w + (w === 1 ? ' time' : ' times')) + '</option>';
  h += '</select>' + (tags ? '<span class="field-hint">Locked to 0 while tags are attached.</span>' : '') + '<span class="field-error"></span></div>';
  h += checkField('sl-tags', 'tagsAttached', 'Original tags attached', buf, 'tagsAttached', { hint: tags ? 'Tags attached forces 0 wears + Like New — applied automatically.' : 'With tags: forced to Like New, 0 wears.' });
  h += '</div>';
  h += textareaField('sl-flaws', 'flaws', 'Flaws (disclose everything)', buf, 'flaws', { rows: 2, maxlength: 300, ph: 'e.g. Tiny pull on left sleeve, otherwise perfect. Write "None" if flawless.', hint: 'Honest flaws build trust — this scores 15 points.' });
  h += checkField('sl-washed', 'washed', 'I have washed / dry-cleaned this item before listing', buf, 'washed', { hint: 'Required — a wash declaration is a trust signal (15 points).' });
  h += selectField('sl-reason', 'reason', 'Reason for selling', buf, 'reason', REASONS, { placeholder: 'Select a reason…' });
  return h;
}

/* ---------- step 4: Photos ---------- */
function photoThumbsHTML(buf){
  var photos = buf.photos || [];
  if (!photos.length) return '<p class="muted small-note photo-empty">No photos yet — your first photo becomes the cover.</p>';
  var h = '<ul class="photo-thumbs" aria-label="Uploaded photos">';
  for (var i = 0; i < photos.length; i++){
    h += '<li class="photo-thumb' + (i === 0 ? ' is-cover' : '') + '">' +
      '<img src="' + esc(photos[i]) + '" alt="Photo ' + (i + 1) + '">' +
      (i === 0 ? '<span class="cover-tag">Cover</span>' : '') +
      '<div class="photo-ops">' +
      '<button type="button" data-action="photo-move" data-i="' + i + '" data-dir="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move photo ' + (i + 1) + ' left">&#9664;</button>' +
      '<button type="button" data-action="photo-move" data-i="' + i + '" data-dir="1"' + (i === photos.length - 1 ? ' disabled' : '') + ' aria-label="Move photo ' + (i + 1) + ' right">&#9654;</button>' +
      '<button type="button" data-action="photo-cover" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Make photo ' + (i + 1) + ' the cover">Cover</button>' +
      '<button type="button" class="is-danger" data-action="photo-del" data-i="' + i + '" aria-label="Delete photo ' + (i + 1) + '">&#10005;</button>' +
      '</div></li>';
  }
  h += '</ul>';
  return h;
}
function stepPhotos(buf){
  var n = (buf.photos || []).length;
  var h = '<div class="photo-drop" id="photo-drop">' +
    '<input type="file" accept="image/*" id="sl-photos" data-photo-input multiple hidden>' +
    '<p class="drop-title">Drag &amp; drop photos here</p>' +
    '<p class="muted small-note">1-3 photos · JPG, PNG or WEBP · auto-compressed to 800px</p>' +
    '<button type="button" class="btn btn-secondary" data-action="photo-add">Choose images</button></div>';
  h += '<div id="photo-list">' + photoThumbsHTML(buf) + '</div>';
  h += '<p class="field-hint" id="photo-count">' + n + ' of 3 photos added.</p>';
  h += '<div class="tips-box"><strong>Photo tips</strong><ul><li>Use daylight — no flash.</li><li>Show the full item, then any flaws close-up.</li><li>First photo becomes the cover; reorder with the arrows.</li></ul></div>';
  return h;
}

/* ---------- step 5: Price ---------- */
function priceLiveHTML(buf){
  var mrp = Number(buf.mrp) || 0, price = Number(buf.price) || 0;
  var r = suggestRange(buf);
  var disc = discountOf(mrp, price);
  var fee = Math.round((price || 0) * (CFG.sellerFeePct || 8) / 100);
  var earn = Math.max(0, (price || 0) - fee);
  var h = '<div class="price-live" id="price-live">';
  h += '<div class="price-live-row"><span>Discount</span><strong id="pl-disc">' + (disc > 0 ? disc + '% off' : '—') + '</strong></div>';
  h += '<div class="price-live-row"><span>Suggested range <span class="muted small-note">' + (mrp ? fmt(r.lo) + ' – ' + fmt(r.hi) + ' for your grade' : 'set MRP + condition first') + '</span></span><strong id="pl-range">' + (mrp ? fmt(r.lo) + ' – ' + fmt(r.hi) : '—') + '</strong></div>';
  h += '<div class="gauge" id="pl-gauge" aria-hidden="true"><div class="gauge-track"><div class="gauge-fill" id="pl-gauge-fill" style="width:' + gaugePct(buf, r) + '%"></div><span class="gauge-mark" id="pl-gauge-mark" style="left:' + gaugePct(buf, r) + '%"></span></div><div class="gauge-labels"><span>Below range</span><span>Sweet spot</span><span>Above range</span></div></div>';
  h += '<div class="price-live-row"><span>You earn (after ' + (CFG.sellerFeePct || 8) + '% fee ' + fmt(fee) + ')</span><strong id="pl-earn">' + fmt(earn) + '</strong></div>';
  h += '<div id="pl-warn">' + priceWarnHTML(buf) + '</div>';
  h += '</div>';
  return h;
}
function gaugePct(buf, r){
  var price = Number(buf.price) || 0;
  if (!r.lo || !price) return 0;
  if (price < r.lo) return 4;
  if (price > r.hi) return 96;
  return Math.round(4 + (price - r.lo) / Math.max(1, r.hi - r.lo) * 92);
}
function priceWarnHTML(buf){
  var mrp = Number(buf.mrp) || 0, price = Number(buf.price) || 0;
  if (mrp && price > mrp) return '<p class="alert-error">Price cannot be above the MRP (' + fmt(mrp) + ').</p>';
  if (price < 99 && price > 0) return '<p class="alert-error">Minimum price is ₹99.</p>';
  if (mrp && price >= mrp * 0.7 && price < mrp) return '<p class="alert-warn-note">That is above ~70% of MRP — buyers compare hard. The suggested range tops out at ' + fmt(suggestRange(buf).hi) + '.</p>';
  if (price && mrp && price > suggestRange(buf).hi) return '<p class="alert-warn-note">Above the suggested range — consider ' + fmt(suggestRange(buf).hi) + ' or below for a faster sale.</p>';
  return '';
}
function stepPrice(buf){
  var h = '<div class="field-row">';
  h += inputField('sl-mrp', 'mrp', 'Original MRP (₹)', buf, 'mrp', { type: 'text', inputmode: 'numeric', maxlength: 9, ph: 'e.g. 2990', hint: 'Price printed on the tag when new.' });
  h += inputField('sl-price', 'price', 'Asking price (₹)', buf, 'price', { type: 'text', inputmode: 'numeric', maxlength: 9, ph: 'e.g. 1200', hint: 'Min ₹99, max = MRP.' });
  h += '</div>';
  h += priceLiveHTML(buf);
  h += '<button type="button" class="btn btn-secondary btn-sm" data-action="price-suggest">Use suggested midpoint</button>';
  return h;
}

/* ---------- step 6: Seller info ---------- */
function sellerNoteHTML(buf){
  var mob = String(buf.sellerMobile || '').trim();
  var existing = findUserSellerByMobile(mob);
  if (existing) return '<p class="success-note">Existing seller found — you will publish as <strong>' + esc(existing.name) + '</strong> (' + esc(existing.id) + ').</p>';
  if (RW.validators.mobile(mob)) return '<p class="muted small-note">New seller — this listing will appear under a new <strong>S13+ seller</strong> profile, shown as “New seller” until rated.</p>';
  return '<p class="muted small-note">New sellers show “New seller” instead of a rating until their first sale is rated.</p>';
}
function stepSeller(buf){
  var h = '<div class="field-row">';
  h += inputField('sl-seller-name', 'sellerName', 'Your name', buf, 'sellerName', { maxlength: 60, autocomplete: 'name' });
  h += inputField('sl-seller-mobile', 'sellerMobile', 'Mobile', buf, 'sellerMobile', { maxlength: 10, inputmode: 'numeric', autocomplete: 'tel', hint: 'Same mobile reuses your existing seller record. Never shown publicly.' });
  h += '</div>';
  h += '<div id="seller-note">' + sellerNoteHTML(buf) + '</div>';
  h += '<div class="field-row">';
  h += inputField('sl-seller-email', 'sellerEmail', 'Email (optional)', buf, 'sellerEmail', { type: 'email', maxlength: 80, autocomplete: 'email' });
  h += inputField('sl-seller-city', 'sellerCity', 'City', buf, 'sellerCity', { maxlength: 40, autocomplete: 'address-level2' });
  h += '</div>';
  h += '<div class="field-row">';
  h += inputField('sl-seller-pin', 'sellerPincode', 'Pickup pincode', buf, 'sellerPincode', { maxlength: 6, inputmode: 'numeric', autocomplete: 'postal-code' });
  h += inputField('sl-pickup-notes', 'pickupNotes', 'Pickup notes (optional)', buf, 'pickupNotes', { maxlength: 120, ph: 'e.g. Weekday evenings after 6, Ring the bell twice' });
  h += '</div>';
  h += checkField('sl-terms', 'terms', 'I confirm this is my own item, not prohibited (no innerwear, swimwear, damaged goods or counterfeits), and accept the 8% selling fee.', buf, 'terms', { block: true });
  return h;
}

/* ---------- step 7: Review ---------- */
function previewProduct(buf){
  var meta = subMeta(buf.category, buf.sub);
  var mrp = Number(buf.mrp) || 0, price = Number(buf.price) || 0;
  return {
    id: 'preview', title: String(buf.title || '').trim() || 'Your listing title', brand: String(buf.brand || '').trim() || 'Your brand',
    category: buf.category || '', sub: buf.sub || '', size: buf.size || '', sizeType: meta ? meta.sizeType : 'letter',
    color: buf.color || '', colorHex: colorHexOf(buf.color), material: buf.material || '', fit: buf.fit || '',
    occasion: buf.occasion || [], condition: buf.condition || 'Like New', timesWorn: wornOf(buf),
    tagsAttached: !!buf.tagsAttached, mrp: mrp, price: price || mrp,
    discountPct: discountOf(mrp, price || mrp), listingScore: scoreOf(buf).total,
    images: (buf.photos || []).slice(0, 3), shape: meta ? meta.shape : undefined,
    sellerId: 'preview', city: buf.sellerCity || 'Your city',
    listedAgoHours: 0, status: 'available', viewsBase: 0, wishlistBase: 0, keywords: []
  };
}
function scorePanelHTML(buf){
  var s = scoreOf(buf);
  var h = '<div class="score-panel' + (s.complete ? ' is-complete' : '') + '">';
  h += '<div class="score-head"><h3 class="h3">Listing quality</h3><span class="score-num">' + s.total + '/100</span>';
  if (s.complete) h += '<span class="badge badge-complete">Complete listing</span>';
  h += '</div><ul class="score-list">';
  for (var i = 0; i < s.parts.length; i++){
    var p = s.parts[i];
    h += '<li class="' + (p.got === p.max ? 'is-on' : p.got > 0 ? 'is-part' : '') + '"><span class="score-label">' + esc(p.label) + '</span>' +
      '<span class="score-bar"><span style="width:' + Math.round(p.got / p.max * 100) + '%"></span></span>' +
      '<span class="score-val">' + p.got + '/' + p.max + '</span><span class="score-note muted small-note">' + esc(p.note) + '</span></li>';
  }
  h += '</ul>';
  if (!s.complete) h += '<p class="muted small-note">Hit 80+ for the “Complete listing” badge — more photos, measurements and an 80+ character description get you there.</p>';
  h += '</div>';
  return h;
}
function stepReview(buf){
  var meta = subMeta(buf.category, buf.sub);
  var mrp = Number(buf.mrp) || 0, price = Number(buf.price) || 0;
  var h = '<div class="review-grid">';
  h += '<div class="review-cell"><h3 class="h4-label">Card preview</h3><div class="review-card">' + RW.ui.card(previewProduct(buf)) + '</div></div>';
  h += '<div class="review-cell"><h3 class="h4-label">Listing page preview</h3><div class="review-page">';
  h += '<span class="p-card-brand">' + esc(buf.brand || 'Brand') + '</span><h4>' + esc(buf.title || 'Your listing title') + '</h4>';
  h += '<div class="price-block"><span class="price-now big">' + fmt(price || mrp) + '</span>';
  if (mrp > price) h += '<span class="price-mrp">' + fmt(mrp) + '</span><span class="price-off">' + discountOf(mrp, price) + '% off</span>';
  h += '</div>';
  h += '<dl class="info-inline"><div><dt>Condition</dt><dd>' + esc(buf.condition || '—') + '</dd></div>' +
    '<div><dt>Worn</dt><dd>' + (wornOf(buf) === 0 ? 'Never worn' : wornOf(buf) + '×') + '</dd></div>' +
    '<div><dt>Size</dt><dd>' + esc(E().sizeLabel({ size: buf.size, sizeType: meta ? meta.sizeType : 'letter' })) + '</dd></div></dl>';
  var mk = buf.measurements || {}, mkeys = Object.keys(mk);
  if (mkeys.length){
    h += '<table class="meas-table"><tbody>';
    for (var i = 0; i < mkeys.length; i++) if (String(mk[mkeys[i]] || '').trim()) h += '<tr><th scope="row">' + esc(mkeys[i]) + '</th><td>' + esc(mk[mkeys[i]]) + '</td></tr>';
    h += '</tbody></table>';
  }
  h += '<p class="flaws"><strong>Flaws:</strong> ' + esc(buf.flaws || '—') + '</p>';
  h += '<p class="washed"><strong>Care:</strong> ' + (buf.washed ? 'Washed / dry-cleaned before listing' : 'Not declared') + '</p>';
  h += '<p class="muted">' + esc(String(buf.description || '').slice(0, 220)) + '</p>';
  h += '</div></div>';
  h += '<div class="review-cell">' + scorePanelHTML(buf) + '</div>';
  h += '</div>';
  h += '<div class="review-summary"><h3 class="h4-label">Before you publish</h3><ul class="review-check">' +
    '<li>' + (buf.photos && buf.photos.length ? '✓' : '○') + ' ' + (buf.photos ? buf.photos.length : 0) + ' photo(s), cover set</li>' +
    '<li>' + (buf.condition && condAllowed(buf.condition, wornOf(buf), !!buf.tagsAttached) ? '✓' : '○') + ' Condition ' + esc(buf.condition || 'not chosen') + ' · worn ' + wornOf(buf) + '×</li>' +
    '<li>' + (price && mrp && price <= mrp && price >= 99 ? '✓' : '○') + ' Price ' + (price ? fmt(price) : '—') + ' of MRP ' + (mrp ? fmt(mrp) : '—') + ' · you keep ' + fmt(Math.round((price || 0) * (100 - (CFG.sellerFeePct || 8)) / 100)) + '</li>' +
    '<li>' + (buf.sellerName && RW.validators.mobile(buf.sellerMobile) ? '✓' : '○') + ' Seller ' + esc(buf.sellerName || '—') + ' · ' + esc(buf.sellerCity || '—') + '</li>' +
    '</ul></div>';
  return h;
}

/* ---------- sell view ---------- */
function progressBar(step, maxStep){
  var pct = Math.round(step / STEP_NAMES.length * 100);
  var h = '<div class="sell-progress"><div class="sell-progress-track" aria-hidden="true"><div class="sell-progress-fill" style="width:' + pct + '%"></div></div>';
  h += '<ol class="sell-steps" aria-label="Sell progress">';
  for (var i = 1; i <= STEP_NAMES.length; i++){
    var cls = i < step ? 'is-done' : i === step ? 'is-current' : '';
    var disabled = i > maxStep && i !== step;
    h += '<li class="' + cls + '"><button type="button" data-action="sell-goto" data-step="' + i + '"' + (disabled ? ' disabled' : '') +
      (i === step ? ' aria-current="step"' : '') + '><span class="n">' + i + '</span><span class="lbl">' + esc(STEP_NAMES[i - 1]) + '</span></button></li>';
  }
  h += '</ol></div>';
  return h;
}
function sell(query){
  ensureDraft();
  var step = parseInt(query && query.step, 10);
  if (!isFinite(step)) step = wd.step || 1;
  step = RW.util.clamp(step, 1, STEP_NAMES.length);
  wd.step = step;
  saveDraftDebounced();

  var pending = !bannerResolved ? savedDraft() : null;
  var bodies = [stepBasics, stepDetails, stepCondition, stepPhotos, stepPrice, stepSeller, stepReview];
  var html = '<div class="view sell-view" data-sellform data-buf="draft">';
  html += '<h1 tabindex="-1">Sell an item</h1>';
  html += '<div class="alert-warn-top" role="note"><strong>Prohibited items:</strong> innerwear, swimwear, damaged items and counterfeits are never allowed. Listings that break these rules are removed.</div>';
  if (pending){
    html += '<div class="draft-restore"><div><strong>Unfinished draft found</strong><p class="muted small-note">“' + esc(String(pending.title || 'Untitled listing')) + '” was saved ' + esc(rel(pending.savedAt || Date.now())) + (pending.step > 1 ? ' at step ' + pending.step : '') + '.</p></div>' +
      '<div class="draft-actions"><button type="button" class="btn btn-primary btn-sm" data-action="draft-continue">Continue draft</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="draft-discard">Start fresh</button></div></div>';
  }
  html += '<p class="step-counter">Step <strong>' + step + '</strong> of ' + STEP_NAMES.length + ' — <strong>' + esc(STEP_NAMES[step - 1]) + '</strong></p>';
  html += progressBar(step, wd.maxStep || 1);
  html += '<form class="wizard-form" novalidate>';
  html += '<div class="wizard-body" id="wizard-body">' + bodies[step - 1](wd) + '</div>';
  html += '<div class="wizard-nav">';
  if (step > 1) html += '<button type="button" class="btn btn-ghost" data-action="sell-back">Back</button>';
  else html += '<span></span>';
  if (step < STEP_NAMES.length) html += '<button type="button" class="btn btn-primary" data-action="sell-next">Next — ' + esc(STEP_NAMES[step]) + '</button>';
  else html += '<button type="button" class="btn btn-accent btn-lg" data-action="sell-submit">Publish listing</button>';
  html += '</div></form>';
  html += '</div>';
  return html;
}

/* ---------- wizard actions ---------- */
function wizardRoot(){ return document.querySelector('.sell-view[data-sellform]'); }
function rootFromEl(el){ return el && el.closest ? el.closest('[data-sellform]') : null; }

RW.actions['sell-goto'] = function(el){
  var n = parseInt(el.getAttribute('data-step'), 10);
  if (!isFinite(n) || n < 1 || n > STEP_NAMES.length) return;
  saveDraft();
  RW.router.navigate('#/sell?step=' + n, { inPage: true });
};
RW.actions['sell-next'] = function(){
  var root = wizardRoot();
  if (!root) return;
  if (!validateBuf(root, wd.step)) return;
  var next = Math.min(STEP_NAMES.length, wd.step + 1);
  wd.maxStep = Math.max(wd.maxStep || 1, next);
  wd.step = next;
  saveDraft();
  RW.router.navigate('#/sell?step=' + next, { inPage: true });
};
RW.actions['sell-back'] = function(){
  saveDraft();
  var prev = Math.max(1, (wd.step || 1) - 1);
  wd.step = prev;
  saveDraft();
  RW.router.navigate('#/sell?step=' + prev, { inPage: true });
};
RW.actions['draft-continue'] = function(){
  var s = savedDraft();
  if (s) wd = Object.assign(newDraft(), s);
  bannerResolved = true;
  RW.toast('Draft restored — carry on where you left off.', 'success');
  RW.router.navigate('#/sell?step=' + RW.util.clamp(wd.step || 1, 1, STEP_NAMES.length), { replace: true, inPage: true });
};
RW.actions['draft-discard'] = function(){
  RW.storage.remove('rw_sell_draft');
  bannerResolved = true;
  wd = newDraft();
  RW.toast('Draft discarded — starting fresh.');
  RW.router.navigate(location.hash, { replace: true });
};

/* ---------- live input sync (wizard + manage edit forms) ---------- */
function syncField(t, b){
  if (!t || !b) return null;
  if (t.getAttribute && t.getAttribute('data-meas')){
    b.measurements = b.measurements || {};
    b.measurements[t.getAttribute('data-meas')] = String(t.value || '').trim().slice(0, 12);
    return { key: null };
  }
  var name = t.name;
  if (!name) return null;
  var type = String(t.type || '').toLowerCase();
  if (type === 'checkbox' && name === 'occasion'){
    var cur = (b.occasion || []).slice();
    var v = String(t.value || '');
    var idx = cur.indexOf(v);
    if (t.checked && idx < 0) cur.push(v);
    if (!t.checked && idx >= 0) cur.splice(idx, 1);
    b.occasion = cur;
    return { key: 'occasion' };
  }
  if (type === 'checkbox'){ b[name] = !!t.checked; return { key: name }; }
  if (type === 'radio'){ if (t.checked) b[name] = String(t.value || ''); return { key: name }; }
  b[name] = String(t.value == null ? '' : t.value);
  return { key: name };
}
function rerenderSell(focusId){
  RW.router.navigate(location.hash, { replace: true });
  if (focusId){
    var el = document.getElementById(focusId);
    if (el && el.focus){ try { el.focus({ preventScroll: true }); } catch(e){ el.focus(); } }
  }
}
function patchPriceLive(root, b){
  var node = root.querySelector('#price-live');
  if (!node) return;
  var tmp = document.createElement('div');
  tmp.innerHTML = priceLiveHTML(b);
  if (tmp.firstChild) node.parentNode.replaceChild(tmp.firstChild, node);
}
function patchSellerNote(root, b){
  var node = root.querySelector('#seller-note');
  if (node) node.innerHTML = sellerNoteHTML(b);
}
function patchDescHint(root, b){
  var ta = root.querySelector('#sl-desc');
  if (!ta) return;
  var f = ta.closest('.field');
  var hint = f && f.querySelector('.field-hint');
  if (hint) hint.textContent = '80+ characters scores full points (currently ' + String(b.description || '').length + ').';
}
function patchGradeRows(root, b){
  var rows = root.querySelectorAll('.grade-row');
  for (var i = 0; i < rows.length; i++){
    var input = rows[i].querySelector('input');
    if (!input) continue;
    var v = String(input.value || '');
    var allowed = condAllowed(v, wornOf(b), !!b.tagsAttached);
    input.disabled = !allowed;
    rows[i].classList.toggle('is-on', b.condition === v);
    rows[i].classList.toggle('is-disabled', !allowed);
    var why = rows[i].querySelector('.grade-why');
    if (why) why.textContent = b.tagsAttached ? 'Tags force Like New' : 'Conflicts with wear count';
    else if (!allowed){
      why = document.createElement('span');
      why.className = 'grade-why';
      why.textContent = b.tagsAttached ? 'Tags force Like New' : 'Conflicts with wear count';
      rows[i].appendChild(why);
    }
  }
}
function onSellFieldEvent(e){
  var t = e.target;
  if (!t || !t.closest) return;
  var container = t.closest('[data-sellform]');
  if (!container) return;
  var b = bufOf(container);
  if (!b) return;
  var info = syncField(t, b);
  if (!info) return;
  /* typing inside the wizard resolves the restore prompt (manage-edit forms never do) */
  if (container.getAttribute('data-buf') !== 'edit' && !bannerResolved && savedDraft()) bannerResolved = true;
  saveDraftDebounced(container);

  var k = info.key;
  if (k === 'category'){
    b.sub = '';
    var subSel = container.querySelector('#sl-sub');
    if (subSel) subSel.innerHTML = subOptions(String(b.category || ''), '');
  } else if (k === 'timesWorn' || k === 'tagsAttached'){
    normalizeCondition(b);
    if (k === 'tagsAttached') rerenderSell('sl-tags');
    else rerenderSell('sl-worn');
  } else if (k === 'condition'){
    patchGradeRows(container, b);
  } else if (k === 'mrp' || k === 'price'){
    patchPriceLive(container, b);
  } else if (k === 'sellerMobile'){
    patchSellerNote(container, b);
  } else if (k === 'description'){
    patchDescHint(container, b);
  }
}
document.addEventListener('input', onSellFieldEvent);
document.addEventListener('change', onSellFieldEvent);

/* ---------- photos ---------- */
function refreshPhotos(container){
  if (!container) return;
  var b = bufOf(container);
  var list = container.querySelector('#photo-list');
  if (list) list.innerHTML = photoThumbsHTML(b);
  var cnt = container.querySelector('#photo-count');
  if (cnt) cnt.textContent = (b.photos || []).length + ' of 3 photos added.';
}
RW.actions['photo-add'] = function(){
  var input = document.getElementById('sl-photos');
  if (input) input.click();
};
function addFiles(container, files){
  if (!container) return;
  var b = bufOf(container);
  if (!b) return;
  var arr = Array.prototype.slice.call(files || []);
  if (!arr.length) return;
  var i = 0;
  function next(){
    if (i >= arr.length){ refreshPhotos(container); saveDraft(container); return; }
    var f = arr[i++];
    if (!f.type || String(f.type).indexOf('image/') !== 0){
      RW.toast('“' + String(f.name || 'file').slice(0, 40) + '” is not an image — only JPG, PNG or WEBP photos are accepted.', 'error');
      next();
      return;
    }
    if ((b.photos || []).length >= 3){
      RW.toast('You can add up to 3 photos.', 'error');
      refreshPhotos(container);
      return;
    }
    RW.util.compressImage(f).then(function(dataUrl){
      if ((b.photos || []).length >= 3){
        RW.toast('You can add up to 3 photos.', 'error');
        refreshPhotos(container);
        return;
      }
      b.photos = (b.photos || []).concat([dataUrl]);
      refreshPhotos(container);
      saveDraft(container);
      next();
    }, function(err){
      RW.toast((err && err.message) || 'Could not add that photo.', 'error');
      next();
    });
  }
  next();
}
document.addEventListener('change', function(e){
  var t = e.target;
  if (t && t.getAttribute && t.getAttribute('data-photo-input') != null){
    addFiles(rootFromEl(t), t.files);
    try { t.value = ''; } catch(err){}
  }
});
document.addEventListener('dragover', function(e){
  var zone = e.target && e.target.closest ? e.target.closest('.photo-drop') : null;
  if (!zone) return;
  e.preventDefault();
  zone.classList.add('is-over');
});
document.addEventListener('dragleave', function(e){
  var zone = e.target && e.target.closest ? e.target.closest('.photo-drop') : null;
  if (zone) zone.classList.remove('is-over');
});
document.addEventListener('drop', function(e){
  var zone = e.target && e.target.closest ? e.target.closest('.photo-drop') : null;
  if (!zone) return;
  e.preventDefault();
  zone.classList.remove('is-over');
  addFiles(rootFromEl(zone), e.dataTransfer && e.dataTransfer.files);
});
function reorderPhoto(el, fn){
  var root = rootFromEl(el);
  var b = bufOf(root);
  if (!b || !b.photos) return;
  fn(b.photos);
  refreshPhotos(root);
  saveDraft(root);
}
RW.actions['photo-del'] = function(el){
  var idx = parseInt(el.getAttribute('data-i'), 10);
  reorderPhoto(el, function(photos){ if (idx >= 0 && idx < photos.length) photos.splice(idx, 1); });
  RW.toast('Photo removed');
};
RW.actions['photo-move'] = function(el){
  var idx = parseInt(el.getAttribute('data-i'), 10);
  var dir = parseInt(el.getAttribute('data-dir'), 10);
  reorderPhoto(el, function(photos){
    var j = idx + dir;
    if (idx < 0 || idx >= photos.length || j < 0 || j >= photos.length) return;
    var tmp = photos[idx]; photos[idx] = photos[j]; photos[j] = tmp;
  });
};
RW.actions['photo-cover'] = function(el){
  var idx = parseInt(el.getAttribute('data-i'), 10);
  reorderPhoto(el, function(photos){
    if (idx <= 0 || idx >= photos.length) return;
    var p = photos.splice(idx, 1)[0];
    photos.unshift(p);
  });
  RW.toast('Cover photo updated', 'success');
};

/* ---------- submit (Listing ID RW-2001+, managed from #/manage - no PIN) ---------- */
function findUserSellerByMobile(mob){
  if (!RW.validators.mobile(mob)) return null;
  var list = RW.store.get('rw_sellers_user') || [];
  for (var i = 0; i < list.length; i++) if (String(list[i].mobile || '') === String(mob)) return list[i];
  return null;
}
function nextListingId(){
  var list = RW.store.get('rw_listings_user') || [];
  var max = 2000;
  for (var i = 0; i < list.length; i++){
    var n = parseInt(String(list[i].id || '').replace('RW-', ''), 10);
    if (isFinite(n) && n > max) max = n;
  }
  return 'RW-' + (max + 1);
}
function nextSellerId(){
  var max = 12;
  var seeds = DATA.sellers || [];
  for (var i = 0; i < seeds.length; i++){
    var n = parseInt(String(seeds[i].id || '').replace('S', ''), 10);
    if (isFinite(n) && n > max) max = n;
  }
  var user = RW.store.get('rw_sellers_user') || [];
  for (var j = 0; j < user.length; j++){
    var m = parseInt(String(user[j].id || '').replace('S', ''), 10);
    if (isFinite(m) && m > max) max = m;
  }
  return 'S' + (max + 1);
}
function keywordsFor(b){
  return (String(b.title || '') + ' ' + String(b.brand || '') + ' ' + String(b.category || '') + ' ' + String(b.sub || '') + ' ' +
    String(b.material || '') + ' ' + String(b.color || '') + ' ' + (b.occasion || []).join(' ') + ' ' + String(b.size || ''))
    .toLowerCase().replace(/[^a-z0-9\s&]/g, ' ').split(/\s+/).filter(Boolean);
}
function trimmedMeasurements(b){
  var out = {};
  var m = b.measurements || {};
  for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k) && String(m[k] || '').trim()) out[k] = String(m[k]).trim().slice(0, 12);
  return out;
}
function buildListing(b, id, sellerId){
  var meta = subMeta(b.category, b.sub);
  var mrp = Number(b.mrp) || 0, price = Number(b.price) || 0;
  var p = {
    id: id,
    title: String(b.title || '').trim().slice(0, 80),
    brand: String(b.brand || '').trim().slice(0, 40),
    category: b.category,
    sub: b.sub,
    size: b.size,
    sizeType: meta ? meta.sizeType : 'letter',
    color: b.color,
    colorHex: colorHexOf(b.color),
    material: b.material,
    fit: b.fit,
    occasion: (b.occasion || []).slice(0, 6),
    condition: b.condition,
    timesWorn: wornOf(b),
    tagsAttached: !!b.tagsAttached,
    mrp: mrp,
    price: price,
    discountPct: discountOf(mrp, price),
    listingScore: scoreOf(b).total,
    measurements: trimmedMeasurements(b),
    flaws: String(b.flaws || '').trim().slice(0, 300),
    washed: !!b.washed,
    reasonForSelling: String(b.reason || '').slice(0, 80),
    description: String(b.description || '').trim().slice(0, 600),
    images: (b.photos || []).slice(0, 3),
    sellerId: sellerId,
    city: String(b.sellerCity || '').trim().slice(0, 40),
    sellerEmail: String(b.sellerEmail || '').trim().slice(0, 80),
    sellerPincode: String(b.sellerPincode || '').trim().slice(0, 10),
    pickupNotes: String(b.pickupNotes || '').trim().slice(0, 300),
    listedAt: Number(b.listedAt) || Date.now(),
    listedAgoHours: 0,
    status: 'available',
    viewsBase: 0,
    wishlistBase: 0,
    keywords: keywordsFor(b)
  };
  if (meta && meta.shape) p.shape = meta.shape;
  return p;
}
function upsertSeller(b){
  var existing = findUserSellerByMobile(String(b.sellerMobile || '').trim());
  var user = (RW.store.get('rw_sellers_user') || []).slice();
  if (existing){
    /* same mobile reuses its user seller record (update profile bits) */
    for (var i = 0; i < user.length; i++){
      if (user[i].id === existing.id){
        user[i] = Object.assign({}, user[i], {
          name: String(b.sellerName || '').trim().slice(0, 60) || user[i].name,
          city: String(b.sellerCity || '').trim().slice(0, 40) || user[i].city
        });
        RW.store.set('rw_sellers_user', user);
        return user[i];
      }
    }
    return existing;
  }
  var s = {
    id: nextSellerId(),
    name: String(b.sellerName || '').trim().slice(0, 60),
    city: String(b.sellerCity || '').trim().slice(0, 40),
    rating: null,
    ratingCount: 0,
    itemsSold: 0,
    memberSinceYear: new Date().getFullYear(),
    avatarColor: SELLER_PALETTE[user.length % SELLER_PALETTE.length],
    mobile: String(b.sellerMobile || '').trim(),
    newUser: true
  };
  user.push(s);
  RW.store.set('rw_sellers_user', user);
  return s;
}
RW.actions['sell-submit'] = function(){
  var root = wizardRoot();
  if (!root) return;
  normalizeCondition(wd);
  /* validate steps 1-6; jump to the first failing step (URL is source of truth) */
  var badStep = 0, badErrs = null;
  for (var s = 1; s <= 6 && !badStep; s++){
    var errs = fieldChecks(wd, s);
    if (errs.length){ badStep = s; badErrs = errs; }
  }
  if (badStep){
    RW.router.navigate('#/sell?step=' + badStep, { replace: true, inPage: true });
    var r2 = wizardRoot();
    if (r2){
      clearErrs(r2);
      for (var i = 0; i < badErrs.length; i++) setErr(r2.querySelector(badErrs[i].sel), badErrs[i].msg);
      focusFirst(r2, badErrs);
    }
    RW.toast('Please fix the highlighted fields', 'error');
    return;
  }
  saveDraft();
  var seller = upsertSeller(wd);
  var id = nextListingId();
  var listing = buildListing(wd, id, seller.id);
  var list = (RW.store.get('rw_listings_user') || []).slice();
  list.push(listing);
  RW.store.set('rw_listings_user', list);
  if (!RW.storage.available()){
    RW.toast('Your browser storage is full — the listing could not be saved. Remove a photo and try again.', 'error');
    return;
  }
  RW.storage.remove('rw_sell_draft');
  wd = newDraft();
  bannerResolved = false;
  quotaWarned = false;
  RW.toast('Listing published — it is live in the shop!', 'success');
  RW.router.navigate('#/sell/done/' + id, { inPage: true });
};

/* ---------- listing created slip ---------- */

function sellDone(query, params){
  var id = params && params.id;
  var p = E().productById(id);
  if (!p){
    return '<div class="view error-view"><p class="code">404</p><h1 tabindex="-1">Listing not found</h1>' +
      '<p class="muted">We could not find listing <code>' + esc(id || '') + '</code>.</p>' +
      '<p><a class="btn btn-primary" href="#/sell">Start a new listing</a> <a class="btn btn-ghost" href="#/shop">Browse shop</a></p></div>';
  }
  var seller = E().sellerById(p.sellerId) || { name: 'You', id: p.sellerId };
  var html = '<div class="view done-view">';
  html += '<div class="done-anim" aria-hidden="true"><svg viewBox="0 0 72 72" width="72" height="72"><circle class="da-circle" cx="36" cy="36" r="32"/><path class="da-check" d="M22 37l10 10 18-20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
  html += '<h1 tabindex="-1">Your listing is live!</h1>';
  html += '<p class="success-note">“' + esc(p.title) + '” is now in the shop with a <strong>Just listed</strong> ribbon, under <a href="#/seller/' + esc(seller.id) + '">' + esc(seller.name) + '</a>.</p>';
  html += '<div class="slip" id="pin-slip">';
  html += '<div class="slip-head"><h2 class="h3">Listing slip</h2><span class="badge badge-complete">Keep this safe</span></div>';
  html += '<div class="slip-row"><span class="slip-label">Listing ID</span><strong class="slip-val" id="slip-id">' + esc(id) + '</strong>' +
    '<button type="button" class="btn btn-sm btn-ghost no-print" data-action="copy-text" data-copy="' + esc(id) + '">Copy</button></div>';
  html += '<p class="slip-warn"><strong>Manage anytime.</strong> Edit the price, details or photos, drop the price, mark it sold or delete it from <a href="#/manage?id=' + encodeURIComponent(id) + '">Manage listing</a> — no PIN needed.</p>';
  html += '<p class="muted small-note no-print">Demo project — no real payment or shipping. Use Manage listing to edit, drop the price, or mark it sold.</p>';
  html += '</div>';
  html += '<div class="done-actions no-print">' +
    '<button type="button" class="btn btn-secondary" data-action="print-slip">Print slip</button>' +
    '<a class="btn btn-primary" href="#/product/' + esc(id) + '">View listing</a>' +
    '<a class="btn btn-accent" href="#/sell">Sell another</a>' +
    '<a class="btn btn-ghost" href="#/manage?id=' + encodeURIComponent(id) + '">Manage listing</a>' +
    '</div>';
  html += '</div>';
  return html;
}
RW.actions['copy-text'] = function(el){
  var text = String(el.getAttribute('data-copy') || '');
  function ok(){ RW.toast('Copied to clipboard', 'success'); }
  function fallback(){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var done = false;
    try { done = document.execCommand('copy'); } catch(e){ done = false; }
    if (ta.parentNode) ta.parentNode.removeChild(ta);
    if (done) ok();
    else RW.toast('Copy failed — select the text manually.', 'error');
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(ok, fallback);
      return;
    }
  } catch(e){}
  fallback();
};
RW.actions['print-slip'] = function(){ window.print(); };

/* ---------- manage listing (list of your listings → panels; no ID/PIN gate) ---------- */
var managedId = null; /* listing currently open in panels — set by manage() */
var editBuf = null;
var editBufFor = null;

function userListingById(id){
  var list = RW.store.get('rw_listings_user') || [];
  for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
  return null;
}
function manageList(note){
  var list = (RW.store.get('rw_listings_user') || []).slice();
  var html = '<div class="view manage-view list-view">';
  html += '<h1 tabindex="-1">Manage listings</h1>';
  if (note) html += '<div class="alert-error" role="alert">' + esc(note) + '</div>';
  if (!list.length){
    html += '<div class="empty-state"><h2>You haven\u2019t listed anything yet</h2>' +
      '<p class="muted">List an item in minutes — then come back here to edit the price, fix details, mark it sold or delete it.</p>' +
      '<p><a class="btn btn-primary" href="#/sell">Start selling</a></p></div></div>';
    return html;
  }
  var live = E();
  html += '<p class="muted" role="status">' + list.length + ' listing' + (list.length === 1 ? '' : 's') +
    ' — edit anything, drop the price, mark sold or delete. Changes go live in the shop instantly.</p>';
  html += '<div class="manage-list">';
  for (var i = 0; i < list.length; i++){
    var p = list[i];
    var prod = live.productById(p.id) || p;
    var ordN = ordersFor(p.id).length;
    html += '<article class="manage-card">';
    html += '<a class="manage-thumb" href="#/product/' + esc(p.id) + '" tabindex="-1" aria-hidden="true">' + RW.ui.img(prod, 0, 'card') + '</a>';
    html += '<div class="manage-card-body">';
    html += '<div class="manage-card-top"><h2 class="h3 manage-card-title">' + esc(p.title) + '</h2>' +
      (prod.status === 'sold' ? '<span class="badge status-sold">Sold</span>' : '<span class="badge status-available">Available</span>') + '</div>';
    html += '<p class="manage-card-meta"><strong>' + fmt(prod.price) + '</strong><span class="muted"> · ' + (p.viewsBase || 0) + ' views' +
      (ordN ? ' · ' + ordN + ' order' + (ordN === 1 ? '' : 's') : '') + '</span></p>';
    html += '<div class="manage-card-actions">' +
      '<a class="btn btn-secondary btn-sm" href="#/manage?id=' + encodeURIComponent(p.id) + '&amp;panel=edit">Edit</a>' +
      '<a class="btn btn-ghost btn-sm" href="#/manage?id=' + encodeURIComponent(p.id) + '">Manage</a>' +
      '<a class="btn btn-ghost btn-sm" href="#/product/' + esc(p.id) + '">View</a></div>';
    html += '</div></article>';
  }
  html += '</div>';
  html += '<p class="muted small-note">Selling more? <a href="#/sell">List another item</a> — it appears here instantly.</p>';
  html += '</div>';
  return html;
}
function ordersFor(id){
  var out = [];
  var orders = RW.store.get('rw_orders') || [];
  for (var i = 0; i < orders.length; i++){
    var o = orders[i];
    if (o.status === 'CANCELLED') continue;
    var hit = false;
    for (var j = 0; j < (o.items || []).length; j++) if (String(o.items[j].id) === String(id)){ hit = true; break; }
    if (hit) out.push(o);
  }
  return out;
}
var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function handoverDate(ts){
  var d = new Date(ts + 2 * 86400000);
  return d.getDate() + ' ' + MON[d.getMonth()];
}
function ordersBannerHTML(id){
  var orders = ordersFor(id);
  if (!orders.length) return '';
  var h = '<div class="orders-banner" role="status"><strong>' + (orders.length === 1 ? '1 order received' : orders.length + ' orders received') + '</strong><ul>';
  for (var i = 0; i < orders.length; i++){
    var o = orders[i];
    var first = String((o.buyer && o.buyer.name) || 'Buyer').split(/\s+/)[0];
    var city = (o.buyer && o.buyer.address && o.buyer.address.city) || '';
    h += '<li><a href="#/order/' + esc(o.orderId) + '">' + esc(o.orderId) + '</a> — ' + esc(first) + (city ? ' · ' + esc(city) : '') +
      ' · hand over by <strong>' + esc(handoverDate(o.createdAt || Date.now())) + '</strong> · ' + esc(o.status.replace(/_/g, ' ').toLowerCase()) + '</li>';
  }
  h += '</ul></div>';
  return h;
}
function editBufFrom(p){
  var s = E().sellerById(p.sellerId) || {};
  return {
    title: p.title, brand: p.brand, category: p.category, sub: p.sub,
    size: p.size, color: p.color, material: p.material, fit: p.fit,
    occasion: (p.occasion || []).slice(), description: p.description || '',
    measurements: Object.assign({}, p.measurements || {}),
    condition: p.condition, timesWorn: String(p.timesWorn != null ? p.timesWorn : 0), tagsAttached: !!p.tagsAttached,
    flaws: p.flaws || '', washed: !!p.washed, reason: p.reasonForSelling || '',
    photos: (p.images || []).slice(0, 3),
    mrp: String(p.mrp), price: String(p.price),
    sellerName: s.name || '', sellerMobile: s.mobile || '',
    sellerEmail: p.sellerEmail || '', sellerCity: s.city || p.city || '',
    sellerPincode: p.sellerPincode || '', pickupNotes: p.pickupNotes || '',
    terms: true, step: 1, maxStep: STEP_NAMES.length, savedAt: 0
  };
}
function summaryPanel(id, p){
  var live = E().productById(id) || p;
  var w = RW.store.get('rw_wishlist') || {};
  var sc = scoreOf(editBufFrom(p));
  var h = '<div class="summary-grid">';
  h += '<div class="sum-card"><span class="sum-label">Status</span>' + (live.status === 'sold' ? '<span class="badge status-sold">Sold</span>' : '<span class="badge status-available">Available</span>') + '</div>';
  h += '<div class="sum-card"><span class="sum-label">Price</span><strong class="sum-val">' + fmt(live.price) + '</strong><span class="muted small-note">MRP ' + fmt(live.mrp) + ' · ' + live.discountPct + '% off</span></div>';
  h += '<div class="sum-card"><span class="sum-label">Views</span><strong class="sum-val">' + (p.viewsBase || 0) + '</strong></div>';
  h += '<div class="sum-card"><span class="sum-label">Wishlisted</span><strong class="sum-val">' + (w[id] ? 1 : 0) + '</strong></div>';
  h += '<div class="sum-card"><span class="sum-label">Quality</span><strong class="sum-val">' + sc.total + '/100</strong>' + (sc.complete ? '<span class="badge badge-complete">Complete listing</span>' : '') + '</div>';
  h += '<div class="sum-card"><span class="sum-label">Listed</span><strong class="sum-val">' + esc(rel(p.listedAt || Date.now())) + '</strong></div>';
  h += '</div>';
  h += '<div class="quick-actions">' +
    '<a class="btn btn-secondary btn-sm" href="#/product/' + esc(id) + '">View listing</a>' +
    '<button type="button" class="btn btn-secondary btn-sm" data-action="manage-panel" data-panel="edit">Edit listing</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" data-action="manage-panel" data-panel="price">Quick price drop</button>' +
    '<button type="button" class="btn btn-ghost btn-sm" data-action="manage-panel" data-panel="messages">Messages</button></div>';
  return h;
}
function editPanel(id, p){
  if (!editBuf || editBufFor !== id) { editBuf = editBufFrom(p); editBufFor = id; }
  var b = editBuf;
  var h = '<form class="edit-form" data-sellform data-buf="edit" novalidate>';
  h += '<h3 class="h3">Basics</h3>' + stepBasics(b);
  h += '<h3 class="h3">Details</h3>' + stepDetails(b);
  h += '<h3 class="h3">Condition</h3>' + stepCondition(b);
  h += '<h3 class="h3">Photos</h3>' + stepPhotos(b);
  h += '<h3 class="h3">Price</h3>' + stepPrice(b);
  h += '<h3 class="h3">Seller info</h3>' + stepSeller(b);
  h += '<div class="wizard-nav">' +
    '<button type="button" class="btn btn-ghost" data-action="manage-panel" data-panel="summary">Cancel</button>' +
    '<button type="button" class="btn btn-primary" data-action="edit-save">Save changes</button></div>';
  h += '</form>';
  return h;
}
function pricePanel(id, p){
  var live = E().productById(id) || p;
  var h = '<div class="panel price-panel-box">';
  h += '<p>Current price <strong class="price-now">' + fmt(live.price) + '</strong> <span class="price-mrp">' + fmt(live.mrp) + '</span></p>';
  h += '<div class="drop-buttons">' +
    '<button type="button" class="btn btn-secondary" data-action="price-drop" data-pct="-10">Drop 10%</button>' +
    '<button type="button" class="btn btn-secondary" data-action="price-drop" data-pct="-20">Drop 20%</button></div>';
  h += '<div class="field-row"><div class="field"><label for="custom-price">Custom price (₹)</label>' +
    '<input type="text" id="custom-price" inputmode="numeric" maxlength="9" placeholder="e.g. ' + Math.max(99, Math.round(live.price * 0.9)) + '">' +
    '<span class="field-hint">Min ₹99, max MRP ' + fmt(live.mrp) + '.</span><span class="field-error"></span></div>' +
    '<div class="field field-btn"><span class="sr-only">Apply</span><button type="button" class="btn btn-primary" data-action="price-apply">Apply price</button></div></div>';
  h += '<p class="muted small-note">Your price is capped: never below ₹99 and never above MRP.</p></div>';
  return h;
}
function statusPanel(id, p){
  var live = E().productById(id) || p;
  var h = '<div class="panel">';
  if (live.status === 'sold'){
    h += '<p><span class="badge status-sold">Marked sold</span> — hidden from the shop (and from carts).</p>';
    h += '<button type="button" class="btn btn-primary" data-action="mark-active" data-id="' + esc(id) + '">Reactivate listing</button>';
  } else {
    h += '<p>Sold it on Instagram or in person? Mark it sold so buyers are not misled.</p>';
    h += '<button type="button" class="btn btn-secondary" data-action="mark-sold" data-id="' + esc(id) + '">Mark sold elsewhere</button>';
  }
  h += '<hr class="danger-zone-hr"><h3 class="h3">Delete listing</h3>';
  h += '<p class="muted small-note">Removes it from the shop, carts and wishlists. Existing orders keep their receipt.</p>';
  h += '<button type="button" class="btn btn-danger" data-action="delete-listing" data-id="' + esc(id) + '">Delete listing</button>';
  h += '</div>';
  return h;
}
function messagesPanel(id){
  var msgs = RW.store.get('rw_messages') || [];
  var mine = [];
  for (var i = 0; i < msgs.length; i++) if (String(msgs[i].listingId) === String(id)) mine.push(msgs[i]);
  var h = '<div class="panel">';
  if (!mine.length){
    h += '<p class="muted">No messages yet. Buyers can reach you from the “Message seller” form on your listing page.</p>';
  } else {
    h += '<ul class="msg-list">';
    for (var j = mine.length - 1; j >= 0; j--){
      var m = mine[j];
      h += '<li class="msg-item"><div class="msg-head"><strong>' + esc(m.fromName) + '</strong><span class="muted small-note">' + esc(m.contact) + ' · ' + esc(rel(m.createdAt)) + '</span></div>' +
        '<p>' + esc(m.text) + '</p></li>';
    }
    h += '</ul>';
  }
  h += '</div>';
  return h;
}
function managePanels(id, panel){
  var p = userListingById(id);
  if (!p) return manageList('That listing no longer exists.');
  var valid = ['summary', 'edit', 'price', 'status', 'messages'];
  if (valid.indexOf(panel) < 0) panel = 'summary';
  if (panel === 'edit' && (!editBuf || editBufFor !== id)) editBuf = editBufFrom(p);

  var html = '<div class="view manage-view">';
  html += '<h1 tabindex="-1">Manage listing</h1>';
  html += '<div class="manage-head"><a class="link-btn" href="#/manage">\u2190 All listings</a>' +
    '<a class="link-btn" href="#/product/' + esc(id) + '">View listing</a></div>';
  html += ordersBannerHTML(id);
  html += '<nav class="panel-tabs" aria-label="Manage sections">';
  var tabs = [['summary','Summary'],['edit','Edit'],['price','Price'],['status','Status'],['messages','Messages']];
  for (var i = 0; i < tabs.length; i++){
    html += '<button type="button" class="tab' + (panel === tabs[i][0] ? ' is-active' : '') + '" data-action="manage-panel" data-panel="' + tabs[i][0] + '"' +
      (panel === tabs[i][0] ? ' aria-current="page"' : '') + '>' + esc(tabs[i][1]) + '</button>';
  }
  html += '</nav>';
  html += '<div class="panel-body">';
  if (panel === 'summary') html += summaryPanel(id, p);
  else if (panel === 'edit') html += editPanel(id, p);
  else if (panel === 'price') html += pricePanel(id, p);
  else if (panel === 'status') html += statusPanel(id, p);
  else if (panel === 'messages') html += messagesPanel(id);
  html += '</div></div>';
  return html;
}
function manageDeleted(id){
  var snap = RW.store.get('rw_deleted') || null;
  var fresh = !!(snap && snap.listing && String(snap.listing.id) === String(id) && (Date.now() - (snap.at || 0)) < 15 * 60 * 1000);
  var label = fresh ? String(snap.listing.title || id) : String(id);
  var html = '<div class="view manage-view deleted-view">';
  html += '<h1 tabindex="-1">Listing deleted</h1>';
  html += '<div class="panel deleted-card">';
  html += '<p class="deleted-lead"><strong>' + esc(label) + '</strong> is off the marketplace.</p>';
  html += '<p class="muted">Removed from the shop, carts, wishlists and messages.</p>';
  html += '<div class="deleted-actions">';
  if (fresh) html += '<button type="button" class="btn btn-primary" data-action="delete-undo">Undo delete</button>';
  html += '<a class="btn ' + (fresh ? 'btn-ghost' : 'btn-primary') + '" href="#/manage">Back to manage</a>';
  if (!fresh) html += '<a class="btn btn-ghost" href="#/sell">List another item</a>';
  html += '</div></div>';
  if (!fresh) html += '<p class="muted small-note">The undo window has closed \u2014 this removal is permanent.</p>';
  html += '</div>';
  return html;
}
function manage(query){
  query = query || {};
  var delId = String(query.deleted || '').toUpperCase().replace(/\s+/g, '');
  if (delId) return manageDeleted(delId);
  var id = String(query.id || '').toUpperCase().replace(/\s+/g, '');
  if (id){
    var p = userListingById(id);
    if (!p) return manageList('That listing no longer exists.');
    managedId = id;
    return managePanels(id, query.panel);
  }
  managedId = null;
  editBuf = null;
  editBufFor = null;
  return manageList(null);
}

/* ---------- manage actions ---------- */
RW.actions['manage-panel'] = function(el){
  var panel = el.getAttribute('data-panel') || 'summary';
  var id = managedId;
  if (!id) return;
  if (panel === 'edit'){
    var p = userListingById(id);
    if (p){ editBuf = editBufFrom(p); editBufFor = id; }
  } else {
    editBuf = null;
    editBufFor = null;
  }
  RW.router.navigate('#/manage?id=' + encodeURIComponent(id) + '&panel=' + panel, { replace: true, inPage: true });
};
RW.actions['edit-save'] = function(el){
  var root = rootFromEl(el);
  if (!root) return;
  if (!validateBuf(root, null)) return;
  var id = managedId;
  var p = id ? userListingById(id) : null;
  if (!p){
    RW.toast('That listing no longer exists.', 'error');
    RW.router.navigate('#/manage', { replace: true, inPage: true });
    return;
  }
  normalizeCondition(editBuf);
  var seller = upsertSeller(editBuf);
  var listing = buildListing(editBuf, p.id, seller.id);
  listing.listedAgoHours = p.listedAgoHours;
  listing.listedAt = p.listedAt || listing.listedAt;
  listing.viewsBase = p.viewsBase || 0;
  listing.wishlistBase = p.wishlistBase || 0;
  listing.status = p.status;
  var list = (RW.store.get('rw_listings_user') || []).slice();
  for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(p.id)) list[i] = listing;
  RW.store.set('rw_listings_user', list);
  editBuf = null;
  editBufFor = null;
  RW.toast('Listing updated — changes are live in the shop.', 'success');
  RW.router.navigate('#/manage?id=' + encodeURIComponent(id) + '&panel=summary', { replace: true, inPage: true });
};
function setUserPrice(id, next){
  var list = (RW.store.get('rw_listings_user') || []).slice();
  for (var i = 0; i < list.length; i++){
    if (String(list[i].id) === String(id)){
      list[i] = Object.assign({}, list[i], { price: next, discountPct: discountOf(list[i].mrp, next) });
      RW.store.set('rw_listings_user', list);
      return list[i];
    }
  }
  return null;
}
RW.actions['price-drop'] = function(el){
  var id = managedId;
  var p = id ? userListingById(id) : null;
  if (!p) return;
  var pct = Number(el.getAttribute('data-pct')) || 0;
  var mrp = Number(p.mrp) || 0;
  var next = RW.util.clamp(Math.round(Number(p.price) * (1 + pct / 100)), 99, mrp || Number(p.price));
  if (next >= Number(p.price)){
    RW.toast('Already at the lowest allowed price (₹99 / MRP floor).', 'error');
    return;
  }
  setUserPrice(id, next);
  RW.toast('Price dropped to ' + fmt(next), 'success');
  RW.router.navigate(location.hash, { replace: true });
};
RW.actions['price-apply'] = function(el){
  var id = managedId;
  var p = id ? userListingById(id) : null;
  if (!p) return;
  var root = rootFromEl(el) || document;
  var input = root.querySelector('#custom-price');
  var n = parseInt(String((input && input.value) || '').trim(), 10);
  if (!isFinite(n) || String(n) !== String((input && input.value || '').trim())){
    setErr(input, 'Enter a whole-number price.');
    if (input) input.focus();
    return;
  }
  if (n < 99){ setErr(input, 'Minimum price is ₹99.'); if (input) input.focus(); return; }
  if (n > Number(p.mrp)){ setErr(input, 'Cannot be above the MRP (' + fmt(p.mrp) + ').'); if (input) input.focus(); return; }
  if (n === Number(p.price)){ RW.toast('That is already the current price.'); return; }
  setUserPrice(id, n);
  RW.toast('Price updated to ' + fmt(n), 'success');
  RW.router.navigate(location.hash, { replace: true });
};
RW.actions['price-suggest'] = function(el){
  var root = rootFromEl(el);
  var b = bufOf(root);
  if (!b) return;
  var r = suggestRange(b);
  if (!r.lo){ RW.toast('Set MRP and condition first.', 'error'); return; }
  var mid = String(Math.round((r.lo + r.hi) / 2));
  b.price = mid;
  var input = root.querySelector('#sl-price');
  if (input) input.value = mid;
  patchPriceLive(root, b);
  saveDraft(root);
  RW.toast('Suggested ' + fmt(Number(mid)) + ' applied — adjust if you like.');
};
function setUserStatus(id, status){
  var list = (RW.store.get('rw_listings_user') || []).slice();
  for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) list[i] = Object.assign({}, list[i], { status: status });
  RW.store.set('rw_listings_user', list);
  var ov = RW.store.get('rw_status_overrides') || {};
  ov[id] = Object.assign({}, ov[id], { status: status });
  RW.store.set('rw_status_overrides', ov);
}
RW.actions['mark-sold'] = function(el){
  var id = el.getAttribute('data-id') || managedId;
  if (!id) return;
  RW.confirm('Mark this listing as sold elsewhere? It will be hidden from the shop and carts.', function(){
    setUserStatus(id, 'sold');
    RW.toast('Marked sold — hidden from the shop.', 'success');
    RW.router.navigate(location.hash, { replace: true });
  }, { yes: 'Mark sold' });
};
RW.actions['mark-active'] = function(el){
  var id = el.getAttribute('data-id') || managedId;
  if (!id) return;
  setUserStatus(id, 'available');
  RW.toast('Listing reactivated — it is back in the shop.', 'success');
  RW.router.navigate(location.hash, { replace: true });
};
RW.actions['delete-listing'] = function(el){
  var id = el.getAttribute('data-id') || managedId;
  if (!id) return;
  RW.confirm('Delete this listing permanently? It disappears from the shop, carts and wishlists.', function(){
    var listing = userListingById(id);
    var cart = RW.store.get('rw_cart') || [];
    var wish = RW.store.get('rw_wishlist') || {};
    var ov = RW.store.get('rw_status_overrides') || {};
    var snap = { listing: listing || null, at: Date.now(), cartEntry: null, wishEntry: wish[id] || null,
      recent: (RW.store.get('rw_recent_views') || []).indexOf(id) >= 0,
      statusOverride: ov[id] || null,
      messages: (RW.store.get('rw_messages') || []).filter(function(m){ return String(m.listingId) === String(id); }) };
    for (var ci = 0; ci < cart.length; ci++){ if (String(cart[ci].id) === String(id)) snap.cartEntry = cart[ci]; }
    RW.store.set('rw_deleted', snap);
    RW.store.set('rw_listings_user', (RW.store.get('rw_listings_user') || []).filter(function(x){ return String(x.id) !== String(id); }));
    RW.store.set('rw_cart', (RW.store.get('rw_cart') || []).filter(function(x){ return String(x.id) !== String(id); }));
    if (wish[id]){ delete wish[id]; RW.store.set('rw_wishlist', wish); }
    RW.store.set('rw_recent_views', (RW.store.get('rw_recent_views') || []).filter(function(x){ return String(x) !== String(id); }));
    if (ov[id]){ delete ov[id]; RW.store.set('rw_status_overrides', ov); }
    RW.store.set('rw_messages', (RW.store.get('rw_messages') || []).filter(function(m){ return String(m.listingId) !== String(id); }));
    editBuf = null; editBufFor = null; managedId = null;
    RW.toast('Listing deleted.', 'success');
    RW.router.navigate('#/manage?deleted=' + encodeURIComponent(id), { replace: true, inPage: true });
  }, { danger: true, yes: 'Delete listing' });
};
RW.actions['delete-undo'] = function(){
  var snap = RW.store.get('rw_deleted');
  if (!snap || !snap.listing || (Date.now() - (snap.at || 0)) >= 15 * 60 * 1000){
    RW.toast('The undo window has closed \u2014 that delete is permanent.', 'error');
    RW.router.navigate('#/manage', { replace: true, inPage: true });
    return;
  }
  var id = String(snap.listing.id);
  RW.store.set('rw_listings_user', (RW.store.get('rw_listings_user') || []).concat([snap.listing]));
  if (snap.cartEntry){
    var c = RW.store.get('rw_cart') || [];
    var has = false;
    for (var i = 0; i < c.length; i++){ if (String(c[i].id) === id) has = true; }
    if (!has) RW.store.set('rw_cart', c.concat([snap.cartEntry]));
  }
  if (snap.wishEntry){
    var w = RW.store.get('rw_wishlist') || {};
    if (!w[id]){ w[id] = snap.wishEntry; RW.store.set('rw_wishlist', w); }
  }
  if (snap.recent){
    var rv = RW.store.get('rw_recent_views') || [];
    if (rv.indexOf(id) < 0) RW.store.set('rw_recent_views', [id].concat(rv).slice(0, 12));
  }
  if (snap.statusOverride){
    var ovs = RW.store.get('rw_status_overrides') || {};
    ovs[id] = snap.statusOverride;
    RW.store.set('rw_status_overrides', ovs);
  }
  if (snap.messages && snap.messages.length){
    RW.store.set('rw_messages', (RW.store.get('rw_messages') || []).concat(snap.messages));
  }
  RW.store.set('rw_deleted', null);
  editBuf = null; editBufFor = null; managedId = null;
  RW.toast('Listing restored \u2014 it is back in your inventory.', 'success');
  RW.router.navigate('#/manage', { replace: true, inPage: true });
};

RW.viewsSell = { sell: sell, sellDone: sellDone, manage: manage };
RW.router.register('/sell', sell, { title: function(params, query){
  var s = query && parseInt(query.step, 10);
  return isFinite(s) && s >= 1 && s <= STEP_NAMES.length ? 'Sell — step ' + s : 'Sell';
} });
RW.router.register('/sell/done/:id', sellDone, { title: 'Listing created' });
RW.router.register('/manage', manage, { title: 'Manage listing' });

})();
