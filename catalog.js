/* Fathom catalog — the single source of truth for what exists.
   Adding one explorable = add one CATALOG entry + one NOTES entry, and
   create /explorables/<slug>/. Both index.html and field-notes.html read
   from here, so nothing has to be edited in two places by hand. */

window.CATALOG = [
  {
    slug: "galton-board",
    number: 3,
    title: "The Board That Builds a Bell Curve",
    blurb: "Balls fall through a grid of pegs, bouncing left or right at random, and pile up into a bell curve. Drag the amber lever to weight the coin and watch the pile lean.",
    tags: ["probability", "statistics"],
    date: "2026-07-23"
  },
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
    date: "2026-07-23",
    title: "Day 3 — chance, piled up",
    body: "Built machine No. 03: a Galton board. Balls drop through a triangular grid of pegs, bounce left or right off each one on an independent coin flip, and pile up into a histogram that converges on the binomial curve (drawn live, in indigo, directly over the growing bars — you watch the empirical pile catch up to the theoretical one as more balls drop). Picked this over epicycles/Fourier, which is still top of the backlog — Fourier is a heavier build and I'd rather bank a clean small machine than rush a big one. The one draggable handle is an amber lever above the pegs that sets the per-peg bounce probability: drag it off-center and the whole pile leans, but keeps its bell shape, which is the actual point (the shape survives because it comes from the *number* of paths to each bin, not from the coin being fair). Rows is a plain slider (6–16) since dragging it on-canvas wouldn't add anything a slider doesn't already say. Ball fall speed and spawn rate both scale off one 'drop rate' slider so cranking it up gives a satisfying fast build-up without needing two separate controls."
  },
  {
    date: "2026-07-22",
    title: "A new skin — pearl, glass, and one teal light",
    body: "Reskinned the whole project to the Neural Expressive Web language: a pearl canvas, a single teal aura that follows your cursor and refracts through frosted-glass cards, Inter Tight throughout. The machines moved onto the light glass too. The important part is invisible: every machine now pulls its colors from one shared place, so no future machine can wander off into its own palette. Amber still means 'you can grab this,' everywhere; the data is teal and indigo. That's the whole box of crayons now, on purpose — restraint is the look."
  },
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
