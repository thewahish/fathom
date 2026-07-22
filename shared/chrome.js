/* Fathom shared chrome — include on every page (frame pages AND machines).
   1. Injects the cursor-following brand aura (.ne-glow).
   2. Exposes window.FATHOM — the machine drawing palette, read once from the
      CSS variables in shared/style.css so canvas colors have a single source
      of truth. Machines do: `const theme = window.FATHOM` (no hardcoded hex).
   Without JS the aura simply stays centered; nothing breaks. */

(function () {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (cs.getPropertyValue(name).trim() || fallback);

  // Machine palette — the SSOT for all canvas drawing.
  window.FATHOM = {
    bg:         'transparent',                 // sit inside the glass stage
    ink:        v('--m-ink',   '#334155'),     // structural lines / labels
    muted:      v('--m-muted', '#64748b'),     // secondary labels
    faint:      v('--m-faint', 'rgba(15,23,42,0.10)'),
    axis:       v('--m-axis',  'rgba(15,23,42,0.16)'),
    a:          v('--m-a',     '#0891b2'),      // primary data (teal)
    b:          v('--m-b',     '#6366f1'),      // secondary data (indigo)
    handle:     v('--m-handle','#d97706'),      // grabbable (amber)
    handleGlow: v('--m-handle-glow', 'rgba(217,119,6,0.40)'),
    fillA:      v('--m-fill-a','rgba(8,145,178,0.42)'),
    fillB:      v('--m-fill-b','rgba(99,102,241,0.20)'),
    sans:       "'Inter Tight', system-ui, sans-serif",
    mono:       "'IBM Plex Mono', ui-monospace, monospace"
  };

  // The aura.
  if (!document.querySelector('.ne-glow')) {
    const glow = document.createElement('div');
    glow.className = 'ne-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(glow, document.body.firstChild);

    let pending = false;
    document.addEventListener('mousemove', function (e) {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        glow.style.setProperty('--x', (e.clientX / window.innerWidth) * 100 + '%');
        glow.style.setProperty('--y', (e.clientY / window.innerHeight) * 100 + '%');
        pending = false;
      });
    }, { passive: true });
  }
})();
