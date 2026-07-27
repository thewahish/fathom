# STATE — read this first, every session

**Live URL:** https://thewahish.github.io/fathom/
**Repo:** https://github.com/thewahish/fathom  (owner `thewahish`, branch `main`, Pages from root)
**Last session:** 2026-07-27 (Day 7 — machine No. 07, times-table-circle: multiplication mod n as a mandala)

## How to run a session (summary — full rules in CLAUDE.md)

1. Read `CLAUDE.md` and this file.
2. Pick the next idea (from the backlog below, or a better one you think of).
3. Build **one** complete machine in `explorables/<slug>/`. Copy an existing
   explorable's `index.html` as the frame. Vanilla JS, canvas, amber = grabbable.
4. Add one `CATALOG` entry (increment `number`) and one `NOTES` entry (at the
   **top**, today's date) in `catalog.js`.
5. Verify it renders and responds to input (serve locally, or open the file).
6. Update this file (bump "Last session", move the idea out of the backlog,
   note anything unfinished).
7. Commit + push. Pages redeploys on its own. Don't ask the user anything.

## What exists

- **Site frame:** `index.html` (gallery, renders from `catalog.js`),
  `about.html`, `field-notes.html` (renders from `catalog.js`).
- **Shared:** `shared/style.css` (all design tokens + control/canvas styling),
  `catalog.js` (the single source of truth: `CATALOG` + `NOTES`).
- **Machines:**
  - **No. 01 — The Circle and the Wave** (`explorables/circle-and-wave/`):
    a point circles; its height traces a sine wave. Drag the amber point to
    scrub. Modes: sine / cosine / both. Speed slider, play/pause, live readouts.
    This is the reference implementation — copy its structure and quality.
  - **No. 02 — Bayes, Seen as Area** (`explorables/bayes-area/`): a population
    square split by a draggable vertical line (prior/base rate) and two
    draggable horizontal lines (sensitivity, specificity). Positive-test-result
    area splits visibly into true positives vs. false alarms; posterior reads
    off their ratio. Presets: rare disease, 99%-accurate test, 50/50 prior.
  - **No. 03 — The Board That Builds a Bell Curve** (`explorables/galton-board/`):
    a Galton board. Balls fall through a triangular grid of pegs, each bounce
    an independent coin flip, and pile up into a histogram that converges live
    on the binomial curve (drawn as an overlay). Drag the amber lever above the
    pegs to bias the coin — the pile leans but keeps its bell shape. Rows
    (6–16) and drop rate are plain sliders.
  - **No. 04 — The Dot Product, Seen as a Shadow** (`explorables/dot-product/`):
    two arrows (teal A, indigo B) from a shared origin, both draggable at the
    tip. A dashed guide line runs through A's direction; a perpendicular drop
    from B's tip lands on that line, and the thick translucent bar from the
    origin to that landing point *is* the dot product — its signed length
    times |A|. Drag B past 90° from A and the landing point crosses to the far
    side of the origin, flipping the sign live. Readouts: |A|, |B|, angle, A·B.
  - **No. 05 — The Number Compound Interest Can't Get Past** (`explorables/e-and-compounding/`):
    left panel plots (1+1/n)^n against n (log scale) as a curve that climbs and
    flattens against a dashed asymptote at e; drag the amber dot along that curve
    to set n. Right panel takes the same n and renders an actual year of
    compounding as a staircase chasing a dashed continuous-growth curve — at
    n=1 it's one big jump, by n≈3,000 the staircase is visually indistinguishable
    from smooth growth. A dashed line ties the dot's height to the staircase's
    year-end value (same number). Presets: yearly / monthly / daily / continuous.
  - **No. 06 — The Circle That Rides a Circle** (`explorables/epicycles/`): a big
    circle turns once; a small circle rides its tip and spins k times in that
    same trip (k a whole number, -6 to 6, forwards or backwards). The pen at the
    small circle's tip traces the combined shape — a plain circle, a dimpled
    loop, a multi-pointed flower, depending on k. Drag the amber lever (same
    track-with-ticks pattern as the Galton board's bias lever) to set k live;
    the full closed curve redraws instantly since integer k always closes after
    exactly one big-circle revolution. A second slider sets the small circle's
    size (R2/R1), which sharpens or softens the loops without changing how many
    there are. Caption ties it to Fourier series: stack more circles the same
    way, sized and timed right, and you can draw any repeating shape.
  - **No. 07 — The Times Table That Draws Itself** (`explorables/times-table-circle/`):
    n points evenly spaced around a circle; point i connects by a straight
    line to point (i × m) mod n. Drag the amber dot (log-scale lever, with a
    magnet toward whole numbers) to sweep the multiplier m continuously —
    m=1 is just the circle's own spokes, m=2 folds into a cardioid, m=3 a
    nephroid, and higher m weaves denser mandalas, all from the same one-line
    rule. Autoplay sweeps m back and forth by default. Points (n) is a plain
    slider (30–300); it changes the mandala's weave but isn't the thing being
    taught, so it didn't earn the primary handle.

## Building next (pull one, or invent better)

Ordered rough plan; the natural sequel is at the top:

1. **N-circle Fourier drawing** — now that the two-circle epicycle mechanics
   (No. 06) are live, the natural sequel is stacking several circles at
   different integer speeds/sizes so the combined pen draws an arbitrary
   repeating shape (even letters), with sliders/handles per harmonic. Higher
   effort — may want to keep banking smaller machines first.
2. **Sorting made physical** — bars you can watch a comparison sort reorder, one
   swap at a time (only if the interaction, not just animation, teaches it).

## Backlog / ideas parking lot

Prime spirals (Ulam), sine sum / harmonics adding up, pendulum phase space,
Simpson's paradox as tilting lines, gradient descent as a ball on a surface you
tilt, Conway's Life as a brush you paint with, the Doppler effect, ray-traced
reflection you aim, binary counting you flip.

## Automation — how the daily run is wired

**ACTIVE: cloud routine** (set up 2026-07-22). Runs in Anthropic's cloud even when
the Mac is off. GitHub account `thewahish` is connected to claude.ai, so it can
clone + push `thewahish/fathom` directly.

- **Routine id:** `trig_01DNWBbhmg6BVz7NNVfKBbZL` ·
  manage at https://claude.ai/code/routines/trig_01DNWBbhmg6BVz7NNVfKBbZL
- **Schedule:** cron `0 6 * * *` = **09:00 Asia/Damascus** (06:00 UTC; the platform
  adds a few min of jitter). Model `claude-sonnet-5`. Repo `thewahish/fathom`.
  Tools: Bash/Read/Write/Edit/Glob/Grep. The prompt = the standing "continue
  Fathom, build one machine, push to main" instruction.
- **Only one automation should run.** Don't also enable the local job below, or
  you'll get two machines/day and push races.

**STANDBY: local launchd job** — installed but **DISABLED** (2026-07-22) so it
doesn't double-build against the cloud routine. Use it only if you retire the
cloud routine (e.g. want it to run against the local working copy).

- Files: `~/Library/LaunchAgents/com.obai.fathom.daily.plist`, `~/.fathom/run.sh`,
  `~/.fathom/prompt.txt`. Logs: `~/.fathom/logs/`. Fires 09:00 local when enabled.
- Re-enable: `launchctl load -w ~/Library/LaunchAgents/com.obai.fathom.daily.plist`
  (and first disable the cloud routine at the link above). Run once now:
  `zsh ~/.fathom/run.sh`. Push auth via `gh` (`gh auth setup-git` done).

## Open threads / notes

- Design language = Neural Expressive Web (pearl canvas, one teal aura through
  glass, Inter Tight + IBM Plex Mono). Machine colors come ONLY from
  `window.FATHOM` (set by `shared/chrome.js` from the `--m-*` CSS vars in
  `shared/style.css`): teal `--m-a` = primary data, indigo `--m-b` = secondary,
  amber `--m-handle` #d97706 = grabbable. Brand aura = `--brand-anchor` #0e7490.
  Never hardcode a hex in a machine; edit the CSS var instead. Every page loads
  `shared/chrome.js` (frame pages + machines, before `sketch.js`).
- No build step by design. Don't introduce one. Don't add npm/frameworks.
- `.nojekyll` is present so Pages serves folders as-is.
- If a session runs short: ship a smaller complete machine rather than a big
  half-built one. The gallery must always be deployable.
