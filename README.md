# pptx-to-premium-video

Cloud-only pipeline that turns a PowerPoint deck plus a single voiceover
MP3 into a premium animated Remotion video — Apple-keynote / institutional
investor film vibe. Runs entirely in Claude Code on the web + GitHub +
GitHub Actions; nothing is installed locally.

## Quickstart

1. Drop your deck at `input/deck.pptx`.
2. Drop your voiceover at `public/audio/master-voiceover.mp3`.
3. (Optional) Drop the transcript at `input/voiceover-script.txt` and add
   `ELEVENLABS_API_KEY` as a repo secret to enable forced alignment.
4. Push to `claude/powerpoint-to-video-cloud-3oujl`. The GitHub Actions
   workflow `Render premium video` will render and upload `final.mp4` as a
   downloadable artifact.

See `CLAUDE.md` for the full design and the scene grammar.

## Pipeline

```
input/deck.pptx ──▶ extract ──▶ slides.json
                                   │
                                   ▼
                                 plan ──▶ plan.json
public/audio/*.mp3 ──▶ align ─────▶ alignment.json
                                   │
                                   ▼
                              build:data ──▶ src/data/scenes.json
                                                       │
                                                       ▼
                                                    render ──▶ out/final.mp4
```
