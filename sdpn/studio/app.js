/**
 * sdpn // LFR20 STUDIO — V4.1 APPLE macOS × NHL.COM BROADCAST SUITE
 * 1920x1080 60FPS Alpha Compositor • 32 NHL Clubs • 277 Verified Players
 *
 * Broadcast QA Guardrails:
 * 1. Apple TV+ × Sportsnet Two-Tier Rounded Broadcast Framing (2.5px-3.5px #FFFFFF border)
 * 2. Optical Ink Centering: drawOpticalText(ctx, str, cx, cy) using actualBoundingBox metrics
 * 3. Zero Canvas Fonts < 20px anywhere in renderer
 * 4. High-Contrast NHL Crests: _dark.svg on dark/team plates, _light.svg on white UI & pure white plates
 * 5. Flush-Cut Player Cutouts: Top 38-44px rises cleanly above top border, bottom clipped strictly flush
 */

// ==========================================================================
// 1. SUB-PIXEL GEOMETRY & OPTICAL INK CENTERING ENGINE
// ==========================================================================

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/**
 * Rounded bottom clip region that allows player heads to extend freely above y=0 (topAllowY < 0)
 * while clipping bottom torso strictly flush inside the rounded card bottom at y=h.
 */
function roundBottomHeadroomClipPath(ctx, x, topAllowY, w, bottomY, r) {
  const rad = Math.max(0, Math.min(r, w / 2));
  ctx.beginPath();
  ctx.moveTo(x, topAllowY);
  ctx.lineTo(x + w, topAllowY);
  ctx.lineTo(x + w, bottomY - rad);
  ctx.quadraticCurveTo(x + w, bottomY, x + w - rad, bottomY);
  ctx.lineTo(x + rad, bottomY);
  ctx.quadraticCurveTo(x, bottomY, x, bottomY - rad);
  ctx.closePath();
}

function drawOpticalText(ctx, str, cx, cy) {
  const s = String(str ?? '');
  if (!s) return;
  const m = ctx.measureText(s);
  const left = m.actualBoundingBoxLeft ?? 0;
  const right = m.actualBoundingBoxRight ?? m.width;
  const ascent = m.actualBoundingBoxAscent ?? 16;
  const descent = m.actualBoundingBoxDescent ?? 4;
  const inkW = left + right;
  const inkH = ascent + descent;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, cx - inkW / 2 + left, cy + inkH / 2 - descent);
  ctx.restore();
}

function drawOpticalLeftText(ctx, str, lx, cy) {
  const s = String(str ?? '');
  if (!s) return;
  const m = ctx.measureText(s);
  const left = m.actualBoundingBoxLeft ?? 0;
  const ascent = m.actualBoundingBoxAscent ?? 16;
  const descent = m.actualBoundingBoxDescent ?? 4;
  const inkH = ascent + descent;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, lx + Math.max(0, left), cy + inkH / 2 - descent);
  ctx.restore();
}

function drawOpticalRightText(ctx, str, rx, cy) {
  const s = String(str ?? '');
  if (!s) return;
  const m = ctx.measureText(s);
  const right = m.actualBoundingBoxRight ?? m.width;
  const ascent = m.actualBoundingBoxAscent ?? 16;
  const descent = m.actualBoundingBoxDescent ?? 4;
  const inkH = ascent + descent;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, rx - right, cy + inkH / 2 - descent);
  ctx.restore();
}

/**
 * Safe broadcast stat animation: NEVER parseFloat() strings with ':', '.', '/', '%', or internal '-'
 */
function formatAnimatedStat(rawVal, progress) {
  const s = String(rawVal ?? '').trim();
  if (/^[+-]?\d+$/.test(s)) {
    const target = parseInt(s, 10);
    const cur = Math.round(target * progress);
    if (s.startsWith('+') && cur > 0) return `+${cur}`;
    return String(cur);
  }
  return s;
}

function fitFontSize(ctx, text, weightStyle, family, maxPx, minPx, maxWidth) {
  let sz = maxPx;
  while (sz > minPx) {
    ctx.font = `${weightStyle} ${sz}px ${family}`;
    const m = ctx.measureText(String(text));
    const w = (m.actualBoundingBoxLeft ?? 0) + (m.actualBoundingBoxRight ?? m.width);
    if (w <= maxWidth) return sz;
    sz -= 2;
  }
  return minPx;
}

function preserveSdpnBrandCase(str) {
  return String(str ?? '').toUpperCase().replace(/\bSDPN\b/g, 'sdpn');
}

function formatTimecode(sec) {
  const clamped = Math.max(0, Number(sec) || 0);
  const mins = Math.floor(clamped / 60);
  const rem = (clamped % 60).toFixed(1).padStart(4, '0');
  return `${mins}:${rem}`;
}

// ==========================================================================
// 2. COLOR SCIENCE, LEAGUE DB & ASSET CACHE
// ==========================================================================

let LEAGUE = {
  teams: [],
  players: [],
  teamMap: {},
  playerMap: {}
};

const CACHE = {
  logosDark: {},   // High-contrast light/white logos FOR dark/team plates
  logosLight: {},  // Colored/dark ink logos FOR white plates
  headshots: {},   // Keyed by player.id
  brand: {}
};

function hexToRgb(hex) {
  const clean = String(hex || '#00205B').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16) || 0x00205B;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function mixHex(hexA, hexB, weightB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    a.r + (b.r - a.r) * weightB,
    a.g + (b.g - a.g) * weightB,
    a.b + (b.b - a.b) * weightB
  );
}

function hexLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const BROADCAST_TEAM_PALETTE = {
  TOR: { primary: '#00205B', secondary: '#0038A8', accent: '#38BDF8' },
  MIN: { primary: '#154734', secondary: '#0E3426', accent: '#EAAA00' },
  COL: { primary: '#6F263D', secondary: '#236192', accent: '#60A5FA' },
  BOS: { primary: '#18181B', secondary: '#27272A', accent: '#FFB81C' },
  MTL: { primary: '#AF1E2D', secondary: '#192168', accent: '#F87171' },
  EDM: { primary: '#041E42', secondary: '#0A2E63', accent: '#FF4C00' },
  OTT: { primary: '#B91C1C', secondary: '#7F1D1D', accent: '#D4AF37' },
  FLA: { primary: '#C8102E', secondary: '#041E42', accent: '#FBBF24' },
  TBL: { primary: '#002868', secondary: '#003E9C', accent: '#60A5FA' },
  NYR: { primary: '#0038A8', secondary: '#00287A', accent: '#EF4444' },
  NJD: { primary: '#CE1126', secondary: '#880D1B', accent: '#FCA5A5' },
  CBJ: { primary: '#002654', secondary: '#063776', accent: '#CE1126' },
  VGK: { primary: '#333F42', secondary: '#1F2937', accent: '#B4975A' },
  UTA: { primary: '#0F172A', secondary: '#1E3A5F', accent: '#6CACE4' }
};

let homeCardRefreshTimer = null;
function scheduleHomeCardsRefresh() {
  if (typeof State === 'undefined' || State.view !== 'home') return;
  clearTimeout(homeCardRefreshTimer);
  homeCardRefreshTimer = setTimeout(() => {
    if (State.view === 'home' && typeof renderHomeGraphicCards === 'function') {
      renderHomeGraphicCards();
    }
  }, 45);
}

function getTeamTheme(abbrev) {
  const code = abbrev || 'TOR';
  const t = LEAGUE.teamMap[code];
  const preset = BROADCAST_TEAM_PALETTE[code];
  const rawPrimary = preset?.primary || t?.colors?.primary || '#00205B';
  const rawAccent = preset?.accent || t?.colors?.accent || '#38BDF8';

  const lumP = hexLuminance(rawPrimary);
  const primary = lumP < 0.06 ? mixHex(rawPrimary, rawAccent, 0.20) : rawPrimary;
  const chassisBright = preset?.secondary || mixHex(primary, '#FFFFFF', 0.16);
  const chassisDeep = mixHex(primary, '#070B16', 0.45);

  const lumA = hexLuminance(rawAccent);
  const accent = lumA < 0.25 ? mixHex(rawAccent, '#FFFFFF', 0.42) : rawAccent;
  const accentInk = hexLuminance(accent) > 0.56 ? '#0A0A0C' : '#FFFFFF';

  return {
    abbrev: code,
    teamName: t?.teamName || code,
    commonName: t?.commonName || code,
    placeName: t?.placeName || '',
    primary,
    chassisBright,
    chassisDeep,
    accent,
    accentInk
  };
}

function ensureHeadshotLoaded(player) {
  if (!player || !player.hasLocalMug || !player.headshot) return null;
  const existing = CACHE.headshots[player.id];
  if (existing) return existing.complete && existing.naturalWidth > 0 ? existing : null;
  const img = new Image();
  img.onload = scheduleHomeCardsRefresh;
  img.src = player.headshot;
  CACHE.headshots[player.id] = img;
  return null;
}

function ensureLogoLoaded(abbrev, onWhitePlate = false) {
  const code = abbrev || 'TOR';
  const bucket = onWhitePlate ? CACHE.logosLight : CACHE.logosDark;
  if (bucket[code]) {
    return bucket[code].complete && bucket[code].naturalWidth > 0 ? bucket[code] : null;
  }
  const img = new Image();
  img.onload = scheduleHomeCardsRefresh;
  img.src = `assets/logos/${code}_${onWhitePlate ? 'light' : 'dark'}.svg`;
  bucket[code] = img;
  return null;
}

function drawTeamCrest(ctx, abbrev, cx, cy, maxW, maxH, onWhitePlate = false) {
  const img = ensureLogoLoaded(abbrev, onWhitePlate);
  if (!img) {
    ctx.save();
    ctx.fillStyle = onWhitePlate ? '#0A0A0C' : '#FFFFFF';
    ctx.font = '800 26px "Inter", sans-serif';
    drawOpticalText(ctx, abbrev || 'NHL', cx, cy);
    ctx.restore();
    return;
  }
  const natW = img.naturalWidth || 960;
  const natH = img.naturalHeight || 640;
  const scale = Math.min(maxW / natW, maxH / natH);
  const dw = natW * scale;
  const dh = natH * scale;

  ctx.save();
  if (!onWhitePlate) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
  }
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

/**
 * Draws a verified NHL player cutout with:
 * - Strict bottom flush clipping at bottomY (zero pixels below card!)
 * - Top 38-44px of head rising cleanly ABOVE the top border
 * - Realistic dark drop shadow (zero neon glow)
 * - Clean jersey-number shield fallback if rookie has no NHL mug
 */
function drawPlayerCutout(ctx, player, cx, bottomY, heightPx, clipMinX, clipMaxX) {
  const img = ensureHeadshotLoaded(player);
  const theme = getTeamTheme(player?.team || 'TOR');

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipMinX, bottomY - heightPx - 80, clipMaxX - clipMinX, heightPx + 80);
  ctx.clip();

  if (img) {
    const aspect = (img.naturalWidth || 168) / (img.naturalHeight || 168);
    const drawH = heightPx;
    const drawW = drawH * aspect;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.58)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.drawImage(img, cx - drawW / 2, bottomY - drawH, drawW, drawH);
    ctx.restore();
  } else {
    const shW = heightPx * 0.64;
    const shH = heightPx * 0.72;
    const sx = cx - shW / 2;
    const sy = bottomY - shH;
    const grad = ctx.createLinearGradient(sx, sy, sx, bottomY);
    grad.addColorStop(0, theme.chassisBright);
    grad.addColorStop(1, theme.chassisDeep);
    ctx.fillStyle = grad;
    roundRectPath(ctx, sx, sy, shW, shH, 16);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 58px "Barlow Condensed", sans-serif';
    drawOpticalText(ctx, `#${player?.num ?? '00'}`, cx, sy + shH / 2);
  }

  ctx.restore();
}

function drawSdpnBadge(ctx, x, y, w, h, radius = 9) {
  ctx.save();
  ctx.fillStyle = '#0038A8';
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  const fontSize = Math.max(20, Math.round(h * 0.54));
  ctx.font = `800 ${fontSize}px "Inter", sans-serif`;
  drawOpticalText(ctx, 'sdpn', x + w / 2, y + h / 2);
  ctx.restore();
}

// ==========================================================================
// 3. EASING CURVES & STUDIO STATE
// ==========================================================================

const Ease = {
  linear: t => t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: t => {
    const c1 = 1.45;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

const TONIGHT_GAME_OVERRIDES = {
  8479318: [ // Auston Matthews #34 (Exact Reference Mockup Match)
    { label: 'G', val: '2' },
    { label: 'A', val: '2' },
    { label: 'PTS', val: '4' },
    { label: 'SOG', val: '7' }
  ],
  8477939: [ // William Nylander #88
    { label: 'G', val: '2' },
    { label: 'A', val: '3' },
    { label: 'PTS', val: '5' },
    { label: 'SOG', val: '6' }
  ],
  8484158: [ // Easton Cowan #53
    { label: 'G', val: '1' },
    { label: 'A', val: '1' },
    { label: 'PTS', val: '2' },
    { label: '+/-', val: '+2' }
  ]
};

const NHL_HUB = {
  games: [],
  nextGame: null,
  prevGame: null,
  opponentAbbrev: 'MIN',
  gameNumber: 21,
  source: 'schedule-cache',
  syncedAt: null,
  isSyncing: false
};

const State = {
  view: 'home',       // 'home' | 'editor'
  template: 'stat',   // stat | matchup | teamtape | standings | stamp | trade | threestars | scorebug
  teamFilter: 'TOR',
  playerSearch: '',
  selectedPlayerId: 8479318,
  activeSlotTarget: 'primary', // contextual slot for left sidebar clicks

  currentTime: 1.65,
  duration: 4.5,
  inDuration: 0.75,
  outDuration: 0.55,
  fps: 60,
  isPlaying: true,
  isLooping: true,
  backdrop: 'lfr', // alpha | studio | ice | lfr
  isExporting: false,
  exportRes: '1080p', // '1080p' (1920x1080) | '4k' (3840x2160)
  exportCodec: 'webm', // 'prores4444' (Native Mac App) | 'webm' (VP9 Alpha)

  stat: {
    tonightMode: false,
    context: 'LFR20 • GAME 21 VS MIN',
    verdict: 'ELITE',
    stats: [
      { label: 'G', val: '12' },
      { label: 'A', val: '10' },
      { label: 'PTS', val: '22' },
      { label: 'SOG', val: '82' }
    ]
  },

  matchup: {
    title: 'LFR20 • GAME 21 SUPERSTAR DUEL',
    leftTeam: 'TOR',
    leftPlayerId: 8479318,  // Auston Matthews
    rightTeam: 'MIN',
    rightPlayerId: 8478864, // Kirill Kaprizov
    statMode: 'scoring'
  },

  teamtape: {
    header: 'LFR20 • GAME 21 TALE OF THE TAPE',
    subheader: 'THU, NOV 12 • 7:00 PM ET • SCOTIABANK ARENA',
    awayTeam: 'MIN',
    homeTeam: 'TOR'
  },

  standings: {
    division: 'Atlantic',
    focusTeam: 'TOR',
    subtitle: '2026-27 PLAYOFF RACE • LIVE NHL'
  },

  stamp: {
    type: 'dangit',
    headline: '4 STRAIGHT LOSSES',
    subtext: 'LFR20 G20 • DROPPED 6-3 TO COLORADO',
    playerId: 'none'
  },

  trade: {
    badge: 'TRADE ALERT',
    leftTeam: 'TOR',
    leftSubtitle: 'ACQUIRES • $3.85M AAV',
    leftItems: ['Kirill Marchenko (RW)', '2027 3rd Round Pick (CBJ)'],
    rightTeam: 'CBJ',
    rightSubtitle: 'ACQUIRES • 15% RETAINED',
    rightItems: ['2027 1st Round Pick (Top-10 Prot.)', 'Top Marlies Prospect'],
    ticker: 'sdpn INSTANT REACTION • EMERGENCY SDP BREAKDOWN'
  },

  threestars: {
    header: 'LFR20 • PLAYERS TO WATCH VS MIN',
    mode: 'stars',
    slots: [
      { playerId: 8477939, line: '2G • 3A • 5 PTS' },
      { playerId: 8479318, line: '2G • 2A • 4 PTS' },
      { playerId: 8478864, line: '31 PTS • WILD #97' }
    ]
  },

  scorebug: {
    episode: 'LFR20 • GAME 21',
    status: 'THU • 7:00 PM ET',
    awayTeam: 'MIN',
    awayScore: '0',
    awayShots: '0',
    homeTeam: 'TOR',
    homeScore: '0',
    homeShots: '0',
    panicLevel: 76
  }
};

let canvas, ctx;
let offscreenExportCanvas = null;
let lastTimestamp = 0;

function isNativeMacApp() {
  return Boolean(
    window.webkit &&
    window.webkit.messageHandlers &&
    window.webkit.messageHandlers.mukNative
  );
}

function postNativeMessage(payload) {
  if (isNativeMacApp()) {
    try {
      window.webkit.messageHandlers.mukNative.postMessage(payload);
    } catch (_) {}
  }
}

function getExportDimensions() {
  const is4k = State.exportRes === '4k';
  return {
    is4k,
    scale: is4k ? 2 : 1,
    width: is4k ? 3840 : 1920,
    height: is4k ? 2160 : 1080,
    tag: is4k ? '4K' : '1080p'
  };
}

function getOffscreenExportSurface() {
  const dim = getExportDimensions();
  if (!offscreenExportCanvas) {
    offscreenExportCanvas = document.createElement('canvas');
  }
  if (offscreenExportCanvas.width !== dim.width || offscreenExportCanvas.height !== dim.height) {
    offscreenExportCanvas.width = dim.width;
    offscreenExportCanvas.height = dim.height;
  }
  const ectx = offscreenExportCanvas.getContext('2d', { alpha: true });
  return { canvas: offscreenExportCanvas, ctx: ectx, dim };
}

function getPlayerById(id) {
  if (!id || id === 'none') return null;
  return LEAGUE.playerMap[Number(id)] || LEAGUE.players[0] || null;
}

function findPlayerByNameOrTeam(lastNameSubstr, teamAbbrev) {
  const q = lastNameSubstr.toLowerCase();
  return LEAGUE.players.find(p =>
    (!teamAbbrev || p.team === teamAbbrev) &&
    p.name.toLowerCase().includes(q)
  );
}

// ==========================================================================
// 4. BOOTSTRAP & ASSET PRELOAD
// ==========================================================================

window.addEventListener('DOMContentLoaded', async () => {
  preloadBrandAssets();
  await loadLeagueDatabase();
  initUI();
  initCanvas();
  selectTemplate('home', false);
  syncLiveNHLHub({ silent: true });
});

function preloadBrandAssets() {
  const wm = new Image();
  wm.src = 'assets/brand/sdpn-wordmark.png';
  CACHE.brand.wordmark = wm;

  const cr = new Image();
  cr.src = 'assets/brand/sdpn-crest.png';
  CACHE.brand.crest = cr;
}

function getTorontoTodayISO() {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch (_) {}
  return new Date().toISOString().slice(0, 10);
}

function formatGameScheduleET(game) {
  if (!game) return { shortDayTime: '7:00 PM ET', fullScheduleLine: 'Scotiabank Arena • 7:00 PM ET', shortDate: 'NOV 12' };
  const tvStr = Array.isArray(game.tv) && game.tv.length ? game.tv.slice(0, 2).join(' / ') : 'SN';
  const venue = game.venue || 'Scotiabank Arena';

  if (game.startTimeUTC) {
    try {
      const dt = new Date(game.startTimeUTC);
      const dayPart = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto',
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }).format(dt);
      const shortDate = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto',
        month: 'short',
        day: 'numeric'
      }).format(dt).toUpperCase();
      const weekdayShort = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto',
        weekday: 'short'
      }).format(dt).toUpperCase();
      const timePart = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto',
        hour: 'numeric',
        minute: '2-digit'
      }).format(dt);
      return {
        shortDayTime: `${weekdayShort} • ${timePart} ET`,
        tapeSubheader: `${dayPart.toUpperCase()} • ${timePart} ET • ${venue.toUpperCase()}`,
        fullScheduleLine: `${dayPart} • ${timePart} ET • ${venue} • ${tvStr}`,
        shortDate
      };
    } catch (_) {}
  }

  return {
    shortDayTime: '7:00 PM ET',
    tapeSubheader: `${venue.toUpperCase()} • 7:00 PM ET`,
    fullScheduleLine: `${game.date || ''} • 7:00 PM ET • ${venue} • ${tvStr}`,
    shortDate: 'LIVE NHL'
  };
}

