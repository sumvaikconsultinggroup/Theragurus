"""Fetch each public source URL in the reviewed migration snapshots; never execute source HTML."""
import concurrent.futures, hashlib, json, pathlib, urllib.request
from urllib.parse import urlsplit, urlunsplit, quote

root = pathlib.Path('.impeccable/review/content')
items = json.loads((root/'pages.json').read_text(encoding='utf-8')) + json.loads((root/'posts.json').read_text(encoding='utf-8'))
def visit(item):
    source = item['link']
    parts = urlsplit(source)
    url = urlunsplit((parts.scheme, parts.netloc, quote(parts.path, safe='/%'), parts.query, ''))
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'TheraGurusContentMigration/1.0'}), timeout=45) as response:
            body = response.read()
            return {'url':source,'status':response.status,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()}
    except Exception as error:
        return {'url':source,'error':str(error)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(visit, items))
(root/'source-audit.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(json.dumps({'urls':len(results),'ok':sum(r.get('status')==200 for r in results),'failures':[r for r in results if r.get('status')!=200]}))
