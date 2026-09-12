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