function resolveUpcomingLeafsGame(games) {
  if (!Array.isArray(games) || !games.length) return { nextGame: null, prevGame: null };
  const todayISO = getTorontoTodayISO();
  let nextIdx = games.findIndex(g =>
    g.gameState === 'LIVE' ||
    g.gameState === 'CRIT' ||
    g.gameState === 'PRE' ||
    (g.gameState !== 'OFF' && g.gameState !== 'FINAL' && g.date >= todayISO)
  );
  if (nextIdx === -1) {
    nextIdx = games.findIndex(g => g.date >= todayISO);
  }
  if (nextIdx === -1) {
    nextIdx = games.length - 1;
  }
  const nextGame = games[nextIdx] || null;
  let prevGame = null;
  for (let i = nextIdx - 1; i >= 0; i--) {
    if (games[i].gameState === 'OFF' || games[i].gameState === 'FINAL' || games[i].awayScore !== null) {
      prevGame = games[i];
      break;
    }
  }
  return { nextGame, prevGame };
}

function applyLiveStandingsArray(standingsArr) {
  if (!Array.isArray(standingsArr) || !standingsArr.length) return;
  standingsArr.forEach(s => {
    const code = typeof s.teamAbbrev === 'object' ? s.teamAbbrev?.default : s.teamAbbrev;
    const club = code ? LEAGUE.teamMap[code] : null;
    if (!club) return;
    const w = s.wins ?? club.wins;
    const l = s.losses ?? club.losses;
    const ot = s.otLosses ?? club.otLosses;
    club.gamesPlayed = s.gamesPlayed ?? club.gamesPlayed;
    club.wins = w;
    club.losses = l;
    club.otLosses = ot;
    club.record = `${w}-${l}-${ot}`;
    club.points = s.points ?? club.points;
    if (typeof s.pointPctg === 'number') {
      club.pointPctg = s.pointPctg.toFixed(3).replace(/^0/, '');
    }
    if (typeof s.goalFor === 'number' && club.gamesPlayed > 0) {
      club.goalFor = s.goalFor;
      club.gfPerGame = (s.goalFor / club.gamesPlayed).toFixed(2);
    }
    if (typeof s.goalAgainst === 'number' && club.gamesPlayed > 0) {
      club.goalAgainst = s.goalAgainst;
      club.gaPerGame = (s.goalAgainst / club.gamesPlayed).toFixed(2);
    }
    if (typeof s.goalDifferential === 'number') club.goalDifferential = s.goalDifferential;
    if (s.divisionSequence) club.divisionSequence = s.divisionSequence;
    if (s.conferenceSequence) club.conferenceSequence = s.conferenceSequence;
    if (s.leagueSequence) club.leagueSequence = s.leagueSequence;
    if (s.streakCode && s.streakCount) {
      club.streakCode = s.streakCode;
      club.streakCount = s.streakCount;
      club.streak = `${s.streakCode}${s.streakCount}`;
    }
    if (typeof s.l10Wins === 'number') {
      club.l10 = `${s.l10Wins}-${s.l10Losses ?? 0}-${s.l10OtLosses ?? 0}`;
    }
  });
}

function applyUpcomingGameToStudio(nextGame, prevGame) {
  if (!nextGame) return;
  NHL_HUB.nextGame = nextGame;
  NHL_HUB.prevGame = prevGame || null;

  const gameNum = nextGame.gameNumber || 21;
  const awayCode = nextGame.awayAbbrev || 'MIN';
  const homeCode = nextGame.homeAbbrev || 'TOR';
  const isTorHome = homeCode === 'TOR';
  const oppCode = isTorHome ? awayCode : homeCode;
  const vsPrep = isTorHome ? 'VS' : '@';

  NHL_HUB.opponentAbbrev = oppCode;
  NHL_HUB.gameNumber = gameNum;

  ensureLogoLoaded(awayCode, false);
  ensureLogoLoaded(awayCode, true);
  ensureLogoLoaded(homeCode, false);
  ensureLogoLoaded(homeCode, true);

  // Preload opponent skaters & goalies so every graphic card has crisp cutouts
  LEAGUE.players
    .filter(p => p.team === oppCode || p.team === 'TOR')
    .forEach(p => ensureHeadshotLoaded(p));

  const schedFmt = formatGameScheduleET(nextGame);
  const oppClub = LEAGUE.teamMap[oppCode];
  const torClub = LEAGUE.teamMap.TOR;
  const oppNameUpper = (oppClub?.commonName || oppClub?.placeName || oppCode).toUpperCase();

  const matthews = findPlayerByNameOrTeam('matthews', 'TOR');
  const nylander = findPlayerByNameOrTeam('nylander', 'TOR');
  const cowan = findPlayerByNameOrTeam('cowan', 'TOR');
  const oppSkaters = LEAGUE.players
    .filter(p => p.team === oppCode && !p.isGoalie)
    .sort((a, b) => (b.stats?.pts ?? 0) - (a.stats?.pts ?? 0));
  const oppStar = oppSkaters[0] || LEAGUE.players.find(p => p.team === oppCode);

  // 1. Player Card (Auston Matthews prepped for upcoming game)
  const isLiveGame = nextGame.gameState === 'LIVE' || nextGame.gameState === 'CRIT';
  State.stat.tonightMode = isLiveGame;
  State.stat.context = `LFR20 • GAME ${gameNum} ${vsPrep} ${oppCode}`;
  State.stat.verdict = 'ELITE';
  if (matthews) {
    State.selectedPlayerId = matthews.id;
    if (!isLiveGame && matthews.defaultTiles?.length === 4) {
      State.stat.stats = matthews.defaultTiles.map(t => ({ label: t.label, val: String(t.val) }));
    }
  }

  // 2. Superstar Head-to-Head (Matthews vs Opponent Top Scorer)
  State.matchup.title = `LFR20 • GAME ${gameNum} SUPERSTAR DUEL`;
  State.matchup.leftTeam = 'TOR';
  if (matthews) State.matchup.leftPlayerId = matthews.id;
  State.matchup.rightTeam = oppCode;
  if (oppStar) State.matchup.rightPlayerId = oppStar.id;
  State.matchup.statMode = 'scoring';

  // 3. Tale of the Tape (Away @ Home)
  State.teamtape.header = `LFR20 • GAME ${gameNum} TALE OF THE TAPE`;
  State.teamtape.subheader = schedFmt.tapeSubheader;
  State.teamtape.awayTeam = awayCode;
  State.teamtape.homeTeam = homeCode;

  // 4. NHL Standings (Live Atlantic Race)
  const todayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric'
  }).format(new Date()).toUpperCase();
  State.standings.division = 'Atlantic';
  State.standings.focusTeam = 'TOR';
  State.standings.subtitle = `2026-27 PLAYOFF RACE • ${todayShort}`;

  // 5. Dang-It! / Hat-Pick! Stamp (Synced to Leafs current streak & previous game result)
  if (torClub?.streakCode === 'L' && (torClub?.streakCount || 0) >= 2) {
    State.stamp.type = 'dangit';
    State.stamp.headline = `${torClub.streakCount} STRAIGHT LOSSES`;
    if (prevGame) {
      const prevOpp = prevGame.awayAbbrev === 'TOR' ? prevGame.homeAbbrev : prevGame.awayAbbrev;
      const torSc = prevGame.awayAbbrev === 'TOR' ? prevGame.awayScore : prevGame.homeScore;
      const oppSc = prevGame.awayAbbrev === 'TOR' ? prevGame.homeScore : prevGame.awayScore;
      State.stamp.subtext = `LFR20 G${prevGame.gameNumber} • DROPPED ${oppSc}-${torSc} VS ${prevOpp}`;
    } else {
      State.stamp.subtext = `HEADING INTO GAME ${gameNum} ${vsPrep} ${oppNameUpper}`;
    }
    State.stamp.playerId = 'none';
  } else if (torClub?.streakCode === 'W' && (torClub?.streakCount || 0) >= 2) {
    State.stamp.type = 'hatpick';
    State.stamp.headline = `${torClub.streakCount} GAME WIN STREAK`;
    State.stamp.subtext = `LEAFS ROLLING INTO GAME ${gameNum} ${vsPrep} ${oppCode}`;
    State.stamp.playerId = matthews ? matthews.id : 'none';
  }

  // 7. Three Stars / Players to Watch
  State.threestars.header = `LFR20 • STARS TO WATCH ${vsPrep} ${oppCode}`;
  State.threestars.mode = 'stars';
  if (nylander) {
    State.threestars.slots[0] = {
      playerId: nylander.id,
      line: `${nylander.stats?.g ?? 12}G • ${nylander.stats?.a ?? 14}A • ${nylander.stats?.pts ?? 26} PTS`
    };
  }
  if (matthews) {
    State.threestars.slots[1] = {
      playerId: matthews.id,
      line: `${matthews.stats?.g ?? 11}G • ${matthews.stats?.a ?? 16}A • ${matthews.stats?.pts ?? 27} PTS`
    };
  }
  if (oppStar) {
    State.threestars.slots[2] = {
      playerId: oppStar.id,
      line: `${oppStar.stats?.g ?? 10}G • ${oppStar.stats?.a ?? 15}A • ${oppStar.stats?.pts ?? 25} PTS`
    };
  } else if (cowan) {
    State.threestars.slots[2] = { playerId: cowan.id, line: 'ROOKIE SPARK • #53' };
  }

  // 8. Live Scorebug & Panic Meter
  State.scorebug.episode = `LFR20 • GAME ${gameNum}`;
  State.scorebug.awayTeam = awayCode;
  State.scorebug.homeTeam = homeCode;
  if (isLiveGame) {
    State.scorebug.status = `LIVE P${nextGame.period || 1}`;
    State.scorebug.awayScore = String(nextGame.awayScore ?? 0);
    State.scorebug.awayShots = String(nextGame.awaySog ?? 0);
    State.scorebug.homeScore = String(nextGame.homeScore ?? 0);
    State.scorebug.homeShots = String(nextGame.homeSog ?? 0);
  } else {
    State.scorebug.status = schedFmt.shortDayTime;
    State.scorebug.awayScore = '0';
    State.scorebug.awayShots = '0';
    State.scorebug.homeScore = '0';
    State.scorebug.homeShots = '0';
  }
  State.scorebug.panicLevel = torClub?.streakCode === 'L'
    ? Math.min(96, 56 + (torClub.streakCount || 1) * 6)
    : 42;

  // Update Ice Rink board banner & Quick Load Preset labels dynamically
  const iceEp = document.getElementById('iceBoardEpisode');
  if (iceEp) iceEp.textContent = `LFR20 • GAME ${gameNum}`;

  updatePresetDropdownLabels(nextGame, oppStar);
}

function updatePresetDropdownLabels(nextGame, oppStar) {
  const presetEl = document.getElementById('presetSelect');
  if (!presetEl || !nextGame) return;
  const gNum = nextGame.gameNumber || 21;
  const away = nextGame.awayAbbrev || 'MIN';
  const home = nextGame.homeAbbrev || 'TOR';
  const oppCode = home === 'TOR' ? away : home;
  const oppGoalie = LEAGUE.players.find(p => p.team === oppCode && p.isGoalie);
  const setOptText = (val, text) => {
    const opt = presetEl.querySelector(`option[value="${val}"]`);
    if (opt) opt.textContent = text;
  };
  setOptText('tonight', `Next Game: ${away} @ ${home} (Matthews #34)`);
  setOptText('h2h_next', `Superstar Duel (Matthews vs ${oppStar?.lastName || oppCode})`);
  setOptText('tape_game20', `Game ${gNum} Tale of Tape (${away} @ ${home})`);
  setOptText('tendy_battle', `Tendy Battle (Stolarz vs ${oppGoalie?.lastName || oppCode})`);
  setOptText('lfr_3stars', `LFR Stars to Watch (${away} @ ${home})`);
  setOptText('scorebug_live', `Game ${gNum} Scorebug & Panic (${away} @ ${home})`);
}

async function loadLeagueDatabase() {
  const [leagueRes, schedRes] = await Promise.all([
    fetch('assets/league_db.json'),
    fetch('assets/tor_schedule.json').catch(() => null)
  ]);
  const data = await leagueRes.json();
  LEAGUE.teams = data.teams || [];
  LEAGUE.players = data.players || [];
  LEAGUE.teamMap = {};
  LEAGUE.playerMap = {};

  LEAGUE.teams.forEach(t => {
    LEAGUE.teamMap[t.abbrev] = t;
    ensureLogoLoaded(t.abbrev, false);
    ensureLogoLoaded(t.abbrev, true);
  });

  LEAGUE.players.forEach(p => {
    LEAGUE.playerMap[p.id] = p;
  });

  if (schedRes && schedRes.ok) {
    try {
      const schedData = await schedRes.json();
      NHL_HUB.games = schedData.games || [];
      NHL_HUB.syncedAt = schedData.syncedAt || null;
      NHL_HUB.source = 'schedule-cache';
    } catch (_) {}
  }

  // Preload TOR Maple Leafs + top league stars immediately
  LEAGUE.players
    .filter(p => p.team === 'TOR' || (p.stats?.pts ?? 0) >= 18)
    .forEach(p => ensureHeadshotLoaded(p));

  const { nextGame, prevGame } = resolveUpcomingLeafsGame(NHL_HUB.games);
  if (nextGame) {
    applyUpcomingGameToStudio(nextGame, prevGame);
  }
}

function initCanvas() {
  canvas = document.getElementById('broadcastCanvas');
  ctx = canvas.getContext('2d', { alpha: true });
  canvas.width = 1920;
  canvas.height = 1080;
  requestAnimationFrame(renderLoop);
}

let parentWalkthroughPlaying = false;

function renderLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;

  if (State.view === 'editor' && !document.hidden && !parentWalkthroughPlaying) {
    if (State.isPlaying && !State.isExporting) {
      State.currentTime += delta;
      if (State.currentTime > State.duration) {
        if (State.isLooping) {
          State.currentTime = 0;
        } else {
          State.currentTime = State.duration;
          State.isPlaying = false;
          updatePlayBtn();
        }
      }
      updateScrubber();
    }
    drawFrame(State.currentTime, true);
  }
  requestAnimationFrame(renderLoop);
}

window.addEventListener('message', function (ev) {
  if (!ev || !ev.data) return;
  if (ev.data.action === 'pauseForWalkthrough') {
    parentWalkthroughPlaying = true;
    State.isPlaying = false;
    if (typeof updatePlayBtn === 'function') updatePlayBtn();
    const vid = document.getElementById('lfrRoomVideo');
    if (vid) vid.pause();
  } else if (ev.data.action === 'resumeAfterWalkthrough') {
    parentWalkthroughPlaying = false;
    if (typeof window.__syncLfrVideoPlayback === 'function') window.__syncLfrVideoPlayback();
  }
});

function updateScrubber() {
  const slider = document.getElementById('timelineSlider');
  const tc = document.getElementById('timecodeDisplay');
  if (slider) slider.value = State.currentTime;
  if (tc) tc.innerText = `${formatTimecode(State.currentTime)} / ${formatTimecode(State.duration)}`;
}

function updatePlayBtn() {
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');
  if (iconPlay && iconPause) {
    iconPlay.style.display = State.isPlaying ? 'none' : 'block';
    iconPause.style.display = State.isPlaying ? 'block' : 'none';
  }
}

function updateCenterIceWatermark() {
  const iceLogo = document.getElementById('centerIceLogo');
  if (!iceLogo) return;
  let code = State.teamFilter || 'TOR';
  if (State.template === 'teamtape') code = State.teamtape.homeTeam || 'TOR';
  else if (State.template === 'scorebug') code = State.scorebug.homeTeam || 'TOR';
  else if (State.template === 'standings') code = State.standings.focusTeam || 'TOR';
  else if (State.template === 'stat') {
    const p = getPlayerById(State.selectedPlayerId);
    if (p?.team) code = p.team;
  }
  const targetSrc = `assets/logos/${code}_light.svg`;
  if (!iceLogo.getAttribute('src')?.endsWith(targetSrc)) {
    iceLogo.src = targetSrc;
  }
  const ringTop = document.getElementById('iceRingTopText');
  if (ringTop) {
    ringTop.textContent = (LEAGUE.teamMap[code]?.teamName || 'TORONTO MAPLE LEAFS').toUpperCase();
  }
}

