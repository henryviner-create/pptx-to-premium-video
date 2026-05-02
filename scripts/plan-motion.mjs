#!/usr/bin/env node
/**
 * plan-motion.mjs
 *
 * Reads public/extracted/slides.json and reinterprets each slide as a
 * cinematic Remotion scene. The PowerPoint is treated as source material:
 * we keep the words, numbers, and imagery but never the slide layout.
 *
 * Output:
 *   public/extracted/plan.json
 *
 * Each scene has:
 *   - id          stable identifier
 *   - type        Remotion scene component name (kebab-case)
 *   - weight      relative narrative weight, used to budget time later
 *   - cueText     short phrase the aligner will look for in the voiceover
 *   - props       props handed to the scene component
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN_PATH = path.join(ROOT, 'public', 'extracted', 'slides.json');
const OUT_PATH = path.join(ROOT, 'public', 'extracted', 'plan.json');

async function main() {
  const deck = JSON.parse(await fs.readFile(IN_PATH, 'utf8'));
  const scenes = [];
  let openingSeen = false;

  for (const slide of deck.slides) {
    if (!openingSeen && slide.layoutHint === 'title') {
      scenes.push(makeOpening(slide));
      openingSeen = true;
      continue;
    }
    scenes.push(...interpretSlide(slide));
  }

  // Always end on a clean closing scene drawn from the last slide.
  const last = deck.slides[deck.slides.length - 1];
  if (last) {
    scenes.push(makeClosing(last));
  }

  // Assign stable ids and weights.
  for (let i = 0; i < scenes.length; i++) {
    scenes[i].id = `scene-${String(i + 1).padStart(3, '0')}`;
    scenes[i].weight ??= defaultWeight(scenes[i].type);
  }

  const plan = {
    sourceDeck: deck.sourceFile,
    sceneCount: scenes.length,
    scenes,
  };
  await fs.writeFile(OUT_PATH, JSON.stringify(plan, null, 2));
  console.log(`[plan] Wrote ${scenes.length} scenes to public/extracted/plan.json`);
}

function makeOpening(slide) {
  return {
    type: 'title',
    cueText: slide.title,
    weight: 1.4,
    props: {
      eyebrow: slide.body[0]?.text ?? '',
      title: slide.title || 'Untitled',
      subtitle: slide.body[1]?.text ?? '',
      mood: 'cinematic-dark',
    },
  };
}

function makeClosing(slide) {
  const headline = pickHeadline(slide) || 'Thank you.';
  return {
    type: 'closing',
    cueText: headline,
    weight: 1.2,
    props: {
      headline,
      subline: slide.note?.split('\n')[0] ?? '',
    },
  };
}

function interpretSlide(slide) {
  const out = [];
  const { title, body, numbers, images, layoutHint } = slide;

  // Section divider for very short slides.
  if (layoutHint === 'section' || (title && body.length === 0 && numbers.length === 0)) {
    out.push({
      type: 'section',
      cueText: title,
      weight: 0.6,
      props: { kicker: `Chapter ${slide.index + 1}`, label: title },
    });
    return out;
  }

  // Single dominant number gets its own metric scene.
  if (layoutHint === 'metric' && numbers.length >= 1) {
    const big = numbers[0];
    out.push({
      type: 'metric',
      cueText: big.raw,
      weight: 1.3,
      props: {
        label: title || big.context,
        value: big.value,
        display: big.raw,
        caption: body.find((b) => !b.text.includes(big.raw))?.text ?? '',
      },
    });
    if (numbers.length > 1) {
      out.push({
        type: 'chart',
        cueText: title,
        weight: 1.1,
        props: {
          title,
          series: numbers.map((n) => ({ label: shorten(n.context, 24), value: n.value, display: n.raw })),
        },
      });
    }
    return out;
  }

  if (layoutHint === 'quote') {
    const text = body.map((b) => b.text).join(' ');
    out.push({
      type: 'quote',
      cueText: title || text,
      weight: 1.0,
      props: {
        body: text || title,
        attribution: body[body.length - 1]?.text?.replace(/^[—–-]\s*/, '') ?? '',
      },
    });
    return out;
  }

  if (layoutHint === 'image' && images.length) {
    out.push({
      type: 'image',
      cueText: title,
      weight: 0.9,
      props: {
        title,
        caption: body[0]?.text ?? '',
        imageSrc: images[0].file,
      },
    });
    return out;
  }

  // Default: bullets reinterpreted as kinetic typography.
  out.push({
    type: 'bullets',
    cueText: title,
    weight: 1.0,
    props: {
      title: title || '',
      items: body.slice(0, 6).map((b) => b.text),
    },
  });

  // Numbers found alongside bullets: surface them as a follow-up beat.
  if (numbers.length >= 2) {
    out.push({
      type: 'chart',
      cueText: numbers[0].raw,
      weight: 0.9,
      props: {
        title: title || 'Key figures',
        series: numbers.slice(0, 4).map((n) => ({ label: shorten(n.context, 24), value: n.value, display: n.raw })),
      },
    });
  }

  return out;
}

function pickHeadline(slide) {
  if (slide.title) return slide.title;
  if (slide.body[0]?.text) return slide.body[0].text;
  return '';
}

function shorten(s, max) {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function defaultWeight(type) {
  switch (type) {
    case 'title':
    case 'closing':
      return 1.3;
    case 'metric':
      return 1.2;
    case 'quote':
      return 1.0;
    case 'chart':
      return 1.1;
    case 'image':
      return 0.9;
    case 'section':
      return 0.6;
    case 'bullets':
    default:
      return 1.0;
  }
}

main().catch((err) => {
  console.error('[plan] Fatal:', err);
  process.exit(1);
});
