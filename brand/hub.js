/* Muk Post Brand Hub — behaviour. Colour data lives here so hex, RGB, HSL, CMYK and contrast are always computed from one source. */
(function () {
  'use strict';

  /* ---------- data ---------- */
  var PAL = [
    { id: 'ink', name: 'Ink', hex: '#0A0A0A', role: 'The canvas. Every layout starts here.', tag: 'Core', dark: true },
    { id: 'paper', name: 'Paper', hex: '#FFFFFF', role: 'Text on dark. Documents and quotes.', tag: 'Core', dark: false },
    { id: 'indigo', name: 'Indigo', hex: '#2D318F', role: 'Signature surface. Backgrounds and cards, never text on black.', tag: 'Signature', dark: true },
    { id: 'indigoui', name: 'Indigo UI', hex: '#8B90E8', role: 'Indigo for text, links and lines on dark.', tag: 'Support', dark: false },
    { id: 'salmon', name: 'Salmon', hex: '#F8A695', role: 'The one accent. A single call to action per layout.', tag: 'Accent', dark: false },
    { id: 'signal', name: 'Signal', hex: '#10B981', role: 'Live status dot only. Nothing else.', tag: 'Status', dark: false }
  ];
  var GREYS = [
    ['G1', '#111111', 'Surface'], ['G2', '#1E1E1E', 'Hairline'], ['G3', '#333333', 'Border hover'], ['G4', '#555555', 'Muted · large only'],
    ['G5', '#888888', 'Dim text'], ['G6', '#AAAAAA', 'Secondary text'], ['G7', '#EEEEEE', 'Body on dark']
  ];
  var RAMP = {
    Indigo: ['#ECEEF7', '#D4D9ED', '#ADB6DA', '#818DC4', '#535FAA', '#2D318F', '#1F2269', '#121548', '#060727', '#01010A'],
    Salmon: ['#FFF8F6', '#FFEFEC', '#FFE0D9', '#FECEC4', '#FBBAAC', '#F8A695', '#B87A6D', '#82554C', '#4B2F29', '#190D0B']
  };
  var STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
  var PAIRS = [
    ['#FFFFFF', '#0A0A0A', 'Paper on Ink', 'Body, headlines'],
    ['#F8A695', '#0A0A0A', 'Salmon on Ink', 'Accents, links, labels'],
    ['#8B90E8', '#0A0A0A', 'Indigo UI on Ink', 'Secondary links, lines'],
    ['#FFFFFF', '#2D318F', 'Paper on Indigo', 'Body on indigo'],
    ['#F8A695', '#2D318F', 'Salmon on Indigo', 'Headlines on indigo (large)'],
    ['#2D318F', '#FFFFFF', 'Indigo on Paper', 'Documents'],
    ['#0A0A0A', '#F8A695', 'Ink on Salmon', 'Buttons, posters'],
    ['#0A0A0A', '#FFFFFF', 'Ink on Paper', 'Documents, quotes'],
    ['#2D318F', '#0A0A0A', 'Indigo on Ink', 'Never for text or logo']
  ];
  var SPACE = [4, 8, 12, 16, 24, 32, 48, 64, 96, 144];
  var CHECKS = [
    ['Logo is the supplied file', 'Not retyped, redrawn, recoloured or cleaned up.'],
    ['Approved colourway and clear space', 'One of the six pairings, with ½ M clear on every side.'],
    ['Colours from the palette only', 'Indigo is a surface. No indigo text on black.'],
    ['One accent per layout', 'Salmon, once. No extra colours, no gradients.'],
    ['Three typefaces, three jobs', 'Bricolage headlines, Inter body, JetBrains Mono labels.'],
    ['Copy is short and confident', 'Sentence case, ends with a full stop, no “!”, no hype words.'],
    ['Imagery is ours and graded', 'Real frames from real work. No stock, no filters.'],
    ['Every number and credit is real', 'Counts, dates and roles confirmed, never invented.'],
    ['No decoration', 'No drop shadows, bevels, ornaments. Texture once, on purpose.'],
    ['Restraint test', 'Remove half the elements. Does it still work? Then remove them.']
  ];
  var DL = [
    { g: 'Logo · The M', items: ['m_white', 'm_ink', 'm_salmon', 'm_indigo'].map(function (k) { return { p: 'logos/muk-' + k.replace('_', '_') + '.png', n: 'M · ' + cap(k.split('_')[1]), s: 'PNG · transparent', lt: k.indexOf('ink') > -1 || k.indexOf('indigo') > -1 }; }) },
    { g: 'Logo · Wordmark', items: ['white', 'ink', 'salmon', 'indigo'].map(function (c) { return { p: 'logos/muk-wordmark_' + c + '.png', n: 'Wordmark · ' + cap(c), s: 'PNG · transparent', lt: c === 'ink' || c === 'indigo' }; }) },
    { g: 'Logo · Lockup', items: ['white', 'ink', 'salmon', 'indigo'].map(function (c) { return { p: 'logos/muk-lockup_' + c + '.png', n: 'Lockup · ' + cap(c), s: 'PNG · transparent', lt: c === 'ink' || c === 'indigo' }; }) },
    { g: 'Tiles, avatars and banners', items: [
      { p: 'logos/muk-tile_indigo.png', n: 'Tile · Indigo', s: 'PNG · 1024²', full: 1 }, { p: 'logos/muk-tile_salmon.png', n: 'Tile · Salmon', s: 'PNG · 1024²', full: 1 },
      { p: 'logos/muk-tile_ink.png', n: 'Tile · Ink', s: 'PNG · 1024²', full: 1 }, { p: 'logos/muk-pfp_textured.jpg', n: 'Avatar · Textured', s: 'JPG · 1024²', full: 1 },
      { p: 'logos/muk-banner_black.png', n: 'Banner · Black', s: 'PNG · 2100×350', full: 0 }, { p: 'logos/muk-banner_white.png', n: 'Banner · White', s: 'PNG · 2100×350', full: 0, lt: 1 }] },
    { g: 'Textures', items: [
      { p: 'textures/texture_ink.jpg', n: 'Texture · Ink', s: 'JPG · 2200 w', full: 1 }, { p: 'textures/texture_indigo.jpg', n: 'Texture · Indigo', s: 'JPG · 2200 w', full: 1 },
      { p: 'textures/texture_salmon.jpg', n: 'Texture · Salmon', s: 'JPG · 2200 w', full: 1 }, { p: 'textures/texture_paper.jpg', n: 'Texture · Paper', s: 'JPG · 2200 w', full: 1 },
      { p: 'textures/linebreak_white.png', n: 'Line break · White', s: 'PNG', full: 0 }, { p: 'textures/linebreak_ink.png', n: 'Line break · Ink', s: 'PNG', full: 0, lt: 1 }] },
    { g: 'Fonts, tokens and templates', items: [
      { p: 'fonts/Bricolage.ttf', n: 'Bricolage Grotesque', s: 'TTF · variable', txt: 'Aa', ff: 'var(--mp-font-display)' },
      { p: 'fonts/Inter.ttf', n: 'Inter', s: 'TTF · variable', txt: 'Aa', ff: 'var(--mp-font-body)' },
      { p: 'fonts/JetBrainsMono.ttf', n: 'JetBrains Mono', s: 'TTF · variable', txt: 'Aa', ff: 'var(--mp-font-mono)' },
      { p: '../tokens/muk-tokens.css', n: 'Tokens · CSS', s: 'CSS', txt: '{ }' }, { p: '../tokens/muk-tokens.json', n: 'Tokens · JSON', s: 'JSON', txt: '{ }' },
      { p: '../email/signature.html', n: 'Email signature', s: 'HTML', txt: '@' }] }
  ];
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------- colour maths ---------- */
  function rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function lum(h) { var c = rgb(h).map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
  function contrast(a, b) { var A = lum(a), B = lum(b); return (Math.max(A, B) + .05) / (Math.min(A, B) + .05); }
  function hsl(h) { var c = rgb(h).map(function (v) { return v / 255; }), mx = Math.max.apply(0, c), mn = Math.min.apply(0, c), l = (mx + mn) / 2, s = 0, hh = 0, d = mx - mn;
    if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === c[0] ? (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0) : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; hh *= 60; }
    return Math.round(hh) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%'; }
  function cmyk(h) { var c = rgb(h).map(function (v) { return v / 255; }), k = 1 - Math.max.apply(0, c); if (k === 1) return '0, 0, 0, 100';
    return c.map(function (v) { return Math.round((1 - v - k) / (1 - k) * 100); }).concat(Math.round(k * 100)).join(', '); }
  function grade(r) { return r >= 7 ? ['AAA', 'pass'] : r >= 4.5 ? ['AA', 'pass'] : r >= 3 ? ['AA LARGE', 'mid'] : ['FAIL', 'fail']; }
  function textOn(h) { return lum(h) > .35 ? '#0A0A0A' : '#FFFFFF'; }

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var toastEl = $('#toast'), tt;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('on'); }, 1400); }
  function copy(text, msg) {
    function fb() { var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove(); }
    if (navigator.clipboard && window.isSecureContext !== false) navigator.clipboard.writeText(text).catch(fb); else fb();
    toast(msg || 'Copied ' + text);
  }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  /* ---------- nav rail ---------- */
  var secs = $$('section.sec');
  $('#railList').innerHTML = secs.map(function (s, i) {
    return '<li><a href="#' + s.id + '" data-id="' + s.id + '"><b>' + (i < 9 ? '0' : '') + (i + 1) + '</b>' + s.dataset.title + '</a></li>';
  }).join('');
  var links = $$('#railList a');
  function spy() {
    var y = window.scrollY + 140, cur = null;
    secs.forEach(function (s) { if (s.offsetTop <= y) cur = s.id; });
    links.forEach(function (a) { a.classList.toggle('on', a.dataset.id === cur); });
    var h = document.documentElement.scrollHeight - innerHeight;
    $('#progress').style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
  }
  addEventListener('scroll', spy, { passive: true }); spy();

  /* ---------- reveal ---------- */
  var statics = /[?&]static/.test(location.search);
  if (statics || !('IntersectionObserver' in window)) { $$('.fx').forEach(function (e) { e.classList.add('in'); }); }
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .08, rootMargin: '0px 0px -40px 0px' });
    $$('.fx').forEach(function (e) { io.observe(e); });
  }

  /* ---------- hero grab ---------- */
  var grab = $('#grab');
  [PAL[0], PAL[1], PAL[2], PAL[4]].forEach(function (p) {
    var b = el('<button><span class="sw" style="background:' + p.hex + '"></span><span><span class="t">' + p.name + '</span><br><span class="h mono">' + p.hex + ' · copy</span></span></button>');
    b.onclick = function () { copy(p.hex); }; grab.appendChild(b);
  });

  /* ---------- swatches ---------- */
  var sw = $('#swatches');
  PAL.forEach(function (p) {
    var r = rgb(p.hex), d = lum(p.hex) < .35;
    var n = el('<div class="swatch ' + (d ? 'dk' : 'lt') + '" style="background:' + p.hex + ';' + (p.id === 'ink' ? 'box-shadow: inset 0 0 0 0' : '') + '"></div>');
    n.innerHTML = '<div><span class="tag ' + (p.tag === 'Core' ? 'no' : p.tag === 'Accent' || p.tag === 'Signature' ? 'yes' : 'part') + '" style="' + (d ? '' : 'background:rgba(0,0,0,.12);color:inherit;border:0') + (p.tag === 'Core' && d ? ';border-color:#333;color:#aaa' : '') + '">' + p.tag + '</span><div class="nm">' + p.name + '</div><p class="rl" style="margin-top:10px">' + p.role + '</p></div>' +
      '<div class="vals">' + [['HEX', p.hex], ['RGB', r.join(', ')], ['HSL', hsl(p.hex)], ['CMYK', cmyk(p.hex)]].map(function (v) { return '<button data-v="' + v[1] + '"><span>' + v[0] + '</span><span>' + v[1] + '</span></button>'; }).join('') + '</div>';
    sw.appendChild(n);
  });
  $$('.vals button').forEach(function (b) { b.onclick = function () { copy(b.dataset.v); b.classList.add('copied'); setTimeout(function () { b.classList.remove('copied'); }, 700); }; });
  // ink swatch needs a visible edge against the page
  $$('.swatch')[0].style.background = '#0A0A0A';

  var gr = $('#greys');
  GREYS.forEach(function (g) {
    var b = el('<button style="background:' + g[1] + ';color:' + textOn(g[1]) + '"><span>' + g[0] + '</span><span>' + g[1] + '<small>' + g[2] + '</small></span></button>');
    b.onclick = function () { copy(g[1]); }; gr.appendChild(b);
  });

  /* proportion */
  var RATIO = [['Ink + greys', 72, '#0A0A0A', '#fff', '1px solid #1e1e1e'], ['Paper', 14, '#FFFFFF', '#0A0A0A'], ['Indigo', 8, '#2D318F', '#fff'], ['Salmon', 5, '#F8A695', '#0A0A0A'], ['', 1, '#10B981', '#0A0A0A']];
  $('#ratio').innerHTML = RATIO.map(function (r) { return '<div style="flex:' + r[1] + ';background:' + r[2] + ';color:' + r[3] + '">' + (r[0] ? '<span>' + r[0] + '</span><b>' + r[1] + '%</b>' : '') + '</div>'; }).join('');

  /* ramps */
  var rp = $('#ramps');
  Object.keys(RAMP).forEach(function (name) {
    var d = el('<div class="ramp"><div class="rl"><span class="label plain">' + name + ' · 50 → 900</span><span class="mono" style="color:var(--mp-g5)">500 is the brand colour</span></div><div class="steps"></div></div>');
    RAMP[name].forEach(function (h, i) { var b = el('<button style="background:' + h + ';color:' + textOn(h) + '"><span>' + STEPS[i] + '</span><span>' + h + '</span></button>'); b.onclick = function () { copy(h); }; $('.steps', d).appendChild(b); });
    rp.appendChild(d);
  });

  /* pairs */
  $('#pairs').innerHTML = PAIRS.map(function (p) {
    var r = contrast(p[0], p[1]), g = grade(r), bad = p[2] === 'Indigo on Ink';
    return '<div class="pair"><div class="demo" style="background:' + p[1] + ';color:' + p[0] + (p[1] === '#0A0A0A' ? ';border-bottom:1px solid #1e1e1e' : '') + '"><b>Aa — Graded.</b><span class="mono">' + p[3] + '</span></div><div class="meta"><span>' + p[2] + ' · ' + r.toFixed(1) + ' : 1</span><span class="grade ' + (bad ? 'fail' : g[1]) + '">' + (bad ? 'NEVER' : g[0]) + '</span></div></div>';
  }).join('');

  /* spacing */
  $('#space').innerHTML = SPACE.map(function (s, i) { return '<div><span class="mono" style="color:var(--mp-g5)">--space-' + (i < 4 ? i + 1 : [5, 6, 8, 12, 16, 24][i - 4]) + '</span><span class="mono">' + s + ' px</span><i style="width:' + s + 'px"></i></div>'; }).join('');

  /* ---------- downloads ---------- */
  var dl = $('#dlRoot');
  DL.forEach(function (grp) {
    var box = el('<div class="dl-group"><span class="label">' + grp.g + '</span><div class="dls' + (grp.g.indexOf('Logo') === 0 ? ' n4' : '') + '"></div></div>');
    grp.items.forEach(function (it) {
      var path = it.p.indexOf('../') === 0 ? it.p.slice(3) : 'assets/' + it.p;
      var pv = it.txt ? '<div class="pv txt" style="' + (it.ff ? 'font-family:' + it.ff : 'font-family:var(--mp-font-mono);font-size:34px') + '">' + it.txt + '</div>' : '<div class="pv ' + (it.full ? 'full' : '') + ' ' + (it.lt ? 'lt' : '') + '"><img src="assets/' + it.p + '" alt=""></div>';
      box.querySelector('.dls').appendChild(el('<a class="dl" href="' + path + '" download>' + pv + '<div class="in"><b>' + it.n + '</b><small>' + it.s + '</small></div></a>'));
    });
    dl.appendChild(box);
  });

  /* ---------- templates ---------- */
  $$('[data-copy-tpl]').forEach(function (b) {
    b.onclick = function () { var c = b.parentNode.cloneNode(true); $$('.label,button', c).forEach(function (n) { n.remove(); }); copy(c.textContent.trim(), 'Template copied'); };
  });

  /* ---------- signature copy ---------- */
  $('#copySig').onclick = function () {
    var node = $('#sig table').cloneNode(true);
    $$('img[data-abs]', node).forEach(function (i) { i.src = i.dataset.abs; });
    var html = node.outerHTML, text = 'Jackson McMurdo\nMuk Post · Post-production, Toronto\ncontact@mukpost.com · mukpost.com';
    try {
      navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]).then(function () { toast('Signature copied'); }, function () { copy(html, 'Signature HTML copied'); });
    } catch (e) { copy(html, 'Signature HTML copied'); }
  };

  /* ---------- compare slider ---------- */
  var ci = $('#cmpIn'), cf = $('#cmp .flat'), cb = $('#cmpBar');
  function cmp() { var v = ci.value; cf.style.clipPath = 'inset(0 ' + (100 - v) + '% 0 0)'; cb.style.left = v + '%'; }
  ci.addEventListener('input', cmp); cmp();

  /* ---------- motion demos ---------- */
  function replay(id) { var n = document.getElementById(id); n.classList.remove('go'); void n.offsetWidth; n.classList.add('go'); }
  $$('[data-replay]').forEach(function (b) { b.onclick = function () { replay(b.dataset.replay); }; });
  var demoIO = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { replay('rv'); replay('gi'); demoIO.disconnect(); } }); }, { threshold: .4 });
  demoIO.observe($('.mo'));

  /* ---------- checklist ---------- */
  var cl = $('#cl');
  CHECKS.forEach(function (c, i) { cl.appendChild(el('<li><label><input type="checkbox" data-i="' + i + '"><span><b>' + c[0] + '</b><span>' + c[1] + '</span></span></label></li>')); });
  function score() {
    var boxes = $$('#cl input'), n = boxes.filter(function (b) { return b.checked; }).length, v = $('#verdict');
    $('#sc').textContent = n; $('#mt').style.width = n * 10 + '%'; v.classList.toggle('pass', n === 10);
    var miss = boxes.filter(function (b) { return !b.checked; }).map(function (b) { return CHECKS[b.dataset.i][0]; });
    if (n === 0) { $('#vh').textContent = 'Nothing checked yet.'; $('#vp').textContent = 'Tick what\'s true. The unchecked items are what to fix.'; }
    else if (n === 10) { $('#vh').textContent = 'On brand.'; $('#vp').textContent = 'Ship it.'; }
    else if (n >= 8) { $('#vh').textContent = 'Nearly. Fix this:'; $('#vp').textContent = miss.join(' · '); }
    else { $('#vh').textContent = 'Not yet. Rework:'; $('#vp').textContent = miss.slice(0, 4).join(' · ') + (miss.length > 4 ? ' · +' + (miss.length - 4) + ' more' : ''); }
  }
  cl.addEventListener('change', score);
  $('#reset').onclick = function () { $$('#cl input').forEach(function (b) { b.checked = false; }); score(); };
  score();
})();