function drawFrame(t, renderBackdrop = true, targetCtx = ctx, scaleFactor = 1) {
  if (!targetCtx) return;
  targetCtx.save();
  targetCtx.setTransform(1, 0, 0, 1, 0, 0);
  targetCtx.shadowColor = 'transparent';
  targetCtx.shadowBlur = 0;
  targetCtx.shadowOffsetX = 0;
  targetCtx.shadowOffsetY = 0;
  targetCtx.clearRect(0, 0, 1920 * scaleFactor, 1080 * scaleFactor);

  if (scaleFactor !== 1) {
    targetCtx.scale(scaleFactor, scaleFactor);
  }
  targetCtx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in targetCtx) {
    targetCtx.imageSmoothingQuality = 'high';
  }

  if (renderBackdrop && State.backdrop === 'studio' && !State.isExporting) {
    drawBroadcastSafeGuide(targetCtx);
  }

  const inD = State.inDuration;
  const outD = State.outDuration;
  const holdEnd = State.duration - outD;

  const inProg = Math.min(1, Math.max(0, t / inD));
  const outProg = t > holdEnd ? Math.min(1, Math.max(0, (t - holdEnd) / outD)) : 0;

  targetCtx.save();
  switch (State.template) {
    case 'stat':
      drawTemplatePlayerChyron(targetCtx, t, inProg, outProg);
      break;
    case 'matchup':
      drawTemplateStarMatchup(targetCtx, t, inProg, outProg);
      break;
    case 'teamtape':
      drawTemplateTaleOfTape(targetCtx, t, inProg, outProg);
      break;
    case 'standings':
      drawTemplateStandings(targetCtx, t, inProg, outProg);
      break;
    case 'stamp':
      drawTemplateKineticStamp(targetCtx, t, inProg, outProg);
      break;
    case 'trade':
      drawTemplateTradeCard(targetCtx, t, inProg, outProg);
      break;
    case 'threestars':
      drawTemplateThreeStars(targetCtx, t, inProg, outProg);
      break;
    case 'scorebug':
      drawTemplateScorebugHUD(targetCtx, t, inProg, outProg);
      break;
  }
  targetCtx.restore();
  targetCtx.restore();
}

function drawBroadcastSafeGuide(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(67, 38, 1920 - 134, 1080 - 76);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  ctx.strokeRect(96, 54, 1920 - 192, 1080 - 108);
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
  ctx.font = '600 20px "JetBrains Mono", monospace';
  drawOpticalLeftText(ctx, 'ACTION SAFE 93%  •  TITLE SAFE 90%', 108, 80);
  ctx.restore();
}

