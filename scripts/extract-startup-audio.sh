#!/usr/bin/env bash
# Extract startup sound from YouTube for SCP intake console first-run animation.
# Requires: yt-dlp (or youtube-dlp), FFmpeg
# See scripts/extract-startup-audio.md

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$ROOT/public/sounds"
URL="https://www.youtube.com/watch?v=mFNvL8ruDbg"

mkdir -p "$OUT_DIR"
if command -v yt-dlp >/dev/null 2>&1; then
  yt-dlp -x --audio-format mp3 --audio-quality 0 -o "$OUT_DIR/startup.mp3" "$URL"
elif command -v youtube-dl >/dev/null 2>&1; then
  youtube-dl -x --audio-format mp3 --audio-quality 0 -o "$OUT_DIR/startup.mp3" "$URL"
else
  echo "Need yt-dlp or youtube-dl and FFmpeg. See scripts/extract-startup-audio.md"
  exit 1
fi
echo "Saved to $OUT_DIR/startup.mp3"
