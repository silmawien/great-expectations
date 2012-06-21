from songdb import rebuild_index
from ge import app

rebuild_index(app.config['MP3ROOT'])

