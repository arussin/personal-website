"""Generate only the personal site's entry pages. Unrelated files are never touched."""
from pathlib import Path
import hashlib
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'vista'
template = (SOURCE / 'index.html').read_text(encoding='utf-8')
content = json.loads((SOURCE / 'content.js').read_text(encoding='utf-8').split('=', 1)[1].rstrip(';\n'))
version_files = [SOURCE / name for name in ['index.html', 'app.js', 'style.css', 'content.js', 'sky.frag']]
version_files += sorted(path for path in (SOURCE / 'assets').iterdir() if path.is_file())
version = hashlib.sha256(b''.join(path.read_bytes() if path.suffix in ['.webp', '.png'] else
    path.read_bytes().replace(b'\r\n',b'\n') for path in version_files)).hexdigest()[:12]

analytics = '''<script async src="https://www.googletagmanager.com/gtag/js?id=G-1J16K8YPDJ"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-1J16K8YPDJ', {send_page_view: false});
    gtag('event', 'page_view', {page_location: location.href, page_title: document.title});
  </script>'''

def fallback(view):
    nav = '<nav><a href="/">Home</a> · <a href="/events/">Events</a> · <a href="/photography/">Photography</a></nav>'
    if view == 'events':
        body = content['events']
    elif view == 'photography':
        body = ''.join(f'<a href="/{html.escape(path)}"><img loading="lazy" src="/{html.escape(path.replace("assets/photos/", "assets/thumbs/"))}" alt="Photograph {i+1} by Adam J. Russin"></a>' for i, path in enumerate(content['photos']))
    else:
        body = '<p><a href="https://github.com/arussin">GitHub</a> · <a href="https://www.linkedin.com/in/adamrussin/">LinkedIn</a></p><p>I am also the drummer for <a href="https://kleenexgirlwonder.bandcamp.com/music">Kleenex Girl Wonder</a>.</p>'
    return '<noscript><style>#adam-vista{display:none}.no-script{max-width:850px;margin:auto}.no-script img{width:44%;height:auto;margin:2%}.no-script .event-entry{margin:2em 0}</style><section class="no-script"><h1>Adam J. Russin</h1>'+nav+'<p><a href="mailto:adam.russin@gmail.com">adam.russin@gmail.com</a></p>'+body+'</section></noscript>'

def page(view):
    title = {'home': 'Adam J. Russin', 'events': 'Events · Adam J. Russin', 'photography': 'Photography · Adam J. Russin'}[view]
    canonical = 'https://adamrussin.com' + ('/' if view == 'home' else '/'+view+'/')
    result = re.sub(r'  <meta name="robots"[^>]+>\n', '', template)
    result = re.sub(r'<title>.*?</title>', '<title>'+title+'</title>', result)
    result = result.replace('href="../favicon.svg"', 'href="/favicon.svg"')
    result = re.sub(r'href="style\.css[^"\s]*"', f'href="/vista/style.css?v={version}"', result)
    result = re.sub(r'src="(app|content)\.js[^"\s]*"', lambda m: f'src="/vista/{m[1]}.js?v={version}"', result)
    result = result.replace('id="adam-vista"', 'id="adam-vista" data-site-base="/" data-release="'+version+'"')
    # Real anchors retain open-in-new-tab, copy-link, and no-script behavior.
    result = re.sub(r'<button([^>]*data-view="(events|photography)"[^>]*)>(.*?)</button>',
        lambda m: '<a'+m[1].replace(' type="button"', '')+' href="/'+m[2]+'/">'+m[3]+'</a>', result, flags=re.S)
    result = result.replace('<main aria-label="Adam J. Russin">', '<main aria-label="Adam J. Russin"><h1 class="site-heading">Adam J. Russin</h1>')
    result = re.sub(r'<noscript>.*?</noscript>', fallback(view), result, flags=re.S)
    meta = f'''<link rel="canonical" href="{canonical}">
  <meta property="og:title" content="{title}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{canonical}">
  <meta property="og:description" content="Drummer, photographer, and technology speaker. A small living landscape by Adam J. Russin.">
  <meta property="og:image" content="https://adamrussin.com/vista/assets/03cd3fed69d7.webp">
  <meta name="theme-color" content="#302637">
  <style>.site-heading{{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}}</style>
  {analytics}
'''
    return '\n'.join(line.rstrip() for line in result.replace('</head>', meta+'</head>').splitlines())+'\n'

paths = {'index.html': 'home', 'events.html': 'events', 'events/index.html': 'events',
         'photography.html': 'photography', 'photography/index.html': 'photography'}
for path, view in paths.items():
    target = ROOT / path
    target.parent.mkdir(exist_ok=True)
    target.write_text(page(view), encoding='utf-8')
print(json.dumps({'release': version, 'entry_pages': list(paths)}))
