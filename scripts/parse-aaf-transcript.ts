/**
 * parse-aaf-transcript.ts
 *
 * Stage 1, mechanical. Reads the AAF-aligned timestamped transcript
 * supplied by the user at:
 *
 *   input/TenTrinityCarbon_AAF_aligned_detailed_timestamped_transcript.txt
 *
 * Parses the 13 AAF Clip sections and the sentence-level cue lines
 * inside each clip, then writes:
 *
 *   src/data/master-transcript.txt   human-readable narration
 *   src/data/master-transcript.json  structured form (clips + cues)
 *   src/data/scene-timings.json      one scene per AAF clip — the primary
 *                                    scene timing structure for Remotion.
 *
 * AAF clip boundaries are TREATED AS SCENE BOUNDARIES.
 * Sentence-level cues inside a clip are TREATED AS EDITING CUES, not as
 * hard scene cuts. They give the renderer (or Stage 2 motion plan)
 * permission to reveal beats inside a scene at known timestamps without
 * breaking the continuous voiceover.
 *
 * No re-encoding, no re-transcription, no API calls. The MP3 stays one
 * continuous file.
 *
 * Run: `npm run parse:transcript`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(
  ROOT,
  'input',
  'TenTrinityCarbon_AAF_aligned_detailed_timestamped_transcript.txt',
);
const OUT_TXT = path.join(ROOT, 'src', 'data', 'master-transcript.txt');
const OUT_JSON = path.join(ROOT, 'src', 'data', 'master-transcript.json');
const OUT_TIMINGS = path.join(ROOT, 'src', 'data', 'scene-timings.json');

interface Cue {
  startSec: number;
  endSec: number;
  durationSec: number;
  text: string;
}

interface Clip {
  clipNumber: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  cues: Cue[];
  fullText: string;
  titleSuggestion: string;
}

interface MasterTranscript {
  source: string;
  generatedAt: string;
  totalDurationSec: number;
  clipCount: number;
  clips: Clip[];
}

interface SceneTiming {
  id: string;
  clipNumber: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  titleSuggestion: string;
  fullText: string;
  cues: Cue[];
}

interface SceneTimings {
  source: string;
  generatedAt: string;
  fps: number;
  totalDurationSec: number;
  sceneCount: number;
  scenes: SceneTiming[];
}

const FPS = 30;

// AAF transcript uses an EN DASH (U+2013) between timestamps — match both
// the en dash and a plain hyphen so future edits remain robust.
const DASH = /[–\-]/;
const TIME_PATTERN = /(\d{1,2}:\d{2}:\d{2}\.\d{1,3})/.source;
const TIME_RANGE = new RegExp(`${TIME_PATTERN}${DASH.source}${TIME_PATTERN}`);

const CLIP_HEADER_RE = new RegExp(
  String.raw`^---\s*AAF\s+Clip\s+(\d+)\s*:\s*` +
    `${TIME_PATTERN}${DASH.source}${TIME_PATTERN}` +
    String.raw`\s*\(([\d.]+)s\)\s*---\s*$`,
);

const CUE_RE = new RegExp(
  String.raw`^\[\s*` +
    `${TIME_PATTERN}${DASH.source}${TIME_PATTERN}` +
    String.raw`\s*\]\s*(.+)$`,
);

async function main(): Promise<void> {
  await fs.mkdir(path.dirname(OUT_TXT), { recursive: true });

  const raw = await readSource();
  const { totalDurationSec, clips } = parseTranscript(raw);

  if (clips.length === 0) {
    throw new Error(
      '[parse:transcript] No AAF Clip sections were parsed. Did the source format change?',
    );
  }

  const generatedAt = new Date().toISOString();
  const sourceRel = path.relative(ROOT, SRC);

  const transcript: MasterTranscript = {
    source: sourceRel,
    generatedAt,
    totalDurationSec,
    clipCount: clips.length,
    clips,
  };

  const timings: SceneTimings = {
    source: sourceRel,
    generatedAt,
    fps: FPS,
    totalDurationSec,
    sceneCount: clips.length,
    scenes: clips.map<SceneTiming>((c) => ({
      id: `scene-${String(c.clipNumber).padStart(2, '0')}`,
      clipNumber: c.clipNumber,
      startSec: c.startSec,
      endSec: c.endSec,
      durationSec: c.durationSec,
      titleSuggestion: c.titleSuggestion,
      fullText: c.fullText,
      cues: c.cues,
    })),
  };

  await fs.writeFile(OUT_JSON, JSON.stringify(transcript, null, 2));
  await fs.writeFile(OUT_TIMINGS, JSON.stringify(timings, null, 2));
  await fs.writeFile(OUT_TXT, formatPlainText(transcript));

  console.log(
    `[parse:transcript] ${clips.length} clips, ` +
      `${totalDurationSec.toFixed(2)}s total -> ` +
      `${path.relative(ROOT, OUT_JSON)}, ` +
      `${path.relative(ROOT, OUT_TIMINGS)}, ` +
      `${path.relative(ROOT, OUT_TXT)}.`,
  );
}

async function readSource(): Promise<string> {
  try {
    return await fs.readFile(SRC, 'utf8');
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[parse:transcript] Could not read ${path.relative(ROOT, SRC)}: ${reason}`,
    );
  }
}

function parseTranscript(raw: string): {
  totalDurationSec: number;
  clips: Clip[];
} {
  const lines = raw.split(/\r?\n/);
  const clips: Clip[] = [];
  let current: Clip | null = null;
  let headerDuration = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // File header tells us the audio duration.
    const headerMatch = trimmed.match(
      /Audio\s*\/\s*AAF\s+timeline\s+duration:\s*\d{1,2}:\d{2}:\d{2}\.\d{1,3}\s*\(([\d.]+)\s*seconds\)/i,
    );
    if (headerMatch) {
      headerDuration = Number(headerMatch[1]);
      continue;
    }

    const clipMatch = trimmed.match(CLIP_HEADER_RE);
    if (clipMatch) {
      const [, num, start, end] = clipMatch;
      const startSec = parseTimestamp(start!);
      const endSec = parseTimestamp(end!);
      current = {
        clipNumber: Number(num),
        startSec,
        endSec,
        durationSec: round3(endSec - startSec),
        cues: [],
        fullText: '',
        titleSuggestion: '',
      };
      clips.push(current);
      continue;
    }

    const cueMatch = trimmed.match(CUE_RE);
    if (cueMatch && current) {
      const [, start, end, text] = cueMatch;
      const startSec = parseTimestamp(start!);
      const endSec = parseTimestamp(end!);
      current.cues.push({
        startSec,
        endSec,
        durationSec: round3(endSec - startSec),
        text: text!.trim(),
      });
      continue;
    }
    // Anything else (notes, blank lines) is silently skipped.
  }

  for (const clip of clips) {
    clip.fullText = clip.cues.map((c) => c.text).join(' ').trim();
    clip.titleSuggestion = makeTitleSuggestion(clip);
  }

  const lastEnd = clips.length ? clips[clips.length - 1]!.endSec : 0;
  const totalDurationSec = headerDuration > 0 ? headerDuration : lastEnd;

  return { totalDurationSec, clips };
}

function parseTimestamp(ts: string): number {
  const [h, m, s] = ts.split(':');
  const seconds = Number(h) * 3600 + Number(m) * 60 + Number(s);
  if (!Number.isFinite(seconds)) {
    throw new Error(`[parse:transcript] Unparseable timestamp: ${ts}`);
  }
  return round3(seconds);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function makeTitleSuggestion(clip: Clip): string {
  const first = clip.cues[0]?.text ?? '';
  // Strip trailing punctuation, keep it short.
  const cleaned = first.replace(/[.!?…]+\s*$/, '').trim();
  if (cleaned.length <= 80) return cleaned;
  // Truncate at a word boundary.
  const truncated = cleaned.slice(0, 79);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${truncated.slice(0, lastSpace > 40 ? lastSpace : 79)}…`;
}

function formatPlainText(t: MasterTranscript): string {
  const lines: string[] = [];
  lines.push(`# Transcript of ${t.source}`);
  lines.push(`# generated: ${t.generatedAt}`);
  lines.push(`# duration: ${t.totalDurationSec.toFixed(3)}s`);
  lines.push(`# clips: ${t.clipCount}`);
  lines.push('');

  for (const clip of t.clips) {
    lines.push(
      `## Clip ${String(clip.clipNumber).padStart(2, '0')}  ` +
        `(${formatTime(clip.startSec)}–${formatTime(clip.endSec)}, ` +
        `${clip.durationSec.toFixed(3)}s)`,
    );
    for (const cue of clip.cues) {
      lines.push(`${cue.text}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec - h * 3600 - m * 60;
  const ss = s.toFixed(3).padStart(6, '0');
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${ss}`;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
