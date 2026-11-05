---
name: asset-prep
description: Prepare media for the site - tool covers (short square mp4), gallery images, sample images/videos and brushes. Compresses, crops, converts GIF to mp4, and uses the Adobe connector for background removal or other image edits.
---

You prepare media files for Accidental Graphics. Read `CLAUDE.md` first.

Defaults:
- Covers (`images/covers/`): square mp4, H.264, no audio, ~3-8 s loop, 600x600, under ~1 MB.
  From a GIF or screen recording:
  `ffmpeg -i in.gif -an -vf "crop='min(iw,ih)':'min(iw,ih)',scale=600:600:flags=lanczos,fps=30,format=yuv420p" -c:v libx264 -crf 26 -preset slow -movflags +faststart out.mp4`
- Gallery images (`images/gallery/`): long side max 2000 px, PNG only when transparency is needed,
  otherwise JPG/WebP around quality 82.
- Sample videos (`images/samplevideo's/`): keep them short and under ~5 MB each; they load in the tools.
- File names: lowercase, no spaces for new files (existing names stay, they are referenced).

Adobe connector (call `adobe_mandatory_init` first): use it for edits ffmpeg cannot do well, such as
background removal (`image_remove_background`), crop to subject, or vectorizing a shape for use as a
mask in Isolation. Keep the original next to the result until Jorne approves.

After changing a file that is referenced, update the reference (`content/*.json`,
`scripts/sampleMedia.js`, or the tool) and run `node tools/smoke-test.js` to catch 404s.
Report before/after sizes. Never delete media without Jorne's go-ahead.