// ==========================================================================
// TEMPLATE 1: APPLE TV+ × NHL.COM TWO-TIER PLAYER CARD (MOCKUP MATCH)
// ==========================================================================
function drawTemplatePlayerChyron(ctx, t, inProg, outProg) {
  const p = getPlayerById(State.selectedPlayerId) || {
    id: 8479318, firstName: 'Auston', lastName: 'Matthews', name: 'Auston Matthews',
    num: 34, pos: 'C', team: 'TOR', hasLocalMug: false
  };
  const theme = getTeamTheme(p.team);

  const easeIn = Ease.outExpo(inProg);
  const easeOut = Ease.outCubic(outProg);
  const alpha = Math.min(1, easeIn * 1.85) * (1 - easeOut);
  if (alpha <= 0.005) return;

  const w = 1480;
  const h = 182;
  const radius = 18;
  const baseX = (1920 - w) / 2; // Centered 220px left/right just like Apple TV+ / Sportsnet
  const baseY = 768;
  const slideY = 72 * (1 - easeIn) + 64 * easeOut;

  const upperH = 104;
  const lowerH = h - upperH; // 78px pure crisp ice-white stat strip
  const leftBayW = 392; // Holds white team crest + full-shoulder player cutout

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(baseX, baseY + slideY);

  // 1. Optional Top Broadcast Context Pill + Verdict Pill (Right of Player Head so zero overlap!)
  const ctxText = preserveSdpnBrandCase((State.stat.context || '').trim());
  const verdict = (State.stat.verdict || '').trim().toUpperCase();
  if (ctxText || verdict) {
    const pillY = -46;
    const pillH = 38;
    let curX = 414;

    drawSdpnBadge(ctx, curX, pillY, 82, pillH, 10);
    curX += 90;

    if (ctxText) {
      ctx.font = '700 20px "Inter", sans-serif';
      const m = ctx.measureText(ctxText);
      const cw = Math.min(540, Math.max(180, Math.ceil(m.width) + 38));
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = 'rgba(10, 14, 24, 0.92)';
      roundRectPath(ctx, curX, pillY, cw, pillH, 10);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.86)';
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, curX, pillY, cw, pillH, 10);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 20px "Inter", sans-serif';
      drawOpticalText(ctx, ctxText, curX + cw / 2, pillY + pillH / 2);
      curX += cw + 8;
    }

    if (verdict) {
      const vMap = {
        ELITE: { bg: '#0038A8', fg: '#FFFFFF' },
        BEASTON: { bg: '#F59E0B', fg: '#0A0A0C' },
        CLUTCH: { bg: '#059669', fg: '#FFFFFF' },
        GHOSTED: { bg: '#475569', fg: '#FFFFFF' },
        PAIN: { bg: '#DC2626', fg: '#FFFFFF' }
      };
      const vc = vMap[verdict] || { bg: theme.primary, fg: '#FFFFFF' };
      ctx.font = '800 20px "Inter", sans-serif';
      const vw = Math.max(110, Math.ceil(ctx.measureText(verdict).width) + 36);
      ctx.fillStyle = vc.bg;
      roundRectPath(ctx, curX, pillY, vw, pillH, 10);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = vc.fg;
      drawOpticalText(ctx, verdict, curX + vw / 2, pillY + pillH / 2);
    }
  }

  // 2. Realistic Soft Broadcast Drop Shadow + Rounded Card Base
  ctx.save();
  ctx.shadowColor = 'rgba(4, 9, 22, 0.48)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = theme.primary;
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.fill();
  ctx.restore();

  // 3. Clipped Two-Tier Interior Chambers (Team Primary Upper & Left + Pure White Lower-Right Stat Strip)
  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.clip();

  // Rich Team Primary Gradient across full card
  const upperGrad = ctx.createLinearGradient(0, 0, w, h);
  upperGrad.addColorStop(0, theme.chassisDeep);
  upperGrad.addColorStop(0.32, theme.primary);
  upperGrad.addColorStop(0.85, theme.chassisBright);
  upperGrad.addColorStop(1, theme.primary);
  ctx.fillStyle = upperGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle top specular sheen
  const sheen = ctx.createLinearGradient(0, 0, 0, upperH);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, upperH);

  // Pure Crisp Ice-White (#FFFFFF) Lower Stat Strip (Right of Player Cutout)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(leftBayW, upperH, w - leftBayW, lowerH);

  // Subtle Hairline Between Upper Team Tier & White Stat Tier
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(leftBayW, upperH - 1.5, w - leftBayW, 1.5);

  // Left High-Contrast White Team Crest (_dark.svg)
  drawTeamCrest(ctx, p.team, 94, h / 2 + 2, 126, 92, false);

  // Upper Name + Jersey Number (e.g. "AUSTON MATTHEWS   #34")
  const fullName = (p.name || 'PLAYER').toUpperCase();
  const numStr = `#${p.num}`;
  const nameStartX = 420;
  const rightPadX = w - 38;

  ctx.font = '700 50px "Inter", sans-serif';
  const numM = ctx.measureText(numStr);
  const numInkW = (numM.actualBoundingBoxLeft ?? 0) + (numM.actualBoundingBoxRight ?? numM.width);

  const availNameW = rightPadX - nameStartX - numInkW - 28;
  const namePx = fitFontSize(ctx, fullName, '800', '"Inter", sans-serif', 54, 34, availNameW);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${namePx}px "Inter", sans-serif`;
  drawOpticalLeftText(ctx, fullName, nameStartX, upperH / 2 + 1);

  ctx.fillStyle = 'rgba(226, 238, 255, 0.82)';
  ctx.font = `700 ${Math.min(50, namePx)}px "Inter", sans-serif`;
  drawOpticalRightText(ctx, numStr, rightPadX, upperH / 2 + 1);

  // Lower 4-Cell Stat Strip ("G: 2  |  A: 2  |  PTS: 4  |  SOG: 7")
  const statStripX = leftBayW + 18;
  const statStripW = w - statStripX - 18;
  const cellW = statStripW / 4;
  const cellCy = upperH + lowerH / 2;
  const statProg = Ease.outQuart(Math.min(1, Math.max(0, (t - 0.14) / 0.58)));

  State.stat.stats.forEach((st, i) => {
    const cxCell = statStripX + i * cellW + cellW / 2;

    if (i > 0) {
      const divX = Math.round(statStripX + i * cellW);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(divX, upperH + 16, 1.5, lowerH - 32);
    }

    const lbl = String(st.label || '').trim().toUpperCase();
    const val = formatAnimatedStat(st.val, statProg);
    const combined = lbl ? `${lbl}: ${val}` : val;
    const cellFontPx = fitFontSize(ctx, combined, '800', '"Barlow Condensed", sans-serif', 44, 28, cellW - 24);

    // Measure label & value separately so label renders in crisp #334155 and value in jet-black #0A0A0C
    ctx.font = `700 ${cellFontPx}px "Barlow Condensed", sans-serif`;
    const lblPart = lbl ? `${lbl}: ` : '';
    const lblW = ctx.measureText(lblPart).width;

    ctx.font = `900 ${cellFontPx}px "Barlow Condensed", sans-serif`;
    const valW = ctx.measureText(val).width;

    const gapW = lblPart ? 4 : 0;
    const totalW = lblW + gapW + valW;
    const startTextX = cxCell - totalW / 2;

    if (lblPart) {
      ctx.fillStyle = '#334155';
      ctx.font = `700 ${cellFontPx}px "Barlow Condensed", sans-serif`;
      drawOpticalLeftText(ctx, lblPart, startTextX, cellCy);
    }

    ctx.fillStyle = '#0A0A0C';
    ctx.font = `900 ${cellFontPx}px "Barlow Condensed", sans-serif`;
    drawOpticalLeftText(ctx, val, startTextX + lblW + gapW, cellCy);
  });

  ctx.restore();

  // 4. Outer 3.5px Crisp White Broadcast Frame (Drawn BEFORE Player Cutout so head breaks cleanly OVER top border!)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5;
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.stroke();

  // 5. Frame-Breaking Flush-Bottom Player Cutout
  // Clipped at bottom y = h - 2 (inside the white bottom border!) while extending freely up to y = -120!
  // heightPx = 274 -> visible hair rises ~42px ABOVE y = 0 top border!
  const cutoutPop = Ease.outQuart(Math.min(1, Math.max(0, (inProg - 0.08) / 0.85)));
  ctx.save();
  roundBottomHeadroomClipPath(ctx, 0, -130, w, h - 1.75, radius);
  ctx.clip();
  ctx.globalAlpha = alpha * cutoutPop;
  const popOffsetY = 30 * (1 - cutoutPop);
  drawPlayerCutout(ctx, p, 266, h - 1.75 + popOffsetY, 274, 148, 404);
  ctx.restore();

  ctx.restore();
}

// ==========================================================================
// TEMPLATE 2: HEAD-TO-HEAD STAR MATCHUP (ROUNDED TWO-CLUB DUEL CARD)
// ==========================================================================
function drawTemplateStarMatchup(ctx, t, inProg, outProg) {
  const leftP = getPlayerById(State.matchup.leftPlayerId) || LEAGUE.players[0];
  const rightP = getPlayerById(State.matchup.rightPlayerId) || LEAGUE.players[30] || LEAGUE.players[1];
  const leftTheme = getTeamTheme(leftP?.team || State.matchup.leftTeam);
  const rightTheme = getTeamTheme(rightP?.team || State.matchup.rightTeam);

  const easeIn = Ease.outExpo(inProg);
  const easeOut = Ease.outCubic(outProg);
  const alpha = Math.min(1, easeIn * 1.8) * (1 - easeOut);
  if (alpha <= 0.005) return;

  const w = 1620;
  const h = 258;
  const radius = 18;
  const baseX = (1920 - w) / 2;
  const baseY = 720;
  const slideY = 80 * (1 - easeIn) + 80 * easeOut;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(baseX, baseY + slideY);

  // Top Header Pill Strap (Centered, clear of left/right cutouts)
  const titleStr = preserveSdpnBrandCase(State.matchup.title || 'LFR20 • SUPERSTAR HEAD-TO-HEAD');
  const headW = 620;
  const headH = 38;
  const headX = (w - headW) / 2;
  const headY = -46;

  drawSdpnBadge(ctx, headX - 88, headY, 80, headH, 10);

  ctx.fillStyle = 'rgba(10, 14, 24, 0.92)';
  roundRectPath(ctx, headX, headY, headW, headH, 10);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 20px "Inter", sans-serif';
  drawOpticalText(ctx, titleStr, headX + headW / 2, headY + headH / 2);

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(4, 9, 22, 0.48)';
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#FFFFFF';
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.fill();
  ctx.restore();

  const wingW = 540;
  const centerW = w - wingW * 2; // 540px crisp white comparison chamber

  // Clipped Interior
  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.clip();

  // Left Wing (Team Color)
  const lGrad = ctx.createLinearGradient(0, 0, wingW, h);
  lGrad.addColorStop(0, leftTheme.chassisDeep);
  lGrad.addColorStop(0.55, leftTheme.primary);
  lGrad.addColorStop(1, leftTheme.chassisBright);
  ctx.fillStyle = lGrad;
  ctx.fillRect(0, 0, wingW, h);

  drawTeamCrest(ctx, leftP.team, wingW - 58, 52, 82, 56, false);

  ctx.fillStyle = 'rgba(226, 238, 255, 0.88)';
  ctx.font = '700 22px "Inter", sans-serif';
  drawOpticalLeftText(ctx, `#${leftP.num}  •  ${leftP.pos}  •  ${leftP.team}`, 240, 48);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '600 24px "Inter", sans-serif';
  drawOpticalLeftText(ctx, (leftP.firstName || '').toUpperCase(), 240, 102);

  const lLast = (leftP.lastName || leftP.name).toUpperCase();
  const lFont = fitFontSize(ctx, lLast, '900', '"Barlow Condensed", sans-serif', 58, 36, 280);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${lFont}px "Barlow Condensed", sans-serif`;
  drawOpticalLeftText(ctx, lLast, 240, 152);

  const lSub = leftP.isGoalie
    ? `${leftP.stats.record}  •  ${leftP.stats.svPct} SV%`
    : `${leftP.stats.gp} GP  •  ${leftP.stats.pts} PTS`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  roundRectPath(ctx, 240, 192, 272, 42, 10);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 21px "Barlow Condensed", sans-serif';
  drawOpticalText(ctx, `2026-27: ${lSub}`, 240 + 136, 213);

  // Right Wing (Team Color)
  const rx = wingW + centerW;
  const rGrad = ctx.createLinearGradient(w, 0, rx, h);
  rGrad.addColorStop(0, rightTheme.chassisDeep);
  rGrad.addColorStop(0.55, rightTheme.primary);
  rGrad.addColorStop(1, rightTheme.chassisBright);
  ctx.fillStyle = rGrad;
  ctx.fillRect(rx, 0, wingW, h);

  drawTeamCrest(ctx, rightP.team, rx + 58, 52, 82, 56, false);

  const rRightEdge = w - 240;
  ctx.fillStyle = 'rgba(226, 238, 255, 0.88)';
  ctx.font = '700 22px "Inter", sans-serif';
  drawOpticalRightText(ctx, `${rightP.team}  •  ${rightP.pos}  •  #${rightP.num}`, rRightEdge, 48);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '600 24px "Inter", sans-serif';
  drawOpticalRightText(ctx, (rightP.firstName || '').toUpperCase(), rRightEdge, 102);

  const rLast = (rightP.lastName || rightP.name).toUpperCase();
  const rFont = fitFontSize(ctx, rLast, '900', '"Barlow Condensed", sans-serif', 58, 36, 280);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${rFont}px "Barlow Condensed", sans-serif`;
  drawOpticalRightText(ctx, rLast, rRightEdge, 152);

  const rSub = rightP.isGoalie
    ? `${rightP.stats.record}  •  ${rightP.stats.svPct} SV%`
    : `${rightP.stats.gp} GP  •  ${rightP.stats.pts} PTS`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  roundRectPath(ctx, rRightEdge - 272, 192, 272, 42, 10);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 21px "Barlow Condensed", sans-serif';
  drawOpticalText(ctx, `2026-27: ${rSub}`, rRightEdge - 136, 213);

  // Center Crisp Ice-White Comparison Chamber (#FFFFFF)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(wingW, 0, centerW, h);

  const mode = (leftP.isGoalie || rightP.isGoalie) ? 'goalie' : State.matchup.statMode;
  let rows = [];
  if (mode === 'goalie') {
    rows = [
      { label: 'GP', lv: String(leftP.stats.gp ?? 0), rv: String(rightP.stats.gp ?? 0), cmp: (leftP.stats.gp ?? 0) - (rightP.stats.gp ?? 0) },
      { label: 'W-L-OT', lv: leftP.stats.record || '0-0-0', rv: rightP.stats.record || '0-0-0', cmp: (leftP.stats.wins ?? 0) - (rightP.stats.wins ?? 0) },
      { label: 'SV%', lv: leftP.stats.svPct || '.000', rv: rightP.stats.svPct || '.000', cmp: parseFloat(leftP.stats.svPct || 0) - parseFloat(rightP.stats.svPct || 0) },
      { label: 'GAA', lv: leftP.stats.gaa || '0.00', rv: rightP.stats.gaa || '0.00', cmp: parseFloat(rightP.stats.gaa || 9) - parseFloat(leftP.stats.gaa || 9) }
    ];
  } else if (mode === 'impact') {
    rows = [
      { label: 'GP', lv: String(leftP.stats.gp ?? 0), rv: String(rightP.stats.gp ?? 0), cmp: (leftP.stats.gp ?? 0) - (rightP.stats.gp ?? 0) },
      { label: 'PTS', lv: String(leftP.stats.pts ?? 0), rv: String(rightP.stats.pts ?? 0), cmp: (leftP.stats.pts ?? 0) - (rightP.stats.pts ?? 0) },
      { label: '+/-', lv: String(leftP.stats.plusMinus ?? '0'), rv: String(rightP.stats.plusMinus ?? '0'), cmp: parseInt(leftP.stats.plusMinus || 0, 10) - parseInt(rightP.stats.plusMinus || 0, 10) },
      { label: 'SOG', lv: String(leftP.stats.sog ?? 0), rv: String(rightP.stats.sog ?? 0), cmp: (leftP.stats.sog ?? 0) - (rightP.stats.sog ?? 0) }
    ];
  } else {
    const parseToiSec = s => {
      const parts = String(s || '0:00').split(':');
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    };
    rows = [
      { label: 'GOALS', lv: String(leftP.stats.g ?? 0), rv: String(rightP.stats.g ?? 0), cmp: (leftP.stats.g ?? 0) - (rightP.stats.g ?? 0) },
      { label: 'ASSISTS', lv: String(leftP.stats.a ?? 0), rv: String(rightP.stats.a ?? 0), cmp: (leftP.stats.a ?? 0) - (rightP.stats.a ?? 0) },
      { label: 'POINTS', lv: String(leftP.stats.pts ?? 0), rv: String(rightP.stats.pts ?? 0), cmp: (leftP.stats.pts ?? 0) - (rightP.stats.pts ?? 0) },
      { label: 'AVG TOI', lv: leftP.stats.toi || '0:00', rv: rightP.stats.toi || '0:00', cmp: parseToiSec(leftP.stats.toi) - parseToiSec(rightP.stats.toi) }
    ];
  }

  const statProg = Ease.outQuart(Math.min(1, Math.max(0, (t - 0.15) / 0.58)));
  const rowH = 52;
  const rowGap = 8;
  const startY = 15;

  rows.forEach((r, idx) => {
    const ry = startY + idx * (rowH + rowGap);
    const rcy = ry + rowH / 2;

    ctx.fillStyle = '#F3F5F8';
    roundRectPath(ctx, wingW + 16, ry, centerW - 32, rowH, 10);
    ctx.fill();

    const pillW = 124;
    const pillX = wingW + (centerW - pillW) / 2;

    if (r.cmp > 0) {
      ctx.fillStyle = rgba(leftTheme.primary, 0.12);
      roundRectPath(ctx, wingW + 16, ry, pillX - (wingW + 16) - 6, rowH, 10);
      ctx.fill();
    } else if (r.cmp < 0) {
      const rxStart = pillX + pillW + 6;
      ctx.fillStyle = rgba(rightTheme.primary, 0.12);
      roundRectPath(ctx, rxStart, ry, wingW + centerW - 16 - rxStart, rowH, 10);
      ctx.fill();
    }

    ctx.fillStyle = '#E2E8F0';
    roundRectPath(ctx, pillX, ry + 7, pillW, rowH - 14, 8);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.font = '800 21px "Barlow Condensed", sans-serif';
    drawOpticalText(ctx, r.label, pillX + pillW / 2, rcy);

    const lVal = formatAnimatedStat(r.lv, statProg);
    const rVal = formatAnimatedStat(r.rv, statProg);

    ctx.fillStyle = r.cmp > 0 ? leftTheme.primary : '#0A0A0C';
    ctx.font = '900 38px "Barlow Condensed", sans-serif';
    drawOpticalText(ctx, lVal, wingW + 16 + (pillX - (wingW + 16)) / 2, rcy);

    ctx.fillStyle = r.cmp < 0 ? rightTheme.primary : '#0A0A0C';
    ctx.font = '900 38px "Barlow Condensed", sans-serif';
    const rightZoneStart = pillX + pillW;
    drawOpticalText(ctx, rVal, rightZoneStart + (wingW + centerW - 16 - rightZoneStart) / 2, rcy);
  });

  ctx.restore();

  // Outer 3.5px White Broadcast Border
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5;
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.stroke();

  // Frame-Breaking Left & Right Player Cutouts (Heads break ~42px above top border, bottoms clipped flush!)
  ctx.save();
  roundBottomHeadroomClipPath(ctx, 0, -130, w, h - 1.75, radius);
  ctx.clip();
  drawPlayerCutout(ctx, leftP, 122, h - 1.75, 354, 4, 236);
  drawPlayerCutout(ctx, rightP, w - 122, h - 1.75, 354, w - 236, w - 4);
  ctx.restore();

  ctx.restore();
}

// ==========================================================================
// TEMPLATE 3: TALE OF THE TAPE (APPLE TV+ × NHL.COM TEAM COMPARISON BOARD)
// ==========================================================================
function drawTemplateTaleOfTape(ctx, t, inProg, outProg) {
  const awayCode = State.teamtape.awayTeam || 'COL';
  const homeCode = State.teamtape.homeTeam || 'TOR';
  const awayClub = LEAGUE.teamMap[awayCode] || { abbrev: awayCode, record: '10-5-1', points: 21, gfPerGame: '3.50', gaPerGame: '2.80', goalDifferential: 8, streak: 'W2', divisionSequence: 2, divisionName: 'Central' };
  const homeClub = LEAGUE.teamMap[homeCode] || { abbrev: homeCode, record: '8-9-2', points: 18, gfPerGame: '3.37', gaPerGame: '3.37', goalDifferential: 0, streak: 'L3', divisionSequence: 6, divisionName: 'Atlantic' };

  const awayTheme = getTeamTheme(awayCode);
  const homeTheme = getTeamTheme(homeCode);

  const easeIn = Ease.outExpo(inProg);
  const easeOut = Ease.outCubic(outProg);
  const alpha = Math.min(1, easeIn * 1.8) * (1 - easeOut);
  if (alpha <= 0.005) return;

  const w = 1400;
  const h = 720;
  const radius = 20;
  const bx = (1920 - w) / 2;
  const by = (1080 - h) / 2 + 36 * (1 - easeIn) + 36 * easeOut;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(bx, by);

  // Ambient Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(4, 9, 22, 0.46)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#FFFFFF';
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.clip();

  // Top Studio Header Strip (h = 64)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, w, 64);
  drawSdpnBadge(ctx, 22, 13, 86, 38, 9);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 26px "Inter", sans-serif';
  drawOpticalLeftText(ctx, preserveSdpnBrandCase(State.teamtape.header || 'TALE OF THE TAPE'), 124, 32);

  ctx.fillStyle = '#93C5FD';
  ctx.font = '700 21px "Inter", sans-serif';
  drawOpticalRightText(ctx, (State.teamtape.subheader || '').toUpperCase(), w - 26, 32);

  // Dual Team Hero Chambers (y = 64, h = 158)
  const heroY = 64;
  const heroH = 158;
  const halfW = w / 2;

  const aGrad = ctx.createLinearGradient(0, heroY, halfW, heroY + heroH);
  aGrad.addColorStop(0, awayTheme.chassisDeep);
  aGrad.addColorStop(1, awayTheme.primary);
  ctx.fillStyle = aGrad;
  ctx.fillRect(0, heroY, halfW, heroH);

  const hGrad = ctx.createLinearGradient(w, heroY, halfW, heroY + heroH);
  hGrad.addColorStop(0, homeTheme.chassisDeep);
  hGrad.addColorStop(1, homeTheme.primary);
  ctx.fillStyle = hGrad;
  ctx.fillRect(halfW, heroY, halfW, heroH);

  drawTeamCrest(ctx, awayCode, 104, heroY + heroH / 2, 132, 92, false);
  ctx.fillStyle = 'rgba(226, 238, 255, 0.85)';
  ctx.font = '700 21px "Inter", sans-serif';
  drawOpticalLeftText(ctx, `VISITOR  •  #${awayClub.divisionSequence || '-'} ${(awayClub.divisionName || '').toUpperCase()}`, 192, heroY + 48);

  const aNameFont = fitFontSize(ctx, awayTheme.teamName.toUpperCase(), '800', '"Inter", sans-serif', 40, 26, 430);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${aNameFont}px "Inter", sans-serif`;
  drawOpticalLeftText(ctx, awayTheme.teamName.toUpperCase(), 192, heroY + 104);

  drawTeamCrest(ctx, homeCode, w - 104, heroY + heroH / 2, 132, 92, false);
  ctx.fillStyle = 'rgba(226, 238, 255, 0.85)';
  ctx.font = '700 21px "Inter", sans-serif';
  drawOpticalRightText(ctx, `#${homeClub.divisionSequence || '-'} ${(homeClub.divisionName || '').toUpperCase()}  •  HOME`, w - 192, heroY + 48);

  const hNameFont = fitFontSize(ctx, homeTheme.teamName.toUpperCase(), '800', '"Inter", sans-serif', 40, 26, 430);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${hNameFont}px "Inter", sans-serif`;
  drawOpticalRightText(ctx, homeTheme.teamName.toUpperCase(), w - 192, heroY + 104);

  // Center VS Pill
  ctx.fillStyle = '#FFFFFF';
  roundRectPath(ctx, halfW - 40, heroY + heroH / 2 - 28, 80, 56, 14);
  ctx.fill();
  ctx.fillStyle = '#0A0A0C';
  ctx.font = '900 30px "Inter", sans-serif';
  drawOpticalText(ctx, 'VS', halfW, heroY + heroH / 2);

  // Crisp Daylight Broadcast Comparison Deck
  const deckY = heroY + heroH;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, deckY, w, h - deckY);

  const fmtDiff = d => (Number(d) > 0 ? `+${d}` : String(d ?? 0));
  const rows = [
    { label: 'SEASON RECORD', lv: awayClub.record, rv: homeClub.record, lNum: awayClub.wins || 1, rNum: homeClub.wins || 1 },
    { label: 'TOTAL POINTS', lv: String(awayClub.points ?? 0), rv: String(homeClub.points ?? 0), lNum: awayClub.points || 1, rNum: homeClub.points || 1 },
    { label: 'GOALS FOR / GP', lv: String(awayClub.gfPerGame || '0.00'), rv: String(homeClub.gfPerGame || '0.00'), lNum: parseFloat(awayClub.gfPerGame) || 1, rNum: parseFloat(homeClub.gfPerGame) || 1 },
    { label: 'GOALS AGAINST / GP', lv: String(awayClub.gaPerGame || '0.00'), rv: String(homeClub.gaPerGame || '0.00'), lNum: 1 / Math.max(0.5, parseFloat(awayClub.gaPerGame) || 3), rNum: 1 / Math.max(0.5, parseFloat(homeClub.gaPerGame) || 3) },
    { label: 'GOAL DIFF  •  STREAK', lv: `${fmtDiff(awayClub.goalDifferential)}  (${awayClub.streak})`, rv: `${fmtDiff(homeClub.goalDifferential)}  (${homeClub.streak})`, lNum: (awayClub.goalDifferential || 0) + 40, rNum: (homeClub.goalDifferential || 0) + 40 }
  ];

  const rowsStartY = deckY + 20;
  const rowH = 80;
  const rowGap = 12;
  const barProg = Ease.outQuart(Math.min(1, Math.max(0, (t - 0.14) / 0.62)));

  rows.forEach((r, i) => {
    const ry = rowsStartY + i * (rowH + rowGap);
    const rcy = ry + rowH / 2;

    ctx.fillStyle = '#F5F7FA';
    roundRectPath(ctx, 28, ry, w - 56, rowH, 12);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Tug-of-War Proportional Bars
    const total = Math.max(0.01, Math.max(0.1, r.lNum) + Math.max(0.1, r.rNum));
    const lShare = Math.max(0.14, Math.min(0.86, Math.max(0.1, r.lNum) / total));
    const barSpan = 560;
    const barY = ry + rowH - 9;

    ctx.fillStyle = awayTheme.primary;
    ctx.fillRect(halfW - barSpan * lShare * barProg, barY, barSpan * lShare * barProg, 5);
    ctx.fillStyle = homeTheme.primary;
    ctx.fillRect(halfW, barY, barSpan * (1 - lShare) * barProg, 5);

    const cPillW = 286;
    const cPillX = halfW - cPillW / 2;
    ctx.fillStyle = '#E2E8F0';
    roundRectPath(ctx, cPillX, ry + 15, cPillW, rowH - 32, 10);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.font = '800 22px "Barlow Condensed", sans-serif';
    drawOpticalText(ctx, r.label, halfW, rcy - 1);

    const lBetter = r.lNum > r.rNum;
    const rBetter = r.rNum > r.lNum;

    ctx.fillStyle = lBetter ? awayTheme.primary : '#0A0A0C';
    ctx.font = '900 42px "Barlow Condensed", sans-serif';
    drawOpticalText(ctx, formatAnimatedStat(r.lv, barProg), 28 + (cPillX - 28) / 2, rcy - 2);

    ctx.fillStyle = rBetter ? homeTheme.primary : '#0A0A0C';
    ctx.font = '900 42px "Barlow Condensed", sans-serif';
    const rStart = cPillX + cPillW;
    drawOpticalText(ctx, formatAnimatedStat(r.rv, barProg), rStart + (w - 28 - rStart) / 2, rcy - 2);
  });

  ctx.restore();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5;
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.stroke();

  ctx.restore();
}

// ==========================================================================
// TEMPLATE 4: LIVE NHL DIVISION STANDINGS BOARD (APPLE TV+ CLEAN TABLE)
// ==========================================================================
function drawTemplateStandings(ctx, t, inProg, outProg) {
  const divName = State.standings.division || 'Atlantic';
  const focusCode = State.standings.focusTeam || 'TOR';

  let divTeams = LEAGUE.teams
    .filter(c => (c.divisionName || '').toLowerCase() === divName.toLowerCase())
    .sort((a, b) => (a.divisionSequence || 99) - (b.divisionSequence || 99) || (b.points || 0) - (a.points || 0));

  if (!divTeams.length) divTeams = LEAGUE.teams.slice(0, 8);
  divTeams = divTeams.slice(0, 8);

  const easeIn = Ease.outExpo(inProg);
  const easeOut = Ease.outCubic(outProg);
  const alpha = Math.min(1, easeIn * 1.8) * (1 - easeOut);
  if (alpha <= 0.005) return;

  const w = 1420;
  const h = 790;
  const radius = 20;
  const bx = (1920 - w) / 2;
  const by = (1080 - h) / 2 + 34 * (1 - easeIn) + 34 * easeOut;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(bx, by);

  ctx.save();
  ctx.shadowColor = 'rgba(4, 9, 22, 0.46)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#FFFFFF';
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.clip();

  // Top Header Strip
  const focusTheme = getTeamTheme(focusCode);
  const headGrad = ctx.createLinearGradient(0, 0, w, 0);
  headGrad.addColorStop(0, '#0F172A');
  headGrad.addColorStop(0.6, focusTheme.primary);
  headGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = headGrad;
  ctx.fillRect(0, 0, w, 72);

  drawSdpnBadge(ctx, 24, 16, 88, 40, 9);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 30px "Inter", sans-serif';
  drawOpticalLeftText(ctx, `NHL ${divName.toUpperCase()} DIVISION STANDINGS`, 130, 36);

  ctx.fillStyle = 'rgba(226, 238, 255, 0.9)';
  ctx.font = '700 21px "Inter", sans-serif';
  drawOpticalRightText(ctx, preserveSdpnBrandCase(State.standings.subtitle || '2026-27 PLAYOFF RACE'), w - 28, 36);

  // Column Header Bar
  const colY = 72;
  const colH = 44;
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, colY, w, colH);

  const cols = {
    rk: 62,
    crest: 144,
    club: 206,
    gp: 760,
    rec: 915,
    pts: 1075,
    diff: 1205,
    strk: 1330
  };

  ctx.fillStyle = '#475569';
  ctx.font = '700 20px "Inter", sans-serif';
  drawOpticalText(ctx, 'RK', cols.rk, colY + colH / 2);
  drawOpticalLeftText(ctx, 'NHL CLUB', cols.club, colY + colH / 2);
  drawOpticalText(ctx, 'GP', cols.gp, colY + colH / 2);
  drawOpticalText(ctx, 'W-L-OT', cols.rec, colY + colH / 2);
  drawOpticalText(ctx, 'PTS', cols.pts, colY + colH / 2);
  drawOpticalText(ctx, 'DIFF', cols.diff, colY + colH / 2);
  drawOpticalText(ctx, 'STRK', cols.strk, colY + colH / 2);

  // Table Body
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, colY + colH, w, h - (colY + colH));

  const startY = colY + colH + 12;
  const rowH = 70;
  const rowGap = 8;

  divTeams.forEach((club, idx) => {
    const cutlineOffset = idx >= 3 ? 10 : 0;
    const ry = startY + idx * (rowH + rowGap) + cutlineOffset;
    const rcy = ry + rowH / 2;
    const isFocus = club.abbrev === focusCode;
    const cTheme = getTeamTheme(club.abbrev);

    if (idx === 3) {
      const lineY = ry - 9;
      ctx.save();
      ctx.strokeStyle = '#0038A8';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(26, lineY);
      ctx.lineTo(w - 26, lineY);
      ctx.stroke();
      ctx.restore();
    }

    const rowSlide = 26 * (1 - Ease.outQuart(Math.min(1, Math.max(0, (inProg - idx * 0.04) / 0.68))));
    ctx.save();
    ctx.translate(rowSlide, 0);

    if (isFocus) {
      const fg = ctx.createLinearGradient(22, ry, w - 22, ry);
      fg.addColorStop(0, cTheme.chassisDeep);
      fg.addColorStop(0.5, cTheme.primary);
      fg.addColorStop(1, cTheme.chassisBright);
      ctx.fillStyle = fg;
      roundRectPath(ctx, 22, ry, w - 44, rowH, 12);
      ctx.fill();
    } else {
      ctx.fillStyle = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
      roundRectPath(ctx, 22, ry, w - 44, rowH, 12);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Rank Badge
    ctx.fillStyle = isFocus ? '#FFFFFF' : idx < 3 ? '#0038A8' : '#E2E8F0';
    roundRectPath(ctx, cols.rk - 20, ry + 16, 40, 38, 9);
    ctx.fill();
    ctx.fillStyle = isFocus ? cTheme.primary : idx < 3 ? '#FFFFFF' : '#334155';
    ctx.font = '800 22px "Inter", sans-serif';
    drawOpticalText(ctx, String(idx + 1), cols.rk, rcy);

    // Logo (_dark.svg on dark focused row, _light.svg on white rows!)
    drawTeamCrest(ctx, club.abbrev, cols.crest, rcy, 62, 44, !isFocus);

    ctx.fillStyle = isFocus ? '#FFFFFF' : '#0A0A0C';
    ctx.font = `${isFocus ? '800' : '700'} 28px "Inter", sans-serif`;
    drawOpticalLeftText(ctx, club.teamName, cols.club, rcy);

    ctx.fillStyle = isFocus ? 'rgba(255,255,255,0.9)' : '#334155';
    ctx.font = '700 28px "Barlow Condensed", sans-serif';
    drawOpticalText(ctx, String(club.gamesPlayed), cols.gp, rcy);
    drawOpticalText(ctx, club.record, cols.rec, rcy);

    // Points Pill
    ctx.fillStyle = isFocus ? '#FFFFFF' : '#EFF6FF';
    roundRectPath(ctx, cols.pts - 40, ry + 13, 80, rowH - 26, 9);
    ctx.fill();
    ctx.fillStyle = isFocus ? cTheme.primary : '#0038A8';
    ctx.font = '900 32px "Barlow Condensed", sans-serif';
    drawOpticalText(ctx, String(club.points), cols.pts, rcy);

    const gd = Number(club.goalDifferential || 0);
    const gdStr = gd > 0 ? `+${gd}` : String(gd);
    ctx.fillStyle = isFocus
      ? '#FFFFFF'
      : gd > 0 ? '#059669' : gd < 0 ? '#DC2626' : '#475569';
    ctx.font = '800 27px "Barlow Condensed", sans-serif';
    drawOpticalText(ctx, gdStr, cols.diff, rcy);

    const isWin = String(club.streak || '').startsWith('W');
    const isLoss = String(club.streak || '').startsWith('L');
    ctx.fillStyle = isFocus
      ? '#FDE68A'
      : isWin ? '#059669' : isLoss ? '#DC2626' : '#D97706';
    ctx.font = '800 27px "Barlow Condensed", sans-serif';
    drawOpticalText(ctx, club.streak || '-', cols.strk, rcy);

    ctx.restore();
  });

  ctx.restore();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5;
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.stroke();

  ctx.restore();
}

// ==========================================================================
// TEMPLATE 5: DANG-IT! / HAT-PICK! KINETIC BROADCAST STAMP
// ==========================================================================
function drawTemplateKineticStamp(ctx, t, inProg, outProg) {
  const isDang = State.stamp.type === 'dangit';
  const featPlayer = getPlayerById(State.stamp.playerId);

  const slamScale = inProg < 1 ? 1.42 - 0.42 * Ease.outExpo(inProg) : 1 - 0.12 * Ease.outCubic(outProg);
  const alpha = Math.min(1, inProg * 3.0) * (1 - Ease.outCubic(outProg));
  if (alpha <= 0.005) return;

  let shakeX = 0, shakeY = 0;
  if (t > 0.12 && t < 0.32) {
    const decay = 1 - (t - 0.12) / 0.20;
    shakeX = Math.sin(t * 165) * 8 * decay;
    shakeY = Math.cos(t * 140) * 6 * decay;
  }

  const primaryHex = isDang ? '#DC2626' : '#F59E0B';
  const stampTag = isDang ? 'DANG-IT!' : 'HAT-PICK!';

  const plateW = featPlayer ? 1340 : 1200;
  const plateH = 224;
  const upperH = 152;
  const lowerH = plateH - upperH; // 72px crisp white subtext strip
  const radius = 20;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(960 + shakeX, 540 + shakeY);
  ctx.scale(slamScale, slamScale);

  const x = -plateW / 2;
  const y = -plateH / 2;

  // Top Stamp Pill Collar (Shifted right of player cutout when active!)
  const collarX = x + (featPlayer ? 310 : 28);
  const collarY = y - 48;
  drawSdpnBadge(ctx, collarX, collarY, 88, 40, 10);

  ctx.fillStyle = '#0F172A';
  roundRectPath(ctx, collarX + 96, collarY, 210, 40, 10);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = isDang ? '#FCA5A5' : '#FDE68A';
  ctx.font = '900 24px "Inter", sans-serif';
  drawOpticalText(ctx, stampTag, collarX + 96 + 105, collarY + 20);

  // Drop Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(4, 9, 22, 0.52)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = primaryHex;
  roundRectPath(ctx, x, y, plateW, plateH, radius);
  ctx.fill();
  ctx.restore();

  // Clipped Two-Tier Body
  ctx.save();
  roundRectPath(ctx, x, y, plateW, plateH, radius);
  ctx.clip();

  const grad = ctx.createLinearGradient(x, y, x + plateW, y + upperH);
  if (isDang) {
    grad.addColorStop(0, '#991B1B');
    grad.addColorStop(0.5, '#DC2626');
    grad.addColorStop(1, '#B91C1C');
  } else {
    grad.addColorStop(0, '#FBBF24');
    grad.addColorStop(0.55, '#F59E0B');
    grad.addColorStop(1, '#D97706');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, plateW, plateH);

  const leftCutoutBay = featPlayer ? 300 : 0;

  // Lower Crisp White Callout Strip
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + leftCutoutBay, y + upperH, plateW - leftCutoutBay, lowerH);

  // Headline
  const headline = preserveSdpnBrandCase(State.stamp.headline || stampTag);
  const textZoneX = x + leftCutoutBay;
  const textZoneW = plateW - leftCutoutBay;
  const headPx = fitFontSize(ctx, headline, '900', '"Barlow Condensed", sans-serif', 98, 52, textZoneW - 72);

  ctx.fillStyle = isDang ? '#FFFFFF' : '#0A0A0C';
  ctx.font = `900 ${headPx}px "Barlow Condensed", sans-serif`;
  drawOpticalText(ctx, headline, textZoneX + textZoneW / 2, y + upperH / 2 + 2);

  // Subtext in White Lower Strip
  const sub = preserveSdpnBrandCase((State.stamp.subtext || '').trim());
  const subFont = fitFontSize(ctx, sub, '800', '"Inter", sans-serif', 25, 20, textZoneW - 64);
  ctx.fillStyle = '#0A0A0C';
  ctx.font = `800 ${subFont}px "Inter", sans-serif`;
  drawOpticalText(ctx, sub, textZoneX + textZoneW / 2, y + upperH + lowerH / 2);

  ctx.restore();

  // Outer 4px White Frame
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  roundRectPath(ctx, x, y, plateW, plateH, radius);
  ctx.stroke();

  // Optional Player Cutout Breaking Top Frame
  if (featPlayer) {
    ctx.save();
    roundBottomHeadroomClipPath(ctx, x, y - 130, plateW, y + plateH - 2, radius);
    ctx.clip();
    drawPlayerCutout(ctx, featPlayer, x + 156, y + plateH - 2, 326, x + 6, x + 306);
    ctx.restore();
  }

  ctx.restore();
}

// ==========================================================================
// TEMPLATE 6: TRADE ALERT / ROSTER BREAKDOWN CARD (ZERO DEAD SPACE)
// ==========================================================================
function drawTemplateTradeCard(ctx, t, inProg, outProg) {
  const leftCode = State.trade.leftTeam || 'TOR';
  const rightCode = State.trade.rightTeam || 'CBJ';
  const leftTheme = getTeamTheme(leftCode);
  const rightTheme = getTeamTheme(rightCode);

  const leftItems = State.trade.leftItems.length ? State.trade.leftItems : ['Roster Asset'];
  const rightItems = State.trade.rightItems.length ? State.trade.rightItems : ['Draft Capital'];
  const maxRows = Math.max(leftItems.length, rightItems.length);

  const easeIn = Ease.outExpo(inProg);
  const easeOut = Ease.outCubic(outProg);
  const alpha = Math.min(1, easeIn * 1.8) * (1 - easeOut);
  if (alpha <= 0.005) return;

  const w = 1440;
  const radius = 20;
  const topBarH = 66;
  const clubHeadH = 116;
  const rowH = 66;
  const rowGap = 12;
  const bodyPadY = 24;
  const bodyH = bodyPadY * 2 + maxRows * rowH + (maxRows - 1) * rowGap;
  const tickerH = 56;
  const h = topBarH + clubHeadH + bodyH + tickerH;

  const bx = (1920 - w) / 2;
  const by = (1080 - h) / 2 + 36 * (1 - easeIn) + 36 * easeOut;
  const halfW = w / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(bx, by);

  ctx.save();
  ctx.shadowColor = 'rgba(4, 9, 22, 0.48)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#FFFFFF';
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.clip();

  // 1. Breaking Crimson/Slate Top Strap
  const headGrad = ctx.createLinearGradient(0, 0, w, 0);
  headGrad.addColorStop(0, '#DC2626');
  headGrad.addColorStop(0.38, '#991B1B');
  headGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = headGrad;
  ctx.fillRect(0, 0, w, topBarH);

  drawSdpnBadge(ctx, 22, 13, 88, 40, 9);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 28px "Inter", sans-serif';
  drawOpticalLeftText(ctx, preserveSdpnBrandCase(State.trade.badge || 'TRADE ALERT'), 128, topBarH / 2);

  ctx.fillStyle = '#FDE68A';
  ctx.font = '700 20px "Inter", sans-serif';
  drawOpticalRightText(ctx, 'INSTANT ROSTER & CAP BREAKDOWN', w - 26, topBarH / 2);

  // 2. Dual Club Header Chambers
  const cyClub = topBarH;
  const drawClubTop = (ox, theme, subtitle) => {
    const g = ctx.createLinearGradient(ox, cyClub, ox + halfW, cyClub + clubHeadH);
    g.addColorStop(0, theme.chassisDeep);
    g.addColorStop(1, theme.primary);
    ctx.fillStyle = g;
    ctx.fillRect(ox, cyClub, halfW, clubHeadH);

    drawTeamCrest(ctx, theme.abbrev, ox + 78, cyClub + clubHeadH / 2, 104, 72, false);

    const titleUpper = theme.teamName.toUpperCase();
    const tFont = fitFontSize(ctx, titleUpper, '800', '"Inter", sans-serif', 34, 24, halfW - 185);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${tFont}px "Inter", sans-serif`;
    drawOpticalLeftText(ctx, titleUpper, ox + 148, cyClub + 44);

    ctx.fillStyle = 'rgba(226, 238, 255, 0.9)';
    ctx.font = '700 21px "Inter", sans-serif';
    drawOpticalLeftText(ctx, (subtitle || 'ACQUIRES').toUpperCase(), ox + 148, cyClub + 84);
  };

  drawClubTop(0, leftTheme, State.trade.leftSubtitle);
  drawClubTop(halfW, rightTheme, State.trade.rightSubtitle);

  // 3. Crisp White Asset Return Columns
  const bodyY = topBarH + clubHeadH;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, bodyY, w, bodyH);

  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(halfW - 1, topBarH, 2, clubHeadH + bodyH);

  const drawAssetList = (items, ox, theme) => {
    items.forEach((item, idx) => {
      const ry = bodyY + bodyPadY + idx * (rowH + rowGap);
      const pillX = ox + 26;
      const pillW = halfW - 52;

      ctx.fillStyle = '#F5F7FA';
      roundRectPath(ctx, pillX, ry, pillW, rowH, 12);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = theme.primary;
      roundRectPath(ctx, pillX, ry, 8, rowH, 4);
      ctx.fill();

      const itemFont = fitFontSize(ctx, item, '700', '"Inter", sans-serif', 27, 20, pillW - 48);
      ctx.fillStyle = '#0A0A0C';
      ctx.font = `700 ${itemFont}px "Inter", sans-serif`;
      drawOpticalLeftText(ctx, item, pillX + 26, ry + rowH / 2);
    });
  };

  drawAssetList(leftItems, 0, leftTheme);
  drawAssetList(rightItems, halfW, rightTheme);

  // Center SWAP Badge
  ctx.fillStyle = '#FFFFFF';
  roundRectPath(ctx, halfW - 48, cyClub + clubHeadH - 22, 96, 44, 12);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#0A0A0C';
  ctx.font = '800 20px "Inter", sans-serif';
  drawOpticalText(ctx, 'SWAP', halfW, cyClub + clubHeadH);

  // 4. Bottom Ticker Strip
  const tickY = bodyY + bodyH;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, tickY, w, tickerH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 21px "Inter", sans-serif';
  drawOpticalLeftText(ctx, preserveSdpnBrandCase(State.trade.ticker || 'sdpn INSTANT REACTION'), 28, tickY + tickerH / 2);

  ctx.restore();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5;
  roundRectPath(ctx, 0, 0, w, h, radius);
  ctx.stroke();

  ctx.restore();
}

