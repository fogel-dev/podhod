#!/bin/sh
# Run as root on the VPS before starting API/worker. Does not remove photos.
set -eu
media_dir=${1:-/var/lib/podhod/media}
case "$media_dir" in
  /*/media) ;;
  *) echo 'Pass an absolute private directory ending in /media.' >&2; exit 1 ;;
esac
[ "$(id -u)" = 0 ] || { echo 'Run as root.' >&2; exit 1; }
[ ! -L "$media_dir" ] || { echo 'Media directory must not be a symlink.' >&2; exit 1; }
mkdir -p "$media_dir"
chown -R 65532:65532 "$media_dir"
chmod 0700 "$media_dir"
