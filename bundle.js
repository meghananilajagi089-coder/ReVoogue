/* bundle.js — generate revogue-single.html: index.html with style.css and all 8 scripts inlined (works from file://) */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SCRIPTS = ['data.js', 'core.js', 'engine.js', 'views-shop.js', 'views-buy.js', 'views-sell.js', 'views-info.js', 'app.js'];

function read(name){ return fs.readFileSync(path.join(ROOT, name), 'utf8'); }

let html = read('index.html');
let ops = 0;

const css = read('style.css');
const linkTag = '<link rel="stylesheet" href="style.css">';
if (html.indexOf(linkTag) < 0) throw new Error('stylesheet link tag not found in index.html');
html = html.replace(linkTag, () => '<style>\n' + css + '\n</style>');
ops++;

for (const name of SCRIPTS){
  const src = read(name);
  if (/<\/script/i.test(src)) throw new Error(name + ' contains a literal </script> and cannot be inlined safely');
  const tag = '<script src="' + name + '" defer></script>';
  if (html.indexOf(tag) < 0) throw new Error('script tag not found in index.html: ' + name);
  html = html.replace(tag, () => '<script>\n' + src + '\n</script>');
  ops++;
}

if (/<link[^>]+style\.css/.test(html) || /<script[^>]+src=/.test(html)) throw new Error('external references remain after bundling');

const out = path.join(ROOT, 'revogue-single.html');
fs.writeFileSync(out, html, 'utf8');
console.log('bundle: ' + ops + ' tags inlined -> ' + path.basename(out) + ' (' + Math.round(Buffer.byteLength(html) / 1024) + ' KB)');