// ==========================================================================
// TEMPLATE 7: THREE STARS / LFR POST-GAME PODIUM (3 ROUNDED CARDS)
// ==========================================================================
function drawTemplateThreeStars(ctx, t, inProg, outProg) {
  const easeIn = Ease.outExpo(inProg);
  const easeOut = Ease.outCubic(outProg);
  const alpha = Math.min(1, easeIn * 1.8) * (1 - easeOut);
  if (alpha <= 0.005) return;

  const w = 1520;
  const h = 696;
  const bx = (1920 - w) / 2;
  const by = (1080 - h) / 2 + 34 * (1 - easeIn) + 34 * easeOut;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(bx, by);

  // Top Header Pill Bar
  ctx.save();
  ctx.shadowColor = 'rgba(4, 9, 22, 0.38)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#0F172A';
  roundRectPath(ctx, 0, 0, w, 66, 16);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, 0, 0, w, 66, 16);
  ctx.stroke();

  drawSdpnBadge(ctx, 20, 13, 88, 40, 9);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 28px "Inter", sans-serif';
  drawOpticalLeftText(ctx, preserveSdpnBrandCase(State.threestars.header || 'LFR20 • THREE STARS OF THE GAME'), 126, 33);

  const isVerdict = State.threestars.mode === 'verdict';
  const badges = isVerdict
    ? [
        { label: 'THE HERO', bg: '#F59E0B', fg: '#0A0A0C' },
        { label: 'THE SPARK', bg: '#0038A8', fg: '#FFFFFF' },
        { label: 'THE PAIN', bg: '#DC2626', fg: '#FFFFFF' }
      ]
    : [
        { label: '1ST STAR', bg: '#F59E0B', fg: '#0A0A0C' },
        { label: '2ND STAR', bg: '#E2E8F0', fg: '#0A0A0C' },
        { label: '3RD STAR', bg: '#FED7AA', fg: '#7C2D12' }
      ];

  const colGap = 32;
  const colW = (w - colGap * 2) / 3;
  const cardY = 90;
  const cardH = h - cardY; // 606px
  const portraitH = 386;
  const deckH = cardH - portraitH; // 220px crisp white nameplate & stat deck

  State.threestars.slots.forEach((slot, idx) => {
    const p = getPlayerById(slot.playerId) || LEAGUE.players[idx] || LEAGUE.players[0];
    const theme = getTeamTheme(p.team);
    const badge = badges[idx];
    const cxCol = idx * (colW + colGap);
    const cardPop = Ease.outQuart(Math.min(1, Math.max(0, (inProg - idx * 0.08) / 0.72)));

    ctx.save();
    ctx.globalAlpha = alpha * cardPop;
    ctx.translate(cxCol, cardY + 34 * (1 - cardPop));

    ctx.save();
    ctx.shadowColor = 'rgba(4, 9, 22, 0.46)';
    ctx.shadowBlur = 38;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = '#FFFFFF';
    roundRectPath(ctx, 0, 0, colW, cardH, 18);
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRectPath(ctx, 0, 0, colW, cardH, 18);
    ctx.clip();

    // Upper Team-Colored Portrait Stage
    const pGrad = ctx.createLinearGradient(0, 0, colW, portraitH);
    pGrad.addColorStop(0, theme.chassisDeep);
    pGrad.addColorStop(0.6, theme.primary);
    pGrad.addColorStop(1, theme.chassisBright);
    ctx.fillStyle = pGrad;
    ctx.fillRect(0, 0, colW, portraitH);

    // Subtle Jersey Number Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.font = '900 190px "Barlow Condensed", sans-serif';
    drawOpticalText(ctx, String(p.num), colW * 0.76, portraitH * 0.56);

    // Ribbon Pill + White Team Crest
    ctx.fillStyle = badge.bg;
    roundRectPath(ctx, 18, 18, 152, 42, 10);
    ctx.fill();
    ctx.fillStyle = badge.fg;
    ctx.font = '800 21px "Inter", sans-serif';
    drawOpticalText(ctx, badge.label, 18 + 76, 39);

    drawTeamCrest(ctx, p.team, colW - 60, 44, 82, 56, false);

    // Player Cutout Clipped Flush at portraitH
    drawPlayerCutout(ctx, p, colW / 2, portraitH, 326, 12, colW - 12);

    // Lower Crisp White Nameplate & Stat Deck
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, portraitH, colW, deckH);

    ctx.fillStyle = '#64748B';
    ctx.font = '700 22px "Inter", sans-serif';
    drawOpticalLeftText(ctx, `#${p.num}  •  ${(p.firstName || '').toUpperCase()}  •  ${p.team}`, 24, portraitH + 38);

    const lastUpper = (p.lastName || p.name).toUpperCase();
    const lPx = fitFontSize(ctx, lastUpper, '900', '"Barlow Condensed", sans-serif', 56, 36, colW - 48);
    ctx.fillStyle = '#0A0A0C';
    ctx.font = `900 ${lPx}px "Barlow Condensed", sans-serif`;
    drawOpticalLeftText(ctx, lastUpper, 24, portraitH + 96);

    // Rounded Stat Pill
    const lineY = portraitH + 142;
    const lineW = colW - 48;
    const lineH = 54;
    ctx.fillStyle = '#F1F5F9';
    roundRectPath(ctx, 24, lineY, lineW, lineH, 12);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const statStr = (slot.line || `${p.stats?.pts ?? 0} PTS`).toUpperCase();
    const statPx = fitFontSize(ctx, statStr, '800', '"Barlow Condensed", sans-serif', 32, 22, lineW - 28);
    ctx.fillStyle = theme.primary;
    ctx.font = `900 ${statPx}px "Barlow Condensed", sans-serif`;
    drawOpticalText(ctx, statStr, 24 + lineW / 2, lineY + lineH / 2);

    ctx.restore();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.5;
    roundRectPath(ctx, 0, 0, colW, cardH, 18);
    ctx.stroke();

    ctx.restore();
  });

  ctx.restore();
}

