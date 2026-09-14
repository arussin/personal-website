# Search visibility

The homepage, Events, and Photography are the only canonical pages in
`sitemap.xml`. Their metadata describes each page without adding visible copy.
Run `python tools/build-vista.py`, then `python tools/check-search.py` after edits.

The Fitbit archive information pages (including privacy and terms) and the
Vista development page retain their existing `noindex` tags. The separate
maimai report service at `/maimai/` sends `X-Robots-Tag: noindex, nofollow,
noarchive` on reports, history, downloads, and other responses. Keep that header
when updating the report service. Removing its email gate does not remove it.
`maimai.party` is a different site with its own indexing policy.

Do not disallow these paths in `robots.txt`: crawlers need to fetch them to read
their noindex directives. They remain absent from the sitemap. Noindex controls
search listings; publicly accessible pages can still be visited and shared.

## Google Search Console

1. Open <https://search.google.com/search-console> and add a **Domain** property
   for `adamrussin.com`.
2. Complete Cloudflare verification if offered, or add Google's TXT verification
   record to Cloudflare DNS with name `@` and the exact supplied value. Keep it
   after verification succeeds.
3. Submit `https://adamrussin.com/sitemap.xml` under **Sitemaps**.
4. Inspect the homepage, `/events/`, and `/photography/`; test each live URL and
   request indexing if eligible.
5. Inspect `/fitbit-archive/privacy.html` and `/maimai/` to confirm Google reads
   their noindex directives. Do not request indexing for them.

References: [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
and [domain verification](https://support.google.com/webmasters/answer/9008080).
