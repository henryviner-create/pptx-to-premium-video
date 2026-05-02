/**
 * create-motion-plan.ts
 *
 * Reads src/data/pptx-extracted.json and emits two artefacts:
 *
 *   1. src/data/presentation.json
 *      Brand system + per-scene content. This is the human-editable contract
 *      between the deck and the Remotion render: anyone (Claude, a designer)
 *      can tweak titles, subtitles, bullets, metrics, chart data, image
 *      choices, and per-scene visual direction without touching component
 *      code.
 *
 *   2. src/data/motion-plan.json
 *      The choreography. Pure motion timing — beats, reveal offsets, the
 *      global transition language, pacing rules, and an explicit avoid-list
 *      so the renderer never falls back to PowerPoint-flavoured transitions.
 *
 * Direction:
 *      Apple keynote meets premium institutional film.
 *      Cinematic typography. Confident, unhurried motion. No SaaS-template
 *      cheese, no spins, no bounces, no clipart.
 *
 * Run: `npm run plan` (which uses tsx).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Input shape (mirrors scripts/extract-pptx.ts)
// ---------------------------------------------------------------------------

interface MediaRef {
  file: string;
  originalName: string;
  bytes: number;
  ext: string;
}

interface TextRun {
  text: string;
  level: number;
  bold: boolean;
  sizePt: number | null;
}

interface NumberToken {
  raw: string;
  value: number;
  context: string;
}

interface ExtractedSlide {
  slideNumber: number;
  sourceXml: string;
  rawText: string;
  inferredTitle: string;
  textRuns: TextRun[];
  numbers: NumberToken[];
  media: MediaRef[];
  screenshot: string;
  notes: string;
}

interface ExtractionInput {
  sourceFile: string;
  generatedAt: string;
  slideCount: number;
  slides: ExtractedSlide[];
}

// ---------------------------------------------------------------------------
// Output shapes
// ---------------------------------------------------------------------------

type SceneType =
  | 'title'
  | 'section'
  | 'bullets'
  | 'metric'
  | 'chart'
  | 'quote'
  | 'image'
  | 'closing';

interface Metric {
  label: string;
  value: number;
  display: string;
}

interface ChartPoint {
  label: string;
  value: number;
  display: string;
}

interface ImageRef {
  file: string;
  role: 'hero' | 'support' | 'reference';
}

interface PresentationScene {
  id: string;
  sourceSlide: number;
  type: SceneType;
  title: string;
  subtitle: string;
  bullets: string[];
  metrics: Metric[];
  chart: { kind: 'bar' | 'comparison' | 'none'; series: ChartPoint[] } | null;
  images: ImageRef[];
  referenceScreenshot: string;
  voiceover: {
    /** Short phrase the aligner will fuzzy-match in the voiceover. */
    cueText: string;
    /** Speaker-note guidance for what the narrator likely says here. */
    expectedPhrase: string;
  };
  visualDirection: string;
}

interface PresentationDoc {
  brand: {
    name: string;
    voice: string;
    motionEthos: string;
    palette: Record<string, string>;
    typography: { display: string; mono: string; sizes: Record<string, number> };
  };
  visualDirection: {
    referenceMood: string;
    do: string[];
    avoid: string[];
  };
  source: { file: string; generatedAt: string; slideCount: number };
  scenes: PresentationScene[];
}

interface MotionBeat {
  /** Seconds, relative to scene start. Negative values = relative to scene end. */
  at: number;
  /** Frames the action takes to complete. */
  durationFrames: number;
  action: string;
  /** Easing the renderer should apply. Damping/stiffness for springs are advisory. */
  easing: 'linear' | 'ease-out' | 'ease-in-out' | 'spring-confident' | 'spring-soft';
  notes?: string;
}

interface MotionScene {
  id: string;
  type: SceneType;
  /** Suggested narrative weight. Used by build-data to budget time across the voiceover. */
  weight: number;
  beats: MotionBeat[];
  /** Convenience: same beats expressed as named seconds offsets. */
  revealTimings: Record<string, number>;
  cinematicNotes: string;
}