// ==========================================================================
// TEMPLATE 8: APPLE TV+ × SPORTSNET SCOREBUG & DANGLE PANIC METER
// ==========================================================================
function drawTemplateScorebugHUD(ctx, t, inProg, outProg) {
  const awayTheme = getTeamTheme(State.scorebug.awayTeam || 'COL');
  const homeTheme = getTeamTheme(State.scorebug.homeTeam || 'TOR');

  const easeIn = Ease.outExpo(inProg);
  const easeOut = Ease.outCubic(outProg);
  const alpha = Math.min(1, easeIn * 1.9) * (1 - easeOut);
  if (alpha <= 0.005) return;

  const panic = Math.max(0, Math.min(100, Number(State.scorebug.panicLevel) || 0));
  let rageX = 0, rageY = 0;
  if (panic >= 95) {
    const intensity = (panic - 93) * 1.3;
    rageX = Math.sin(t * 95) * intensity;
    rageY = Math.cos(t * 112) * intensity;
  }

  const baseX = 96 + rageX;
  const baseY = 62 - 56 * (1 - easeIn) - 56 * easeOut + rageY;
  const bugW = 760;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(baseX, baseY);

  // 1. Main Rounded Broadcast Scorebug Capsule
  const mainH = 132;
  const topBarH = 42;
  const scoreH = mainH - topBarH; // 90px
  const radius = 16;

  ctx.save();
  ctx.shadowColor = 'rgba(4, 9, 22, 0.45)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#FFFFFF';
  roundRectPath(ctx, 0, 0, bugW, mainH, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, 0, 0, bugW, mainH, radius);
  ctx.clip();

  // Top Clock & Broadcast Bar
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, bugW, topBarH);

  ctx.fillStyle = '#0038A8';
  ctx.fillRect(0, 0, 96, topBarH);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 21px "Inter", sans-serif';
  drawOpticalText(ctx, 'sdpn', 48, topBarH / 2);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '700 20px "Inter", sans-serif';
  drawOpticalLeftText(ctx, preserveSdpnBrandCase(State.scorebug.episode || 'LFR20 • GAME 20'), 114, topBarH / 2);

  // Crisp White Clock Pill on Top Right
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(bugW - 210, 0, 210, topBarH);
  ctx.fillStyle = '#0A0A0C';
  ctx.save();
  if ('fontVariantNumeric' in ctx) ctx.fontVariantNumeric = 'tabular-nums';
  ctx.font = '800 21px "Inter", sans-serif';
  drawOpticalText(ctx, (State.scorebug.status || '3RD • 04:18').toUpperCase(), bugW - 105, topBarH / 2);
  ctx.restore();

  // Dual Club Chambers
  const halfW = bugW / 2;
  const drawScoreClub = (ox, theme, scoreVal, sogVal) => {
    const g = ctx.createLinearGradient(ox, topBarH, ox + halfW, topBarH + scoreH);
    g.addColorStop(0, theme.chassisDeep);
    g.addColorStop(1, theme.primary);
    ctx.fillStyle = g;
    ctx.fillRect(ox, topBarH, halfW, scoreH);

    drawTeamCrest(ctx, theme.abbrev, ox + 52, topBarH + scoreH / 2, 74, 52, false);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 36px "Inter", sans-serif';
    drawOpticalLeftText(ctx, theme.abbrev, ox + 102, topBarH + 34);

    ctx.fillStyle = 'rgba(226, 238, 255, 0.85)';
    ctx.font = '700 20px "Barlow Condensed", sans-serif';
    drawOpticalLeftText(ctx, `SOG ${sogVal}`, ox + 104, topBarH + 68);

    // Pure Crisp White Score Box
    const wellW = 96;
    const wellX = ox + halfW - wellW;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(wellX, topBarH, wellW, scoreH);

    ctx.fillStyle = '#0A0A0C';
    ctx.font = '900 58px "Barlow Condensed", sans-serif';
    drawOpticalText(ctx, String(scoreVal ?? '0'), wellX + wellW / 2, topBarH + scoreH / 2);
  };

  drawScoreClub(0, awayTheme, State.scorebug.awayScore, State.scorebug.awayShots);
  drawScoreClub(halfW, homeTheme, State.scorebug.homeScore, State.scorebug.homeShots);

  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(halfW - 1, topBarH, 2, scoreH);

  ctx.restore();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  roundRectPath(ctx, 0, 0, bugW, mainH, radius);
  ctx.stroke();

  // 2. Clean Rounded Dangle Panic Meter Capsule Below Scorebug
  const panicY = mainH + 10;
  const panicH = 52;

  ctx.save();
  ctx.shadowColor = 'rgba(4, 9, 22, 0.35)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  roundRectPath(ctx, 0, panicY, bugW, panicH, 13);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = panic >= 80 ? '#F87171' : '#FFFFFF';
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, 0, panicY, bugW, panicH, 13);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 20px "Inter", sans-serif';
  drawOpticalLeftText(ctx, 'PANIC METER', 18, panicY + panicH / 2);

  const totalSegs = 20;
  const activeSegs = Math.round((panic / 100) * totalSegs * Ease.outQuart(inProg));
  const segStartX = 174;
  const segEndX = bugW - 96;
  const segSpan = segEndX - segStartX;
  const segGap = 5;
  const segW = (segSpan - segGap * (totalSegs - 1)) / totalSegs;

  for (let i = 0; i < totalSegs; i++) {
    const sx = segStartX + i * (segW + segGap);
    let segColor = 'rgba(255, 255, 255, 0.14)';
    if (i < activeSegs) {
      if (i < 8) segColor = '#10B981';
      else if (i < 14) segColor = '#F59E0B';
      else segColor = '#EF4444';
    }
    ctx.fillStyle = segColor;
    roundRectPath(ctx, sx, panicY + 13, segW, panicH - 26, 4);
    ctx.fill();
  }

  const pctColor = panic >= 75 ? '#FCA5A5' : panic >= 45 ? '#FDE68A' : '#6EE7B7';
  ctx.fillStyle = pctColor;
  ctx.font = '800 22px "JetBrains Mono", monospace';
  drawOpticalText(ctx, `${panic}%`, bugW - 48, panicY + panicH / 2);

  ctx.restore();
}

// ==========================================================================
// 5. APPLE × NHL.COM SIDEBAR, ROSTER BROWSER & INSPECTOR CONTROLLER
// ==========================================================================

const PRIORITY_CREST_ORDER = ['TOR', 'MIN', 'COL', 'BOS', 'MTL', 'EDM', 'FLA', 'TBL', 'OTT', 'NYR', 'VGK', 'UTA'];

function getOrderedTeamsForStrip() {
  const opp = NHL_HUB.opponentAbbrev || 'MIN';
  const dynamicPriority = ['TOR', opp, ...PRIORITY_CREST_ORDER.filter(c => c !== 'TOR' && c !== opp)];
  const copy = [...LEAGUE.teams];
  copy.sort((a, b) => {
    const ia = dynamicPriority.indexOf(a.abbrev);
    const ib = dynamicPriority.indexOf(b.abbrev);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.abbrev.localeCompare(b.abbrev);
  });
  return copy;
}

function getSortedTeamsForDropdown() {
  const copy = [...LEAGUE.teams];
  copy.sort((a, b) => {
    if (a.abbrev === 'TOR') return -1;
    if (b.abbrev === 'TOR') return 1;
    return a.abbrev.localeCompare(b.abbrev);
  });
  return copy;
}

function renderTeamCrestStrip() {
  const strip = document.getElementById('teamCrestStrip');
  if (!strip) return;
  strip.innerHTML = '';

  getOrderedTeamsForStrip().forEach(team => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'team-crest-item' + (State.teamFilter === team.abbrev ? ' active' : '');
    btn.dataset.team = team.abbrev;
    btn.title = `${team.teamName} (${team.record})`;

    // Use _light.svg inside white circular UI badges so dark/colored crests pop with crisp contrast!
    btn.innerHTML = `
      <span class="team-crest-circle">
        <img src="assets/logos/${team.abbrev}_light.svg" alt="${team.abbrev}">
      </span>
      <span class="team-crest-code">${team.abbrev}</span>
    `;

    btn.addEventListener('click', () => {
      handleTeamStripSelection(team.abbrev);
    });

    strip.appendChild(btn);
  });
}

function updateActiveTeamCrestUI() {
  document.querySelectorAll('.team-crest-item').forEach(el => {
    el.classList.toggle('active', el.dataset.team === State.teamFilter);
  });
}

function handleTeamStripSelection(abbrev) {
  State.teamFilter = abbrev;
  if (State.playerSearch) {
    State.playerSearch = '';
    const sInput = document.getElementById('rosterSearchInput');
    if (sInput) sInput.value = '';
  }

  updateActiveTeamCrestUI();

  // Contextually drive active template when clicking a club crest
  if (State.template === 'standings') {
    State.standings.focusTeam = abbrev;
    const club = LEAGUE.teamMap[abbrev];
    if (club?.divisionName) State.standings.division = club.divisionName;
    syncFormToState();
    restartAnimation();
  } else if (State.template === 'teamtape') {
    if (State.activeSlotTarget === 'tapeHome') State.teamtape.homeTeam = abbrev;
    else State.teamtape.awayTeam = abbrev;
    syncFormToState();
    restartAnimation();
  } else if (State.template === 'trade') {
    if (State.activeSlotTarget === 'tradeRight') State.trade.rightTeam = abbrev;
    else State.trade.leftTeam = abbrev;
    syncFormToState();
    restartAnimation();
  } else if (State.template === 'scorebug') {
    if (State.activeSlotTarget === 'scoreHome') State.scorebug.homeTeam = abbrev;
    else State.scorebug.awayTeam = abbrev;
    syncFormToState();
    restartAnimation();
  } else if (State.template === 'stat') {
    const firstOnClub = LEAGUE.players.find(p => p.team === abbrev);
    if (firstOnClub) {
      State.selectedPlayerId = firstOnClub.id;
      applyPlayerStatsByMode(firstOnClub);
      restartAnimation();
    }
  }

  updateCenterIceWatermark();
  renderPlayerAvatarList();
}

function renderSlotAssignmentBar() {
  const bar = document.getElementById('slotAssignmentBar');
  if (!bar) return;

  const configs = {
    matchup: [
      { id: 'matchupLeft', label: 'Left Player' },
      { id: 'matchupRight', label: 'Right Player' }
    ],
    threestars: [
      { id: 'star0', label: '1st Star' },
      { id: 'star1', label: '2nd Star' },
      { id: 'star2', label: '3rd Star' }
    ],
    stamp: [
      { id: 'stampCutout', label: 'Stamp Cutout' },
      { id: 'stampClear', label: 'Text Only' }
    ],
    teamtape: [
      { id: 'tapeAway', label: 'Visitor Club' },
      { id: 'tapeHome', label: 'Home Club' }
    ],
    trade: [
      { id: 'tradeLeft', label: 'Left Club' },
      { id: 'tradeRight', label: 'Right Club' }
    ],
    scorebug: [
      { id: 'scoreAway', label: 'Visitor Club' },
      { id: 'scoreHome', label: 'Home Club' }
    ]
  };

  const slots = configs[State.template];
  if (!slots) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }

  if (!slots.some(s => s.id === State.activeSlotTarget)) {
    State.activeSlotTarget = slots[0].id;
  }

  bar.style.display = 'flex';
  bar.innerHTML = '';

  slots.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-pill-btn' + (State.activeSlotTarget === s.id ? ' active' : '');
    btn.innerText = s.label;
    btn.addEventListener('click', () => {
      if (s.id === 'stampClear') {
        State.stamp.playerId = 'none';
        State.activeSlotTarget = 'stampCutout';
        syncFormToState();
        renderPlayerAvatarList();
        restartAnimation();
        return;
      }
      State.activeSlotTarget = s.id;
      renderSlotAssignmentBar();
      renderPlayerAvatarList();
    });
    bar.appendChild(btn);
  });
}

function getCurrentlyHighlightedPlayerId() {
  if (State.template === 'matchup') {
    return State.activeSlotTarget === 'matchupRight' ? State.matchup.rightPlayerId : State.matchup.leftPlayerId;
  }
  if (State.template === 'threestars') {
    const idx = State.activeSlotTarget === 'star1' ? 1 : State.activeSlotTarget === 'star2' ? 2 : 0;
    return State.threestars.slots[idx]?.playerId;
  }
  if (State.template === 'stamp') {
    return State.stamp.playerId === 'none' ? null : Number(State.stamp.playerId);
  }
  return State.selectedPlayerId;
}

function renderPlayerAvatarList() {
  const listEl = document.getElementById('playerAvatarList');
  if (!listEl) return;

  const q = (State.playerSearch || '').trim().toLowerCase();
  const isGlobalSearch = q.length > 0;

  let filtered = LEAGUE.players.filter(p => {
    if (!isGlobalSearch && p.team !== State.teamFilter) return false;
    if (!isGlobalSearch) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      String(p.num).includes(q) ||
      p.team.toLowerCase().includes(q) ||
      (LEAGUE.teamMap[p.team]?.teamName || '').toLowerCase().includes(q)
    );
  });

  // Sort skaters by points descending (or jersey for 0-pt depth), goalies by wins
  filtered.sort((a, b) => {
    if (a.isGoalie !== b.isGoalie) return a.isGoalie ? 1 : -1;
    if (a.isGoalie) return (b.stats?.wins ?? 0) - (a.stats?.wins ?? 0);
    return (b.stats?.pts ?? 0) - (a.stats?.pts ?? 0);
  });

  const activePid = getCurrentlyHighlightedPlayerId();
  listEl.innerHTML = '';

  filtered.forEach(p => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'player-row' + (p.id === activePid ? ' active' : '');

    const posLabel = p.pos === 'L' ? 'LW' : p.pos === 'R' ? 'RW' : p.pos;
    const statLine = p.isGoalie
      ? `${posLabel} • ${p.stats.record} • ${p.stats.svPct} SV%`
      : `${posLabel} • ${p.stats.g}G ${p.stats.a}A ${p.stats.pts}PTS`;
    const numHeader = isGlobalSearch ? `#${p.num} • ${p.team}` : `#${p.num}`;

    const avatarInner = p.hasLocalMug && p.headshot
      ? `<img src="${p.headshot}" alt="${p.name}" loading="lazy">`
      : `<span class="player-avatar-fallback">#${p.num}</span>`;

    row.innerHTML = `
      <span class="player-avatar-circle">${avatarInner}</span>
      <span class="player-row-meta">
        <span class="player-row-num">${numHeader}</span>
        <span class="player-row-name">${p.name}</span>
        <span class="player-row-sub">${statLine}</span>
      </span>
    `;

    row.addEventListener('click', () => {
      handlePlayerRowClick(p);
    });

    listEl.appendChild(row);
  });
}

function handlePlayerRowClick(player) {
  if (!player) return;
  ensureHeadshotLoaded(player);

  if (State.template === 'matchup') {
    if (State.activeSlotTarget === 'matchupRight') {
      State.matchup.rightTeam = player.team;
      State.matchup.rightPlayerId = player.id;
    } else {
      State.matchup.leftTeam = player.team;
      State.matchup.leftPlayerId = player.id;
    }
  } else if (State.template === 'threestars') {
    const idx = State.activeSlotTarget === 'star1' ? 1 : State.activeSlotTarget === 'star2' ? 2 : 0;
    State.threestars.slots[idx].playerId = player.id;
    State.threestars.slots[idx].line = player.isGoalie
      ? `${player.stats.record} • ${player.stats.svPct} SV%`
      : `${player.stats.g}G • ${player.stats.a}A • ${player.stats.pts} PTS`;
  } else if (State.template === 'stamp') {
    State.stamp.playerId = player.id;
    State.activeSlotTarget = 'stampCutout';
  } else {
    // Player Card (or clicking a player while on team templates switches straight to their Player Card if desired, or updates selected player)
    State.selectedPlayerId = player.id;
    if (State.template !== 'stat') {
      selectTemplate('stat', false);
    }
    applyPlayerStatsByMode(player);
  }

  syncFormToState();
  updateCenterIceWatermark();
  renderPlayerAvatarList();
  restartAnimation();
}

function buildTonightGameStats(player) {
  if (!player) return [{ label: 'G', val: '1' }, { label: 'A', val: '1' }, { label: 'PTS', val: '2' }, { label: 'SOG', val: '4' }];
  if (TONIGHT_GAME_OVERRIDES[player.id]) {
    return TONIGHT_GAME_OVERRIDES[player.id].map(s => ({ ...s }));
  }
  if (player.isGoalie) {
    return [
      { label: 'SV', val: '31' },
      { label: 'SA', val: '33' },
      { label: 'SV%', val: '.939' },
      { label: 'GA', val: '2' }
    ];
  }
  const g = Math.max(0, Math.min(2, Math.round((player.stats?.g || 2) / 9)));
  const a = Math.max(0, Math.min(2, Math.round((player.stats?.a || 3) / 9)));
  const pts = g + a || 1;
  const sog = Math.max(2, Math.min(7, pts + 3));
  return [
    { label: 'G', val: String(g || 1) },
    { label: 'A', val: String(a) },
    { label: 'PTS', val: String((g || 1) + a) },
    { label: 'SOG', val: String(sog) }
  ];
}

function applyPlayerStatsByMode(player) {
  if (!player) return;
  ensureHeadshotLoaded(player);
  if (State.stat.tonightMode) {
    State.stat.stats = buildTonightGameStats(player);
  } else if (player.defaultTiles && player.defaultTiles.length === 4) {
    State.stat.stats = player.defaultTiles.map(t => ({ label: t.label, val: String(t.val) }));
  }
  syncFormToState();
}

function populateTeamSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  getSortedTeamsForDropdown().forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.abbrev;
    opt.innerText = `${t.abbrev} — ${t.teamName}`;
    selectEl.appendChild(opt);
  });
}

function populateClubPlayersSelect(selectEl, teamAbbrev, selectedId) {
  if (!selectEl) return null;
  const list = LEAGUE.players.filter(p => p.team === teamAbbrev);
  const pool = list.length ? list : LEAGUE.players;
  selectEl.innerHTML = '';
  pool.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.innerText = `#${p.num} ${p.name} (${p.pos})`;
    selectEl.appendChild(opt);
  });
  const chosen = pool.find(p => p.id === Number(selectedId)) || pool[0];
  if (chosen) {
    selectEl.value = chosen.id;
    ensureHeadshotLoaded(chosen);
  }
  return chosen ? chosen.id : null;
}

function populateAllPlayersSelect(selectEl, includeNone = false) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  if (includeNone) {
    const noneOpt = document.createElement('option');
    noneOpt.value = 'none';
    noneOpt.innerText = 'None (Text Stamp Only)';
    selectEl.appendChild(noneOpt);
  }
  LEAGUE.players.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.innerText = `[${p.team}] #${p.num} ${p.name} (${p.pos})`;
    selectEl.appendChild(opt);
  });
}

function updateStatModeLabel() {
  const lbl = document.getElementById('statModeLabel');
  if (!lbl) return;
  if (State.stat.tonightMode) {
    lbl.innerHTML = `2026-27 Season | <strong>Tonight's Game</strong>`;
  } else {
    lbl.innerHTML = `<strong>2026-27 Season</strong> | Tonight's Game`;
  }
}

