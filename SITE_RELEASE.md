# Living vista website

The public personal site uses the shared implementation in `vista/`. It is a
static GitHub Pages site on the existing `adamrussin.com` domain. The domain's
`CNAME` and existing hosting configuration are preserved.

## Updating the site

Edit `vista/content.js` for events and photographs, `vista/index.html` for shared
markup, `vista/style.css` for styles, and `vista/app.js` / `vista/sky.frag` for
scene behavior. Run `python tools/build-vista.py` before publishing. This updates
the five personal-site entry pages and their asset version references.

Run the browser checks documented in `vista/README.md` against a local HTTP server.
Use real phone/browser checks as well: automated lifecycle checks do not establish
that every browser or embedded preview will behave identically.

## Scope and rollback

The original site is retained at commit
`9e48f61916bb816b1f7cd6bd14e53ab5b31b9ea8`. A pre-release backup branch also retains
that snapshot. Revert the release commit to roll back only its changes, preserving
subsequent unrelated work; do not reset the whole repository to an old commit.

This release changes only the existing home, Events, and Photography entry pages,
and adds their shared source, assets, route directories, and maintenance files.
Existing `fitbit-archive` pages and policies, original photographs/thumbnails,
favicon, `style.css`, `script.js`, and `CNAME` are preserved byte for byte. No
other repository, DNS record, project-site routing rule, or catch-all error page
is changed.
