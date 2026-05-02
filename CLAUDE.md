# pptx-to-premium-video — Claude project instructions

This repository turns a PowerPoint deck plus a single voiceover MP3 into a
premium animated Remotion video — the kind of motion piece you would
expect from an Apple keynote or an institutional investor film. It runs
**entirely in the cloud**: Claude Code (web), GitHub, and GitHub Actions.
There is **no local toolchain** to install.

## The brief — what this system must always do

1. Treat the PowerPoint as **source material and storyboard**, never as the
   final picture. Extract its words, numbers, structure, and embedded
   images, then **reinterpret** each slide as an animated Remotion scene.
2. Never render slides as static images. Never play "slide 1, slide 2,
   slide 3" transitions. The output is a continuous motion film.
3. Use large, cinematic typography. Use elegant transitions
   (cross-dissolves, slow zooms, stagger-reveals). Animate metrics and
   charts. No spins, no bounces, no clipart, no SaaS-template visuals.
4. Use the supplied `master-voiceover.mp3` as the single, continuous audio
   track. The voiceover is **never split per scene** and **never
   re-encoded**. Scene timings are anchored to its transcript.
5. Final artifact: `out/final.mp4`, uploaded as a GitHub Actions artifact.

If a change conflicts with these principles, push back rather than implement.

## The two-stage workflow

The pipeline is split into two stages on purpose. Stage 1 is mechanical
and lives in code. Stage 2 is design judgment and is authored by Claude
after reviewing the Stage 1 outputs. **Do not generate Stage 2 files
deterministically** — the whole point is that the scene plan reflects
what the voiceover actually says, not just what the deck contains.

### Stage 1 — Data preparation (mechanical, runs in CI)

| Step | Script                              | Reads                                                                                | Writes                                                                                                          |
| ---- | ----------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 1    | `npm run prepare:audio`             | `input/master-voiceover.mp3`                                                         | `public/audio/master-voiceover.mp3`                                                                             |
| 2    | `npm run prepare:logos`             | `input/tentrinity-carbon-*.png`                                                      | `public/logos/*.png`                                                                                            |
| 3    | `npm run extract:pptx`              | `input/deck.pptx`                                                                    | `src/data/pptx-extracted.json`, `public/media/*`                                                                |
| 4    | `npm run parse:transcript`          | `input/TenTrinityCarbon_AAF_aligned_detailed_timestamped_transcript.txt`             | `src/data/master-transcript.json`, `src/data/master-transcript.txt`, `src/data/scene-timings.json`              |
| 5    | `npm run prepare:footage`           | `src/data/footage-plan.json` + Pexels API                                            | `public/footage/*.mp4`, `src/data/footage.json` (manifest)                                                      |
| 6    | `npm run prepare:concepts`          | `src/data/concept-plan.json` + Arcads API (Veo 3.1, Sora 2)                         | `public/concepts/*.mp4`, `src/data/concepts.json` (manifest)                                                    |

`npm run prepare:data` runs all six in order. The footage step needs
`PEXELS_API_KEY`; the concept step needs `ARCADS_API_KEY`. Without
either, those scripts write empty manifests and exit 0 so the rest of
the pipeline still runs — scenes that expected a missing asset fall
back along the precedence: concept clip > footage clip > declared
surface. The film is never broken by a missing asset.

Concept clips are AI-generated cinematic backdrops for the four scenes
where pure typography or stock footage cannot deliver the keynote-grade
visual: Three Pillars (3), Takaful structure (6), the carbon credit as
object (9), and carbon flux into canopy beneath the −16.3 hero metric
(11). Prompts and intent live in `src/data/concept-plan.json`. The
Arcads API contract is HTTP Basic auth with `ARCADS_API_KEY` as
username and an empty password; base URL `https://external-api.arcads.ai`. Stage 1 runs in the
`1 - Prepare data` workflow (`.github/workflows/prepare-data.yml`),
which **commits the generated files back to the branch** so Claude
Code can read them via a normal `git pull`. There is no artifact
download step, no API call, no transcription. The transcript is
supplied by the user pre-aligned to the AAF timeline.

`scene-timings.json` uses the **13 AAF Clip boundaries as the primary
scene timing structure**. Sentence-level cues inside each clip are
treated as editing cues, not hard scene boundaries — they let the
motion plan reveal beats inside a scene at known timestamps without
breaking the continuous voiceover.

