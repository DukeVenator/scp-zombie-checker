# Startup audio extraction

The app plays `sounds/startup.mp3` during the first-run startup animation when the file is present.

## Extract audio (Node, cross-platform)

From the project root (uses the `youtube-dl-exec` dev dependency; it will download the yt-dlp binary and use FFmpeg):

```bash
npm run extract-startup-audio
```

Or run the script directly:

```bash
node scripts/extract-startup-audio.cjs
```

**Requires:** FFmpeg on your PATH (for audio conversion). The yt-dlp binary is downloaded automatically by `youtube-dl-exec`.

## Alternative: manual yt-dlp

If you have **yt-dlp** and **FFmpeg** installed:

```bash
mkdir -p public/sounds
yt-dlp -x --audio-format mp3 --audio-quality 0 -o "public/sounds/startup.mp3" "https://www.youtube.com/watch?v=mFNvL8ruDbg"
```

Or run `./scripts/extract-startup-audio.sh` (Bash).
