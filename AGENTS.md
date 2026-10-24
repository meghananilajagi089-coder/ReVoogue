# AGENTS.md

- Plain HTML/CSS/JS only. Classic `<script defer>` tags. No modules, no fetch(), no CDN. Must work from file://.
- Script order: data.js, core.js, engine.js, views-shop.js, views-buy.js, views-sell.js, views-info.js, app.js.
- Each JS file is an IIFE: `(function(){'use strict';const RW=window.RW=window.RW||{};...})();` with a header comment listing its exports. data.js only sets window.RW_DATA.
- Escape all user/URL text with RW.util.esc(). Never put raw text in innerHTML.
- UI never mutates state directly. It calls RW.router.navigate(hash,{replace}). The URL is the source of truth.
- Delegated events: document listener with data-action="x" handlers in RW.actions.x(el,ev).
- Only do the requested phase. Use Edit, not rewrites, on existing files.
- Before finishing: run `node --check` on every .js file and append what was done and any known bugs to PROGRESS.md. Summary max 6 lines.
