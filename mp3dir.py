# Mp3 find/filter utilities
# Collections of songs are represented as a list of tuples (path, filename)

from werkzeug.contrib.cache import SimpleCache
import os

cache = SimpleCache()

def list_files(top):
    """Generate (path, file) tuples for all files under directory top.
    The top prefix is stripped from the returned paths."""
    for root, _, files in os.walk(top):
        # assume utf-8 from file system, but quietly accept garbage
        root = root.decode('utf8', 'replace')[len(top):]
        for file in files:
            yield (root, file.decode('utf-8', 'replace'))

def files(root, nocache):
    """Find (path, file) tuples, cached for 5 min."""
    rv = cache.get('files')
    if rv is None or nocache:
        rv = list(list_files(root))
        cache.set('files', rv, timeout=5 *60)
    return rv

def match(s, q):
    """Find out if s matches the query q."""
    return s.lower().find(q.lower()) != -1

def find_matching(root, q, nocache):
    """Find (path, file) tuples matching query q under directory root."""
    # TODO fuzzy matching with multiple query words
    # TODO ID3 support?
    return filter(lambda (p, f): match(p, q) or match(f, q), files(root, nocache))

