# ReVogue Build Plan v4

## 0. Brief
- Project: ReVogue, a marketplace to buy and sell lightly used clothes (worn few times). Tagline: "Worn once. Loved twice."
- Stack: plain HTML/CSS/JS only. No framework, no backend, no build step. Currency INR (₹).
- Delivery: ONE index.html shell acting as a multi-page site via hash routing, split into files (see section 0.1). Must also run when opened directly from disk (file://).
- Payments: Cash on Delivery and a UPI screen, both simulated. No real payment, shipping, SMS or email.
- Data: 56 fake listings, 12 fake sellers, seeded orders. All state in browser storage.
- Required UX: Amazon/Flipkart/Meesho-style search, autosuggest, filters, sort, price range, pagination, wishlist, cart, coupons, order tracking.
- Definition of done: every flow in section 17 passes; no console errors; usable at 360px, 768px, 1440px; "Reset demo data" restores a clean state.

## 0.1 Scope, packaging and cut list
- Packaging (decided): `index.html` + `style.css` + `data.js` + app scripts (`core.js` storage/state/utils/router, `engine.js` search/filter, `views-shop.js`, `views-buy.js`, `views-sell.js`, `views-info.js`, `app.js` init). Order in index.html is fixed; `app.js` loads last.
- Load as classic `<script src>` tags with `defer`. No ES modules, no `fetch()` for JSON/templates (both fail on file://). Data lives in `data.js` as `window.RW_DATA = {...}`. Each file starts with a section-marker comment and a header listing the globals it exports. Each file must work on its own, so a cut-off session never loses finished files.
- Build a thin end-to-end slice first (phase 3: simple Home, Shop, Product, Cart, COD checkout, Confirmation) before filters, UPI, wishlist and the sell wizard. Home is built early in simple form and polished in phase 9.
- Cut list, drop in this order if time or usage runs out: (1) Hindi toggle, (2) mega-menu, (3) quick view, (4) price histogram, (5) typo tolerance, (6) IndexedDB (use compressed data URLs in localStorage), (7) forgot-PIN OTP.

## 1. Concept
- Every item is one of a kind (quantity always 1). This drives cart, product page, sold logic, reservation.
- Trust signals for used goods: condition grade, times worn, tags attached, measurements, flaws disclosure, washed/dry-cleaned declaration, "Complete listing" badge (derived from the listing quality score, see 6.10; it does not mean the item was inspected).
- Closed loop: buyer order marks listing sold, seller sees the order in Manage Listing, buyer can rate seller after delivery.
- Sellers manage listings with Listing ID + 4-digit PIN. Buyers track orders with Order ID + mobile.

## 2. Architecture
- Shell (always present): header, category bar, footer, mobile bottom nav, toast region, modal region.
- `<main id="app">`: router swaps views in.
- Hash router: `#/route?params`. Back/forward/refresh/deep links all work.
- The URL is the single source of truth: URL -> parse + sanitise -> state -> pipeline -> render. UI controls never mutate state directly; they call `navigate(newHash, {replace})`, which updates the URL and triggers one render.
- Filter/sort/page tweaks use `replace` (history.replaceState + a direct render call) so Back is not flooded; route changes and new searches push. A `lastRenderedHash` guard makes the hashchange listener ignore changes the app made itself (no re-render loops).
- URL params are untrusted input: whitelist known keys, validate types, clamp `page`/`per`, allow `sort` only from a fixed list, drop unknown params, and escape on render (e.g. `?q=<img onerror=...>` is shown as plain text, never inserted via innerHTML).
- Skip link: `href="#main"` would trigger the router, so intercept its click in JS (preventDefault, focus `<main tabindex="-1">`).
- Router duties: guards, scroll reset (restore scroll on Back to shop), document.title per view, move focus to view heading, active nav highlight, 404 view, try/catch around each render with a friendly error view.
- Event handling: few top-level delegated listeners using `data-action` attributes.
- Cross-tab consistency: listen to the `storage` event to refresh cart counts and sold status.
- Note: hash routing is not crawlable by search engines; acceptable for an assignment.
- Images: inline SVG or data URIs by default; relative image paths only work if the images folder ships alongside index.html.

## 3. Routes
| Route | View |
|---|---|
| `#/` | Home |
| `#/shop?q&cat&sub&coll&size&price&cond&worn&tagged&disc&brand&color&occ&mat&rating&city&listed&hideSold&sort&page&per&view` | Browse |
| `#/product/RW-1001` | Product detail |
| `#/seller/S01` | Seller storefront |
| `#/wishlist` | Saved items |
| `#/cart` | Cart |
| `#/checkout` | Checkout |
| `#/pay/ORD-…` | UPI payment screen |
| `#/order/ORD-…` | Order confirmation |
| `#/track` | Track order |
| `#/sell` | Sell wizard |
| `#/sell/done/RW-…` | Listing created slip |
| `#/manage` | Manage listing (ID + PIN) |
| `#/how-it-works` `#/about` `#/faq` `#/contact` | Info |
| `#/policy/returns` `#/policy/safety` `#/policy/terms` `#/policy/privacy` | Policies |
| other | 404 |
- Guards: empty cart on checkout redirects to cart.
- `#/pay/ORD-…`: valid only if the order exists in this browser and is PAYMENT_PENDING or PAYMENT_FAILED. If it is already PLACED or later, redirect to `#/order/ORD-…`. Unknown ID shows an "Order not found" view with a Track link (no silent redirect).
- `#/order/ORD-…`: valid for any existing order that is not PAYMENT_PENDING, so refreshing a completed COD confirmation works. PAYMENT_PENDING redirects to `#/pay/ORD-…`. Unknown ID shows "Order not found".
- `#/seller/S..` and `#/product/RW-..`: unknown ID shows not-found. Seller IDs S13+ are user-created sellers.

## 4. Access model (ID + PIN, Order ID + mobile)
- Seller: on listing creation generate Listing ID (RW-2001+) and 4-digit PIN. Store PIN as salted hash (crypto.subtle SHA-256, fallback simple hash). Show plain PIN once on the slip.
- Manage access: Listing ID + PIN. 3 wrong attempts triggers a 30s lockout with visible countdown; lockout persists across refresh.
- PIN recovery (cut #7): "Forgot PIN" asks Listing ID + seller mobile; if matched, show a simulated OTP on screen (e.g. "Demo OTP: 4821"), then set a new PIN.
- Buyer: Order ID + mobile (last 4 digits enough) to track, cancel, rate, request return.
- Seller phone is never shown publicly. "Message seller" form on product page stores a message; seller reads it in Manage Listing.
- Escape all user-entered text and all URL params before rendering. Validate every field. Never store real payment data.

## 5. Global UI
- Announcement strip: free delivery above ₹999.
- Header (sticky): logo, large search with autosuggest, Sell button, Wishlist (count), Cart (count), Track Order.
- Category bar: Women, Men, Kids, Accessories (category tree) plus Collections: Ethnic, Party Wear, Winter, Wedding, Office. Mega-menu on hover with sub-categories (cut #2; fallback: simple dropdown or link to shop).
- Collections are tag/occasion-driven views of the same catalog, not separate categories.
- Mobile: hamburger drawer; bottom nav Home, Shop, Sell (centre, highlighted), Wishlist, Cart.
- Footer: link columns (Buy, Sell, Help, Company), newsletter box (fake), payment icons (COD, UPI), "Reset demo data" link.
- Shared: toasts (ARIA live), confirm modal, generic modal (size guide, quick view), breadcrumbs, back-to-top, skeleton loaders, empty states, star rating, relative time ("listed 2 days ago").

## 6. Views

### 6.1 Home
Build a simple version in phase 3 (hero, category tiles, budget strip, Just Listed); items 4-12 and polish in phase 9.
1. Hero carousel (3 slides, autoplay, pause on hover, dots, arrows, swipe).
2. Category tiles. 3. Budget strip: Under ₹500, ₹500-1,000, ₹1,000-2,000, ₹2,000-5,000 (links to filtered shop).
4. Just Listed carousel. 5. Shop by occasion: Wedding, Party, Festive, Office, Casual, Winter.
6. Top brands. 7. Trending (most wishlisted). 8. How it works (3 steps buy, 3 steps sell).
9. Impact counters (fake, animated on scroll). 10. Testimonials (6). 11. Sell CTA band. 12. Recently viewed (if any).

### 6.2 Shop
- Layout: breadcrumb, title + result count, sticky sort bar, filter sidebar + grid, pagination.
- Sort: Relevance, Newest, Price low-high, Price high-low, Biggest discount, Popularity (wishlist count), Least worn.
- Filters (collapsible groups, live facet counts, OR within group, AND across groups):
  - Category tree (nested), Collection
  - Price: dual-handle slider + editable min/max + quick bands + optional mini histogram (cut #4)
  - Size chips: derived from the data of the selected category/sub-category, never a fixed list, so no chip is ever empty. Numeric sizes carry a `sizeType` (Shirts = collar, Ethnic/Formal/Outerwear = chest, Bottoms/Belts = waist) and are labelled "Waist 32", "Chest 40", "Collar 40". Letters (S-XL), Free and kids age bands show only where present. With no category selected, show letters, Free and age bands only.
  - Condition (Like New, Excellent, Good)
  - Times worn (Never worn, Once, 2-3, 4-6)
  - Tags attached (toggle, URL param `tagged`)
  - Discount (70+, 60+, 50+, 40+ %), based on the rounded `discountPct`, the same value shown in the badge
  - Brand (searchable, show more), Color (swatches), Occasion, Material
  - (No separate gender filter: gender/age comes from the category tree, Women / Men / Kids > Boys, Girls.)
  - Seller rating (4.5+, 4+), Seller city, Listed within (24h, 7d, 30d)
  - Availability: hide sold (default on)
- Active filter chips (removable) + Clear all. Filter state in URL.
- Pagination: 12/page default, per-page 12/24/48. Grid/List toggle.
- Empty result: show removable-filter suggestions + "You might also like".
- Mobile: full-screen filter sheet (left group list, right options) with sticky "Show N items"; sort as bottom sheet.
- Product card: main image (swap to second on hover), heart, discount badge, condition chip, "Worn N×" ("Never worn" if 0), "Tags attached", brand, title (1 line), size, price + struck MRP, free-delivery line if price ≥ ₹999, "Just listed" ribbon (<3 days), "Only 1 available". Sold items greyed with SOLD overlay (visible when hide-sold is off). Optional quick view modal (cut #3).

### 6.3 Search
- Autosuggest grouped: Products, Categories, Brands, matched text highlighted. Recent searches on empty focus. Debounce 200ms.
- Normalisation (applied to both query and indexed text): lowercase, strip diacritics, remove apostrophes (' and ’) so "Levi's" = "levis", `&` -> "and", hyphens/dots/spaces both split and joined so "t-shirt" = "t shirt" = "tshirt", light plural stemming (s, es, ies->y) so "jean" = "Jeans". Brand aliases: "m&s" / "mns" = Marks & Spencer, "us polo" = U.S. Polo Assn.
- Prefix matching: the last typed token matches by prefix (min 2 chars), so "kur" suggests Kurta. Earlier tokens match whole words (after stemming).
- Ranking: title > brand > category > keywords > description; all typed words must match (AND).
- Synonyms: kurti=kurta, tee=t-shirt, frock=dress, sari=saree, coat=jacket/overcoat, lehnga=lehenga, jeans=denim, tux=tuxedo.
- Light typo tolerance (cut #5): edit distance 1 on stemmed words of 4+ chars, first letter must match. No-result state with popular searches.
- Submit goes to `#/shop?q=…`; filters stack on top.

### 6.4 Product detail
- Gallery: thumbs, hover/click zoom, swipe on mobile.
- Info: breadcrumb, brand, title, price block (price, MRP, % off, "You save ₹X"), condition meter, worn count, tags attached, size + size-guide modal, measurements table (fields by category), flaws line, washed declaration, "Complete listing" badge.
- Actions: Add to Cart, Buy Now, wishlist heart, Share, Report listing.
- Share: use the Web Share API when available over http(s); otherwise copy `location.href`. When opened from disk (`file:`), copy "RW-1001 - title" instead and toast "Links work only when hosted".
- Report listing: modal with reason (Counterfeit, Prohibited item, Wrong info, Spam, Other) + optional note; saved to `rw_reports` (once per listing per browser); toast with a report ID. No automatic takedown. If in cart show "Go to Cart". If sold show disabled "Sold" + "See similar".
- Delivery checker by pincode (estimate date or "Not serviceable"). Offers box with coupon codes. Payment options line.
- Below: description, detail table (material, fit, color, occasion, care, reason for selling), seller card (name, city, rating, items sold, member since, link to storefront), Message seller form, More from seller, Similar items, Recently viewed.
- Mobile: sticky bottom bar with Add to Cart + Buy Now.
- Views counter: seeded base + increments per unique visit.

### 6.5 Cart
- Rows: image, title, size, price, seller, Remove, Move to wishlist. No quantity stepper (each item unique); note "Each item is one of a kind".
- Price summary: Price (N items), Discount (MRP minus price), Delivery (free ≥ ₹999 else ₹49), Platform fee ₹5, Coupon discount, Total, "You will save ₹X".
- Order of calculation: subtotal = sum of item prices. Free-delivery check and coupon minimums use the subtotal BEFORE the coupon discount (a coupon never removes free delivery). Total = subtotal - coupon discount + delivery + platform fee (+ COD fee at checkout).
- Multi-seller carts: one delivery fee and one platform fee per order; ETA = the slowest item.
- Coupons: REVOGUE10 (10% up to ₹150, min ₹799), FIRST100 (₹100 off, min ₹699), FREESHIP (free delivery). Invalid/ineligible shows reason. One coupon at a time.
  - FREESHIP is valid only when delivery would otherwise cost ₹49 (subtotal < ₹999); at ₹999+ show "Free delivery already applies".
  - FIRST100 "first order" = no user-created order (seeded orders ignored) on this browser/mobile that is not CANCELLED or PAYMENT_FAILED. Re-check at checkout once the mobile is known.
- Availability re-check on load and on checkout: sold items flagged "No longer available" and block checkout until removed.
- Max 10 items; duplicates blocked. Empty state with CTA.

### 6.6 Checkout
Single page, collapsible steps (completed steps show summary + Change):
1. Contact: name, mobile (10 digits, starts 6-9), email.
2. Address: house, area, pincode (6 digits; auto-fill city/state from lookup), city, state, Home/Work tag.
3. Review: items, totals, link back to cart.
4. Payment: COD (₹25 handling fee, "Pay ₹X to delivery partner") or UPI (enter UPI ID name@bank with fake Verify; or scan QR placeholder; or pick app button: Google Pay, PhonePe, Paytm, Other).
5. Place Order.
- Soft reservation: starting checkout holds items for 10 minutes with a visible timer; on expiry release hold and return to cart. Holds are stored as `expiresAt` timestamps and expiry is computed on read (route change, cart load, storage event); the on-screen timer only displays the remaining time and never owns the state. COD placement converts the hold to sold; placing a UPI order replaces the hold with the 5-minute UPI window (expiresAt = placement time + 5 min). If another order takes an item, show "This item was just sold" and return to cart.
- Inline validation, focus first error, nothing submits until valid.

### 6.7 UPI payment screen
- Shows amount, order ID, 5-minute countdown, waiting animation, QR panel or "approve the request in your UPI app".
- Demo controls (clearly labelled): Simulate success, Simulate failure. Optional auto-success after N seconds.
- Success: green tick then confirmation. Failure/timeout: "Payment failed" with Retry UPI, Switch to COD, Back to cart. Order stays PAYMENT_PENDING until resolved; items stay reserved until the UPI window's `expiresAt` passes (computed on read).

### 6.8 Order confirmation
- Order ID, payment method + status, address, expected delivery, items, totals. Buttons: Track, Continue shopping, Print invoice (print stylesheet). Tip to save Order ID.

### 6.9 Track order
- Input Order ID + mobile last 4. Timeline: Placed, Confirmed, Packed, Shipped, Out for delivery, Delivered, with timestamps.
- User orders: status derived from createdAt and stage offsets, no live timers needed; "Demo speed" toggle compresses a stage to 30s. Seeded orders: store an explicit `pinnedStatus` and a fixed timeline (offsets from first load, like listedAgoHours) so they never drift; the Cancelled seed cannot be derived at all.
- Cancel allowed before Shipped (item returns to available).
- After Delivered: Rate seller (1-5 + comment, once per order; updates seller average) and Request return (within 3 days, reason "not as described"; status RETURN_REQUESTED then RETURN_APPROVED; item becomes available again).
- Help text lists 6 seeded sample orders to try.

### 6.10 Sell wizard (7 steps, progress bar, per-step validation, draft autosave)
1. Basics: title, category > sub-category (cascading; Kids > Boys/Girls sets gender/age), brand (search or custom).
2. Details: size, color, material, fit, occasion, measurements (fields vary by category).
3. Condition: grade with plain-English descriptions, times worn (0-6), tags attached, flaws, washed/dry-cleaned (required), reason for selling.
4. Photos: 1-3 images, drag-drop, thumbnails, reorder, delete, choose cover. Compress in browser (max 800px, quality ~0.6-0.7); stored as data URLs in localStorage (IndexedDB only if time allows, cut #6); on quota error show a message and suggest fewer/smaller photos. Tips box.
5. Price: MRP, asking price, smart suggestion, live discount %, earnings calculator (8% fee).
6. Seller info: name, mobile, optional email, city, pincode, pickup notes, terms checkbox. A new seller record (S13+) is created on submit; the same mobile reuses its existing user seller record. New sellers show "New seller" instead of a rating until rated.
7. Review: preview as card + product page, listing quality score, submit. Score 0-100: photos 3 = 30 (2 = 20, 1 = 10), measurements filled 25, flaws line filled 15, description ≥ 80 chars 15, washed declaration 15. "Complete listing" badge = score ≥ 80, for seeds and user listings alike (seeds are authored so ~70% qualify).
- Prohibited items warning on top: innerwear, swimwear, damaged items, counterfeits.
- Condition vs worn consistency: Like New ≤ 2 wears, Excellent ≤ 3, Good 3-6; wears above 6 are not accepted. Condition options that conflict with the entered wear count are disabled. Tags attached forces wears = 0 and Like New.
- Price suggestion: base share of MRP by grade (Like New 30-65%, Excellent 25-60%, Good 20-55%, calibrated to cover all seeded prices); minus ~3% per wear beyond 2 (capped); plus ~5% if tags attached. Show range + gauge. Warn above ~70% of MRP. Block price above MRP; minimum ₹99.

### 6.11 Listing created
- Success animation; Listing ID + PIN with Copy buttons; Print slip; warning that PIN is only recoverable via mobile OTP simulation.
- Buttons: View listing, Sell another. Listing appears in Shop immediately with "Just listed" ribbon, under its new seller record (storefront `#/seller/S13+` works).

### 6.12 Manage listing
- Gate: ID + PIN (lockout rules in section 4) + Forgot PIN.
- Panels: summary (views, wishlist count, status), Edit (all wizard fields, replace photos), Quick price drop (-10%, -20%, custom), Mark sold elsewhere / Reactivate, Delete (confirm), Messages (from Message seller form), Orders received banner (buyer first name, city, handover-by date).

### 6.13 Wishlist
- Grid, Move to cart, "Price dropped" badge (compare to price when saved), Sold notice + Find similar.

### 6.14 Seller storefront
- Name, city, rating, member since, items sold, grid of available items.

### 6.15 Info pages
- How it works (Buying/Selling tabs), About (fast-fashion problem, mission, fake impact stats), FAQ (15 Q accordion + search), Contact (form returns ticket ID), Policies (returns: 3 days "not as described" only, hygiene items non-returnable; safety + prohibited items; terms; privacy, clearly a student project), 404.

## 7. Data schema
- Product: id, title, brand, category, sub, size, sizeType (letter|waist|chest|collar|age|free, derived from sub-category), color, colorHex, material, fit, occasion[], condition, timesWorn (0-6), tagsAttached, mrp, price, discountPct (computed, Math.round((mrp-price)/mrp*100), used for badge and filter), listingScore (computed),  measurements{}, flaws, reasonForSelling, description, images[], sellerId, city, listedAgoHours (seed; converted to listedAt at first load so "Just listed" always works), status (available|reserved|sold), viewsBase, wishlistBase, keywords[] (search keywords; not the same as tagsAttached or the URL param `tagged`), pinHash+salt (user listings only).
- Seller: id, name, city, rating, ratingCount, itemsSold, memberSinceYear, avatarColor, mobile (hidden). Seeds S01-S12; user-created S13+.
- Order: orderId, items[] (snapshot of title/price/image/seller), buyer{name,mobile,email,address}, payment{method,status,upiId?}, totals{}, coupon, createdAt, status, timeline[], seeded (bool), pinnedStatus? + pinnedTimeline? (seeded orders only), rating?, returnRequest?.
- Message: id, listingId, fromName, contact, text, createdAt.
- Storage keys: rw_version, rw_listings_user, rw_status_overrides, rw_cart, rw_wishlist (with price at save), rw_orders, rw_sellers_user, rw_reports, rw_messages, rw_recent_views, rw_recent_searches, rw_sell_draft, rw_coupon, rw_lockout, rw_hold (items + expiresAt).
- Base data lives in code; user listings and overrides merge on top at start. Schema version key with a migration/reset path.
- Storage wrapper: try/catch, JSON safe, in-memory fallback if blocked/full, friendly message.
- Photos for user listings: compressed data URLs in localStorage (max 3 per listing). IndexedDB is optional (cut #6). Generate 300px thumbnails for cards.

## 8. Sellers
S01 Priya Sharma, Pune | S02 Rohan Mehta, Mumbai | S03 Ananya Krishnan, Bengaluru | S04 Aditya Patil, Pune | S05 Sneha Reddy, Hyderabad | S06 Karan Thakur, Delhi | S07 Meera Joshi, Ahmedabad | S08 Vikram Desai, Mumbai | S09 Isha Banerjee, Kolkata | S10 Arjun Nair, Chennai | S11 Neha Gupta, Jaipur | S12 Rahul Verma, Lucknow
- Vary ratings 3.8-4.9, items sold 2-40, member since 2022-2025.

## 9. Products (56)
Format: ID|Title|Brand|Cat>Sub|Size|Cond|Worn|Tagged|MRP|Price|Color|Material|Occasion|Seller
Cond: LN Like New, EX Excellent, GD Good. Tagged: Y = original tags attached (always Worn = 0). Gender/age is derived from Cat>Sub (no Gender column; 1023 and 1042 are unisex items filed under Women and Men). sizeType is derived from Sub (see 6.2).
Sold at start: 1018, 1022, 1033, 1038, 1049.
Generate per item: 3 image variants, measurements (by category), flaws line (mostly "None", few minor), reason for selling, 2-3 sentence description, listedAgoHours (spread 2h to 60 days), views, wishlist count (spread so Trending is meaningful). Cities from seller. "Complete listing" badge (score ≥ 80) on ~70% of items, computed from the generated fields, not hand-set.

1001|Floral Wrap Dress|Zara|Women>Dresses|M|LN|1|N|3200|1100|Multi|Viscose|Casual,Brunch|S01
1002|Satin Slip Midi Dress|H&M|Women>Dresses|S|LN|1|N|2499|1250|Champagne|Satin|Party,Date|S03
1003|Black Bodycon Party Dress|Vero Moda|Women>Dresses|M|EX|2|N|2799|900|Black|Polyester|Party|S05
1004|Mustard Tiered Maxi Dress|Mango|Women>Dresses|L|EX|2|N|4290|1500|Mustard|Cotton|Casual,Vacation|S09
1005|Maroon Cocktail Gown|AND|Women>Dresses|M|LN|1|N|12000|4500|Maroon|Crepe|Party,Wedding|S11
1006|Sequin Party Top|Forever 21|Women>Tops|S|LN|1|N|2800|900|Silver|Sequin|Party|S03
1007|White Linen Shirt|Marks & Spencer|Women>Tops|M|EX|2|N|3200|1900|White|Linen|Office,Casual|S01
1008|Off-Shoulder Ruffle Top|Only|Women>Tops|S|LN|0|Y|1499|900|Peach|Polyester|Casual,Date|S05
1009|Printed Peplum Top|Global Desi|Women>Tops|L|GD|4|N|1699|450|Blue|Cotton|Casual,Office|S07
1010|Cotton Printed Kurta Set|Biba|Women>Kurtas & Sets|M|EX|3|N|3999|2200|Teal|Cotton|Casual,Festive|S07
1011|Chikankari Straight Kurta|Fabindia|Women>Kurtas & Sets|L|LN|1|N|2990|1800|White|Cotton|Festive,Casual|S11
1012|Silk Anarkali Set|Libas|Women>Kurtas & Sets|S|EX|2|N|8500|3200|Emerald|Silk|Wedding,Festive|S09
1013|Indigo Block-Print Kurta|Fabindia|Women>Kurtas & Sets|M|GD|5|N|1990|600|Indigo|Cotton|Casual|S01
1014|Red Banarasi Silk Saree|Boutique|Women>Sarees|Free|EX|1|N|14000|5500|Red|Silk|Wedding,Festive|S11
1015|Pastel Chanderi Saree|Fabindia|Women>Sarees|Free|LN|1|N|5500|3200|Pastel Green|Chanderi|Festive,Puja|S03
1016|Georgette Saree Sequin Border|Soch|Women>Sarees|Free|LN|1|N|6800|2400|Wine|Georgette|Party,Wedding|S05
1017|Cotton Handloom Saree|Handloom Co.|Women>Sarees|Free|GD|6|N|3200|900|Rust|Cotton|Casual,Office|S07
1018|Teal Bridal-Guest Lehenga|Mohey|Women>Lehengas & Sharara|M|LN|0|Y|22000|8500|Teal|Net|Wedding|S09
1019|Pink Sharara Set|Indya|Women>Lehengas & Sharara|S|EX|2|N|6990|2600|Pink|Georgette|Festive,Wedding|S01
1020|High-Rise Mom Jeans|Levi's|Women>Bottoms|28|EX|3|N|4299|1500|Blue|Denim|Casual|S03
1021|Pleated Wide-Leg Trousers|Zara|Women>Bottoms|M|LN|2|N|3590|2000|Beige|Polyester|Office,Casual|S05
1022|Black Tailored Blazer|Zara|Women>Jackets|M|LN|1|N|6000|2400|Black|Poly Blend|Office,Party|S11
1023|Denim Jacket|Levi's|Women>Jackets|L|GD|4|N|5500|2000|Blue|Denim|Casual,Winter|S07
1024|Faux-Leather Biker Jacket|H&M|Women>Jackets|S|EX|2|N|4999|1800|Black|Faux Leather|Casual,Winter|S09
1025|Sky-Blue Linen Shirt|Allen Solly|Men>Shirts|L|LN|2|N|2200|1300|Sky Blue|Linen|Casual,Office|S02
1026|Formal White Shirt|Van Heusen|Men>Shirts|40|LN|0|Y|1899|1200|White|Cotton|Office|S04
1027|Checked Casual Shirt|U.S. Polo Assn.|Men>Shirts|M|EX|3|N|2499|750|Red Check|Cotton|Casual|S06
1028|Oxford Button-Down Shirt|Tommy Hilfiger|Men>Shirts|L|EX|2|N|5999|2000|Light Blue|Cotton|Office,Casual|S08
1029|Graphic Tee|H&M|Men>T-shirts|M|GD|4|N|799|200|Black|Cotton|Casual|S10
1030|Polo T-shirt|Puma|Men>T-shirts|L|EX|3|N|1999|600|Navy|Cotton Blend|Casual,Sports|S12
1031|Dri-Fit Training Tee|Nike|Men>T-shirts|M|GD|5|N|1795|450|Grey|Polyester|Sports|S02
1032|Cream Wedding Sherwani|Manyavar|Men>Ethnic|40|EX|1|N|18000|6500|Cream|Brocade|Wedding|S04
1033|Maroon Silk Kurta-Pyjama Set|Manyavar|Men>Ethnic|L|LN|1|N|5500|2000|Maroon|Silk|Festive,Wedding|S06
1034|Navy Nehru Jacket|Raymond|Men>Ethnic|42|LN|1|N|4500|2800|Navy|Wool Blend|Wedding,Festive|S08
1035|Slim-Fit Jeans Dark Wash|Levi's|Men>Bottoms|32|GD|5|N|3999|1100|Dark Blue|Denim|Casual|S10
1036|Khaki Chinos|Peter England|Men>Bottoms|32|GD|5|N|2500|700|Khaki|Cotton|Casual,Office|S12
1037|Charcoal Formal Trousers|Raymond|Men>Bottoms|34|EX|2|N|2999|1000|Charcoal|Poly Viscose|Office|S02
1038|Navy Two-Piece Suit|Raymond|Men>Formal|40|EX|2|N|14999|5500|Navy|Wool Blend|Office,Wedding|S04
1039|Black Tuxedo Jacket|Van Heusen|Men>Formal|40|LN|1|N|9999|3800|Black|Wool Blend|Party,Wedding|S06
1040|Beige Casual Blazer|Marks & Spencer|Men>Formal|L|EX|2|N|7999|4500|Beige|Linen Blend|Office,Casual|S08
1041|Charcoal Wool Overcoat|Zara|Men>Outerwear|XL|EX|3|N|9000|5200|Charcoal|Wool|Winter,Office|S10
1042|Grey Zip Hoodie|Adidas|Men>Outerwear|L|GD|5|N|3999|1200|Grey|Fleece|Casual,Winter,Sports|S12
1043|Olive Puffer Jacket|The North Face|Men>Outerwear|M|EX|2|N|9999|3800|Olive|Nylon|Winter|S02
1044|Bomber Jacket|Roadster|Men>Outerwear|L|GD|4|N|2999|800|Black|Nylon|Casual,Winter|S04
1045|Kids Kurta Set|Fabindia|Kids>Boys|6-7 yrs|LN|1|N|1800|1000|Mustard|Cotton|Festive|S07
1046|Girls Pink Party Frock|Mothercare|Kids>Girls|4-5 yrs|LN|0|Y|2200|1300|Pink|Net|Party,Birthday|S01
1047|Boys Sherwani Set|Manyavar|Kids>Boys|8-9 yrs|EX|1|N|4500|1500|Ivory|Brocade|Wedding|S08
1048|Denim Dungaree|H&M|Kids>Girls|3-4 yrs|EX|2|N|1499|400|Blue|Denim|Casual|S05
1049|Girls Lehenga Choli|Biba|Kids>Girls|7-8 yrs|LN|0|Y|3499|1100|Orange|Silk Blend|Festive,Wedding|S03
1050|Kids Winter Jacket|Marks & Spencer|Kids>Boys|5-6 yrs|EX|2|N|3299|1000|Red|Nylon|Winter|S10
1051|Pashmina Stole|Fabindia|Accessories>Stoles & Scarves|Free|LN|0|Y|3500|2200|Beige|Pashmina|Winter,Festive|S09
1052|Tan Leather Belt|Tommy Hilfiger|Accessories>Belts|34|GD|4|N|2499|1400|Tan|Leather|Office,Casual|S06
1053|Silk Tie Set (3)|Raymond|Accessories>Ties|Free|LN|1|N|2200|1100|Assorted|Silk|Office,Wedding|S12
1054|Gold Embroidered Clutch|Zara|Accessories>Bags|Free|LN|0|Y|2990|1500|Gold|Fabric|Party,Wedding|S11
1055|Woollen Muffler|Allen Solly|Accessories>Stoles & Scarves|Free|EX|2|N|1299|700|Grey|Wool|Winter|S02
1056|Bandhani Dupatta|Fabindia|Accessories>Dupattas|Free|LN|0|Y|2200|1400|Multi|Silk|Festive|S07

Coverage goals: prices ₹200-8,500 (all price bands non-empty); discounts 36-75% rounded (all discount filters 40+/50+/60+/70+ non-empty); ~30 brands; 12+ colors; sizes cover letters (S-XL), waist, chest, collar, kids age bands, free (no XS/XXL); worn 0-6 (0 only for tagged items); 8 tags-attached; 5 sold.

## 10. Other seed data
- 6 seeded orders (the only count used everywhere): Placed, Confirmed/Packed, Shipped, Out for delivery, Delivered, Cancelled, each with mobile for tracking and an explicit pinned status/timeline. Seeded orders are excluded from the FIRST100 first-order check.
- 6 testimonials, 15 FAQs, pincode prefix map (first 3 digits -> city/state: 411 Pune, 400 Mumbai, 560 Bengaluru, 500 Hyderabad, 110 Delhi, 380 Ahmedabad, 700 Kolkata, 600 Chennai, 302 Jaipur, 226 Lucknow) with a regional fallback by first digit for anything unmapped (city/state left editable, "others" ETA); pincodes starting with 9 are "not serviceable", 3 hero banners.
- Images tiers: (A) inline SVG garment silhouettes tinted by colorHex as guaranteed fallback; (B) one local photo per product, extra angles via CSS crop. Avoid hotlinking. Lazy-load, fixed aspect ratio, alt text.

## 11. Business rules
| Rule | Value |
|---|---|
| Quantity per listing | 1 |
| Delivery | Free ≥ ₹999 else ₹49 |
| Platform fee | ₹5/order |
| COD handling | ₹25 |
| Seller fee (display only) | 8% |
| Cart max | 10 items |
| Listing price | min ₹99, max = MRP |
| Photos | 1-3 |
| Returns | 3 days after delivery, "not as described" only; hygiene items excluded |
| PIN attempts | 3, then 30s lock |
| Checkout hold | 10 min |
| UPI window | 5 min (placing a UPI order replaces the hold with this window) |
| Expiry | computed on read from `expiresAt`, not from timers |
| Multi-seller cart | 1 delivery fee, 1 platform fee, ETA = slowest item |
| Condition vs wears | Like New ≤ 2, Excellent ≤ 3, Good 3-6, max 6 |
| Delivery ETA | 2-4 days metro, 4-7 days others |
- Order side effects: COD placed or UPI success marks items sold and notifies seller; cancel/return approved restores availability; UPI pending keeps items reserved until timeout.
- Order status machine: PAYMENT_PENDING -> PLACED -> CONFIRMED -> PACKED -> SHIPPED -> OUT_FOR_DELIVERY -> DELIVERED; branches: PAYMENT_FAILED, CANCELLED (before SHIPPED), RETURN_REQUESTED -> RETURN_APPROVED.

## 12. Engines
Search/filter pipeline on every route or filter change:
0. Parse + sanitise URL params into state (URL is the source of truth).
1. Base products merged with user listings and overrides.
2. Text search (tokenize, synonyms, typo tolerance, score, drop zero).
3. Apply filters (OR in group, AND across).
4. Facet counts per option, ignoring that option's own group.
5. Stable sort, ties by newest.
6. Paginate.
7. Render grid, chips, result count, facets.
(No "write state to URL" step: controls navigate to a new URL, see section 2.)
- Price bounds clamp to real data range. Slider and inputs stay in sync.
- Number formatting via Intl.NumberFormat('en-IN') for ₹ lakh grouping.

## 13. Design system
- Mood: fresh, earthy, editorial thrift-boutique with marketplace usability.
- Colors: primary forest green #1F4D3A; accent terracotta #C8553D; highlight mustard #E5A93C; bg cream #FAF6EF; surface #FFFFFF; ink #1E1E1E; muted #6B6B6B; success #2E7D32; error #C62828. Condition chips: Like New green, Excellent teal, Good amber.
- Type: serif headings (DM Serif Display or Playfair Display), sans body (Inter or Poppins), system fallbacks.
- Tokens as CSS variables: spacing 4/8/12/16/24/32/48, radius scale, soft layered shadows, button set (primary, secondary, ghost, danger), inline SVG icons.
- Motion: card hover lift, heart pop, toast slide, route fade; respect prefers-reduced-motion.
- Breakpoints: ≤480: 2 cols, filter sheet; 481-768: 3 cols, filter sheet; 769-1099: filter sidebar + 3 cols (laptop); ≥1100: sidebar + 4 cols. Check at 360, 768, 1024, 1440.
- Accessibility: contrast, visible focus rings, labelled inputs, keyboard-usable gallery/filters/modals, ARIA live for toasts and result counts, focus trap in modals.
- Print stylesheet for invoice and listing slip. Dark mode optional via CSS variables.

## 14. Code structure (across the script files in 0.1)
1. Config: fees, thresholds, coupons, category tree, synonyms, collections.
2. Data: products, sellers, seed orders, pincodes, FAQs, testimonials.
3. Storage wrapper (+ optional IndexedDB image store, cut #6).
4. State store with subscribe (header counts update automatically); storage-event sync.
5. Utilities: currency, dates/relative time, ID generators, debounce, escapeHTML, image compressor, hash.
6. Validators: mobile, pincode, email, UPI ID, price, required.
7. Router.
8. Search/filter engine.
9. Views (one function per route).
10. Shared components: card, price block, rating, badges, toast, modal, skeleton.
11. Delegated events.
12. Init: load storage, migrate, merge data, start router.

## 15. Performance and robustness
- 56 items render without virtualization; paginate anyway. Lazy-load images; fixed aspect ratios.
- No external dependencies except optional fonts with fallbacks. Works offline.
- Error boundary per view; storage failure fallback; schema migration.

## 16. Build phases and acceptance criteria
1. Foundation: tokens, shell, router (URL as source of truth, guards) with placeholder views, storage/state. AC: navigation, Back, refresh work from file://.
2. Data: all 56 products, sellers, categories, image strategy. AC: all records valid, no missing fields.
3. Thin end-to-end slice: simple Home, basic Shop (card, grid, sort, pagination, category), basic Product page, Cart, COD checkout, Confirmation. AC: buy one item with COD from Home to confirmation.
4. Browse complete: all filters, chips, facets, URL state, mobile sheet. AC: any filter combo gives correct counts and survives refresh.
5. Search: normalisation, prefix, autosuggest, ranking, synonyms, recent searches. AC: "kurti", "levis jean", "Levi's Jeans", "kur", "tshirt", "m&s", "saree", "tux" return sensible results.
6. Product page complete: gallery, size guide, delivery checker, similar items, message seller, share, report. AC: every deep link loads; unknown ID shows not-found.
7. Buying complete: wishlist, coupons, hold timer, UPI screen, tracking, rating, return. AC: full purchase with both methods; UPI fail/retry/switch to COD works.
8. Selling: wizard, photos, price suggestion, ID + PIN, user sellers, manage, forgot PIN, order-to-seller loop. AC: new listing visible in shop; buying it shows banner to seller.
9. Content: Home polish, info, policies, 404. AC: no dead links.
10. Polish: responsive, empty/loading/error states, animation, accessibility, print. AC: 360/768/1024/1440 checked.
11. Test and rehearse: run section 17 and 18.
- Priority if short on time: phases 1-8 fully; Home and info pages lighter; apply the cut list (0.1) in order; skip stretch.

## 17. Test checklist
- Flows: browse > filter > product > cart > checkout (COD) > confirmation > track. Same with UPI: success, failure, timeout, retry, switch to COD. Sell > ID/PIN > visible in shop > manage > edit > price drop > delete. Buy user listing > seller sees order. Rate seller. Return request. Cancel order.
- Edges: duplicate add; item sold while in cart; hold expiry; two tabs buying same item; wrong PIN x3 + refresh during lockout; forgot PIN flow; wizard draft restore; empty cart/wishlist/search/filter results; invalid mobile/pincode/email/UPI ID; very long text; `<script>` in user text; non-image upload; 4th photo; `?q=<img src=x onerror=alert(1)>` in the URL; "levis jean" / "Levi's Jeans"; refresh on a completed COD confirmation; FREESHIP at ₹999+; FIRST100 with seeded orders present; user listing under a new S13+ seller; storage blocked/full; deep link in fresh tab; unknown product ID; Back/Forward after checkout; opened from disk.
- Devices: Chrome, Edge, Firefox; phone-width window; keyboard-only.

## 18. Demo script
1. Home: hero, budget strip, just listed. 2. Search "kurti": autosuggest + synonyms. 3. Shop: category + size + price slider + worn once + 40%+ discount; chips, live counts, URL; refresh persists. 4. Product: condition meter, measurements, delivery check. 5. Add to cart, apply REVOGUE10, checkout, pay UPI, fail once, retry, succeed. 6. Track with Demo speed. 7. Sell wizard (suggestion, earnings) > get ID + PIN. 8. New listing in shop > buy it > Manage with ID + PIN > order banner. 9. Reset demo data.

## 19. Report and deliverables
- Deliverables: index.html + style.css + data.js + app scripts (+ assets), README (how to run, features, reset demo), report, screenshots, demo script.
- Report points: why single-page hash routing; ID + PIN and Order ID access design with trade-offs (convenience vs recovery/security, mitigations: hashing, lockout, OTP simulation); unique-inventory logic (hold, sold, race handling); trust design for used goods; sustainability angle; limitations (browser-only data, no real payments/shipping/messaging, listings not shared across devices); future work (backend + database, real OTP, payment gateway, seller verification, image moderation, chat/offers, reviews).

## 20. Risks
| Risk | Mitigation |
|---|---|
| Photos overflow storage | Compress, max 3 photos, data URLs in localStorage, quota-error message |
| One file grows unwieldy or a session is cut off | Already split into files (0.1); each built and fixed independently |
| Filter logic bugs | Central pipeline, test matrix, facet-count checks |
| Image sourcing time | SVG silhouette fallback first |
| Scope creep | Phase priority rule; stretch only after phase 7 |
| Hash-route edge cases | Guards, 404, per-view error boundary |

## 21. Stretch
Make an offer with simulated counter; compare up to 3 items; dark mode; "complete the look"; WhatsApp share links; PWA manifest; English/Hindi toggle for static text (first item on the cut list).
