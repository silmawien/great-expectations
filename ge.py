from flask import Flask
from flask import request
from flask import make_response
from functools import update_wrapper
from itertools import islice
import mp3dir
from collections import defaultdict
import json

app = Flask(__name__)
app.debug = True

def nocache(f):
    """Cache-disabling decorator."""
    def new_func(*args, **kwargs):
        resp = make_response(f(*args, **kwargs))
        resp.cache_control.no_cache = True
        return resp
    return update_wrapper(new_func, f)

@app.route('/')
def hello_world():
    return 'Hello World Reloaded!'

@app.route('/lsmp3')
@nocache
def lsmp3():
    q = request.args.get('q', '')
    limit = request.args.get('limit', None, type=int)
    nocache = request.args.get('nocache', False, type=bool)
    matches = mp3dir.find_matching(q, nocache)
    limited = matches[0:limit]
    stats = (len(limited), len(matches))
    
    # group by directory for nice display
    d = defaultdict(list)
    for p, f in limited:
        d[p].append(f)
    result = json.dumps(d, indent=4)
    #result = '\n'.join(repr(p) for p in d.iteritems())
    result += "\n(displayed, total) = %s" % (stats,)
    return result

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=53789)

