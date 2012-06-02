from flask import Flask
from flask import request
from flask import make_response
from functools import update_wrapper
import songdb
from collections import defaultdict
import json
import os

app = Flask(__name__)
app.config.from_pyfile('application.cfg')

def nocache(f):
    """Decorator that disables http caching."""
    def new_func(*args, **kwargs):
        resp = make_response(f(*args, **kwargs))
        resp.cache_control.no_cache = True
        return resp
    return update_wrapper(new_func, f)

@app.route('/lsmp3')
@nocache
def lsmp3():
    q = request.args.get('q', '')
    limit = request.args.get('limit', None, type=int)
    nocache = request.args.get('nocache', False, type=bool)

    matches = songdb.list_matching(app.config['MP3ROOT'], q, nocache)
    limited = matches[0:limit]
    stats = (len(limited), len(matches))

    # Build dict of category -> songlist where each songlist is a tuple
    # (displayname, filepath)
    d = defaultdict(list)
    for filepath, info in limited:
        if info['artist'] and info['album'] and info['title']:
            # use metadata for category and displayname
            key = info['artist'] + " - " + info['album']
            value = info['title']
        else:
            # no metadata, use path / filename
            # strip invalid utf-8 chars so that json.dumps won't choke
            key, value = map(lambda s: s.decode('utf-8', 'replace'), os.path.split(filepath))

        # preserve invalid characters in filepath
        filepath = filepath.encode('string_escape')
        d[key].append((value, filepath))

    result = { "results": d, "stats": stats }
    return json.dumps(result, indent=4)

if __name__ == '__main__':
    from werkzeug.wsgi import SharedDataMiddleware

    app.wsgi_app = SharedDataMiddleware(app.wsgi_app, {
        '/': os.path.join(os.path.dirname(__file__), 'static')
    })

    app.run(host='0.0.0.0', port=53789)
    #app.run(host='0.0.0.0', port=53789, processes=7)

