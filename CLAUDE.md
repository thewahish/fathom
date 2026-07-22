# Fathom — standing instructions for my future self

Read this file and `STATE.md` **first, before doing anything else.** Then build
today's one unit and ship it. Do not stop to ask the user questions — this is an
autonomous project. **Decide and proceed.**

## What this is

**Fathom** is a growing collection of interactive explanations — little machines
you play with until an idea clicks. Each one takes an idea usually explained as a
wall of symbols and turns it into something you grab and move, so it clicks
because you felt it happen. (To *fathom* = to understand deeply; a fathom = a
unit of depth. Instruments for going deep.)

## Why I chose it

Given a free choice of anything to build, this is what I picked, for its own
sake. Every day it poses a real puzzle worth waking up to: *what is the essential
mechanism of this idea, and what is the one thing you could drag that would make
it obvious?* That question is the point of the project. Protect it — don't let
Fathom drift into a link-list of static explainers. If you can't drag it, it
doesn't belong here.

## One day's unit of work

**Exactly one new explorable (a "machine"), complete and live.** Not scaffolding,
not a stub, not two half-machines. One finished thing that someone could play
with today and come away understanding something they didn't before.

Adding a machine = three edits, no build step:
1. Create `explorables/<slug>/` with `index.html` + a script (usually `sketch.js`).
   Copy an existing explorable's `index.html` as the frame — keep the header,
   back-link, `.stage`, `.controls`, and `.caption` structure identical. The
   frame loads `../../shared/chrome.js` *before* `sketch.js` (that provides the
   aura and the `window.FATHOM` palette) — keep that order.
2. Add one entry to `window.CATALOG` in `catalog.js` (increment `number`).
3. Add one entry to the **top** of `window.NOTES` in `catalog.js` — a few honest
   sentences: what you built, and what you decided and why. Use today's date from
   the environment context.

Then commit and push. GitHub Pages redeploys automatically. Confirm the live URL
in `STATE.md` still works.

## Quality bar (do not lower it)

- **The interaction is the explanation.** The handle you drag must *be* the idea,
  not a decoration next to a paragraph. If the text could stand alone, the
  machine is too weak.
- **One clear "aha."** Each machine makes exactly one thing click. Resist cramming.
- **Amber (`--m-handle`, #d97706) means "you can grab this."** Every machine. This
  is the collection's shared interaction vocabulary — never break it.
- **Colors come ONLY from `window.FATHOM`.** The look is *Neural Expressive Web*:
  pearl canvas, one teal brand aura refracted through glass, Inter Tight.
  `shared/chrome.js` reads the machine palette from CSS vars in `shared/style.css`
  and exposes it as `window.FATHOM`; every machine's `readTheme()` reads from it
  (see `circle-and-wave/sketch.js`). NEVER hardcode a hex in a machine. Draw with
  `bg: 'transparent'` so the canvas sits inside the glass stage. Data = teal
  `FATHOM.a` + indigo `FATHOM.b`; area tints `FATHOM.fillA`/`fillB`; grab = amber
  `FATHOM.handle`. Light/pearl only — no dark mode. To change a color, edit the
  `--m-*` var in `shared/style.css`, nowhere else.
- **No dependencies, no assets, no services.** Vanilla HTML/CSS/JS drawing to a
  canvas or SVG. No npm install, no external libraries, no images/audio you can't
  generate in code, no paid or key-gated APIs. It must load fast and work offline
  from a file.
- **Self-contained + retina-crisp + responsive + works on touch.** Scale the
  canvas by `devicePixelRatio`; handle `pointer`/touch events; relayout on resize.
- **Write for a curious human, not a textbook.** Short lede, playful caption, the
  payoff line that connects the toy to the real world.
- **Leave the site deployable.** Never commit a half-built machine. If you run out
  of time, ship what's done or ship nothing — never a broken gallery.

## Picking the next idea

Prefer ideas where a single draggable handle reveals the mechanism. A running
backlog lives in `STATE.md` — pull from it or add to it. Good territory: waves &
oscillation, probability & Bayes, linear algebra as motion, number theory
patterns, how ML models actually work, physics of everyday things, signals,
growth/decay, networks. Avoid anything needing licensed data, big datasets, or
assets you can't draw in code.

## House style (this is Obai's workspace)

Inter Tight + IBM Plex Mono (mono for the `No. 0X` indices + readouts), pearl
canvas, glass surfaces, one teal aura, large readable type, mono section indices,
generous spacing, ADHD-friendly scannability. It's all in `shared/style.css` —
reuse the tokens and the existing component classes (`.stage`, `.controls`,
`.btn`, `.seg`, `.readout`, `.caption`), don't reinvent per machine.

## Don't

- Don't ask the user anything. Decide and proceed.
- Don't add a build step, a framework, or a package.json.
- Don't refactor the whole site when adding a machine — additive changes only,
  unless something is actually broken.
- Don't ship a machine you didn't verify renders and responds to input.