function initUI() {
  renderTeamCrestStrip();
  renderSlotAssignmentBar();
  renderPlayerAvatarList();

  // Team Strip Scroll Chevrons
  document.getElementById('btnTeamScrollLeft').addEventListener('click', () => {
    document.getElementById('teamCrestStrip').scrollBy({ left: -200, behavior: 'smooth' });
  });
  document.getElementById('btnTeamScrollRight').addEventListener('click', () => {
    document.getElementById('teamCrestStrip').scrollBy({ left: 200, behavior: 'smooth' });
  });

  // Live 277-Player Search
  document.getElementById('rosterSearchInput').addEventListener('input', e => {
    State.playerSearch = e.target.value;
    renderPlayerAvatarList();
  });

  // Populate Right Inspector Dropdowns
  populateTeamSelect(document.getElementById('matchupLeftTeam'));
  populateTeamSelect(document.getElementById('matchupRightTeam'));
  populateTeamSelect(document.getElementById('tapeAwayTeam'));
  populateTeamSelect(document.getElementById('tapeHomeTeam'));
  populateTeamSelect(document.getElementById('standingsFocusTeam'));
  populateTeamSelect(document.getElementById('tradeLeftTeam'));
  populateTeamSelect(document.getElementById('tradeRightTeam'));
  populateTeamSelect(document.getElementById('scoreAwayTeam'));
  populateTeamSelect(document.getElementById('scoreHomeTeam'));

  populateAllPlayersSelect(document.getElementById('stampPlayerSelect'), true);
  populateAllPlayersSelect(document.getElementById('star1Player'), false);
  populateAllPlayersSelect(document.getElementById('star2Player'), false);
  populateAllPlayersSelect(document.getElementById('star3Player'), false);

  populateClubPlayersSelect(document.getElementById('matchupLeftPlayer'), State.matchup.leftTeam, State.matchup.leftPlayerId);
  populateClubPlayersSelect(document.getElementById('matchupRightPlayer'), State.matchup.rightTeam, State.matchup.rightPlayerId);

  // Top Header Brand & Segmented Bar (Home + All 8 Templates)
  const brandHomeBtn = document.getElementById('brandHomeBtn');
  if (brandHomeBtn) {
    brandHomeBtn.addEventListener('click', () => selectTemplate('home', false));
    brandHomeBtn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectTemplate('home', false);
      }
    });
  }

  document.querySelectorAll('.seg-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      selectTemplate(tab.getAttribute('data-template'), true);
    });
  });

  // Home View CTAs & Header Sync Buttons
  const headerOpenBtn = document.getElementById('btnHeaderOpenEditor');
  if (headerOpenBtn) {
    headerOpenBtn.addEventListener('click', () => selectTemplate(State.template || 'stat', true));
  }

  const prepNextBtn = document.getElementById('btnPrepNextGame');
  if (prepNextBtn) {
    prepNextBtn.addEventListener('click', () => selectTemplate('teamtape', true));
  }

  const headerSyncBtn = document.getElementById('btnHeaderSyncNHL');
  if (headerSyncBtn) {
    headerSyncBtn.addEventListener('click', () => syncLiveNHLHub({ silent: false }));
  }

  const homeSyncBtn = document.getElementById('btnHomeSyncNHL');
  if (homeSyncBtn) {
    homeSyncBtn.addEventListener('click', () => syncLiveNHLHub({ silent: false }));
  }

  // Preset Dropdown
  document.getElementById('presetSelect').addEventListener('change', e => {
    applyDemoPreset(e.target.value);
  });

  // QuickTime Transport Capsule
  document.getElementById('btnPlayPause').addEventListener('click', () => {
    State.isPlaying = !State.isPlaying;
    updatePlayBtn();
  });
  document.getElementById('btnRestart').addEventListener('click', restartAnimation);

  document.getElementById('timelineSlider').addEventListener('input', e => {
    State.isPlaying = false;
    State.currentTime = parseFloat(e.target.value);
    updatePlayBtn();
    updateScrubber();
  });

  // Preview Backdrop Switcher (Alpha | Studio | Ice | Blue Room)
  const lfrRoomVideo = document.getElementById('lfrRoomVideo');
  window.__syncLfrVideoPlayback = () => {
    if (!lfrRoomVideo) return;
    if (State.view === 'editor' && State.backdrop === 'lfr') {
      lfrRoomVideo.play().catch(() => {});
    } else {
      lfrRoomVideo.pause();
    }
  };
  window.__syncLfrVideoPlayback();

  document.querySelectorAll('.backdrop-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.backdrop-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.backdrop = btn.getAttribute('data-backdrop');
      document.getElementById('viewportScreen').className = `broadcast-monitor mode-${State.backdrop}`;
      window.__syncLfrVideoPlayback();
    });
  });

  // Resolution Selector (1080p | 4K) & Native Mac Codec Bridge
  const codecSelect = document.getElementById('exportCodecSelect');
  if (isNativeMacApp()) {
    State.exportCodec = 'prores4444';
    if (codecSelect) {
      codecSelect.style.display = 'inline-block';
      codecSelect.value = 'prores4444';
    }
    postNativeMessage({ action: 'studioReady', version: '4.1-V5' });
  }
  updateExportButtonsUI();

  document.querySelectorAll('.res-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.res-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.exportRes = btn.getAttribute('data-res') || '1080p';
      updateExportButtonsUI();
    });
  });

  if (codecSelect) {
    codecSelect.addEventListener('change', e => {
      State.exportCodec = e.target.value;
      updateExportButtonsUI();
    });
  }

  const closeToastBtn = document.getElementById('btnCloseWebToast');
  if (closeToastBtn) {
    closeToastBtn.addEventListener('click', () => {
      document.getElementById('webExportToast').style.display = 'none';
    });
  }

  // Export Actions
  document.getElementById('btnExportWebM').addEventListener('click', exportTransparentVideo);
  document.getElementById('btnExportPNG').addEventListener('click', exportTransparentPNG);
  document.getElementById('btnFetchNHL').addEventListener('click', fetchLiveNHLData);

  bindFormInputs();
  syncFormToState();
}

function bindFormInputs() {
  // 1. Player Card Inspector
  document.getElementById('statTonightToggle').addEventListener('change', e => {
    State.stat.tonightMode = e.target.checked;
    updateStatModeLabel();
    applyPlayerStatsByMode(getPlayerById(State.selectedPlayerId));
    restartAnimation();
  });
  document.getElementById('statContext').addEventListener('input', e => { State.stat.context = e.target.value; });
  document.getElementById('statVerdict').addEventListener('input', e => { State.stat.verdict = e.target.value; });
  for (let i = 0; i < 4; i++) {
    document.getElementById(`statLbl${i}`).addEventListener('input', e => {
      State.stat.stats[i].label = e.target.value.replace(/:$/, '').trim();
    });
    document.getElementById(`statVal${i}`).addEventListener('input', e => {
      State.stat.stats[i].val = e.target.value;
    });
  }

  // 2. Head-to-Head Inspector
  document.getElementById('matchupTitle').addEventListener('input', e => { State.matchup.title = e.target.value; });
  document.getElementById('matchupStatMode').addEventListener('change', e => {
    State.matchup.statMode = e.target.value;
    restartAnimation();
  });
  document.getElementById('matchupLeftTeam').addEventListener('change', e => {
    State.matchup.leftTeam = e.target.value;
    State.matchup.leftPlayerId = populateClubPlayersSelect(document.getElementById('matchupLeftPlayer'), State.matchup.leftTeam, null);
    renderPlayerAvatarList();
    restartAnimation();
  });
  document.getElementById('matchupLeftPlayer').addEventListener('change', e => {
    State.matchup.leftPlayerId = Number(e.target.value);
    ensureHeadshotLoaded(getPlayerById(State.matchup.leftPlayerId));
    renderPlayerAvatarList();
    restartAnimation();
  });
  document.getElementById('matchupRightTeam').addEventListener('change', e => {
    State.matchup.rightTeam = e.target.value;
    State.matchup.rightPlayerId = populateClubPlayersSelect(document.getElementById('matchupRightPlayer'), State.matchup.rightTeam, null);
    renderPlayerAvatarList();
    restartAnimation();
  });
  document.getElementById('matchupRightPlayer').addEventListener('change', e => {
    State.matchup.rightPlayerId = Number(e.target.value);
    ensureHeadshotLoaded(getPlayerById(State.matchup.rightPlayerId));
    renderPlayerAvatarList();
    restartAnimation();
  });

  // 3. Tale of Tape Inspector
  document.getElementById('tapeHeader').addEventListener('input', e => { State.teamtape.header = e.target.value; });
  document.getElementById('tapeSubheader').addEventListener('input', e => { State.teamtape.subheader = e.target.value; });
  document.getElementById('tapeAwayTeam').addEventListener('change', e => {
    State.teamtape.awayTeam = e.target.value;
    restartAnimation();
  });
  document.getElementById('tapeHomeTeam').addEventListener('change', e => {
    State.teamtape.homeTeam = e.target.value;
    updateCenterIceWatermark();
    restartAnimation();
  });

  // 4. Standings Inspector
  document.getElementById('standingsDivision').addEventListener('change', e => {
    State.standings.division = e.target.value;
    restartAnimation();
  });
  document.getElementById('standingsFocusTeam').addEventListener('change', e => {
    State.standings.focusTeam = e.target.value;
    const club = LEAGUE.teamMap[State.standings.focusTeam];
    if (club?.divisionName) {
      State.standings.division = club.divisionName;
      document.getElementById('standingsDivision').value = club.divisionName;
    }
    updateCenterIceWatermark();
    restartAnimation();
  });
  document.getElementById('standingsSubtitle').addEventListener('input', e => { State.standings.subtitle = e.target.value; });

  // 5. Dang-It! / Hat-Pick! Stamp Inspector
  document.getElementById('stampType').addEventListener('change', e => { State.stamp.type = e.target.value; restartAnimation(); });
  document.getElementById('stampHeadline').addEventListener('input', e => { State.stamp.headline = e.target.value; });
  document.getElementById('stampSubtext').addEventListener('input', e => { State.stamp.subtext = e.target.value; });
  document.getElementById('stampPlayerSelect').addEventListener('change', e => {
    State.stamp.playerId = e.target.value === 'none' ? 'none' : Number(e.target.value);
    ensureHeadshotLoaded(getPlayerById(State.stamp.playerId));
    renderPlayerAvatarList();
    restartAnimation();
  });

  // 6. Trade Alert Inspector
  document.getElementById('tradeBadge').addEventListener('input', e => { State.trade.badge = e.target.value; });
  document.getElementById('tradeLeftTeam').addEventListener('change', e => { State.trade.leftTeam = e.target.value; });
  document.getElementById('tradeLeftSubtitle').addEventListener('input', e => { State.trade.leftSubtitle = e.target.value; });
  document.getElementById('tradeLeftItems').addEventListener('input', e => {
    State.trade.leftItems = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
  });
  document.getElementById('tradeRightTeam').addEventListener('change', e => { State.trade.rightTeam = e.target.value; });
  document.getElementById('tradeRightSubtitle').addEventListener('input', e => { State.trade.rightSubtitle = e.target.value; });
  document.getElementById('tradeRightItems').addEventListener('input', e => {
    State.trade.rightItems = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
  });
  document.getElementById('tradeTicker').addEventListener('input', e => { State.trade.ticker = e.target.value; });

  // 7. Three Stars Inspector
  document.getElementById('starsHeader').addEventListener('input', e => { State.threestars.header = e.target.value; });
  document.getElementById('starsMode').addEventListener('change', e => { State.threestars.mode = e.target.value; });
  [1, 2, 3].forEach((n, idx) => {
    document.getElementById(`star${n}Player`).addEventListener('change', e => {
      const pid = Number(e.target.value);
      State.threestars.slots[idx].playerId = pid;
      const p = getPlayerById(pid);
      if (p) {
        ensureHeadshotLoaded(p);
        State.threestars.slots[idx].line = p.isGoalie
          ? `${p.stats.record} • ${p.stats.svPct} SV%`
          : `${p.stats.g}G • ${p.stats.a}A • ${p.stats.pts} PTS`;
        document.getElementById(`star${n}Line`).value = State.threestars.slots[idx].line;
      }
      renderPlayerAvatarList();
      restartAnimation();
    });
    document.getElementById(`star${n}Line`).addEventListener('input', e => {
      State.threestars.slots[idx].line = e.target.value;
    });
  });

  // 8. Scorebug Inspector
  document.getElementById('scoreEpisode').addEventListener('input', e => { State.scorebug.episode = e.target.value; });
  document.getElementById('scoreStatus').addEventListener('input', e => { State.scorebug.status = e.target.value; });
  document.getElementById('scoreAwayTeam').addEventListener('change', e => { State.scorebug.awayTeam = e.target.value; });
  document.getElementById('scoreAwayScore').addEventListener('input', e => { State.scorebug.awayScore = e.target.value; });
  document.getElementById('scoreAwayShots').addEventListener('input', e => { State.scorebug.awayShots = e.target.value; });
  document.getElementById('scoreHomeTeam').addEventListener('change', e => {
    State.scorebug.homeTeam = e.target.value;
    updateCenterIceWatermark();
  });
  document.getElementById('scoreHomeScore').addEventListener('input', e => { State.scorebug.homeScore = e.target.value; });
  document.getElementById('scoreHomeShots').addEventListener('input', e => { State.scorebug.homeShots = e.target.value; });
  document.getElementById('scorePanic').addEventListener('input', e => {
    State.scorebug.panicLevel = parseInt(e.target.value, 10);
    document.getElementById('panicValueDisplay').innerText = `${State.scorebug.panicLevel}%`;
  });
}

function syncFormToState() {
  const toggleEl = document.getElementById('statTonightToggle');
  if (toggleEl) toggleEl.checked = State.stat.tonightMode;
  updateStatModeLabel();

  document.getElementById('statContext').value = State.stat.context;
  document.getElementById('statVerdict').value = State.stat.verdict;
  for (let i = 0; i < 4; i++) {
    const cleanLbl = String(State.stat.stats[i].label || '').replace(/:$/, '');
    document.getElementById(`statLbl${i}`).value = `${cleanLbl}:`;
    document.getElementById(`statVal${i}`).value = State.stat.stats[i].val;
  }

  document.getElementById('matchupTitle').value = State.matchup.title;
  document.getElementById('matchupLeftTeam').value = State.matchup.leftTeam;
  populateClubPlayersSelect(document.getElementById('matchupLeftPlayer'), State.matchup.leftTeam, State.matchup.leftPlayerId);
  document.getElementById('matchupRightTeam').value = State.matchup.rightTeam;
  populateClubPlayersSelect(document.getElementById('matchupRightPlayer'), State.matchup.rightTeam, State.matchup.rightPlayerId);
  document.getElementById('matchupStatMode').value = State.matchup.statMode;

  document.getElementById('tapeHeader').value = State.teamtape.header;
  document.getElementById('tapeSubheader').value = State.teamtape.subheader;
  document.getElementById('tapeAwayTeam').value = State.teamtape.awayTeam;
  document.getElementById('tapeHomeTeam').value = State.teamtape.homeTeam;

  document.getElementById('standingsDivision').value = State.standings.division;
  document.getElementById('standingsFocusTeam').value = State.standings.focusTeam;
  document.getElementById('standingsSubtitle').value = State.standings.subtitle;

  document.getElementById('stampType').value = State.stamp.type;
  document.getElementById('stampHeadline').value = State.stamp.headline;
  document.getElementById('stampSubtext').value = State.stamp.subtext;
  document.getElementById('stampPlayerSelect').value = String(State.stamp.playerId);

  document.getElementById('tradeBadge').value = State.trade.badge;
  document.getElementById('tradeLeftTeam').value = State.trade.leftTeam;
  document.getElementById('tradeLeftSubtitle').value = State.trade.leftSubtitle;
  document.getElementById('tradeLeftItems').value = State.trade.leftItems.join('\n');
  document.getElementById('tradeRightTeam').value = State.trade.rightTeam;
  document.getElementById('tradeRightSubtitle').value = State.trade.rightSubtitle;
  document.getElementById('tradeRightItems').value = State.trade.rightItems.join('\n');
  document.getElementById('tradeTicker').value = State.trade.ticker;

  document.getElementById('starsHeader').value = State.threestars.header;
  document.getElementById('starsMode').value = State.threestars.mode;
  [1, 2, 3].forEach((n, idx) => {
    document.getElementById(`star${n}Player`).value = State.threestars.slots[idx].playerId;
    document.getElementById(`star${n}Line`).value = State.threestars.slots[idx].line;
  });

  document.getElementById('scoreEpisode').value = State.scorebug.episode;
  document.getElementById('scoreStatus').value = State.scorebug.status;
  document.getElementById('scoreAwayTeam').value = State.scorebug.awayTeam;
  document.getElementById('scoreAwayScore').value = State.scorebug.awayScore;
  document.getElementById('scoreAwayShots').value = State.scorebug.awayShots;
  document.getElementById('scoreHomeTeam').value = State.scorebug.homeTeam;
  document.getElementById('scoreHomeScore').value = State.scorebug.homeScore;
  document.getElementById('scoreHomeShots').value = State.scorebug.homeShots;
  document.getElementById('scorePanic').value = State.scorebug.panicLevel;
  document.getElementById('panicValueDisplay').innerText = `${State.scorebug.panicLevel}%`;
}

function getHomeSuiteDefinitions() {
  const gNum = NHL_HUB.gameNumber || 21;
  const next = NHL_HUB.nextGame;
  const away = next?.awayAbbrev || State.teamtape.awayTeam || 'MIN';
  const home = next?.homeAbbrev || State.teamtape.homeTeam || 'TOR';
  const oppCode = home === 'TOR' ? away : home;
  const leftP = getPlayerById(State.matchup.leftPlayerId);
  const rightP = getPlayerById(State.matchup.rightPlayerId);

  return [
    {
      id: 'stat',
      title: 'Player Stat Chyron',
      badge: 'Lower-Third',
      desc: `Auston Matthews #34 • Game ${gNum} vs ${oppCode}`,
      previewTime: 1.85
    },
    {
      id: 'matchup',
      title: 'Superstar Head-to-Head',
      badge: 'Split Comparison',
      desc: `${leftP?.lastName || 'Matthews'} (TOR) vs ${rightP?.lastName || oppCode} (${oppCode})`,
      previewTime: 1.85
    },
    {
      id: 'teamtape',
      title: 'Tale of the Tape',
      badge: 'Club Matchup',
      desc: `${away} @ ${home} • Live Record & Goals/G`,
      previewTime: 1.85
    },
    {
      id: 'standings',
      title: 'NHL Division Standings',
      badge: 'Live Table',
      desc: `${State.standings.division} Playoff Race • 8-Club Board`,
      previewTime: 1.85
    },
    {
      id: 'stamp',
      title: 'Dang-It! & Hat-Pick! Stamp',
      badge: 'Kinetic Slam',
      desc: State.stamp.headline || 'LFR20 Signature Verdict Stamp',
      previewTime: 1.85
    },
    {
      id: 'trade',
      title: 'Breaking Trade Alert',
      badge: 'Trade Board',
      desc: `${State.trade.leftTeam} / ${State.trade.rightTeam} Assets & Cap Retention`,
      previewTime: 1.85
    },
    {
      id: 'threestars',
      title: 'Three Stars Podium',
      badge: '3-Player Showcase',
      desc: `Stars to Watch • ${away} @ ${home}`,
      previewTime: 1.85
    },
    {
      id: 'scorebug',
      title: 'Live Scorebug & Panic Meter',
      badge: 'Broadcast HUD',
      desc: `${away} @ ${home} Box Score + Dangle Panic`,
      previewTime: 1.85
    }
  ];
}

