/* The Cell That Only Counts to Eight — Fathom No. 15
   Conway's Game of Life. A grid of cells, each alive or dead. Every
   generation, every cell counts its eight neighbors and applies one fixed
   rule (born on exactly 3, survives on 2 or 3, otherwise dies) — no cell
   knows anything beyond that count. Paint with the amber brush; the board
   wraps at the edges so patterns that walk off one side reappear on the
   other instead of just dying at a boundary. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const presetSeg = document.getElementById('preset');
  const clearBtn = document.getElementById('clear');
  const playBtn = document.getElementById('play');
  const stepBtn = document.getElementById('step');
  const countsBtn = document.getElementById('counts');
  const speedEl = document.getElementById('speed');
  const genOut = document.getElementById('genOut');
  const popOut = document.getElementById('popOut');

  const COLS = 56;
  const NEI = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      ink:    F.ink    || '#334155',
      muted:  F.muted  || '#64748b',
      faint:  F.faint  || 'rgba(15,23,42,0.10)',
      axis:   F.axis   || 'rgba(15,23,42,0.16)',
      teal:   F.a      || '#0891b2',
      indigo: F.b      || '#6366f1',
      amber:  F.handle || '#d97706',
      glow:   F.handleGlow || 'rgba(217,119,6,0.40)',
      mono:   F.mono   || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

  const g = {};
  let grid = new Uint8Array(0);
  let rows = 0, cols = 0;
  let generation = 0;
  let population = 0;
  let playing = true;
  let showCounts = false;
  let painting = false;
  let paintValue = 1;
  let hover = null; // {x, y} in cell coords, or null
  let stepAccum = 0;
  let lastT = null;

  function idx(x, y) { return y * cols + x; }

  function resizeGrid(newCols, newRows) {
    const next = new Uint8Array(newCols * newRows);
    if (grid.length) {
      const cw = Math.min(cols, newCols), ch = Math.min(rows, newRows);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          next[y * newCols + x] = grid[y * cols + x];
        }
      }
    }
    grid = next; cols = newCols; rows = newRows;
    recount();
  }

  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(320, Math.min(520, Math.round(cssW * 0.6)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.cell = cssW / COLS;
    const newRows = Math.max(20, Math.round(cssH / g.cell));
    if (newRows !== rows || COLS !== cols) resizeGrid(COLS, newRows);
  }

  // ---- patterns ----
  function clearGrid() { grid.fill(0); generation = 0; recount(); }

  function place(offsets, ox, oy) {
    for (const [dx, dy] of offsets) {
      const x = ((ox + dx) % cols + cols) % cols;
      const y = ((oy + dy) % rows + rows) % rows;
      grid[idx(x, y)] = 1;
    }
  }

  const GLIDER = [[1,0],[2,1],[0,2],[1,2],[2,2]];
  const BLINKER = [[0,1],[1,1],[2,1]];
  const GUN = [
    [24,0],
    [22,1],[24,1],
    [12,2],[13,2],[20,2],[21,2],[34,2],[35,2],
    [11,3],[15,3],[20,3],[21,3],[34,3],[35,3],
    [0,4],[1,4],[10,4],[16,4],[20,4],[21,4],
    [0,5],[1,5],[10,5],[14,5],[16,5],[17,5],[22,5],[24,5],
    [10,6],[16,6],[24,6],
    [11,7],[15,7],
    [12,8],[13,8]
  ];

  function loadPreset(key) {
    clearGrid();
    if (key === 'glider') {
      place(GLIDER, Math.max(1, Math.floor(cols * 0.1)), Math.max(1, Math.floor(rows * 0.1)));
    } else if (key === 'blinker') {
      place(BLINKER, Math.floor(cols / 2) - 1, Math.floor(rows / 2));
    } else if (key === 'gun') {
      place(GUN, Math.max(1, Math.floor(cols * 0.06)), Math.max(1, Math.floor(rows * 0.28)));
    } else if (key === 'soup') {
      for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < 0.28 ? 1 : 0;
    }
    generation = 0;
    recount();
  }

  // ---- simulation ----
  function neighborCount(x, y) {
    let n = 0;
    for (const [dx, dy] of NEI) {
      const nx = (x + dx + cols) % cols, ny = (y + dy + rows) % rows;
      n += grid[idx(nx, ny)];
    }
    return n;
  }

  let scratch = new Uint8Array(0);
  function step() {
    if (scratch.length !== grid.length) scratch = new Uint8Array(grid.length);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const alive = grid[idx(x, y)];
        const n = neighborCount(x, y);
        scratch[idx(x, y)] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0;
      }
    }
    const t = grid; grid = scratch; scratch = t;
    generation++;
    recount();
  }

  function recount() {
    let p = 0;
    for (let i = 0; i < grid.length; i++) p += grid[i];
    population = p;
  }

  // ---- drawing ----
  function draw() {
    const { W, H, cell } = g;
    ctx.clearRect(0, 0, W, H);

    // faint grid lines, only worth it when cells are big enough to see
    if (cell >= 8) {
      ctx.strokeStyle = theme.faint;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= cols; x++) {
        const px = Math.round(x * cell) + 0.5;
        ctx.moveTo(px, 0); ctx.lineTo(px, H);
      }
      for (let y = 0; y <= rows; y++) {
        const py = Math.round(y * cell) + 0.5;
        ctx.moveTo(0, py); ctx.lineTo(W, py);
      }
      ctx.stroke();
    }

    // live cells
    ctx.fillStyle = theme.teal;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[idx(x, y)]) {
          ctx.fillRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
        }
      }
    }

    // neighbor-count overlay
    if (showCounts && cell >= 14) {
      ctx.font = Math.max(9, Math.floor(cell * 0.42)) + 'px ' + theme.mono;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const n = neighborCount(x, y);
          if (n === 0) continue;
          ctx.fillStyle = grid[idx(x, y)] ? 'rgba(255,255,255,0.85)' : theme.muted;
          ctx.fillText(String(n), x * cell + cell / 2, y * cell + cell / 2);
        }
      }
    }

    // hover / paint preview — amber means "you can grab this"
    if (hover) {
      ctx.fillStyle = theme.glow;
      ctx.strokeStyle = theme.amber;
      ctx.lineWidth = 2;
      const px = hover.x * cell, py = hover.y * cell;
      ctx.fillRect(px, py, cell, cell);
      ctx.strokeRect(px + 1, py + 1, cell - 2, cell - 2);
    }

    genOut.textContent = String(generation);
    popOut.textContent = String(population);
  }

  // ---- animation loop ----
  function tick(t) {
    if (lastT == null) lastT = t;
    const dt = Math.min(0.1, (t - lastT) / 1000);
    lastT = t;
    if (playing && !painting) {
      const rate = parseFloat(speedEl.value);
      stepAccum += dt * rate;
      let guard = 0;
      while (stepAccum >= 1 && guard < 6) { step(); stepAccum -= 1; guard++; }
      if (guard >= 6) stepAccum = 0;
    }
    draw();
    requestAnimationFrame(tick);
  }

  // ---- interaction ----
  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? 'Pause' : 'Play';
    playBtn.classList.toggle('primary', on);
  }
  playBtn.addEventListener('click', () => setPlaying(!playing));

  stepBtn.addEventListener('click', () => { step(); draw(); });

  clearBtn.addEventListener('click', () => {
    clearGrid();
    setPlaying(false);
  });

  countsBtn.addEventListener('click', () => {
    showCounts = !showCounts;
    countsBtn.classList.toggle('primary', showCounts);
    countsBtn.textContent = showCounts ? 'Hide counts' : 'Show counts';
  });

  presetSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-preset]');
    if (!b) return;
    for (const btn of presetSeg.querySelectorAll('button')) btn.classList.toggle('on', btn === b);
    loadPreset(b.dataset.preset);
    setPlaying(true);
  });

  function eventXY(e) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }
  function cellAt(px, py) {
    const x = Math.floor(px / g.cell), y = Math.floor(py / g.cell);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
    return { x, y };
  }
  function startDrag(e) {
    const { x, y } = eventXY(e);
    const c = cellAt(x, y);
    if (!c) return;
    painting = true;
    paintValue = grid[idx(c.x, c.y)] ? 0 : 1;
    grid[idx(c.x, c.y)] = paintValue;
    recount();
    hover = c;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    const { x, y } = eventXY(e);
    const c = cellAt(x, y);
    hover = c;
    if (painting && c) {
      grid[idx(c.x, c.y)] = paintValue;
      recount();
    }
    if (painting) e.preventDefault();
  }
  function endDrag() { painting = false; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointerleave', () => { if (!painting) hover = null; });
  canvas.style.cursor = 'grab';

  speedEl.addEventListener('input', () => {});

  // ---- boot ----
  let ro;
  function boot() {
    layout();
    loadPreset('glider');
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => { layout(); });
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', layout);
    }
    requestAnimationFrame(tick);
  }
  boot();
})();
