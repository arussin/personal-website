# Living vista website

The public personal site uses the shared implementation in `vista/`. It is a
static Cloudflare Workers site on `adamrussin.com` (cutover October 1, 2026 EDT).
GitHub is canonical. GitHub Pages and its source `CNAME` remain as rollback standby.
**Main pushes publish to Cloudflare through GitHub Actions** and also update
GitHub Pages standby. See [WORKER_PUBLISHING.md](WORKER_PUBLISHING.md) for the reviewed
manual publication procedure, architecture diagrams and rollback instructions.

## Updating the site

Edit `vista/content.js` for events and photographs, `vista/index.html` for shared
markup, `vista/style.css` for styles, and `vista/app.js` / `vista/sky.frag` for
scene behavior. Run `python tools/build-vista.py` before publishing. This updates
the three personal-site entry pages, their asset version references, and the
public `robots.txt` and `sitemap.xml`. Run `python tools/check-search.py` to
check metadata and the pages excluded from indexing; see `SEARCH_VISIBILITY.md`.

Run the browser checks documented in `vista/README.md` against a local HTTP server.
Use real phone/browser checks as well: automated lifecycle checks do not establish
that every browser or embedded preview will behave identically.

## Scope and rollback

The original site is retained at commit
`9e48f61916bb816b1f7cd6bd14e53ab5b31b9ea8`. A pre-release backup branch also retains
that snapshot. Revert the release commit to roll back only its changes, preserving
subsequent unrelated work; do not reset the whole repository to an old commit.

The initial Vista release updated the home, Events and Photography entry pages
and added their shared source, assets, route directories and maintenance files.
It preserved the Fitbit archive, original photographs and thumbnails, favicon,
domain configuration and legacy root assets. The later removal of unused assets
is recorded below.

## Legacy asset cleanup

Current pages use the shared assets in `vista/`. The unused root `style.css`,
root `script.js` and `assets/bg.png` have been removed from the source tree;
the pre-release backup and original commit above retain all three files.

Publishing this version retires `/style.css`, `/script.js` and `/assets/bg.png`.
Current repository pages do not use those URLs. References from external sites
were not checked.

## November 2026 review fixes

- **One URL per page.** `events.html` and `photography.html` are gone; `/events/`
  and `/photography/` are the only copies. `_redirects` sends `/events`,
  `/events.html`, `/events/index.html`, the photography equivalents and
  `/index.html` to them with a permanent 301, and `/favicon.ico` to `/favicon.svg`.
- **Headers.** `_headers` adds the security headers (HSTS, CSP, `nosniff`, frame
  denial, referrer and permissions policies) and long-lived caching for scene
  files, fonts, photographs and icons. HTML keeps Cloudflare's revalidate default.
  A new third-party script or font needs a matching CSP entry in `_headers`.
- **Fonts.** IBM Plex Mono (SIL Open Font License 1.1, Latin subset, weights 400
  and 500) is served from `vista/assets/`; nothing loads from Google Fonts.
- **404 page.** `404.html` is hand-written and self-contained. Unknown URLs
  return it with status 404 (`not_found_handling: "404-page"`).
- **Icons.** `apple-touch-icon.png` is a 180 px render of `favicon.svg`. Re-render
  it if the SVG changes; iOS does not accept an SVG touch icon.
- **Development page.** `vista/index.html` remains the build template and local
  development page but is no longer published, so `/vista/` returns 404.
- **Photograph viewer.** An enlarged photograph has its own history entry (Back
  returns to the contact sheet), keeps keyboard focus, and fits one screen.

`_headers` and `_redirects` are Cloudflare control files. GitHub Pages standby
ignores both, so a hosting rollback to Pages loses these headers and serves
`/events.html` and `/photography.html` as 404.
