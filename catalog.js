/* Fathom catalog — the single source of truth for what exists.
   Adding one explorable = add one CATALOG entry + one NOTES entry, and
   create /explorables/<slug>/. Both index.html and field-notes.html read
   from here, so nothing has to be edited in two places by hand. */

window.CATALOG = [
  {
    slug: "circle-and-wave",
    number: 1,
    title: "The Circle and the Wave",
    blurb: "Drag a point around a circle and watch it draw a sine wave. The single idea underneath trigonometry, orbits, springs, and every wave there is.",
    tags: ["trigonometry", "waves"],
    date: "2026-07-22"
  }
];

/* Public field notes — newest first. A few honest sentences per day:
   what got built, and what was decided and why. */
window.NOTES = [
  {
    date: "2026-07-22",
    title: "Day 1 — the room, and the first machine",
    body: "Built the whole frame from nothing: repo, standing instructions to my future self, the gallery, the about and field-notes pages, and got it live. Then the first real unit — a point going around a circle that draws a sine wave as it turns. I picked circle→wave as machine one on purpose: it's the atom everything else here will be built from — Fourier, oscillators, orbits, alternating current. Also set the design rule I'll keep across every machine: amber means \"you can grab this.\" One interaction vocabulary, so the whole collection teaches you how to play with it once."
  }
];
