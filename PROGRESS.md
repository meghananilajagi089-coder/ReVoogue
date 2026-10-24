# Progress

## Done
- Read PLAN.md §0-§5, §7-§11, §13; created AGENTS.md with the 8 session rules.
- Phase 1 (foundation): index.html shell (announce, sticky header, search, Sell/Wishlist/Track, category+collection bar, hamburger drawer, bottom nav, footer w/ newsletter + Reset demo data, #app, toast + modal regions, script tags in fixed order).
- style.css: §13 tokens as CSS vars, system fonts, buttons/inputs/chips/badges/toast/modal/skeleton, 480/768/1100 breakpoints, reduced-motion, focus rings, print block.
- core.js: util (esc, fmtINR en-IN, relTime, debounce, clamp, IDs, crypto.subtle hash + simpleHash fallback), safe storage w/ in-memory fallback, store+subscribe+storage-event sync, hash router (guards, lastRenderedHash, scroll, title, focus h1, 404, try/catch error view), toast, modal focus-trap, confirm, delegated data-action framework, skip-link, reset demo.
- Phase 2 (data): data.js stores §9 as 56 pipe rows + deterministic generator (sizeType, colorHex, fit, 3 image keys, measurements, flaws ~6 minor, reasons, descriptions incl. short ones, listedAgoHours 2h-60d, views/wishlist, keywords, city, sold set, discountPct, listingScore §6.10 ~70% ≥80). Plus config, category tree, collections, synonyms, brandAliases, S01-S12, 6 seeded orders (pinned), 6 testimonials, 15 FAQs, pincodes, 3 banners.
- engine.js: catalog merge, normalize/tokenize/synonyms, pipeline (sanitize/filters/sort/paginate), RW.ui.img SVG silhouettes (14 shapes, 3 variants, user data URL override).
- Placeholder views for all 18 routes; guards: checkout (empty cart→cart), pay/order status redirects + not-found.
- dev/validate.js: 14 checks, ALL PASS.

## Known bugs / next
- Cart/checkout/sell wizard are still guarded placeholders (next phases 3+). Add-to-cart/Buy Now show a toast until RW.ui.addToCart exists.
- No live browser check; engine/search/facets verified in node (44 assertions). "tshirt" search fixed via joined-token index; stem now strips plurals.

## Browse phase (this session)
- engine.js: strict parseParams (whitelist, clamp page≤9999, sort/per guards), run() pipeline (search→filters OR-in/AND-across→facets ignoring own group→stable sort ties-newest→paginate), hideSold default on; suggest() for autosuggest; sizeLabel with Waist/Chest/Collar.
- views-shop.js: full Shop (breadcrumb, sticky sort bar, sidebar filters, active chips, grid/list, pagination, mobile filter sheet + Show N button) and Home (hero carousel autoplay/dots/arrows, category tiles, budget strip, Just Listed, Trending, occasion, how-it-works, sell CTA). Added core.js rw:rendered event for post-render init.
- views-buy.js: Product detail (gallery+zoom, condition meter, measurements, flaws/washed, price block "You save", Add/Go to Cart/Buy Now/heart, Share file:→ID+title, Report once, pincode checker 9xx→not serviceable, offers, seller card, Message seller, More/Similar/Recently viewed, mobile buybar, size guide) and Wishlist (move-to-cart, price-dropped, sold+Find similar) and Seller storefront.
- app.js: autosuggest (Products/Categories/Brands, highlight, 200ms debounce, keyboard nav, recents) + guarded add-to-cart/buy-now.
- Fixed stem plurals (jean~jeans, shirt~shirts), H&M tokenization, substring last-token matching so "tshirt"→"T-shirt".

## Buying flow (this session)
- core.js: RW.store.computeTotals (ONLY totals fn: subtotal -> coupons on pre-coupon subtotal -> free-delivery threshold -> +platformFee, +?25 COD), isFirstOrder, RW.hold (10-min checkout / 5-min UPI, expiry on read + storage event + route check), rw_seller_overrides key.
- views-buy.js: Cart (rows/coupon/totals/sold-guard/one-of-a-kind/wishlist move), Checkout (4 collapsible steps, pincode autofill, draft autosave, hold timer, place-order reload() cross-tab recheck), #/pay (QR+demo success/fail, retry/switch-COD, keeps cart), #/order confirmation + print invoice, #/track (derived timeline, cancel->available, rate->override avg, return->approve->available). style.css: matching styles + print block.
- Verified: dev/totals-test.js 20/20, dev/validate.js 14/14, engine suite all pass, node --check all OK, CDP smoke 40/40 (COD, UPI fail/retry/switch, hold-expiry reload, two-tab just-sold, cancel/return restore, zero console errors).
- Known: seeded ORD-5005 already rated (rate form hidden is correct); Home hero has no h1 (browse-phase, focusHeading no-ops).

## Selling flow (this session)
- views-sell.js: 7-step #/sell wizard (URL step source of truth, draft autosave + restore banner, prohibited notice, buf-based per-step validation + focus-first, condition/worn/tags rules, measurements, 3-photo drag-drop via compressImage, gauge/suggest/8% fee, seller reuse, score+review), publish RW-2001+/S13 with salted-hash-only PIN, #/sell/done slip (PIN once in memory, copy/print), #/manage (seed/unknown/wrong-PIN gate, 3 tries → 30s lock persisted across refresh, summary/edit/price-drop/status/messages/orders banner, delete).
- core.js: RW.util.compressImage. style.css: wizard/progress/grade/photo/gauge/score/slip/gate/tabs/manage/print styles.
- Fixed: category change rebuilt sub-dropdown from an empty category (dead select); lockState wiped attempt counts on every render (3-strikes never armed); buildListing now keeps sellerEmail/pincode/pickupNotes/listedAt for edit round-trips.
- Verified: rw-sell-smoke 93/93 (shop/seller visibility + reload, XSS literal, photo guards, lock persists across refresh, edit/price-drop/delete reflect in shop, orders banner, draft restore, step clamp, zero console errors); buying 40/40, totals 20/20, validate 14/14, engine pass, node --check all OK. Known: OTP PIN recovery skipped by design.

## Clickability fix + Gen Z restyle (this session)
- ROOT CAUSE: `style.css` `.modal-region { display: grid }` overrode the UA `[hidden] { display: none }`, leaving an invisible full-viewport z-250 click shield (old CDP smokes used programmatic .click(), which bypasses hit-testing). Fixed by `.modal-region[hidden] { display: none }` + an inline head script that shows a permanent red `#rw-err-banner` on window error / unhandledrejection.
- core.js: delegate now ignores clicks whose delegate element is a FORM (submit buttons carry their own actions; the form was firing on every click - place-order spam, PIN attempts counting field clicks), added noop/noop-key actions, rw:rendered closes the drawer + clears body.no-scroll (stuck after filter-sheet re-render). views-shop.js: shop-price-range action; views-buy.js: pincode-check/message-seller became RW.actions entries. Added dev/smoke.js (76 checks: boot, 18 routes, action coverage, link resolution, cart/wish wiring).
- Restyle: new palette (violet #6C4DFF, lime #D9FF3F, orange #FF5C39, ink #17120F, cream bg), Arial-Black display font, 2-3px ink borders + hard offset shadows + hover translate(-2px) everywhere, uppercase buttons, sticker chips/badges; hero banners now lime/pink/sky with ink text; avatar + silhouette colors updated (RW.ui.img gets ink outlines); headings stay mixed-case (innerText tests assert h1 case).
- Verified: node --check all 12 OK; smoke 76/76, validate 14/14, totals 20/20; rw-smoke 40/40, rw-sell-smoke 93/93, rw-hit-test 31/31 (real mouse), new rw-viewports 46/46 (768/1024/1440 x 7 routes, no h-scroll/banner/errors), dev/bundle.js -> revogue-single.html boots file:// (single check 9/9).
- Known bugs: none new; homepage has no h1 (pre-existing, focusHeading no-ops) and OTP PIN recovery stays skipped by design.

## Editorial palette restyle (this session)
- User rejected the Gen Z look as "cartoon"; replaced it with the supplied editorial palette: cream #F5F2EB page, noir #1B1B1B type/primary buttons, taupe #B3A290 lines/secondary, mocha #5C4033 icons/hovers/active, olive #4A5D4E accents/sustainable/promo (muted text darkened to #7A6C5C for AA). Georgia display, soft shadows only.
- style.css: retokenized + full re-sweep (header/search/cat-bar/drawer/bottom-nav, buttons/inputs, chips/badges/toast/modal/cards, hero cream-on-dark with olive/mocha/noir banners, cat tiles/budget/hiw/sell-cta olive, footer); codemod removed all hard offset shadows, 2-3px ink borders, sticker translates, rotations and old brights (82 replacements); semantic fixes (cover ring, timeline, sell-step current, PAYMENT_PENDING badge, gauge gradient, warn tints).
- data.js: hero banners to olive/mocha/noir, 12 seller avatars to dark palette tones (COLOR_MAP garment hexes left intact after an accidental 6-entry clobber was reverted); views-shop/views-buy/views-sell avatar + tile colors; engine.js img backdrop/stroke; index.html error banner #A2433A.
- Verified: node --check all 12 OK; smoke 76/76, validate 14/14, totals 20/20; rw-smoke 40/40, rw-sell-smoke 93/93, rw-hit-test 31/31, rw-viewports 46/46; bundle regenerated (355 KB) and single-check 9/9 (header-border assertion updated to 1px ink).
- Known bugs: none new; homepage still has no h1 (pre-existing) and OTP PIN recovery stays skipped by design.

## Hero carousel removed (this session)
- Deleted the homepage hero slideshow entirely: views-shop.js (homeHero(), home() call, heroIdx/heroTimer, showSlide/startHero/stopHero, hero-prev/next/dot actions, RW.router.start carousel override), style.css (.hero/.hero-track/.hero-slide/.hero-copy/.hero-arrow/.hero-dots blocks + responsive overrides), data.js (BANNERS array + banners key).
- dev/validate.js: dropped the "3 banners" data check (label updated).
- Verified: node --check all 12 OK; smoke 76/76 (action count now 71), validate 14/14, totals 20/20; rw-smoke 40/40, rw-sell-smoke 93/93, rw-hit-test 31/31, rw-viewports 46/46; bundle regenerated (349 KB) + single-check 9/9.
- Known bugs: none; home now starts at "Shop by category".

## Multi-page site, SVG images, delete UX, folder flatten (this session)
- Images: user rejected real photos ("very bad"); deleted all 60 photo-*.jpg files; engine.js RW.ui reworked to generate deterministic studio-style SVG garment illustrations as data URIs (GARMENTS dict, 14 shapes, front/back/detail-crop variants, gradients/shadows/hanger); style.css cat-tile art sizing fix; validate.js + check-photos.js rewritten for SVG asserts (15/15, 9/9).
- Multi-page: SPA kept its hash router but the site now ships 18 flat HTML pages (index + 17 family pages); core.js gained fileForPath/canMultiPage/rewriteLinks/stashToasts/consumeNavToasts so links cross file boundaries on file:// and server alike; new rw-multipage.js suite 29/29 (all files boot, params redirect, query decode, no console errors).
- Delete UX: deleting a listing from manage panels now shows a friendly confirmation view (manage.html#/manage?deleted=ID) instead of bouncing to the PIN gate, with Undo (15-min window, full snapshot in rw_deleted incl. cart/wishlist/status/messages) and Back actions; rw_deleted whitelisted in store KEYS so it survives reload; sell-smoke grew to 103 assertions, all green.
- Flatten: dev/ folder removed entirely — bundle.js, smoke.js, totals-test.js, validate.js moved to root with __dirname roots and require(./..) fixed; project now has ZERO subfolders (35 flat files); bundle.js regenerated revogue-single.html (369 KB).
- Verified: node --check all 12 OK; smoke 76, validate 15, totals 20, rw-smoke 40, rw-sell-smoke 103, rw-hit-test 31, rw-viewports 46, rw-multipage 29, check-photos 9, single-check 9 — all passing. Known bugs: none new; homepage has no h1 (pre-existing) and OTP PIN recovery stays skipped by design.

## 70 new products, no-gate Manage, Track dashboard (this session)
- data.js +70 listings (RW-1057..RW-1126: 20 Women / 20 Men / 20 Kids / 10 Accessories, all tagged N, Coral added to COLOR_HEX); FAQ/testimonial/hiw copy de-PINed; validate.js now checks 126 total + category split (16/16).
- Manage rework: PIN/lockout/gate machinery deleted from views-sell.js; #/manage now opens a card list of your listings (Edit/Manage/View), stale id falls back to the list; slip shows Listing ID + "no PIN needed"; edit-save keeps no pin fields; manage-head = "All listings" + View links; gate CSS replaced by manage-list styles.
- Track rework (views-buy.js): track() is now an orders dashboard over rw_orders (newest first, status badge, 6-stage mini progress, total, View timeline) with ?o=ID expanding the existing timeline above it; ID/PIN form, samples panel and track-form action removed.
- Verified: node --check all .js 0 failures; validate 16, totals 20, smoke 76, rw-smoke 40, rw-sell-smoke 96, rw-hit-test 31, rw-viewports 46, rw-multipage 29, check-photos 9, single-check 9; bundle regenerated (375 KB). Known bugs: none new.

## Footer info pages: real content (this session)
- views-info.js placeholders replaced: How it works (buy/sell step columns, CTAs), About ReVogue (mission/values/marketplace panels), Contact (form with name/email/topic/ref/message, contact-send action validates then shows RW-T-###### ticket confirmation), and 4 policies (returns/safety/terms/privacy, sectioned panels + "Last updated October 2026"); ph() removed; #ct-note error style added to style.css.
- Verified: node --check all OK; smoke 76, validate 16, totals 20; rw-multipage 29 (policy h1 check updated for "Returns & refunds"); new rw-info-check 21/21 (real-browser: pages, form validation, ticket, footer click lands on policy); single-check 9; bundle regenerated (388 KB, zero placeholder text). Known bugs: none new.

## 5 demo Manage listings (this session)
- data.js gains MY_ROWS/MY_LISTINGS (RW-1901..RW-1905: dress, shirt, sold kids frock, satchel, overcoat � built via buildProduct with own views/hours/flaws, tagged N, seller S13) + MY_SELLERS ("You", Pune) exported as myListings/mySellers; core.js adds rw_listings_seeded key + seedDemoCloset() so loadAll merges them into rw_listings_user/rw_sellers_user exactly once (existing lists merged, never duplicated; user deletions stick).
- Manage now opens with 5 cards (1 Sold badge) instead of the empty state; wizard-created ids stay RW-2001, its seller becomes S14 (sell-smoke assertions updated); validate.js adds a demo-listings check (17/17).
- Verified: node --check all OK; validate 17, smoke 76, totals 20, engine-test 0 fail, rw-smoke 40, sell-smoke 96, multipage 29, hit-test 31, viewports 46, check-photos 9, info-check 31 (incl. manage/product/edit/seller demo asserts), single-check 9; bundle regenerated (390 KB). Known bugs: none new.

## SVG pipeline upgrade: parametric, layered, realistic (this session)
- engine.js rewritten: svgFor(shape,hex,label,v,{lod,cat,cond,mat,title}) builds 14 parametric GARMENTS templates with data-f markers + per-shape df/dv; layered output = backdrop/light pool/contact shadow, hanger, 3-stop gradient + directional/radial volume, material texture + sheen, inner-edge AO, tapered fold pairs (hash-varied), stitching, rim light + grain, vignette, micro-rotation; v0 front / v1 mirrored back / v2 detail crop w/ ring / v3 hang-tag (tagsAttached, 4 thumbs).
- LOD: RW.ui.img(p,v,lod) with card skipping grain/rim/mid-folds at 6 call sites (shop/cat tiles, cart/review/order, manage, search); svgCache keyed id|view|lod; exports shapeKeys/featuresRequired; hidden #/dev/svg-sheet dev route renders all 131 figures.
- New svg-check.js 13/13 (structure, a11y, ids, color, features, budgets full<=12k/card<=8k, cache, timing 0.08ms); check-photos 10/10 incl. RW-1008 4-distinct-thumbs; AO/weave tuned after visual review (narrow paths no longer crush to black).
- Verified: node --check all .js 0 fail; svg-check 13, validate 17, smoke 76, totals 20, rw-smoke 40, sell-smoke 96, engine-test pass, check-photos 10, single-check 9 (vs fresh bundle); bundle regenerated (407 KB). Known bugs: none new; #/dev/svg-sheet fileForRoute maps to nonexistent file (intentional, unlinked).

## Accessory SVGs match each product (this session)
- engine.js: 8 new accessory sub-templates (scarf, dupatta, belt, tie, clutch, tote, sling, pocket) + shapeKey now resolves accessoryShape() from title/sub (16/16 verified: stoles/muffler->scarf, 3 belts->belt, ties->tie incl. 3-tie set, dupattas->dupatta, clutch/tote/sling/pocket squares); svgFor supports function body/front/back (tie set renders 3 blades); title-driven textures: studs, bandhani, phulkari, plaid, block-print, embroidery.
- Fixes found via screenshot review: g.body raw-function leak broke tie images (now bodyS; svg-check gained a "no leaked JS source" check -> 14/14), belt buckle made a grey frame + detail crop moved to a hole, sling strap widened + slider (padlock read), tie detail crop moved to blade.
- Verified: node --check all .js 0 fail; svg-check 14, validate 17, totals 20, smoke 76, rw-smoke 40 (1 flake re-run ok), sell-smoke 96, engine-test, hit-test 31, viewports 46, multipage 29, info-check 31, check-photos 10, single-check 9; bundle regenerated (420 KB). Known bugs: none new.

## Women SVG shape fixes (step 1 of 3, this session)
- 7 new templates (sharara, vest, anarkali, shirtdress, culotte, peplum, offshoulder) + shapeKey refineShape() title rules; fixed 8 mismatches: RW-1007 shirt, RW-1019/1072 sharara, RW-1075 sleeveless vest, RW-1012 anarkali flare, RW-1057/1060 shirt dresses, RW-1074 culottes, RW-1009 peplum, RW-1008 off-shoulder; svg-check 14/14 (29 shapes, dv<=24).
- Verified: node --check all 0 fail; validate 17, totals 20, smoke 76, rw-smoke 40, sell-smoke 96, engine-test, hit 31, viewports 46, multipage 29, info 31, check-photos 10, single-check 9; bundle 428 KB; Women audit screenshot reviewed (shot-women2.png). Known bugs: none new.

## Men SVG shape fixes (step 2 of 3, this session)
- 3 new templates (blazer, hoodie, jogger) + function fronts: vest now zip vs button-column by title (Nehru/waistcoat), tee now polo collar + chest graphic variants; refineShape rules: nehru|waistcoat->vest, blazer|tuxedo->blazer, hoodie|sweatshirt->hoodie, coat+puffer|bomber|liner|quarter-zip->jacket, standalone ethnic kurta->kurta, jogger->jogger; fixed 15 mismatches (RW-1034/1087/1093, 1039/1040/1092, 1042, 1043/1044/1095/1096, 1085/1086, 1088, 1030/1029+1084); svg-check 14/14 (32 shapes).
- Verified: node --check all 0 fail; validate 17, totals 20, smoke 76, rw-smoke 40, sell-smoke 96, engine-test, hit 31, viewports 46, multipage 29, info 31, check-photos 10, single-check 9; bundle 434 KB; Men re-audit reviewed (shot-men2.png). Known bugs: none new. Next: step 3 Kids.

## Kids SVG shape fixes (step 3 of 3, this session)
- 2 new templates (skirt, dungaree w/ bib+straps) + refineShape rules: shorts->culotte, skirt->skirt, sherwani->ethnic, dungaree/overall->dungaree, leggings->ethnic, track pants->jogger, kurta+set->ethnic (also fixed Women RW-1010), kids puffer/jacket->jacket, kids overshirt/shirt (not t-shirt)->shirt; fixed 11 mismatches (RW-1045/1097, 1047, 1048/1106, 1099, 1102/1104, 1103, 1107/1112, 1110, 1115); RW-1022 women now blazer; svg-check 14/14 (34 shapes, dv<=24 via shared crops).
- Verified: node --check all 0 fail; validate 17, totals 20, smoke 76, rw-smoke 40, sell-smoke 96, engine-test, hit 31, viewports 46, multipage 29, info 31, check-photos 10, single-check 9; bundle 437 KB; Kids/Women/Men re-audits reviewed (shot-kids2/shot-women3/map Men). Known bugs: minor — RW-1101 Night Suit shows top only.

## Select click fix + SVG realism pass (this session)
- Sort/per selects: core.js delegate() now skips click on SELECT and adds a SELECT-only change delegate (old click handler re-rendered view and killed the open dropdown); new rw-select-test 15/15 (run against shop.html; navigating to a changed hash across files is by design).
- Realism pass (user flagged dungaree proportions): dungaree redesigned (big bib+straps, calf-length cuffed pants), vest shortened to hip, tutu puffy variant, hanger highlight, jacket zipper pull, tee sleeve stitch+collar rib, trousers/culotte/skirt waistband button (center belt loop removed), polo folded collar.
- Title variants: dress sleeveless strap body (slip/gown/cocktail/bodycon) + wrap/tier/bow accents, shared BOW_D on bow-neck blouse/dress, angrakha kurta diagonal overlap+tie, palazzo/wide-leg trousers (svgFor folds/stitch now accept functions), night suit RW-1101 -> 2-piece sharara (known bug fixed).
- Audited 7 zoom batches (84 products) via zoom-sheet.js; svg-check 14/14 (34 shapes); node --check all 0 fail; validate 17, totals 20, smoke 76, rw-smoke 40, sell-smoke 96, engine-test, select 15, hit 31, viewports 46, multipage 29, info 31, check-photos 10, single-check 9; bundle 444 KB. Known bugs: none.
- Product photos: images/*.png mapped to products in PHOTO_CFG.map (data.js); front view uses photo, other views + any load failure use the generated SVG.
- ReVogue rebrand: logo.png replaces RW box, brand renamed, all files flat in one folder (photos beside index.html), bundle -> revogue-single.html. Coupon REWEAR10 -> REVOGUE10.
- Category tiles use real product photos (PHOTO_CFG.cats); photos compressed to JPEG (57MB -> 6.6MB). Filters verified identical to original: 168 queries.
- Category tile photos replaced with user-supplied images: cat-women/men/kids/accessories.jpg (accessories checkerboard background removed).
