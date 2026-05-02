#!/usr/bin/env node
/**
 * align-audio.mjs
 *
 * Calls the ElevenLabs forced-alignment API with the master voiceover and an
 * optional transcript at input/voiceover-script.txt. Produces word-level
 * timestamps used in the next step to snap scene boundaries to natural
 * pauses in the narration.
 *
 * If ELEVENLABS_API_KEY is not set, or the call fails, we fall back to
 * probing the audio duration with ffprobe so the pipeline still produces a
 * valid timeline (scenes will be distributed proportionally by weight).
 *
 * Output:
 *   public/extracted/alignment.json
 *     {
 *       duration: number,           seconds
 *       source: 'elevenlabs' | 'fallback',
 *       words?: [{ text, start, end }]
 *     }
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_PATH = path.join(ROOT, 'public', 'audio', 'master-voiceover.mp3');
const SCRIPT_PATH = path.join(ROOT, 'input', 'voiceover-script.txt');
const OUT_PATH = path.join(ROOT, 'public', 'extracted', 'alignment.json');

const ENDPOINT = 'https://api.elevenlabs.io/v1/forced-alignment';

async function main() {
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });

  const audioExists = await fs.access(AUDIO_PATH).then(() => true).catch(() => false);
  if (!audioExists) {
    console.warn(`[align] No audio at ${path.relative(ROOT, AUDIO_PATH)} — using fallback duration of 60s.`);
    await write({ duration: 60, source: 'fallback' });
    return;
  }

  const duration = await probeDuration(AUDIO_PATH).catch((e) => {
    console.warn('[align] ffprobe failed:', e.message);
    return null;
  });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const transcript = await fs.readFile(SCRIPT_PATH, 'utf8').catch(() => null);

  if (apiKey && transcript) {
    try {
      const result = await callElevenLabs(apiKey, AUDIO_PATH, transcript);
      const words = normaliseWords(result);
      const finalDuration = duration ?? words.at(-1)?.end ?? 60;
      await write({ duration: finalDuration, source: 'elevenlabs', words });
      console.log(`[align] Forced alignment complete: ${words.length} words, ${finalDuration.toFixed(2)}s.`);
      return;
    } catch (err) {
      console.warn('[align] ElevenLabs forced alignment failed, falling back. Reason:', err.message);
    }
  } else {
    if (!apiKey) console.warn('[align] ELEVENLABS_API_KEY not set; skipping forced alignment.');
    if (!transcript) console.warn('[align] input/voiceover-script.txt not found; skipping forced alignment.');
  }

  await write({ duration: duration ?? 60, source: 'fallback' });
  console.log(`[align] Fallback alignment written. Duration: ${(duration ?? 60).toFixed(2)}s.`);
}

async function callElevenLabs(apiKey, audioPath, transcript) {
  const audio = await fs.readFile(audioPath);
  // Node 20+ has native FormData / Blob.
  const form = new FormData();
  form.append('file', new Blob([audio], { type: 'audio/mpeg' }), 'master-voiceover.mp3');
  form.append('text', transcript);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

function normaliseWords(payload) {
  // ElevenLabs returns characters and words; we only need words.
  const words = Array.isArray(payload?.words) ? payload.words : [];
  return words
    .map((w) => ({
      text: String(w.text ?? w.word ?? '').trim(),
      start: Number(w.start ?? w.start_time ?? 0),
      end: Number(w.end ?? w.end_time ?? 0),
    }))
    .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));
}

function probeDuration(file) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      file,
    ]);
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => (out += d.toString()));
    proc.stderr.on('data', (d) => (err += d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `ffprobe exited ${code}`));
      const n = Number(out.trim());
      if (!Number.isFinite(n)) return reject(new Error(`unparseable ffprobe output: ${out}`));
      resolve(n);
    });
  });
}

async function write(payload) {
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error('[align] Fatal:', err);
  process.exit(1);
});