interface MotionPlanDoc {
  fps: 30;
  resolution: { width: 1920; height: 1080 };
  globalTransition: {
    style: string;
    durationFrames: number;
    easing: string;
    notes: string;
  };
  pacing: {
    minSceneSeconds: number;
    maxSceneSeconds: number;
    breath: string;
    notes: string[];
  };
  avoid: string[];
  scenes: MotionScene[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN_PATH = path.join(ROOT, 'src', 'data', 'pptx-extracted.json');
const PRESENTATION_OUT = path.join(ROOT, 'src', 'data', 'presentation.json');
const MOTION_PLAN_OUT = path.join(ROOT, 'src', 'data', 'motion-plan.json');

const FPS = 30 as const;

const BRAND = {
  name: 'Premium Cinematic',
  voice:
    'Apple keynote meets premium institutional film. Confident, quiet, rigorous. ' +
    'Lets the type and the numbers do the talking.',
  motionEthos:
    'Confident not playful. Cross-dissolves, slow Ken Burns, kinetic type. ' +
    'No bounces, no spins, no whoosh. Damping >= 18, stiffness <= 130.',
  palette: {
    bg: '#06080d',
    bgGradientA: '#0c1322',
    bgGradientB: '#03050a',
    ink: '#f5f7fb',
    inkSoft: 'rgba(245, 247, 251, 0.62)',
    inkFaint: 'rgba(245, 247, 251, 0.28)',
    accent: '#7cc4ff',
    accentWarm: '#f4c27a',
    rule: 'rgba(245, 247, 251, 0.14)',
  },
  typography: {
    display: '"Inter", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
    sizes: {
      eyebrow: 24,
      bullet: 52,
      subtitle: 40,
      title: 96,
      hero: 168,
      metric: 360,
    },
  },
} as const;

const VISUAL_DIRECTION = {
  referenceMood: 'Apple keynote meets premium institutional film.',
  do: [
    'Editorial typography at hero scale (96–168px headlines).',
    'Cross-dissolve and slow Ken Burns between every scene.',
    'Animate metrics with ease-out count-ups — never render as static text.',
    'Stagger word/character reveals; let copy land before the next beat.',
    'Use one accent colour at a time; let negative space breathe.',
    'Treat the deck as storyboard, not as the picture: reinterpret every slide.',
  ],
  avoid: [
    'PowerPoint slide-flipping or page-peel transitions.',
    'Basic fade-and-cut slide transitions.',
    'Spinning, bouncing, elastic springs, or any toy motion.',
    'Clipart, stickers, emoji, generic SaaS template visuals.',
    'More than 6 bullets on screen at once.',
    'Tiny copy. Anything below 28px reads as a slide deck, not a film.',
    'Showing the original PowerPoint screenshot as the main video.',
  ],
} as const;

const GLOBAL_TRANSITION = {
  style: 'Cross-dissolve with a 1.015 → 1.045 slow Ken Burns push.',
  durationFrames: 18,
  easing: 'ease-out cubic on opacity, linear on scale.',
  notes:
    'Adjacent scenes overlap on dissolve via the SceneFrame wrapper. Cuts ' +
    'must never feel like PowerPoint transitions — there is no wipe, no ' +
    'page turn, no slide-in.',
} as const;

const PACING = {
  minSceneSeconds: 2.4,
  maxSceneSeconds: 14,
  breath: 'Leave ~0.5s of stillness at the start of every chapter.',
  notes: [
    'Section dividers are short (3–4s) and exist to let the eye rest.',
    'Metric scenes hold the final number for 1.5s after the count-up resolves.',
    'Title and closing scenes get the longest hold (>= 5s).',
  ],
} as const;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const input = await readInput();
  const presentation = buildPresentation(input);
  const motionPlan = buildMotionPlan(presentation);

  await fs.mkdir(path.dirname(PRESENTATION_OUT), { recursive: true });
  await fs.writeFile(PRESENTATION_OUT, JSON.stringify(presentation, null, 2));
  await fs.writeFile(MOTION_PLAN_OUT, JSON.stringify(motionPlan, null, 2));

  console.log(
    `[plan] ${presentation.scenes.length} scenes -> ` +
      `${path.relative(ROOT, PRESENTATION_OUT)} + ` +
      `${path.relative(ROOT, MOTION_PLAN_OUT)}`,
  );
}

async function readInput(): Promise<ExtractionInput> {
  try {
    const raw = await fs.readFile(IN_PATH, 'utf8');
    return JSON.parse(raw) as ExtractionInput;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not read ${path.relative(ROOT, IN_PATH)}: ${reason}. ` +
        'Run `npm run extract` first.',
    );
  }
}

// ---------------------------------------------------------------------------
// Presentation builder
// ---------------------------------------------------------------------------

function buildPresentation(input: ExtractionInput): PresentationDoc {
  const scenes: PresentationScene[] = [];
  let openingDone = false;

  for (let i = 0; i < input.slides.length; i++) {
    const slide = input.slides[i]!;
    const isFirst = i === 0;
    const isLast = i === input.slides.length - 1;

    if (!openingDone && isFirst) {
      scenes.push(makeOpening(slide));
      openingDone = true;
      continue;
    }

    scenes.push(...interpretSlide(slide));

    if (isLast) {
      scenes.push(makeClosing(slide));
    }
  }

  // Stable ids based on final order.
  for (let i = 0; i < scenes.length; i++) {
    scenes[i]!.id = `scene-${String(i + 1).padStart(3, '0')}`;
  }

  return {
    brand: BRAND,
    visualDirection: {
      referenceMood: VISUAL_DIRECTION.referenceMood,
      do: [...VISUAL_DIRECTION.do],
      avoid: [...VISUAL_DIRECTION.avoid],
    },
    source: {
      file: input.sourceFile,
      generatedAt: input.generatedAt,
      slideCount: input.slideCount,
    },
    scenes,
  };
}

function makeOpening(slide: ExtractedSlide): PresentationScene {
  const subtitle = slide.textRuns[0]?.text ?? '';
  const eyebrow = slide.textRuns[1]?.text ?? '';
  return {
    id: 'scene-pending',
    sourceSlide: slide.slideNumber,
    type: 'title',
    title: slide.inferredTitle || 'Untitled',
    subtitle: subtitle && subtitle !== slide.inferredTitle ? subtitle : eyebrow,
    bullets: [],
    metrics: [],
    chart: null,
    images: imageRefs(slide, 'support'),
    referenceScreenshot: slide.screenshot,
    voiceover: {
      cueText: slide.inferredTitle,
      expectedPhrase: firstSentence(slide.notes) || subtitle,
    },
    visualDirection:
      'Editorial open. Hero title at 168px, eyebrow in mono uppercase. Hold for ' +
      '~5s. No supporting graphics — let the type carry it.',
  };
}

function makeClosing(slide: ExtractedSlide): PresentationScene {
  const headline = slide.inferredTitle || slide.textRuns[0]?.text || 'Thank you.';
  return {
    id: 'scene-pending',
    sourceSlide: slide.slideNumber,
    type: 'closing',
    title: headline,
    subtitle: firstSentence(slide.notes) || slide.textRuns[1]?.text || '',
    bullets: [],
    metrics: [],
    chart: null,
    images: [],
    referenceScreenshot: slide.screenshot,
    voiceover: {
      cueText: headline,
      expectedPhrase: firstSentence(slide.notes) || headline,
    },
    visualDirection:
      'Quiet finish. Centred type, longer hold, slower Ken Burns. Fade audio ' +
      'tail across the final 1.2s.',
  };
}

function interpretSlide(slide: ExtractedSlide): PresentationScene[] {
  const layout = inferLayout(slide);
  const out: PresentationScene[] = [];

  if (layout === 'section') {
    out.push({
      id: 'scene-pending',
      sourceSlide: slide.slideNumber,
      type: 'section',
      title: slide.inferredTitle,
      subtitle: '',
      bullets: [],
      metrics: [],
      chart: null,
      images: [],
      referenceScreenshot: slide.screenshot,
      voiceover: {
        cueText: slide.inferredTitle,
        expectedPhrase: firstSentence(slide.notes) || slide.inferredTitle,
      },
      visualDirection:
        'Chapter divider. Thin rule expands across centre, label appears beneath. ' +
        'Holds 3–4s, then dissolves to the next beat.',
    });
    return out;
  }

  if (layout === 'metric') {
    const big = slide.numbers[0]!;
    out.push({
      id: 'scene-pending',
      sourceSlide: slide.slideNumber,
      type: 'metric',
      title: slide.inferredTitle || metricLabelFromContext(big.context),
      subtitle: '',
      bullets: [],
      metrics: [
        {
          label: slide.inferredTitle || metricLabelFromContext(big.context),
          value: big.value,
          display: big.raw,
        },
      ],
      chart: null,
      images: imageRefs(slide, 'reference'),
      referenceScreenshot: slide.screenshot,
      voiceover: {
        cueText: big.raw,
        expectedPhrase: firstSentence(slide.notes) || big.context,
      },
      visualDirection:
        'Hero metric. Number at ~360px, ease-out count-up over ~1.6s. Tiny mono ' +
        'eyebrow above. Caption below in inkSoft. No iconography.',
    });

    if (slide.numbers.length > 1) {
      out.push({
        id: 'scene-pending',
        sourceSlide: slide.slideNumber,
        type: 'chart',
        title: slide.inferredTitle || 'Key figures',
        subtitle: '',
        bullets: [],
        metrics: [],
        chart: { kind: chartKind(slide.numbers.length), series: chartSeries(slide) },
        images: [],
        referenceScreenshot: slide.screenshot,
        voiceover: {
          cueText: slide.inferredTitle || slide.numbers[1]!.raw,
          expectedPhrase: firstSentence(slide.notes),
        },
        visualDirection:
          'Comparison rows. Bars grow with confident springs. Right-aligned ' +
          'tabular numerals count up alongside the bar reaching its terminus.',
      });
    }
    return out;
  }

  if (layout === 'quote') {
    const body = slide.textRuns.map((r) => r.text).join(' ');
    out.push({
      id: 'scene-pending',
      sourceSlide: slide.slideNumber,
      type: 'quote',
      title: '',
      subtitle: '',
      bullets: [body],
      metrics: [],
      chart: null,
      images: [],
      referenceScreenshot: slide.screenshot,
      voiceover: {
        cueText: slide.inferredTitle || firstWords(body, 5),
        expectedPhrase: firstSentence(slide.notes) || body,
      },
      visualDirection:
        'Pull quote. Light weight type at 84px, oversized open quote in accent ' +
        'colour ghosted behind. Attribution in mono uppercase, accentWarm.',
    });
    return out;
  }

  if (layout === 'image') {
    out.push({
      id: 'scene-pending',
      sourceSlide: slide.slideNumber,
      type: 'image',
      title: slide.inferredTitle,
      subtitle: slide.textRuns[0]?.text ?? '',
      bullets: [],
      metrics: [],
      chart: null,
      images: imageRefs(slide, 'hero'),
      referenceScreenshot: slide.screenshot,
      voiceover: {
        cueText: slide.inferredTitle,
        expectedPhrase: firstSentence(slide.notes),
      },
      visualDirection:
        'Full-bleed image, slow scale-up from 1.06 → 1.16. Vertical gradient ' +
        'gloom on bottom 60% so the type sits clean. Slight desaturation, +5% ' +
        'contrast. No drop shadows.',
    });
    return out;
  }

  // Default: bullets, but capped to 6 to honour the avoid-list.
  const bullets = slide.textRuns.slice(0, 6).map((r) => r.text);
  out.push({
    id: 'scene-pending',
    sourceSlide: slide.slideNumber,
    type: 'bullets',
    title: slide.inferredTitle,
    subtitle: '',
    bullets,
    metrics: [],
    chart: null,
    images: imageRefs(slide, 'support'),
    referenceScreenshot: slide.screenshot,
    voiceover: {
      cueText: slide.inferredTitle,
      expectedPhrase: firstSentence(slide.notes),
    },
    visualDirection:
      'Bullets become kinetic statements, not list items. Numeric counter in ' +
      'mono accent, copy at 52px in display, generous leading. Stagger the ' +
      'reveal with damping 22 / stiffness 110.',
  });

  if (slide.numbers.length >= 2) {
    out.push({
      id: 'scene-pending',
      sourceSlide: slide.slideNumber,
      type: 'chart',
      title: slide.inferredTitle || 'Key figures',
      subtitle: '',
      bullets: [],
      metrics: [],
      chart: { kind: chartKind(slide.numbers.length), series: chartSeries(slide) },
      images: [],
      referenceScreenshot: slide.screenshot,
      voiceover: {
        cueText: slide.numbers[0]!.raw,
        expectedPhrase: firstSentence(slide.notes),
      },
      visualDirection:
        'Follow-up beat after the bullets. Same headline carries over so the ' +
        'cut feels like a deepening, not a reset.',
    });
  }

  return out;
}

function inferLayout(slide: ExtractedSlide): SceneType {
  const hasText = slide.rawText.trim().length > 0;
  const hasImages = slide.media.length > 0;
  const numCount = slide.numbers.length;
  const bodyCount = slide.textRuns.length;
  const firstBody = slide.textRuns[0]?.text ?? '';

  if (!hasText && hasImages) return 'image';
  if (slide.inferredTitle && bodyCount === 0 && numCount === 0) return 'section';
  if (numCount >= 1 && bodyCount <= 3) return 'metric';
  if (/^["“”']/.test(firstBody) || /[—–-]\s*[A-Z]/.test(firstBody)) return 'quote';
  if (hasImages && bodyCount <= 2) return 'image';
  return 'bullets';
}

// ---------------------------------------------------------------------------
// Motion plan builder
// ---------------------------------------------------------------------------

function buildMotionPlan(presentation: PresentationDoc): MotionPlanDoc {
  const scenes: MotionScene[] = presentation.scenes.map((scene) => choreograph(scene));
  return {
    fps: FPS,
    resolution: { width: 1920, height: 1080 },
    globalTransition: { ...GLOBAL_TRANSITION },
    pacing: { ...PACING, notes: [...PACING.notes] },
    avoid: [...VISUAL_DIRECTION.avoid],
    scenes,
  };
}

function choreograph(scene: PresentationScene): MotionScene {
  switch (scene.type) {
    case 'title':
      return {
        id: scene.id,
        type: scene.type,
        weight: 1.4,
        beats: [
          beat(0.0, 14, 'fade-in eyebrow (mono uppercase, accent)', 'ease-out'),
          beat(0.27, 24, 'kinetic title reveal, word stagger', 'spring-confident'),
          beat(1.2, 22, 'subtitle word stagger in inkSoft', 'spring-soft'),
          beat(-0.6, 18, 'cross-dissolve out via SceneFrame', 'ease-out'),
        ],
        revealTimings: { eyebrow: 0.0, title: 0.27, subtitle: 1.2 },
        cinematicNotes:
          'Hold the title beat. Resist any motion below the type — the audience ' +
          'should read this as a film opening, not a slide.',
      };

    case 'section':
      return {
        id: scene.id,
        type: scene.type,
        weight: 0.6,
        beats: [
          beat(0.0, 14, 'mono kicker fades in', 'ease-out'),
          beat(0.2, 20, 'centre rule scales in from 0 → 480px', 'ease-out'),
          beat(0.55, 22, 'chapter label staggers in', 'spring-soft'),
          beat(-0.5, 18, 'cross-dissolve out', 'ease-out'),
        ],
        revealTimings: { kicker: 0.0, rule: 0.2, label: 0.55 },
        cinematicNotes: 'Brief breath beat. Do not add motion graphics — silence is the point.',
      };

    case 'metric':
      return {
        id: scene.id,
        type: scene.type,
        weight: 1.3,
        beats: [
          beat(0.0, 14, 'eyebrow label fades in', 'ease-out'),
          beat(0.2, 48, 'hero number ease-out count-up to terminus', 'ease-out'),
          beat(1.2, 22, 'caption staggers in below', 'spring-soft'),
          beat(-0.4, 16, 'subtle scale settle on the number', 'ease-out'),
        ],
        revealTimings: { eyebrow: 0.0, number: 0.2, caption: 1.2 },
        cinematicNotes:
          'Number is the picture. No iconography, no decoration. Hold the final ' +
          'value for at least 1.5s so the magnitude lands.',
      };

    case 'chart':
      return {
        id: scene.id,
        type: scene.type,
        weight: 1.1,
        beats: [
          beat(0.0, 16, 'title appears', 'ease-out'),
          beat(0.3, 32, 'bars grow sequentially with 0.33s stagger', 'spring-confident'),
          beat(0.5, 32, 'tabular figures count up alongside their bar', 'ease-out'),
          beat(-0.5, 18, 'cross-dissolve out', 'ease-out'),
        ],
        revealTimings: { title: 0.0, bars: 0.3, figures: 0.5 },
        cinematicNotes:
          'Bars and numbers must finish in unison — the count-up and the bar ' +
          'arrive at their terminus on the same frame.',
      };

    case 'quote':
      return {
        id: scene.id,
        type: scene.type,
        weight: 1.0,
        beats: [
          beat(0.0, 12, 'oversized open-quote glyph fades in', 'ease-out'),
          beat(0.15, 36, 'quote body word stagger, light weight', 'spring-soft'),
          beat(1.4, 18, 'attribution appears in accentWarm mono', 'ease-out'),
          beat(-0.5, 18, 'cross-dissolve out', 'ease-out'),
        ],
        revealTimings: { quoteMark: 0.0, body: 0.15, attribution: 1.4 },
        cinematicNotes:
          'Restraint. The quote is the entire frame; do not split-screen with ' +
          'imagery or add backgrounds beyond the global field.',
      };

    case 'image':
      return {
        id: scene.id,
        type: scene.type,
        weight: 0.9,
        beats: [
          beat(0.0, 14, 'image cross-dissolves in', 'ease-out'),
          beat(0.0, 999, 'continuous Ken Burns push 1.06 → 1.16', 'linear'),
          beat(0.6, 24, 'lower-third gradient floor + title appear', 'spring-soft'),
          beat(1.0, 22, 'caption staggers in', 'spring-soft'),
          beat(-0.5, 18, 'cross-dissolve out', 'ease-out'),
        ],
        revealTimings: { image: 0.0, title: 0.6, caption: 1.0 },
        cinematicNotes:
          'Treat the image as B-roll — desaturate slightly, push contrast +5%. ' +
          'Never sit it inside a frame or device mockup.',
      };

    case 'closing':
      return {
        id: scene.id,
        type: scene.type,
        weight: 1.2,
        beats: [
          beat(0.0, 22, 'centred headline reveals with longer stagger', 'spring-confident'),
          beat(1.0, 22, 'subline appears in inkSoft', 'spring-soft'),
          beat(-1.2, 36, 'audio + visual fade together', 'ease-in-out'),
        ],
        revealTimings: { headline: 0.0, subline: 1.0 },
        cinematicNotes:
          'Longest hold of the film. Resist a logo lockup unless it is provided ' +
          'as part of the brand system — silence reads as confidence.',
      };

    case 'bullets':
    default:
      return {
        id: scene.id,
        type: 'bullets',
        weight: 1.0,
        beats: [
          beat(0.0, 14, 'section title appears', 'ease-out'),
          beat(0.4, 30, 'bullet 1: number kicker + copy slide in 40px', 'spring-confident'),
          beat(0.8, 30, 'bullet 2 lands', 'spring-confident'),
          beat(1.2, 30, 'bullet 3 lands', 'spring-confident'),
          beat(1.6, 30, 'subsequent bullets land at 0.4s intervals', 'spring-confident'),
          beat(-0.5, 18, 'cross-dissolve out', 'ease-out'),
        ],
        revealTimings: { title: 0.0, firstBullet: 0.4, bulletInterval: 0.4 },
        cinematicNotes:
          'Cap visible bullets at 6. If the source slide has more, split into a ' +
          'second bullets scene rather than cramming.',
      };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function imageRefs(slide: ExtractedSlide, role: ImageRef['role']): ImageRef[] {
  return slide.media.map((m, i) => ({
    file: m.file,
    role: i === 0 ? role : 'support',
  }));
}

function chartKind(n: number): 'bar' | 'comparison' {
  return n === 2 ? 'comparison' : 'bar';
}

function chartSeries(slide: ExtractedSlide): ChartPoint[] {
  return slide.numbers.slice(0, 4).map((n) => ({
    label: shorten(metricLabelFromContext(n.context), 28),
    value: n.value,
    display: n.raw,
  }));
}

function metricLabelFromContext(context: string): string {
  const cleaned = context.replace(/\s+/g, ' ').trim();
  // Drop the numeric token from the front to leave a label-ish remainder.
  const stripped = cleaned.replace(
    /\$?£?€?\s?-?\d[\d,.]*\s?(?:[%kKmMbB]|bn|m|k|million|billion|pts?|bps)?/g,
    '',
  );
  return shorten(stripped.replace(/\s+/g, ' ').trim(), 60) || cleaned;
}

function firstSentence(text: string | undefined): string {
  if (!text) return '';
  const s = text.replace(/\s+/g, ' ').trim();
  const m = s.match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : s).slice(0, 220);
}

function firstWords(text: string, n: number): string {
  return text.split(/\s+/).slice(0, n).join(' ');
}

function shorten(s: string, max: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function beat(
  at: number,
  durationFrames: number,
  action: string,
  easing: MotionBeat['easing'],
  notes?: string,
): MotionBeat {
  return notes ? { at, durationFrames, action, easing, notes } : { at, durationFrames, action, easing };
}

main().catch((err: unknown) => {
  console.error('[plan] Fatal:', err);
  process.exit(1);
});
