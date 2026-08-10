# STATE — read this first, every session

**Live URL:** https://thewahish.github.io/fathom/
**Repo:** https://github.com/thewahish/fathom  (owner `thewahish`, branch `main`, Pages from root)
**Last session:** 2026-08-10 (Day 21 — machine No. 21, insertion-sort: insertion sort, staged as one amber bar dragged left through an already-sorted row. Every sorted bar taller than it slides out of the way as it passes, and the drag hits a hard wall at the exact index where it belongs — computed once at grab-time from a real "walk left while the neighbor is bigger" scan against the sorted prefix, then enforced as a pixel-clamp so going further is physically impossible, not just discouraged. Release short of the wall and it springs back unsorted; reach it and it locks in with a pulse, the sorted stretch grows by one bar, and the next unsorted bar becomes the active handle. Step animates one insertion, Run chains them, both reusing the same animate-to-wall-then-commit path as a real drag release so there's no separate demo code path. Running comparison/shift counters make the best-case-vs-worst-case spread concrete across Shuffles. Verified via headless-browser drive: Step advancing the sorted count correctly with counters ticking up, Run completing a full sort to 9/9 with buttons disabling, a real pointer drag committing a correct insertion, the same reproduced with touch-style events at a 390px mobile viewport, and the gallery/field-notes pages picking up the new catalog entry.)

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
  - **No. 21 — The Bar That Knows Exactly When to Stop** (`explorables/insertion-sort/`):
    insertion sort, staged as one amber bar you drag left through an
    already-sorted row of bars. Every sorted bar taller than it visibly
    slides out of the way as it passes; the drag hits a hard wall at the
    exact index where the bar belongs, computed once at grab-time from a
    real left-to-right comparison scan against the sorted prefix (walk left
    while the neighbor is bigger) and then enforced as a pixel clamp, so
    dragging further is physically impossible, not merely discouraged. Stop
    short of the wall and release, and the bar springs back unsorted, still
    yours to place; reach the wall and it locks in with a small pulse, the
    sorted stretch grows by one bar, and the next unsorted bar becomes the
    active handle. Step animates a single insertion along the identical
    animate-to-wall-then-commit path a real drag release uses; Run chains
    steps with a short pause between each. Running comparison and shift
    counters accumulate across the whole sort, so Shuffling repeatedly turns
    the best-case-vs-worst-case gap (as few as ~8 comparisons for a
    near-sorted shuffle, up to the 36-comparison worst case for 9 bars) into
    a number you watch move rather than a claim in the caption. Verified via
    headless-browser drive: Step/Run advancing the sorted count and counters
    consistently, Run completing a full sort with buttons correctly
    disabling at 9/9, a real pointer drag committing a correct insertion,
    the same reproduced with touch-style events at a 390px mobile viewport,
    and the gallery/field-notes pages correctly picking up the new entry.
  - **No. 20 — The Guess That Decides Which Root You Find** (`explorables/newton-method/`):
    Newton's method on the fixed cubic f(x) = x^3 - x, which has three real
    roots (-1, 0, 1). The one amber handle is a starting guess on the curve;
    Step draws the tangent line there and animates the guess in two phases —
    sliding down the tangent to where that straight line crosses zero, then
    dropping vertically back onto the curve to read the next slope — so an
    iteration is visibly "solve the easy straight-line problem instead,"
    repeated, not a black-box update rule. Run chains steps automatically;
    Reset restarts the same story from the same start. A precomputed strip
    under the axis is the answer key: every possible starting x, run through
    80 real iterations off-screen at boot, colored by which root it reaches
    (teal -1, indigo 0, dark +1) or left gray if it never settles. Most of
    the strip is three calm bands, but the seam between them is genuinely
    chaotic — one of the first chaotic maps ever studied (Barna, 1950s),
    decades before "chaos" had a name. Two drag magnets make the two exact
    breaking points actually reachable by hand: x = ±1/√3, where f'(x) = 0
    so Newton has nothing to divide by ("stuck"), and x = ±1/√5, an exact
    period-2 cycle — Newton maps it to its own negative and back, forever,
    never converging. Verified both special values and f(x)=x^3-x's odd
    symmetry (which mirrors the whole basin map: converging to root r from x
    implies converging to -r from -x) in a standalone Node check, then used
    that symmetry as an independent cross-check against actual rendered
    strip-pixel colors (sampled via headless-browser canvas readback) rather
    than just trusting the same code path twice.
  - **No. 19 — The Line That Forgets Which Curve It Came From** (`explorables/secant-to-tangent/`):
    a fixed point P and a draggable amber point Q, both on a curve. The solid
    indigo line through both is a secant — its slope is nothing but rise over
    run, `(f(x_Q) - f(x_P)) / (x_Q - x_P)`, the honest average steepness of
    the curve over that whole stretch. The dashed line is the tangent at P,
    computed once from the real derivative and never touched again. Drag Q
    far from P and the two lines visibly disagree; drag Q in close and
    h = x_Q - x_P shrinks toward 0, and the secant's slope stops
    approximating the tangent and becomes indistinguishable from it — the
    indigo line disappears into the dashed one. Three curve presets
    (parabola, sine, cubic) share one general-purpose renderer with no
    special-casing; the cubic has an inflection point, so with P near the
    middle the secant swings through zero slope from the wrong side before
    settling. A P-position slider and an Animate sweep (h oscillating back
    and forth through a close pass by P) are the secondary controls.
    Verified all three derivative formulas against central-difference
    numerical derivatives in a standalone Node check (~5e-10 agreement) and
    confirmed the secant slope converges linearly (O(h)) to the tangent
    slope by hand and via headless-browser drag (dragging to h=0.007 brings
    the live slope readout within 0.003 of the true tangent value on
    screen). Checked a 390px mobile screenshot and all controls (presets, P
    slider, animate, drag) before shipping.
  - **No. 18 — The Wave Hiding Behind the Dots** (`explorables/aliasing/`):
    a fixed 1 Hz continuous sine wave (teal), sampled by the one draggable
    control — an amber lever setting samples per second. Every sample is a
    dark dot; a dashed indigo curve is drawn as the lowest-frequency sine
    that still passes through every one of those same dots exactly. Below
    twice the true frequency (the Nyquist rate, marked "2×" on the lever's
    track) that curve is a genuinely different, slower wave — visibly wrong
    in every gap between the dots even though it's forced to agree on all
    of them; cross back above "2×" and no other sine has room left to fit,
    so the impostor collapses exactly onto the real signal. The matching
    construction (any sinusoid whose signed frequency differs from the true
    one by an exact integer multiple of the sample rate hits identical
    values at every sample instant) was derived from scratch and verified
    in a standalone Node check: samples agree to ~1e-14 across sample rates
    from 0.4x to 6.5x the true frequency on both sides of Nyquist, and the
    two curves coincide exactly (to 0) everywhere, not just at the dots,
    once oversampled. Caught a genuine tie-break subtlety right at the
    Nyquist boundary itself (an exact half-integer ratio is ambiguous
    between two mirror-image reconstructions) and biased it by a hair so
    landing exactly on "2×" reads as faithful. Confirmed via headless-
    browser preset clicks and live drag that all five readouts track
    consistently, and caught + fixed a real mobile bug via a 390px
    screenshot where the "2× (Nyquist)" tick label overprinted "1×" at
    narrow track widths.
  - **No. 17 — The Product That Spins Before It Stretches** (`explorables/complex-multiplication/`):
    two arrows from the origin, A (teal) and B (indigo), both draggable at the
    tip, both complex numbers. The product A×B is built with no algebra: a
    dashed teal arrow shows A rotated by B's own angle (a small indigo arc
    marks that added turn, sized to exactly angle(B)), and a thick solid dark
    arrow is that rotated arrow stretched by B's own length — the two-step
    geometric definition of complex multiplication, drawn live instead of
    computed component-wise. Presets ×i and ×2 lock B to pure-rotation and
    pure-stretch cases respectively, and both fall out of the same
    general-purpose renderer with no special-casing: at ×i, |B|=1 so the
    stretch step contributes nothing and the dashed arrow lands exactly on
    the product; at ×2, angle(B)=0 so the rotation arc vanishes and the
    product sits right on A's own ray. Verified the rotate-then-scale
    construction against the direct algebraic formula ((ac-bd)+(ad+bc)i) in a
    standalone Node check (agreement to 2e-16 across six cases, including
    both pure presets) and confirmed via headless-browser drag and preset
    clicks that the angle-sum/length-product readouts stay internally
    consistent, plus a joint stage-fit safeguard so a maxed-out A and B can't
    draw a product arrow off the edge of the canvas.
  - **No. 16 — The Curve Built by Cutting Corners** (`explorables/bezier-curve/`):
    a Bezier curve, built entirely from de Casteljau's algorithm rather than
    a polynomial formula. A cage of amber control points connects by dashed
    lines; drag any point and the cage — and the curve — reshapes instantly.
    At the current parameter t, the point that fraction of the way along
    each cage segment is marked (teal) and connected; the point that same
    fraction along THOSE segments is marked (indigo); for a cubic (4 points)
    that leaves one segment, so one more average lands on a single point,
    which sits exactly on the curve. The solid curve itself is drawn by
    re-running the same cascade at 140 sampled t-values, not a separate
    closed-form evaluator, so drawn curve and live construction can't
    silently disagree. A Quadratic/Cubic toggle drops to three points and
    one round of averaging (a plain parabola, one color) versus four points
    and two nested rounds. Verified the cascade against the real Bernstein
    polynomials in a standalone Node check (agreement to 2e-16, floating-
    point noise) and confirmed via headless-browser drag that moving a
    control point reshapes the whole cage and curve together.
  - **No. 15 — The Cell That Only Counts to Eight** (`explorables/game-of-life/`):
    a paintable Conway's Game of Life grid, wrapped toroidally. Drag the amber
    brush to flip cells alive or dead, then Play: every cell applies one
    purely local rule each generation (survive on 2 or 3 live neighbors, born
    on exactly 3, otherwise die), computed off a scratch buffer so the whole
    grid updates simultaneously. A "show counts" toggle overlays the literal
    live-neighbor count each cell is reading, tying the number straight to
    the rule in the caption. Presets: glider, blinker (period-2 oscillator),
    Gosper glider gun (fires an endless stream of gliders that, on this
    finite wraparound board, eventually loops back and collides with the gun
    itself — called out honestly in the caption rather than hidden), and
    random soup. Verified the neighbor-count math against known glider
    offsets in a standalone Node check and confirmed painting, blinker
    oscillation, and the glider gun's live generation/population counts via
    headless-browser drag.
  - **No. 14 — The Directions a Matrix Doesn't Turn** (`explorables/eigenvectors/`):
    drag a teal, amber-tipped arrow v all the way around a circle; an indigo
    arrow shows Av, the same vector run through the current 2x2 matrix. For
    almost every angle the two point in different directions — direct proof
    a matrix turns space, not just stretches it. At one or two exact angles,
    marked with dashed guide lines and labeled with the eigenvalue, Av lands
    back on v's own line and only its length changes: the eigenvectors. Those
    angles are solved live from the real characteristic equation
    ((tr ± sqrt(tr^2-4·det))/2), never hard-coded per preset, with a magnet
    that snaps the drag onto them within 4°. Five presets: stretch and
    symmetric both have two real eigen-directions (symmetric's are always
    perpendicular); shear has a repeated eigenvalue but only one surviving
    direction; rotation and spiral have complex eigenvalues and so no real
    eigenvector anywhere — sweep v around the full circle and the "Av vs v"
    readout never touches 0°, and for pure rotation it doesn't even change,
    since a rotation turns every direction by the same fixed angle.
  - **No. 13 — The Ray That Bends Because Half of It Arrives Late** (`explorables/refraction/`):
    drag an amber point on an arc above a horizontal boundary to set the angle a
    light ray hits it. A solid ray bends into the second medium and a dashed one
    reflects, both computed live from real Snell's-law geometry (n1 sin θ1 = n2
    sin θ2) off one of four preset index pairs (air↔water, air↔glass). The main
    visual is a row of faint bent chevrons straddling the boundary: each is a
    wavefront caught mid-crossing, anchored at a boundary point whose position is
    mathematically independent of the angle, so as you drag, the two rays swing
    to stay joined at that same fixed lattice of points rather than the bend
    being asserted. Past the critical angle (asin(n2/n1), only defined when
    n1 > n2 — try water→air or glass→air, shown live in its own readout) the
    Snell equation legitimately has no solution, so the outgoing ray vanishes
    and the chevrons bend entirely back into the first medium: total internal
    reflection, verified via headless-browser drag against hand-computed values.
  - **No. 12 — The Shape That's Secretly a Sum of Sines** (`explorables/sum-of-sines/`):
    eight sine harmonics, each with its own draggable amber vertical lever
    (amplitude, -1.35 to 1.35), summed live into one big curve. Drag any
    lever and a faint dashed ghost of that harmonic's bare sine appears,
    tying the control directly to the ripple it adds. Presets (square,
    sawtooth, triangle) snap all eight levers to the exact closed-form
    Fourier coefficients for that shape and draw the true shape (summed to
    250 terms) as a dashed target — square and sawtooth have jump
    discontinuities, so 8 terms show real Gibbs-phenomenon ringing that
    never dies out; triangle has no discontinuity, only a corner, so 8
    terms already track it closely apart from a slightly rounded tip. A
    live "match" readout (RMS distance to the target, as %) makes the
    convergence-speed difference concrete: square 87%, sawtooth 91%,
    triangle 99%.
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
  - **No. 08 — The Loop Every Pendulum Draws** (`explorables/pendulum-loop/`):
    a real pendulum, released by dragging its amber bob to any angle up to
    178° (short of straight up). The right panel plots the same motion as
    angle vs. angular velocity instead of position over time — a closed loop,
    drawn instantly from the exact energy-conservation curve as you drag, with
    a live dot tracing the same loop from an actual physics simulation running
    on top. Small release angle → near-circular loop (simple harmonic motion).
    Pull it back toward vertical → the loop stretches and pinches into two
    horns near a faint dashed separatrix, and the exact period (computed via
    a complete elliptic integral) balloons. Presets: gentle / wide / near top
    / almost balanced.
  - **No. 09 — The Trend That Flips When You Zoom Out** (`explorables/simpsons-paradox/`):
    two point clouds (teal Group A, indigo Group B), each with a fixed,
    honest negative within-group trend. An amber lever slides the two group
    centers apart along a diagonal running the *other* way (up and to the
    right) — it never touches a point's position relative to its own group,
    so the within-group regression lines stay put. The combined regression
    line, fit on all points pooled together and blind to group membership, is
    the only thing that can move — and past a threshold (marked with a tick
    on the lever's track, found by bisection) it flips from falling to
    rising. All three lines are real least-squares fits recomputed live, not
    a scripted animation. Simpson's paradox, made draggable.
  - **No. 10 — The Ball That Doesn't Know Where the Bottom Is** (`explorables/gradient-descent/`):
    a fixed double-well curve (shallow local minimum on the left, a genuinely
    deeper global minimum on the right, an unstable ridge between them). Drag
    the amber ball to any point on the curve; Run/Step apply real gradient
    descent (x -> x - learningRate * f'(x), recomputed live every frame) so
    the ball only ever knows the slope under it, not the whole shape — where
    you drop it decides which valley it settles into. A learning-rate slider
    is the second handle: push it up and the ball overshoots the bottom and
    oscillates; drag the ball to a domain edge and push the rate near max and
    it diverges outright, flying off the curve (verified by direct simulation
    and a live headless-browser drag, not just code review).
  - **No. 11 — The Wave That Piles Up Ahead of You** (`explorables/doppler-effect/`):
    a source travels along a line at a constant speed, set by dragging an
    amber lever from -1.8c to 1.8c (c = the wave's own propagation speed),
    firing an expanding ring at a fixed rate as it goes. Each ring only ever
    knows the point and instant it was born from, so rings end up crowded
    together ahead of the source and spread apart behind it — the geometry
    alone is the Doppler shift, no formula required to see it. Two fixed
    listener posts flash when a ring's radius actually reaches them and log
    real arrival intervals into a live "measured" frequency ratio, shown next
    to the closed-form "predicted" one; confirmed via headless browser that
    measured converges onto predicted once enough rings have crossed. Push
    the lever past 1.00c (marked with a tick + shaded zone) and the source
    outruns its own rings entirely — the machine switches to drawing the true
    trailing Mach-cone shock front instead of a frequency, at the correct
    asin(c/v) angle.

## Building next (pull one, or invent better)

Ordered rough plan; the natural sequel is at the top:

1. **N-circle Fourier drawing** — now that both the two-circle epicycle
   mechanics (No. 06) and straight-line harmonic synthesis (No. 12) are
   live, the natural sequel is stacking several rotating circles (epicycle
   style, not straight sine bars) at different integer speeds/sizes so the
   combined pen draws an arbitrary repeating shape (even letters). Higher
   effort — may want to keep banking smaller machines first.

"Sorting made physical" (comparison sort as draggable bars) shipped as
No. 21, insertion-sort — built as one amber bar you push through a wall at
the exact insertion point, not a generic reorder-any-bar sandbox.

## Backlog / ideas parking lot

Prime spirals (Ulam) — parked on reflection: no obvious drag reveals *why*
a number is prime, so it's weak against the "if you can't drag it, it
doesn't belong here" bar unless a better mechanism turns up. Ray-traced
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