### Stage 2 — AI scene design (Claude authors by hand)

After Stage 1 has run, Claude reads:

- `src/data/pptx-extracted.json` — what the deck contains
- `src/data/master-transcript.txt` — what the narrator actually says

…and then **writes** these three files by hand, exercising design
judgment about which slide ideas to keep, which to combine or skip, and
where each scene should sit on the voiceover timeline:

| File                              | What it carries |
| --------------------------------- | --------------- |
| `src/data/presentation.json`      | Brand system + per-scene content: title, subtitle, bullets, metrics, chart data, image refs, voiceover cue, per-scene visual direction. |
| `src/data/motion-plan.json`       | Pure choreography: fps 30, 1920×1080, global cross-dissolve + Ken Burns, per-scene beats, reveal timings, pacing rules, avoid-list. |
| `src/data/scene-timings.json`     | The sole source of timing truth: scene id → `start`/`end` seconds in the master voiceover, anchored to specific words from the transcript. |

These three files **are committed to the repo**. They are the source of
truth that the Remotion render reads. They are not regenerated by any
script — re-deriving them mechanically defeats the purpose.

When the deck or voiceover changes, re-run Stage 1, re-read the outputs,
and re-author the Stage 2 files.

## Inputs the user provides

| Path                                                                          | Required | Notes |
| ----------------------------------------------------------------------------- | -------- | ----- |
| `input/deck.pptx`                                                             | yes      | The source PowerPoint. |
| `input/master-voiceover.mp3`                                                  | yes      | The single, continuous voiceover. Never split, never re-encoded. |
| `input/TenTrinityCarbon_AAF_aligned_detailed_timestamped_transcript.txt`      | yes      | AAF-aligned transcript supplied by the user. 13 clip boundaries + sentence cues. |
| `input/tentrinity-carbon-icon-gold.png`                                       | yes      | Icon mark, gold. |
| `input/tentrinity-carbon-icon-gold-lightgrey.png`                             | yes      | Icon mark on light-grey background. |
| `input/tentrinity-carbon-icon-gold-white.png`                                 | yes      | Icon mark on white. |
| `input/tentrinity-carbon-horizontal-gold.png`                                 | yes      | Horizontal lockup, gold. |
| `input/tentrinity-carbon-horizontal-white.png`                                | yes      | Horizontal lockup, white. |
| GitHub secret `PEXELS_API_KEY`                                                | yes      | Free Pexels API key, used by `prepare:footage`. |
| GitHub secret `ARCADS_API_KEY`                                                | yes      | Arcads API key, used by `prepare:concepts` to generate AI concept clips via Veo 3.1 / Sora 2. |

## Scene grammar

Stage 2 emits typed scenes. At render time every scene maps to exactly
one component in `src/scenes/`:

| Scene type | Component             | When to use |
| ---------- | --------------------- | ----------- |
| `title`    | `TitleScene.tsx`      | Opening / title slides |
| `bullets`  | `BulletsScene.tsx`    | Slides with multiple short text runs (cap at 6) |
| `metric`   | `MetricScene.tsx`     | A dominant number or percentage |
| `chart`    | `ChartScene.tsx`      | Multiple numbers compared on one slide |
| `quote`    | `QuoteScene.tsx`      | Pull quotes |
| `image`    | `ImageScene.tsx`      | Slides whose content is primarily a photo |
| `section`  | `SectionScene.tsx`    | Title-only chapter dividers |
| `closing`  | `ClosingScene.tsx`    | Final beat synthesised from the last slide |

Each scene wraps its body in `SceneFrame`, which provides cross-dissolves
and a slow Ken Burns push. Cuts must never feel like PowerPoint
transitions.

## Authoring rules (Stage 2)

When designing `presentation.json`:

1. Treat the transcript, not the slide order, as the spine. If the
   narrator skips a slide, drop it. If the narrator dwells, give that
   beat a longer scene or split it into two.
2. Cap bullets at 6 per scene; split into a follow-up bullets scene
   rather than cramming.
3. For metric-heavy slides, lift the dominant number into its own
   `metric` scene and put the supporting figures into a follow-up
   `chart` scene. Don't render small text alongside a hero number.
4. Quote scenes carry only the quote and the attribution. No images, no
   list, no logo lockup.
