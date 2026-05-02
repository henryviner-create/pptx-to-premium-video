import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import presentation from './data/presentation.json';
import sceneTimings from './data/scene-timings.json';
import footageManifest from './data/footage.json';
import { StatementScene } from './scenes/StatementScene';
import { ManifestoScene } from './scenes/ManifestoScene';
import { PillarsScene } from './scenes/PillarsScene';
import { MetricsScene } from './scenes/MetricsScene';
import { ComparisonScene } from './scenes/ComparisonScene';
import { PortfolioScene } from './scenes/PortfolioScene';
import { MetricScene } from './scenes/MetricScene';
import { ClosingScene } from './scenes/ClosingScene';
import type { SurfaceKind } from './components/Surface';
import type { FootageRef } from './components/SceneShell';
import { theme } from './theme';

/**
 * Adjacent scenes overlap by this many frames so each Sequence's
 * SceneShell fade-in/out cross-dissolves with its neighbours, instead
 * of cutting hard. Matches the 18-frame fade in SceneShell.
 */
const OVERLAP_FRAMES = 18;

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

type ManifestEntry = { slug: string; file: string; pexelsId: number };
const FOOTAGE_BY_SLUG: Map<string, ManifestEntry> = new Map(
  (footageManifest.entries as ManifestEntry[]).map((e) => [e.slug, e]),
);

type Scene = (typeof presentation.scenes)[number];

export const Video: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: theme.forestBgLow }}>
      <Audio src={staticFile(presentation.audio.src)} />

      {presentation.scenes.map((scene: Scene, i) => {
        const timing = sceneTimings.scenes.find(
          (t) => t.clipNumber === scene.clipNumber,
        );
        if (!timing) return null;

        const Comp = COMPONENTS[scene.type];
        if (!Comp) return null;

        const isLast = i === presentation.scenes.length - 1;
        const from = Math.max(0, Math.round(timing.startSec * fps));
        const baseFrames = Math.max(1, Math.round(timing.durationSec * fps));
        // Extend each scene by OVERLAP_FRAMES so its fade-out happens while
        // the next scene fades in. The last scene gets no overlap — its
        // fade-out resolves at the end of the audio bed.
        const sceneFrames = isLast ? baseFrames : baseFrames + OVERLAP_FRAMES;

        // Resolve surface + footage. If a scene declares footage but the
        // manifest doesn't have it (Pexels returned nothing, or the
        // workflow has never run), downgrade to forest.
        const declaredSurface = (scene as { surface?: SurfaceKind }).surface ?? 'forest';
        const footageDecl = (scene as { footage?: { slug: string; push?: FootageRef['push'] } }).footage;
        let surface: SurfaceKind = declaredSurface;
        let footage: FootageRef | undefined;
        if (declaredSurface === 'footage' && footageDecl) {
          const entry = FOOTAGE_BY_SLUG.get(footageDecl.slug);
          if (entry) {
            footage = { file: entry.file, push: footageDecl.push };
          } else {
            surface = 'forest';
          }
        }

        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={sceneFrames}
            name={`${scene.id} · ${scene.type} · ${surface}`}
          >
            <Comp
              {...(scene.props as Record<string, unknown>)}
              surface={surface}
              sceneFrames={sceneFrames}
              footage={footage}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
