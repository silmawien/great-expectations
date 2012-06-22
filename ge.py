from flask import Flask
from flask import request
from flask import jsonify
from flask import make_response
from functools import update_wrapper
import songdb
from collections import defaultdict
import json
import os
from redis import Redis
import pickle

app = Flask(__name__)
app.config.from_pyfile('application.cfg')
redis = Redis()

def nocache(f):
    """Decorator that disables http caching."""
    def new_func(*args, **kwargs):
        resp = make_response(f(*args, **kwargs))
        resp.cache_control.no_cache = True
        return resp
    return update_wrapper(new_func, f)

@app.route('/click')
def click():
    filepath = request.args.get('fp', None, type=str)
    if filepath:
        filepath = filepath.decode('string_escape')
        path = os.path.join(app.config['MP3ROOT'], filepath)
        cmd = 'loadfile "%s" 1\n' % path
        redis.rpush(app.config['REDIS_QUEUE_KEY'], pickle.dumps(cmd))
    return "Track queued"

@app.route('/stop')
@nocache
def stop():
    cmd = 'stop\n'
    redis.rpush(app.config['REDIS_QUEUE_KEY'], pickle.dumps(cmd))
    return ""

@app.route('/step')
def step():
    value = request.args.get('value', None, int)
    if value:
        cmd = 'pt_step %s\n' % value
        redis.rpush(app.config['REDIS_QUEUE_KEY'], pickle.dumps(cmd))
    return ""

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
            # strip invalid utf-8 chars so that jsonify won't choke
            key, value = map(lambda s: s.decode('utf-8', 'replace'), os.path.split(filepath))

        # preserve invalid characters in filepath
        filepath = filepath.encode('string_escape')
        d[key].append((value, filepath))

    result = { "results": d, "stats": stats }
    return jsonify(result)

if __name__ == '__main__':
    from werkzeug.wsgi import SharedDataMiddleware

    app.wsgi_app = SharedDataMiddleware(app.wsgi_app, {
        '/': os.path.join(os.path.dirname(__file__), 'static')
    })

    app.run(host='0.0.0.0', port=53789)
    #app.run(host='0.0.0.0', port=53789, processes=7)

