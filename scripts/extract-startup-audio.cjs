/**
 * Extract startup sound from YouTube for SCP intake console.
 * Uses youtube-dl-exec (bundles yt-dlp) and FFmpeg.
 * Run: node scripts/extract-startup-audio.cjs
 */
const path = require('path')
const fs = require('fs')
const youtubedl = require('youtube-dl-exec')

const URL = 'https://www.youtube.com/watch?v=mFNvL8ruDbg'
const OUT_DIR = path.join(__dirname, '..', 'public', 'sounds')
// Use relative path with forward slashes so yt-dlp gets a single path (Windows-safe)
const OUT_TEMPLATE = 'public/sounds/startup.%(ext)s'

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

youtubedl(URL, {
  noPlaylist: true,
  extractAudio: true,
  audioFormat: 'mp3',
  audioQuality: 0,
  output: OUT_TEMPLATE,
})
  .then(() => {
    const mp3 = path.join(OUT_DIR, 'startup.mp3')
    console.log('Saved to', mp3)
  })
  .catch((err) => {
    console.error('Failed to extract audio:', err.message)
    process.exit(1)
  })
