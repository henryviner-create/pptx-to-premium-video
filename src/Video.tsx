import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import presentation from './data/presentation.json';
import sceneTimings from './data/scene-timings.json';
import { BackgroundField } from './components/BackgroundField';
import { StatementScene } from './scenes/StatementScene';
import { ManifestoScene } from './scenes/ManifestoScene';
import { PillarsScene } from './scenes/PillarsScene';
import { MetricsScene } from './scenes/MetricsScene';
import { ComparisonScene } from './scenes/ComparisonScene';
import { PortfolioScene } from './scenes/PortfolioScene';
import { MetricScene } from './scenes/MetricScene';
import { ClosingScene } from './scenes/ClosingScene';
import { theme } from './theme';

/**
 * The film.
 *
 * Audio: a single, continuous master voiceover track served from
 *        public/audio/master-voiceover.mp3 (regenerated each render
 *        from input/master-voiceover.mp3 by `npm run prepare:audio`).
 *        Never split per scene, never re-encoded.
 *
 * Timing: scene-timings.json is canonical. We look up each scene by
 *         clipNumber so the order in presentation.json doesn't matter.
 *
 * Content: presentation.json carries the per-scene props.
 *
 * Background: BackgroundField is mounted once for the whole timeline so
 *             the dissolve between scenes never feels like a slide flip.
 */
const COMPONENTS: Record<string, React.FC<any>> = {
  statement: StatementScene,
  manifesto: ManifestoScene,
  pillars: PillarsScene,
  metrics: MetricsScene,
  comparison: ComparisonScene,
  portfolio: PortfolioScene,
  metric: MetricScene,
  closing: ClosingScene,
};

type Scene = (typeof presentation.scenes)[number];

export const Video: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <BackgroundField />
      <Audio src={staticFile(presentation.audio.src)} />

      {presentation.scenes.map((scene: Scene) => {
        const timing = sceneTimings.scenes.find(
          (t) => t.clipNumber === scene.clipNumber,
        );
        if (!timing) return null;

        const Comp = COMPONENTS[scene.type];
        if (!Comp) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[Video] No component registered for scene type "${scene.type}"`);
          }
          return null;
        }

        const from = Math.max(0, Math.round(timing.startSec * fps));
        const durationInFrames = Math.max(
          1,
          Math.round(timing.durationSec * fps),
        );

        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={durationInFrames}
            name={`${scene.id} · ${scene.type}`}
          >
            <Comp {...(scene.props as Record<string, unknown>)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
