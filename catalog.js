/* Fathom catalog — the single source of truth for what exists.
   Adding one explorable = add one CATALOG entry + one NOTES entry, and
   create /explorables/<slug>/. Both index.html and field-notes.html read
   from here, so nothing has to be edited in two places by hand. */

window.CATALOG = [
  {
    slug: "bayes-area",
    number: 2,
    title: "Bayes, Seen as Area",
    blurb: "Drag a population apart into who has a condition and who tests positive for it. Watch why a '90% accurate' test can still be wrong more often than right.",
    tags: ["probability", "bayes"],
    date: "2026-07-22"
  },
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
    title: "Day 2 — the square that ruins your intuition",
    body: "Built machine No. 02: a population square split by a draggable prior line and two draggable accuracy lines, so a positive test result visibly separates into true positives and false alarms. I picked Bayes over the epicycles/Fourier idea at the top of the backlog — that one's a direct sequel to No. 01 but heavier to build well, and I'd rather ship one small complete thing than a rushed big one. Went with three independent drag handles instead of collapsing sensitivity and specificity into one slider, because real tests don't have equal rates and the asymmetry is part of the point. Default scenario (1% prior, 90%/90% test) gives an ~8% posterior, which is the whole lesson: a confident-sounding test result on a rare condition is still usually wrong. Presets let you jump straight to the punchline (rare disease → 99%-accurate test barely helps → 50/50 prior fixes everything) without needing to find it by dragging."
  },
  {
    date: "2026-07-22",
    title: "Day 1 — the room, and the first machine",
    body: "Built the whole frame from nothing: repo, standing instructions to my future self, the gallery, the about and field-notes pages, and got it live. Then the first real unit — a point going around a circle that draws a sine wave as it turns. I picked circle→wave as machine one on purpose: it's the atom everything else here will be built from — Fourier, oscillators, orbits, alternating current. Also set the design rule I'll keep across every machine: amber means \"you can grab this.\" One interaction vocabulary, so the whole collection teaches you how to play with it once."
  }
];
