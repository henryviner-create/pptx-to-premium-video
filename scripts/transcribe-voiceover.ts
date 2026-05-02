/**
 * transcribe-voiceover.ts
 *
 * Stage 1, step 3.
 *
 * Sends public/audio/master-voiceover.mp3 to ElevenLabs Speech-to-Text and
 * writes:
 *
 *   src/data/master-transcript.json   raw STT response (words with timings)
 *   src/data/master-transcript.txt    plain text, one paragraph
 *
 * Both are inputs to Stage 2 — the AI scene design pass that I (Claude) do
 * by hand against the actual narration. We never split the voiceover into
 * per-scene clips; the .json is purely a timeline of word timestamps used
 * later by Stage 2 to anchor scene boundaries to natural pauses.
 *
 * Requires the ELEVENLABS_API_KEY env var. If it's missing the script exits
 * with a non-zero code so CI fails loudly — there is no fallback that would
 * produce a credible transcript.
 *
 * Run: `npm run transcribe` (uses tsx).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ElevenLabsWord {
  text: string;
  start: number;
  end: number;
  type?: 'word' | 'spacing' | 'audio_event';
  speaker_id?: string;
}

interface ElevenLabsResponse {
  language_code?: string;
  language_probability?: number;
  text?: string;
  words?: ElevenLabsWord[];
  [k: string]: unknown;
}

interface NormalisedTranscript {
  source: string;
  generatedAt: string;
  language: string | null;
  durationSeconds: number;
  text: string;
  words: { text: string; start: number; end: number }[];
  raw: ElevenLabsResponse;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = path.join(ROOT, 'public', 'audio', 'master-voiceover.mp3');
const OUT_JSON = path.join(ROOT, 'src', 'data', 'master-transcript.json');
const OUT_TXT = path.join(ROOT, 'src', 'data', 'master-transcript.txt');

const ENDPOINT = 'https://api.elevenlabs.io/v1/speech-to-text';
const MODEL_ID = 'scribe_v1';

async function main(): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      '[transcribe] ELEVENLABS_API_KEY is not set. ' +
        'Add it as a repo secret (Actions) or export it locally before running.',
    );
  }

  const audioExists = await fileExists(AUDIO);
  if (!audioExists) {
    throw new Error(
      `[transcribe] Missing ${path.relative(ROOT, AUDIO)}. ` +
        'Run `npm run prepare:audio` first.',
    );
  }

  const audio = await fs.readFile(AUDIO);

  const form = new FormData();
  form.append(
    'file',
    new Blob([audio], { type: 'audio/mpeg' }),
    'master-voiceover.mp3',
  );
  form.append('model_id', MODEL_ID);
  form.append('timestamps_granularity', 'word');
  form.append('diarize', 'false');

  console.log(
    `[transcribe] Submitting ${(audio.byteLength / 1_000_000).toFixed(2)} MB ` +
      `to ElevenLabs (${MODEL_ID})…`,
  );

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `[transcribe] ElevenLabs HTTP ${res.status}: ${body.slice(0, 400)}`,
    );
  }

  const payload = (await res.json()) as ElevenLabsResponse;
  const normalised = normalise(payload);

  await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });
  await fs.writeFile(OUT_JSON, JSON.stringify(normalised, null, 2));
  await fs.writeFile(OUT_TXT, formatPlainText(normalised));

  console.log(
    `[transcribe] ${normalised.words.length} words, ` +
      `${normalised.durationSeconds.toFixed(2)}s, ` +
      `lang=${normalised.language ?? 'unknown'} -> ` +
      `${path.relative(ROOT, OUT_JSON)} + ${path.relative(ROOT, OUT_TXT)}`,
  );
}

function normalise(payload: ElevenLabsResponse): NormalisedTranscript {
  const allWords = Array.isArray(payload.words) ? payload.words : [];
  // Keep only actual words for downstream alignment; spacing/audio_event are
  // useful for sentence reconstruction but noisy as anchors.
  const words = allWords
    .filter((w) => (w.type ?? 'word') === 'word')
    .map((w) => ({
      text: String(w.text ?? '').trim(),
      start: Number(w.start ?? 0),
      end: Number(w.end ?? 0),
    }))
    .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));

  const text =
    typeof payload.text === 'string' && payload.text.trim().length
      ? payload.text.trim()
      : reconstructText(allWords);

  const last = words[words.length - 1];
  const duration = last ? last.end : 0;

  return {
    source: 'public/audio/master-voiceover.mp3',
    generatedAt: new Date().toISOString(),
    language:
      typeof payload.language_code === 'string' ? payload.language_code : null,
    durationSeconds: duration,
    text,
    words,
    raw: payload,
  };
}

function reconstructText(words: ElevenLabsWord[]): string {
  return words
    .map((w) => (typeof w.text === 'string' ? w.text : ''))
    .join('')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function formatPlainText(t: NormalisedTranscript): string {
  // Wrap to ~100 chars at sentence boundaries for human readability,
  // preserving the raw text otherwise.
  const out: string[] = [];
  out.push(`# Transcript of ${t.source}`);
  out.push(`# generated ${t.generatedAt}`);
  if (t.language) out.push(`# language: ${t.language}`);
  out.push(`# duration: ${t.durationSeconds.toFixed(2)}s`);
  out.push(`# words: ${t.words.length}`);
  out.push('');
  out.push(t.text);
  out.push('');
  return out.join('\n');
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
