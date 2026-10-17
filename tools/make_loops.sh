#!/usr/bin/env bash
# Make short muted web loops (+ poster frames) from source videos.
# Usage: tools/make_loops.sh OUT_DIR VIDEO [START_SECONDS]
#   START_SECONDS defaults to 25% of the way in.
set -euo pipefail
out="$1"; src="$2"; start="${3:-}"
mkdir -p "$out"
name=$(basename "$src"); name="${name%.*}"
slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed -E "s/[^a-z0-9]+/-/g; s/^-|-$//g")
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
if [ -z "$start" ]; then start=$(awk -v d="$dur" 'BEGIN{s=d*0.25; if (s+6>d) s=(d>6?d-6:0); printf "%.2f", s}'); fi
ffmpeg -y -v error -ss "$start" -i "$src" -t 6 -an \
  -vf "scale='min(1280,iw)':-2,fps=30" -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -crf 27 -preset slow -movflags +faststart "$out/$slug.mp4"
ffmpeg -y -v error -ss "$start" -i "$src" -frames:v 1 -vf "scale='min(1280,iw)':-2" -q:v 4 "$out/$slug.jpg"
printf '%s\t%s\t%s\t%s\n' "$slug" "$start" "$dur" "$(du -h "$out/$slug.mp4" | cut -f1)"
