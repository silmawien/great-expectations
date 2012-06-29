# Simple metadata scanner / lister. Metadata is stored in an index file that
# can be incrementally updated.

from hsaudiotag import auto
import pickle
import os
from werkzeug.contrib.cache import SimpleCache

# Pickled dict of metadata.
# Format: pathname(os-charset) -> { artist, album, title, track }
INDEX = "songs.idx"

# recognized audio files
AUDIO_FILES = [".mpeg", ".mp3", ".mp4", ".flac", ".ogg", ".aiff", ".wma"]

cache = SimpleCache()

def read_index(path):
    try:
        with open(os.path.join(path, INDEX), 'r') as f:
            return pickle.load(f)
    except (IOError, EOFError):
        return {}

def write_index(path, idx):
    with open(os.path.join(path, INDEX), 'w') as f:
        pickle.dump(idx, f)

def list_song_files(root):
    """Get relative path to all songs under root.
    Example: /root/dir/song.mp3 -> dir/song.mp3
    """
    for path, _, files in os.walk(root):
        for f in files:
            _, ext = os.path.splitext(f)
            if ext in AUDIO_FILES:
                yield os.path.join(os.path.relpath(path, root), f)

def mkentry(tags, filepath):
    """Create new entry for the metadata dict."""
    if tags.valid:
        info = {}
        info['artist'] = tags.artist
        info['album'] = tags.album
        info['title'] = tags.title
        info['track'] = tags.track
    else:
        info = { 'artist': '', 'album': '', 'title': '', 'track': 0 }

    info['idx'] = ' '.join([tags.artist, tags.album,
           tags.title, filepath.decode('utf-8', 'ignore')]).lower()
    return info

def rebuild_index(root):
    """Incrementally update the index in directory root."""
    oldidx = read_index(root)
    newidx = {}
    for filepath in list_song_files(root):
        if filepath in oldidx:
            newidx[filepath] = oldidx[filepath]
        else:
            print "Adding", filepath
            tags = auto.File(os.path.join(root, filepath))
            newidx[filepath] = mkentry(tags, filepath)
    for k in oldidx:
        if k not in newidx:
            print "Discarding", k
    write_index(root, newidx)

def upgrade(root):
    """Helper for manually fixing up the index file w/o rebuilding it."""
    oldidx = read_index(root)
    # do stuff
    for filepath, info in oldidx.items():
        info['idx'] = info['idx'].lower()
        #info['idx'] = ' '.join([info['artist'], info['album'],
        #        info['title'], filepath.decode('utf-8', 'ignore')])
    write_index(root, oldidx)


def get_index(root, nocache):
    idx = cache.get(root)
    if idx is None or nocache:
        idx = read_index(root)
        cache.set(root, idx, timeout=5 * 60)
    return idx

def mkmatcher(q):
    """Create a matcher predicate (index entry -> boolean) for query q."""
    lowq = q.lower()
    def matcher(kv):
        _, info = kv
        return info['idx'].find(lowq) != -1
    return matcher

def list_matching(root, q, nocache):
    """
    Dict of songs -> metadata of songs under director root that matches q.
    Metadata may be empty.
    """
    rv = get_index(root, nocache).items()
    for term in q.split():
        rv = filter(mkmatcher(term), rv);
    return rv
