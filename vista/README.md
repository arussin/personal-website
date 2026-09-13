# Vista source

This directory contains the source and artwork for Adam's personal website.
The root home page, Events, and Photography all load the same scene, preserving
the landscape and time state during navigation.

Serve the repository root over HTTP, then open `/vista/`. From the repository:

```text
python -m http.server 8137 --bind 127.0.0.1
```

Files are plain static source; no dependency installation or build service is
required to serve them. `index.html` loads `content.js`, `app.js`, and `style.css`;
the renderer loads its readable GLSL source from `sky.frag`.
Scene artwork is local under `assets/`; photos use the repository's existing
`../assets/photos/` and `../assets/thumbs/` files. The only font dependency is Google
Fonts. The one-time extraction from the approved preview is kept in the parent
workspace as `work/vista-art-direction/prepare-standalone.py`; it is not required
to run or deploy this directory. The native files now contain subsequent edits and
are authoritative; the extraction script refuses to overwrite them by default.

`/vista/` is a development entry page, marked noindex and without analytics.
After editing these source files, run `python tools/build-vista.py` from the
repository root. It regenerates only `index.html`, `events.html`,
`photography.html`, `events/index.html`, and `photography/index.html`, including
versioned asset URLs, canonical metadata, and no-JavaScript content. Existing
privacy policies, other projects, photos, domain configuration, and legacy
shared styles are not modified by the build.

The public routes `/events`, `/events/`, `/events.html`, `/photography`,
`/photography/`, and `/photography.html` open the corresponding reading surface.
Events start expanded, including entries revealed with Earlier events.

## Freeze diagnostics

Open `/vista/?debug-motion`. In the browser console, inspect:

```js
window.vistaDebug.snapshot()
```

This returns actual tick/render counts, time, pause/drag/visibility states, graphics
readiness, recent state changes, and the most recent uncaught error. Diagnostics are
local only. The snapshot function does not reset or repair the state, so it can be
used to capture the failure as it occurs.

The native page retains the latest sky positions, centered phone crop, Arrange sky,
orange J, purple letter depth, coordinated day/night lighting, and current content.
It contains no iframe, Tweak controls, or preview-host icon dependency.

The name uses square dots with pointer/touch light ripples. Its automatic shimmer
visits a small, softly edged patch in a varied direction for 5–7 seconds, then
rests for 20–31 seconds. The first shimmer begins after 4.5 seconds of active
viewing. Pointer interaction takes priority. Space or Enter on the name starts a
shimmer; the existing pause, hidden-tab, reading-panel and reduced-motion states
suspend it. The letter outline, lighting, depth and shadows are preserved.
With `?debug-motion`, `window.nameLightDebug.snapshot()` reports its local state.

## Development regression checks

With Playwright available to Node, run `node vista/tests/motion-lifecycle.cjs`
against the server above. `VISTA_TEST_URL`, `VISTA_PLAYWRIGHT_MODULE`, and
`VISTA_CHROME_PATH` can override the URL, Playwright installation, and browser path.
These checks exercise pause, resizing, panel navigation, interrupted dragging,
preserved-page event handlers, graphics context restoration, and reduced motion.
They do not substitute for a real-browser reproduction of the reported freeze.
`node vista/tests/scene-lighting.cjs` additionally checks the gradual text handover,
shared email/credit timing, night-only connector lines, and the phone layout.
`node vista/tests/production-routes.cjs` checks direct URLs, browser history,
expanded event details, the Bar Freda footage link, moon layering, scrolling,
photo loading, and no-JavaScript content against the generated root pages.
`node vista/tests/viewport-fit.cjs` checks full-height home framing on desktop,
phones, shallow windows, and ultrawide displays, plus scrolling back from the
expanded archive and responding to changes in mobile browser height.
The scene fills the viewport down to 600px tall (660px at phone widths), then
uses normal page scrolling so its labels and controls no longer crowd together.
`node vista/tests/panel-layout.cjs` checks every animation frame for horizontal
label movement when a classic scrollbar appears, including interrupted panel
transitions and ordinary scrolling on narrow screens, including opening and
closing both sections from a scrolled, minimum-height home scene.
`node vista/tests/display-resize.cjs` checks monitor pixel-density changes,
rapid resizing, GPU resets during asset loading and playback, restored controls,
actual painted terrain pixels, and preservation of an intentional pause. It uses
Chrome's device-metrics emulation and WebGL context-loss extension; physical
multi-monitor/GPU migration still depends on the visitor's browser and driver.
`node vista/tests/name-light.cjs` checks automatic glimmers, pointer and touch
response, settling, pause across density changes, panel suspension, keyboard
activation and reduced motion against the production entry page.
`node vista/tests/scene-startup.cjs` holds application startup to verify the full
panorama is already present on wide and phone screens, scene assets preload only
once, and the renderer paints all terrain regions when it takes over.

## Opening scene

The content-hashed `assets/opening-*.webp` is a still exported from the existing
renderer at the initial time, including the calibrated side extensions. It fills
the loading background at exactly the live landscape's scale. The full panorama
replaces the old center-only fallback, so extended terrain does not pop in later.
The HTML preloads the still and runtime scene resources before deferred application
startup. The build matches runtime version queries so those responses are reused.
`node tools/render-vista-poster.cjs` can regenerate the still after an intentional
landscape change; update its filename in the template and CSS before rebuilding.

## Panorama preservation

The original center image, `assets/03cd3fed69d7.webp`, is immutable. Its Git blob
is `e57f03afc33ac4e5b31bb3611b46160adad31831`. The viewport-height scene uses its
existing coordinates; wider screens reveal new terrain outside the original
image bounds. The generated side assets are separate textures. Their model-made
copies of the center are not included, and seam alignment affects only the sides.
`panorama-edges-v1.json` supplies terrain silhouettes so the scene's existing sky,
moon, stars, and day/night lighting work across the extended landscape.
The viewport check verifies both the original file hash and the rendered central
terrain's position when moving from a 3:2 view to a 32:9 view.

The panorama metadata also calibrates horizontal and vertical registration,
color, and contrast at each terrain depth. A compact RGB run-encoded lighting
lookup corrects residual edge differences. Fine corrections fade over a short
distance; broad color differences fade more gradually. This preserves the side
textures without stretching a single border column into a visible stripe.
The terrain shader and CPU silhouette calculation use the same registration.
Every correction is restricted to coordinates outside the approved center.
