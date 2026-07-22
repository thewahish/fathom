/* Bayes, Seen as Area — Fathom No. 02
   Vanilla canvas, no dependencies. A square of "everyone" is split by a
   draggable vertical line (how rare the condition is) and two draggable
   horizontal lines (how good the test is in each column). The posterior
   is read straight off the overlap of two tinted regions. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const presetSeg = document.getElementById('preset');
  const priorOut = document.getElementById('priorOut');
  const seOut = document.getElementById('seOut');
  const spOut = document.getElementById('spOut');
  const postOut = document.getElementById('postOut');

  const TAU = Math.PI * 2;
  const MIN = 0.02, MAX = 0.98;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const PRESETS = {
    rare:  { p: 0.01, se: 0.90, sp: 0.90 },
    great: { p: 0.01, se: 0.99, sp: 0.99 },
    coin:  { p: 0.50, se: 0.90, sp: 0.90 }
  };

  let cur = { ...PRESETS.rare };
  let target = { ...PRESETS.rare };
  let dragging = null; // null | 'p' | 'se' | 'sp'

  // palette from window.FATHOM (single source of truth in shared/style.css,
  // read by shared/chrome.js). No hardcoded colors here.
  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:     'transparent',                        // sit inside the glass stage
      ring:   F.axis   || 'rgba(15,23,42,0.16)',
      text:   F.ink    || '#334155',
      muted:  F.muted  || '#64748b',
      faint:  F.faint  || 'rgba(15,23,42,0.10)',
      violet: F.fillB  || 'rgba(99,102,241,0.20)',  // has-condition column
      blue:   F.fillA  || 'rgba(8,145,178,0.42)',   // tests-positive band
      amber:  F.handle || '#d97706',
      glow:   F.handleGlow || 'rgba(217,119,6,0.40)'
    };
  }
  readTheme();

  // geometry, recomputed on resize
  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(320, Math.min(440, Math.round(cssW * 0.5)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.S = Math.min(cssH - 84, cssW - 120);
    g.sqX = Math.round((cssW - g.S) / 2);
    g.sqY = 54;
  }

  function handlePositions(c) {
    return {
      p:  { x: g.sqX + c.p * g.S, y: g.sqY - 12 },
      se: { x: g.sqX - 12, y: g.sqY + c.se * g.S },
      sp: { x: g.sqX + g.S + 12, y: g.sqY + (1 - c.sp) * g.S }
    };
  }

  function posterior(c) {
    const tp = c.p * c.se;
    const fp = (1 - c.p) * (1 - c.sp);
    return tp / (tp + fp);
  }

  function draw(c) {
    const { W, H, S, sqX, sqY } = g;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    const leftW = c.p * S;
    const rightW = S - leftW;
    const seY = c.se * S;
    const spTopH = (1 - c.sp) * S;

    // has-condition column tint (full height)
    ctx.fillStyle = theme.violet;
    ctx.fillRect(sqX, sqY, leftW, S);

    // tests-positive tint, drawn on top of both columns' top bands
    ctx.fillStyle = theme.blue;
    ctx.fillRect(sqX, sqY, leftW, seY);
    ctx.fillRect(sqX + leftW, sqY, rightW, spTopH);

    // outer border
    ctx.strokeStyle = theme.ring;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sqX + 0.75, sqY + 0.75, S - 1.5, S - 1.5);

    // column labels
    ctx.fillStyle = theme.muted;
    ctx.font = '13px "Inter Tight", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (leftW > 46) ctx.fillText('has condition', sqX + leftW / 2, sqY - 20);
    if (rightW > 46) ctx.fillText('no condition', sqX + leftW + rightW / 2, sqY - 20);

    // the three draggable lines
    const hp = handlePositions(c);
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.amber;

    ctx.beginPath(); ctx.moveTo(hp.p.x, sqY); ctx.lineTo(hp.p.x, sqY + S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sqX, hp.se.y); ctx.lineTo(sqX + leftW, hp.se.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sqX + leftW, hp.sp.y); ctx.lineTo(sqX + S, hp.sp.y); ctx.stroke();

    // handle knobs
    for (const key of ['p', 'se', 'sp']) {
      const pt = hp[key];
      ctx.fillStyle = theme.amber;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 6.5, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // small +/- ticks marking the test-outcome axis on each side
    ctx.fillStyle = theme.muted;
    ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('tests +', sqX - 10, sqY + 12);
    ctx.fillText('tests −', sqX - 10, sqY + S - 4);
    ctx.textAlign = 'left';
    ctx.fillText('+ tests', sqX + S + 10, sqY + 12);
    ctx.fillText('− tests', sqX + S + 10, sqY + S - 4);

    // readouts
    priorOut.textContent = Math.round(c.p * 100) + '%';
    seOut.textContent = Math.round(c.se * 100) + '%';
    spOut.textContent = Math.round(c.sp * 100) + '%';
    const post = posterior(c);
    postOut.textContent = (post * 100 < 1 && post > 0 ? post * 100 : Math.round(post * 100 * 10) / 10) + '%';
  }

  // ---- interaction ----
  function eventXY(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x, y };
  }

  function nearestHandle(x, y) {
    const hp = handlePositions(cur);
    let best = null, bestD = 22;
    for (const key of ['p', 'se', 'sp']) {
      const d = Math.hypot(x - hp[key].x, y - hp[key].y);
      if (d < bestD) { bestD = d; best = key; }
    }
    if (best) return best;
    // also allow grabbing anywhere along the line itself, not just the knob
    const leftW = cur.p * g.S;
    if (Math.abs(x - (g.sqX + leftW)) < 12 && y > g.sqY - 4 && y < g.sqY + g.S + 4) return 'p';
    const seY = g.sqY + cur.se * g.S;
    if (Math.abs(y - seY) < 12 && x > g.sqX - 4 && x < g.sqX + leftW + 4) return 'se';
    const spY = g.sqY + (1 - cur.sp) * g.S;
    if (Math.abs(y - spY) < 12 && x > g.sqX + leftW - 4 && x < g.sqX + g.S + 4) return 'sp';
    return null;
  }

  function setPreset(key) {
    target = { ...PRESETS[key] };
    for (const btn of presetSeg.querySelectorAll('button')) {
      btn.classList.toggle('on', btn.dataset.preset === key);
    }
  }

  function startDrag(e) {
    const { x, y } = eventXY(e);
    const h = nearestHandle(x, y);
    if (!h) return;
    dragging = h;
    for (const btn of presetSeg.querySelectorAll('button')) btn.classList.remove('on');
    e.preventDefault();
    moveDrag(e);
  }
  function moveDrag(e) {
    if (!dragging) return;
    const { x, y } = eventXY(e);
    if (dragging === 'p') cur.p = target.p = clamp((x - g.sqX) / g.S, MIN, MAX);
    if (dragging === 'se') cur.se = target.se = clamp((y - g.sqY) / g.S, MIN, MAX);
    if (dragging === 'sp') cur.sp = target.sp = clamp(1 - (y - g.sqY) / g.S, MIN, MAX);
    e.preventDefault();
  }
  function endDrag() { dragging = null; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  presetSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-preset]');
    if (!b) return;
    setPreset(b.dataset.preset);
  });

  // ---- animation loop (lerps toward preset targets; instant while dragging) ----
  function tick() {
    if (!dragging) {
      cur.p += (target.p - cur.p) * 0.16;
      cur.se += (target.se - cur.se) * 0.16;
      cur.sp += (target.sp - cur.sp) * 0.16;
    }
    draw(cur);
    requestAnimationFrame(tick);
  }

  // ---- boot ----
  let ro;
  function boot() {
    layout();
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => layout());
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', layout);
    }
    requestAnimationFrame(tick);
  }
  boot();
})();
