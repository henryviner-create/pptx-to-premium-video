# pptx-to-premium-video — Claude project instructions

This repository turns a PowerPoint deck plus a single voiceover MP3 into a
premium animated Remotion video — the kind of motion piece you would expect
from an Apple keynote, a product reveal film, or an institutional investor
update. It runs **entirely in the cloud**: Claude Code (web), GitHub, and
GitHub Actions. There is **no local toolchain** to install.

## The brief — what this system must always do

1. Treat the PowerPoint as **source material and storyboard**, never as the
   final picture. We extract its words, numbers, structure, and embedded
   images and **reinterpret** each slide as an animated Remotion scene.
2. Never render slides as static images. Never play "slide 1, slide 2,
   slide 3" transitions. The output is a continuous motion film.
3. Use large, cinematic typography. Use elegant transitions (cross-dissolves,
   slow zooms, stagger-reveals). Animate metrics and charts.
4. Use the supplied `master-voiceover.mp3` as the single, continuous audio
   track. Scene timings are aligned to that voiceover via ElevenLabs forced
   alignment, not author-supplied timestamps.
5. Final artifact: `out/final.mp4`, uploaded as a GitHub Actions artifact.

If a change conflicts with these principles, push back rather than implement.

## Inputs the user provides

| Path                                  | Required | Notes |
| ------------------------------------- | -------- | ----- |
| `input/deck.pptx`                     | yes      | The source PowerPoint. |
| `public/audio/master-voiceover.mp3`   | yes      | The single, continuous voiceover. |
| `input/voiceover-script.txt`          | optional | Plain-text transcript. Massively improves alignment quality. |
| GitHub secret `ELEVENLABS_API_KEY`    | optional | Needed for forced alignment. Without it, the pipeline distributes scenes proportionally to weight. |

## Pipeline (each step is a separate npm script)

```
npm run extract     # input/deck.pptx -> public/extracted/slides.json + media/
npm run plan        # slides.json     -> public/extracted/plan.json
npm run align       # mp3 + script    -> public/extracted/alignment.json
npm run build:data  # plan + align    -> src/data/scenes.json
npm run render      # Remotion        -> out/final.mp4
```

`npm run prepare:all` runs everything except the render. `npm run build:video`
runs the whole chain end-to-end. The GitHub Actions workflow at
`.github/workflows/render.yml` runs the same chain on push to
`claude/powerpoint-to-video-cloud-3oujl` and on workflow_dispatch.

## Scene grammar

The motion planner emits typed scenes. A render time, every scene maps to
exactly one component in `src/scenes/`:

| Scene type | Component             | When emitted |
| ---------- | --------------------- | ------------ |
| `title`    | `TitleScene.tsx`      | Opening / title slides |
| `bullets`  | `BulletsScene.tsx`    | Slides with multiple short text runs |
| `metric`   | `MetricScene.tsx`     | A dominant number or percentage |
| `chart`    | `ChartScene.tsx`      | Multiple numbers on one slide |
| `quote`    | `QuoteScene.tsx`      | Slides that read as a pull quote |
| `image`    | `ImageScene.tsx`      | Slides whose content is primarily a photo |
| `section`  | `SectionScene.tsx`    | Title-only slides used as chapter dividers |
| `closing`  | `ClosingScene.tsx`    | Final beat synthesised from the last slide |

Each scene wraps its content in `SceneFrame`, which provides cross-dissolves
and a slow Ken Burns push. Cuts must never feel like PowerPoint transitions.

## Authoring rules for new scene components

1. Always wrap the body in `<SceneFrame>` so transitions stay consistent.
2. Use `KineticText` for any string that should read in (word/char stagger).
3. Use `AnimatedNumber` for any numeric value — never render numbers as
   plain strings; they should count up.
4. Pull colour, typography, and spacing tokens from `src/theme.ts`. Do not
   hardcode hex codes inside scene files.
5. Default font sizes for headlines: 96–168px. For supporting copy: 28–44px.
   This is a 1920×1080 piece — small type ruins the cinematic feel.
6. Avoid bouncy springs. Damping ≥ 18, stiffness ≤ 130. Premium motion is
   confident, not playful.

## Editing the timing logic

`scripts/build-data.mjs` is the only place that decides where each scene
starts and ends. The two strategies it uses are:

- **Anchored** (preferred): if forced-alignment word timestamps exist, each
  scene's `cueText` is fuzzy-matched against the transcript and the scene
  start snaps to the matched word.
- **Weighted fallback**: with no transcript, scenes are spread across the
  audio duration proportionally to their `weight` (set by the planner).

Minimum scene length is 2.4s — tighten in `MIN_SCENE_SECONDS` if a deck
needs faster pacing.

## Things never to add

- LibreOffice rendering of slides → static images. The whole point is that
  we do not show the original PowerPoint.
- Per-slide hard cuts. All scene transitions go through `SceneFrame`.
- Local toolchain dependencies (Python, Homebrew, native binaries beyond
  what GitHub-hosted runners already provide).
- Multiple audio files or audio-per-scene. There is one master voiceover.
- Speaker diarisation, captions, or transcripts in the rendered output
  unless the user explicitly asks.

## Working in Claude Code on the web

- All development happens on branch `claude/powerpoint-to-video-cloud-3oujl`.
- After meaningful changes, commit and push so the GitHub Actions workflow
  can render. Do not open a PR unless the user asks.
- Inspect render runs via the Actions tab; download `final-video` artifact
  for review and `pipeline-debug` for the intermediate JSON.
- The repo is intentionally lock-file-light at first commit; after the first
  successful CI run, commit `package-lock.json` so subsequent renders use
  `npm ci` and stay reproducible.

## Quick reference

```
src/
  Root.tsx              registerComposition('Main')
  Video.tsx             timeline assembly: audio + sequenced scenes
  theme.ts              colour and type tokens
  components/
    BackgroundField.tsx drifting gradient + vignette behind every scene
    SceneFrame.tsx      universal cross-dissolve + Ken Burns wrapper
    KineticText.tsx     word/char stagger entrance
    AnimatedNumber.tsx  ease-out count-up with format preservation
  scenes/               one .tsx per scene type listed above
  data/scenes.json      generated by scripts/build-data.mjs

scripts/
  extract-pptx.mjs      pptx (zip) -> structured JSON + media
  plan-motion.mjs       slides -> typed scene plan with cues + weights
  align-audio.mjs       ElevenLabs forced alignment (with fallback)
  build-data.mjs        merge plan + alignment into Remotion's scenes.json

.github/workflows/render.yml  full cloud render -> out/final.mp4 artifact
```