function formatClubRecordSummary(code) {
  const t = LEAGUE.teamMap[code];
  if (!t) return code;
  const ord = n => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const rankPart = t.divisionSequence ? `${ord(t.divisionSequence)} ${t.divisionName}` : t.divisionName || '';
  return `${t.record} • ${t.points} PTS${rankPart ? ` • ${rankPart}` : ''}`;
}

function renderHomeView() {
  const next = NHL_HUB.nextGame;
  const prev = NHL_HUB.prevGame;
  const awayCode = next?.awayAbbrev || State.teamtape.awayTeam || 'MIN';
  const homeCode = next?.homeAbbrev || State.teamtape.homeTeam || 'TOR';
  const gNum = next?.gameNumber || NHL_HUB.gameNumber || 21;
  const awayClub = LEAGUE.teamMap[awayCode];
  const homeClub = LEAGUE.teamMap[homeCode];
  const schedFmt = formatGameScheduleET(next);

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const isLiveApi = NHL_HUB.source === 'live-nhl-api';
  setTxt('homeSyncBadgeText', isLiveApi ? 'LIVE NHL API SYNCED' : 'NHL SCHEDULE SYNCED');
  setTxt('headerSyncLabel', isLiveApi ? `NHL Live • G${gNum} ${awayCode}@${homeCode}` : `NHL Synced • G${gNum} ${awayCode}@${homeCode}`);
  setTxt('homeGameEpisode', `LFR20 • GAME ${gNum}`);
  setTxt('homeHeroHeadline', next?.gameState === 'LIVE' ? 'Maple Leafs Live Broadcast Package' : 'Maple Leafs Next Broadcast Package');
  setTxt('homeGameMetaLine', schedFmt.fullScheduleLine);

  if (prev) {
    const pAway = prev.awayAbbrev;
    const pHome = prev.homeAbbrev;
    setTxt('homeLastGameChip', `Last Game (G${prev.gameNumber}): ${pAway} ${prev.awayScore ?? 0}, ${pHome} ${prev.homeScore ?? 0} • Final`);
  }

  const awayCrest = document.getElementById('homeAwayCrest');
  if (awayCrest) {
    awayCrest.src = `assets/logos/${awayCode}_light.svg`;
    awayCrest.alt = awayCode;
  }
  setTxt('homeAwayCode', awayCode);
  setTxt('homeAwayName', awayClub?.teamName || next?.awayName || awayCode);
  setTxt('homeAwayRecord', formatClubRecordSummary(awayCode));

  const homeCrest = document.getElementById('homeHomeCrest');
  if (homeCrest) {
    homeCrest.src = `assets/logos/${homeCode}_light.svg`;
    homeCrest.alt = homeCode;
  }
  setTxt('homeHomeCode', homeCode);
  setTxt('homeHomeName', homeClub?.teamName || next?.homeName || homeCode);
  setTxt('homeHomeRecord', formatClubRecordSummary(homeCode));

  const prepBtn = document.getElementById('btnPrepNextGame');
  if (prepBtn) prepBtn.innerHTML = `Open Game ${gNum} Package &rarr;`;

  setTxt(
    'homeSuiteSubtitle',
    `All 8 animated templates pre-synced for ${awayClub?.teamName || awayCode} @ ${homeClub?.teamName || homeCode} — click any graphic to customize & export in 1080p60 or 4K60 Alpha.`
  );

  renderHomeGraphicCards();
}

function renderHomeGraphicCards() {
  const grid = document.getElementById('homeCardsContainer');
  if (!grid) return;

  const defs = getHomeSuiteDefinitions();
  if (grid.children.length !== defs.length) {
    grid.innerHTML = '';
    defs.forEach(def => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'home-graphic-card';
      card.dataset.template = def.id;
      card.innerHTML = `
        <div class="home-card-stage">
          <canvas class="home-card-canvas" width="640" height="360"></canvas>
          <span class="home-card-badge">${def.badge}</span>
        </div>
        <div class="home-card-body">
          <div class="home-card-text">
            <span class="home-card-title">${def.title}</span>
            <span class="home-card-desc"></span>
          </div>
          <span class="home-card-open">Edit &rarr;</span>
        </div>
      `;
      card.addEventListener('click', () => {
        selectTemplate(def.id, true);
      });
      grid.appendChild(card);
    });
  }

  const savedTemplate = State.template;
  defs.forEach((def, idx) => {
    const card = grid.children[idx];
    if (!card) return;
    const descEl = card.querySelector('.home-card-desc');
    if (descEl) descEl.textContent = def.desc;

    const c = card.querySelector('canvas');
    if (c) {
      const cctx = c.getContext('2d', { alpha: true });
      State.template = def.id;
      drawFrame(def.previewTime, false, cctx, 640 / 1920);
    }
  });
  State.template = savedTemplate;
}

function selectTemplate(tmpl, shouldRestart = true) {
  const homeView = document.getElementById('homeView');
  const workspace = document.getElementById('studioWorkspace');
  const homeActions = document.getElementById('headerHomeActions');
  const editorActions = document.getElementById('headerEditorActions');

  document.querySelectorAll('.seg-tab').forEach(c => c.classList.remove('active'));
  const tab = document.getElementById(`tab-${tmpl}`);
  if (tab) tab.classList.add('active');

  if (tmpl === 'home') {
    State.view = 'home';
    if (homeView) homeView.style.display = 'block';
    if (workspace) workspace.style.display = 'none';
    if (homeActions) homeActions.style.display = 'flex';
    if (editorActions) editorActions.style.display = 'none';
    if (typeof window.__syncLfrVideoPlayback === 'function') window.__syncLfrVideoPlayback();
    renderHomeView();
    return;
  }

  State.view = 'editor';
  State.template = tmpl;

  if (homeView) homeView.style.display = 'none';
  if (workspace) workspace.style.display = '';
  if (homeActions) homeActions.style.display = 'none';
  if (editorActions) editorActions.style.display = 'flex';
  if (typeof window.__syncLfrVideoPlayback === 'function') window.__syncLfrVideoPlayback();

  document.querySelectorAll('.inspector-section').forEach(sec => { sec.style.display = 'none'; });
  const activeSec = document.getElementById(`section-${tmpl}`);
  if (activeSec) activeSec.style.display = 'block';

  renderSlotAssignmentBar();
  renderPlayerAvatarList();
  updateCenterIceWatermark();

  if (shouldRestart) restartAnimation();
}

function restartAnimation() {
  State.currentTime = 0;
  State.isPlaying = true;
  updatePlayBtn();
}

// ==========================================================================
// 6. QUICK LOAD PRESET SCENARIOS (AUTO-SYNCED TO LEAFS NEXT NHL GAME)
// ==========================================================================

function applyDemoPreset(key) {
  const presetEl = document.getElementById('presetSelect');
  if (presetEl && presetEl.value !== key) presetEl.value = key;

  const next = NHL_HUB.nextGame;
  const gNum = next?.gameNumber || NHL_HUB.gameNumber || 21;
  const awayCode = next?.awayAbbrev || 'MIN';
  const homeCode = next?.homeAbbrev || 'TOR';
  const oppCode = homeCode === 'TOR' ? awayCode : homeCode;
  const vsPrep = homeCode === 'TOR' ? 'VS' : '@';
  const schedFmt = formatGameScheduleET(next);

  const matthews = findPlayerByNameOrTeam('matthews', 'TOR');
  const nylander = findPlayerByNameOrTeam('nylander', 'TOR');
  const cowan = findPlayerByNameOrTeam('cowan', 'TOR');
  const stolarz = findPlayerByNameOrTeam('stolarz', 'TOR') || LEAGUE.players.find(p => p.team === 'TOR' && p.isGoalie);
  const oppSkater = LEAGUE.players
    .filter(p => p.team === oppCode && !p.isGoalie)
    .sort((a, b) => (b.stats?.pts ?? 0) - (a.stats?.pts ?? 0))[0];
  const oppGoalie = LEAGUE.players.find(p => p.team === oppCode && p.isGoalie);

  switch (key) {
    case 'tonight':
      selectTemplate('stat', false);
      State.teamFilter = 'TOR';
      State.playerSearch = '';
      State.stat.tonightMode = false;
      if (matthews) {
        State.selectedPlayerId = matthews.id;
        applyPlayerStatsByMode(matthews);
      }
      State.stat.context = `LFR20 • GAME ${gNum} ${vsPrep} ${oppCode}`;
      State.stat.verdict = 'ELITE';
      break;

    case 'h2h_next':
      selectTemplate('matchup', false);
      State.matchup.title = `LFR20 • GAME ${gNum} SUPERSTAR DUEL`;
      State.matchup.leftTeam = 'TOR';
      State.matchup.rightTeam = oppCode;
      if (matthews) State.matchup.leftPlayerId = matthews.id;
      if (oppSkater) State.matchup.rightPlayerId = oppSkater.id;
      State.matchup.statMode = 'scoring';
      break;

    case 'matthews_season':
      selectTemplate('stat', false);
      State.teamFilter = 'TOR';
      State.playerSearch = '';
      State.stat.tonightMode = false;
      if (matthews) {
        State.selectedPlayerId = matthews.id;
        applyPlayerStatsByMode(matthews);
      }
      State.stat.context = '2026-27 NHL SEASON';
      State.stat.verdict = 'ELITE';
      break;

    case 'mckenna':
      selectTemplate('stat', false);
      State.teamFilter = 'TOR';
      State.playerSearch = '';
      State.stat.tonightMode = false;
      if (cowan) {
        State.selectedPlayerId = cowan.id;
        applyPlayerStatsByMode(cowan);
      }
      State.stat.context = 'LFR20 • ROOKIE SPOTLIGHT';
      State.stat.verdict = 'CLUTCH';
      break;

    case 'tendy_battle':
      selectTemplate('matchup', false);
      State.matchup.title = `LFR20 • GAME ${gNum} CREASE SHOWDOWN`;
      State.matchup.leftTeam = 'TOR';
      State.matchup.rightTeam = oppCode;
      if (stolarz) State.matchup.leftPlayerId = stolarz.id;
      if (oppGoalie) State.matchup.rightPlayerId = oppGoalie.id;
      State.matchup.statMode = 'goalie';
      break;

    case 'atlantic_panic':
      selectTemplate('standings', false);
      State.standings.division = 'Atlantic';
      State.standings.focusTeam = 'TOR';
      State.standings.subtitle = `2026-27 PLAYOFF RACE • ${schedFmt.shortDate}`;
      break;

    case 'tape_game20':
      selectTemplate('teamtape', false);
      State.teamtape.header = `LFR20 • GAME ${gNum} TALE OF THE TAPE`;
      State.teamtape.subheader = schedFmt.tapeSubheader;
      State.teamtape.awayTeam = awayCode;
      State.teamtape.homeTeam = homeCode;
      break;

    case 'dangit':
      selectTemplate('stamp', false);
      State.stamp.type = 'dangit';
      State.stamp.headline = `${LEAGUE.teamMap.TOR?.streakCount || 4} STRAIGHT LOSSES`;
      State.stamp.subtext = NHL_HUB.prevGame
        ? `LFR20 G${NHL_HUB.prevGame.gameNumber} • DROPPED ${NHL_HUB.prevGame.awayScore}-${NHL_HUB.prevGame.homeScore} VS ${NHL_HUB.prevGame.awayAbbrev}`
        : `HEADING INTO GAME ${gNum} ${vsPrep} ${oppCode}`;
      State.stamp.playerId = 'none';
      break;

    case 'hatpick':
      selectTemplate('stamp', false);
      State.stamp.type = 'hatpick';
      State.stamp.headline = 'BEASTON COWAN';
      State.stamp.subtext = 'LFR20 • ROOKIE SNIPER LIGHTS UP SCOTIABANK';
      State.stamp.playerId = cowan ? cowan.id : 'none';
      if (cowan) ensureHeadshotLoaded(cowan);
      break;

    case 'trade_alert':
      selectTemplate('trade', false);
      State.trade.badge = 'TRADE ALERT';
      State.trade.leftTeam = 'TOR';
      State.trade.leftSubtitle = 'ACQUIRES • $3.85M AAV';
      State.trade.leftItems = ['Kirill Marchenko (RW)', '2027 3rd Round Pick (CBJ)'];
      State.trade.rightTeam = 'CBJ';
      State.trade.rightSubtitle = 'ACQUIRES • 15% RETAINED';
      State.trade.rightItems = ['2027 1st Round Pick (Top-10 Prot.)', 'Top Marlies Prospect'];
      State.trade.ticker = 'sdpn INSTANT REACTION • EMERGENCY SDP BREAKDOWN';
      break;

    case 'lfr_3stars':
      selectTemplate('threestars', false);
      State.threestars.header = `LFR20 • STARS TO WATCH ${vsPrep} ${oppCode}`;
      State.threestars.mode = 'stars';
      if (nylander) State.threestars.slots[0] = { playerId: nylander.id, line: `${nylander.stats?.g ?? 12}G • ${nylander.stats?.a ?? 14}A • ${nylander.stats?.pts ?? 26} PTS` };
      if (matthews) State.threestars.slots[1] = { playerId: matthews.id, line: `${matthews.stats?.g ?? 11}G • ${matthews.stats?.a ?? 16}A • ${matthews.stats?.pts ?? 27} PTS` };
      if (oppSkater) State.threestars.slots[2] = { playerId: oppSkater.id, line: `${oppSkater.stats?.g ?? 10}G • ${oppSkater.stats?.a ?? 15}A • ${oppSkater.stats?.pts ?? 25} PTS` };
      break;

    case 'scorebug_live':
      selectTemplate('scorebug', false);
      State.scorebug.episode = `LFR20 • GAME ${gNum}`;
      State.scorebug.status = schedFmt.shortDayTime;
      State.scorebug.awayTeam = awayCode;
      State.scorebug.awayScore = '0';
      State.scorebug.awayShots = '0';
      State.scorebug.homeTeam = homeCode;
      State.scorebug.homeScore = '0';
      State.scorebug.homeShots = '0';
      State.scorebug.panicLevel = 76;
      break;
  }

  updateActiveTeamCrestUI();
  renderPlayerAvatarList();
  updateCenterIceWatermark();
  syncFormToState();
  restartAnimation();
}

// ==========================================================================
// 7. LIVE NHL HUB SYNC & 1-CLICK TRANSPARENT ALPHA EXPORTER
// ==========================================================================

async function syncLiveNHLHub({ silent = false } = {}) {
  if (NHL_HUB.isSyncing) return;
  NHL_HUB.isSyncing = true;

  const headerLbl = document.getElementById('headerSyncLabel');
  const homeLbl = document.getElementById('btnHomeSyncLabel');
  const scoreBtn = document.getElementById('btnFetchNHL');

  if (!silent) {
    if (headerLbl) headerLbl.textContent = 'Syncing NHL...';
    if (homeLbl) homeLbl.textContent = 'Syncing...';
    if (scoreBtn) scoreBtn.textContent = 'Syncing...';
  }

  try {
    const res = await fetch('/api/nhl/live-hub', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.ok) {
      if (Array.isArray(data.standings) && data.standings.length) {
        applyLiveStandingsArray(data.standings);
      }
      if (Array.isArray(data.games) && data.games.length) {
        NHL_HUB.games = data.games;
      }
      NHL_HUB.source = 'live-nhl-api';
      NHL_HUB.syncedAt = data.syncedAt || new Date().toISOString();
    }
  } catch (_) {
    // Fallback to bundled tor_schedule.json + league_db.json when hosted statically
    if (!NHL_HUB.games.length) {
      try {
        const fallback = await fetch('assets/tor_schedule.json', { cache: 'no-store' });
        if (fallback.ok) {
          const fbJson = await fallback.json();
          NHL_HUB.games = fbJson.games || [];
          NHL_HUB.source = 'schedule-cache';
        }
      } catch (_e) {}
    }
  } finally {
    NHL_HUB.isSyncing = false;
  }

  const { nextGame, prevGame } = resolveUpcomingLeafsGame(NHL_HUB.games);
  if (nextGame) {
    applyUpcomingGameToStudio(nextGame, prevGame);
  }

  renderTeamCrestStrip();
  renderPlayerAvatarList();
  syncFormToState();
  updateCenterIceWatermark();

  if (State.view === 'home') {
    renderHomeView();
  } else {
    restartAnimation();
    const gNum = NHL_HUB.gameNumber || 21;
    const away = NHL_HUB.nextGame?.awayAbbrev || 'MIN';
    const home = NHL_HUB.nextGame?.homeAbbrev || 'TOR';
    if (headerLbl) {
      headerLbl.textContent = `${NHL_HUB.source === 'live-nhl-api' ? 'NHL Live' : 'NHL Synced'} • G${gNum} ${away}@${home}`;
    }
  }

  if (!silent) {
    if (homeLbl) {
      homeLbl.textContent = 'Synced Live!';
      setTimeout(() => { homeLbl.textContent = 'Sync Live NHL'; }, 2000);
    }
    if (scoreBtn) {
      scoreBtn.textContent = 'Synced Live';
      setTimeout(() => { scoreBtn.textContent = 'Sync Live NHL'; }, 2000);
    }
  }
}

async function fetchLiveNHLData() {
  await syncLiveNHLHub({ silent: false });
}

function updateExportButtonsUI() {
  const is4k = State.exportRes === '4k';
  const pngLbl = document.getElementById('btnExportPNGLabel');
  const vidLbl = document.getElementById('btnExportWebMLabel');

  if (pngLbl) {
    pngLbl.innerText = is4k ? 'Save 4K PNG' : 'Save PNG';
  }
  if (vidLbl) {
    vidLbl.innerText = is4k ? 'Export 4K Alpha' : 'Export Alpha Video';
  }
}

function showPreviewExportLockedNotice() {
  showBrowserExportToast('Exports are locked in Preview Mode — 4K/1080p ProRes 4444 & PNG Alpha unlock upon purchase.');
}

function showBrowserExportToast(message) {
  if (isNativeMacApp()) return; // Native Mac app displays real AppKit NSDraggingSource dock
  const toast = document.getElementById('webExportToast');
  const txt = document.getElementById('webExportToastText');
  if (!toast || !txt) return;
  txt.innerText = message;
  toast.style.display = 'inline-flex';
  clearTimeout(window.__mukToastTimer);
  window.__mukToastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, 6000);
}

function canvasToPngBlob(targetCanvas) {
  return new Promise((resolve, reject) => {
    targetCanvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas PNG encoding failed'));
    }, 'image/png');
  });
}

async function exportTransparentVideo() {
  showPreviewExportLockedNotice();
}

const exportTransparentWebM = exportTransparentVideo;

async function exportTransparentPNG() {
  showPreviewExportLockedNotice();
}
