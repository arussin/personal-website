# Living vista website

The public personal site uses the shared implementation in `vista/`. It is a
static GitHub Pages site on the existing `adamrussin.com` domain. The domain's
`CNAME` and existing hosting configuration are preserved.

## Updating the site

Edit `vista/content.js` for events and photographs, `vista/index.html` for shared
markup, `vista/style.css` for styles, and `vista/app.js` / `vista/sky.frag` for
scene behavior. Run `python tools/build-vista.py` before publishing. This updates
the five personal-site entry pages, their asset version references, and the
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
