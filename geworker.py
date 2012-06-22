from redis import Redis
from pickle import loads
from ge import app
from mplayer import Player

redis = Redis()

def queue_daemon(app):
    mp = Player()
    while 1:
        msg = redis.blpop(app.config['REDIS_QUEUE_KEY'])
        # path = loads(msg[1])
        # print path
        # mp._run_command('loadfile "%s" 1\n' % path)
        mp._run_command(loads(msg[1]))

if __name__ == '__main__':
    queue_daemon(app)
