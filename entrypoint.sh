#!/bin/sh
set -e

mkdir -p /data/assets

for f in /app/defaults/*; do
  [ -f "$f" ] || continue
  filename=${f##*/}
  if [ ! -f "/data/assets/$filename" ]; then
    cp "$f" "/data/assets/$filename"
  fi
done

exec node /app/backend/index.js
