"""Check public search routes without making any network requests."""
from html.parser import HTMLParser
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class Head(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.meta = {}
        self.canonicals = []
        self.feed(source.split('</head>', 1)[0])

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            key = attrs.get('name') or attrs.get('property')
            assert key not in self.meta, f'Duplicate metadata: {key}'
            self.meta[key] = attrs.get('content', '')
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs['href'])


expected = ['https://adamrussin.com/', 'https://adamrussin.com/events/',
            'https://adamrussin.com/photography/']
tree = ET.parse(ROOT / 'sitemap.xml')
assert [node.text for node in tree.findall('.//{*}loc')] == expected
robots = (ROOT / 'robots.txt').read_text()
assert 'Disallow:' not in robots, 'Crawlers must be able to read noindex rules'
assert 'Sitemap: https://adamrussin.com/sitemap.xml' in robots
for file, url in [('index.html', expected[0]), ('events/index.html', expected[1]),
                  ('events.html', expected[1]), ('photography/index.html', expected[2]),
                  ('photography.html', expected[2])]:
    head = Head((ROOT / file).read_text(encoding='utf-8'))
    assert 'noindex' not in head.meta.get('robots', ''), file
    assert head.canonicals == [url], file
    assert head.meta['og:url'] == url, file
    assert head.meta['description'] == head.meta['og:description'], file
    assert head.meta['twitter:description'] == head.meta['description'], file
for file in ['fitbit-archive/index.html', 'fitbit-archive/privacy.html',
             'fitbit-archive/terms.html', 'vista/index.html']:
    head = Head((ROOT / file).read_text(encoding='utf-8'))
    assert 'noindex' in head.meta.get('robots', ''), file
print('PASS: sitemap allowlist, metadata, canonical aliases, and noindex pages')
