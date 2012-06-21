from redis import Redis
from pickle import loads
from ge import app
from mplayer import Player
import time

redis = Redis()

def smooth_loadfile(mp, path):
    vol = mp.volume
    if vol:
        mp.volume = 0
        mp.stop()
        time.sleep(.0)
    mp.loadfile(path, 1)
    if vol:
        time.sleep(.0)
        mp.volume = vol
        mp.seek(0.0, 1)

def queue_daemon(app):
    mp = Player()
    while 1:
        msg = redis.blpop(app.config['REDIS_QUEUE_KEY'])
        path = loads(msg[1])
        print path
        mp._run_command('loadfile "%s" 1\n' % path)

if __name__ == '__main__':
    queue_daemon(app)