5. Image scenes use full-bleed photography with a vertical gradient
   floor for type. Never put images inside device mockups or frames.
6. Every scene gets a one-sentence `visualDirection` so the renderer (or
   a future designer) knows the intent without reverse-engineering.

When designing `motion-plan.json`:

1. Headlines: 96–168 px. Subtitles / supporting copy: 28–44 px. Anything
   smaller reads as a slide deck, not a film.
2. Springs: damping ≥ 18, stiffness ≤ 130. Premium motion is confident,
   not playful.
3. Default per-scene transition is the global cross-dissolve + Ken Burns
   from `SceneFrame`. Do not introduce per-scene wipes, slides, or peels.
4. Animate metrics with ease-out count-ups; never render numbers as
   plain strings.
5. Bars and figures in chart scenes finish at the same frame.

When designing `scene-timings.json`:

1. Anchor every scene start to a specific word in the transcript
   (record the word index and the resulting timestamp).
2. Minimum scene length: 2.4s. Maximum: 14s. If a scene needs more,
   split it.
3. Leave ~0.5s of stillness at the start of every chapter (section
   scenes).
4. Title and closing scenes get the longest holds (≥ 5s).
5. The last scene's `end` must equal the voiceover duration to within
   one frame so the final dissolve lines up with the audio fade.

## Things never to add

- LibreOffice or any tool that renders slides → static images for the
  main video. Slide screenshots are reference-only, never on screen.
- Per-slide hard cuts. All scene transitions go through `SceneFrame`.
- Local toolchain dependencies (Python, Homebrew, native binaries
  beyond what GitHub-hosted runners already provide).
- Multiple audio files or audio-per-scene. There is one master
  voiceover, byte-for-byte unchanged, played continuously.
- Speaker diarisation, on-screen captions, or hard-coded transcripts in
  the rendered output unless the user explicitly asks.
- A deterministic `create-motion-plan` script that synthesises Stage 2
  files. That defeats the design intent.

## Working in Claude Code on the web

- All development happens on branch `claude/powerpoint-to-video-cloud-3oujl`.
- After meaningful changes, commit and push so the GitHub Actions
  workflow can render. Do not open a PR unless the user asks.
- Inspect render runs via the Actions tab; download `final-video`
  artifact for review and `pipeline-debug` for the intermediate JSON.
- The repo is intentionally lock-file-light at first commit; after the
  first successful CI run, commit `package-lock.json` so subsequent
  renders use `npm ci` and stay reproducible.

## Quick reference

```
input/
  deck.pptx                          source PowerPoint (committed)
  master-voiceover.mp3               source audio (committed)

scripts/
  prepare-audio.ts                   Stage 1 step 1: copy mp3 -> public/audio
  prepare-logos.ts                   Stage 1 step 2: copy logos -> public/logos
  extract-pptx.ts                    Stage 1 step 3: pptx -> pptx-extracted.json + public/media
  parse-aaf-transcript.ts            Stage 1 step 4: parse AAF transcript -> master-transcript.{json,txt} + scene-timings.json
  prepare-footage.ts                 Stage 1 step 5: Pexels search + download -> public/footage + footage.json manifest
  prepare-concepts.ts                Stage 1 step 6: Arcads (Veo/Sora) generation + download -> public/concepts + concepts.json manifest

src/
  Root.tsx                           registerComposition('Main')
  Video.tsx                          timeline assembly: audio + sequenced scenes
  theme.ts                           colour and type tokens
  components/                        SceneShell, Surface, FilmGrain, BrandLogo, KineticText, AnimatedNumber
  scenes/                            one .tsx per scene type listed above
  data/
    pptx-extracted.json              [stage 1 — generated by workflow, committed back]
    master-transcript.json           [stage 1 — generated by workflow, committed back]
    master-transcript.txt            [stage 1 — generated by workflow, committed back]
    presentation.json                [stage 2 — Claude-authored, committed]
    motion-plan.json                 [stage 2 — Claude-authored, committed]
    scene-timings.json               [stage 1 — committed back by workflow]
    footage-plan.json                [stage 2 — Claude-authored brief for Pexels]
    footage.json                     [stage 1 — manifest committed back by workflow]

.github/workflows/
  prepare-data.yml                   Stage 1, commits generated data back to branch
  render-video.yml                   Render only -> final-animated-presentation artifact
```
