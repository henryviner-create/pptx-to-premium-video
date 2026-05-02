import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import presentation from './data/presentation.json';
import sceneTimings from './data/scene-timings.json';
import footageManifest from './data/footage.json';
import conceptsManifest from './data/concepts.json';
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

type FootageEntry = { slug: string; file: string };
type ConceptEntry = { slug: string; file: string };
const FOOTAGE_BY_SLUG: Map<string, FootageEntry> = new Map(
  (footageManifest.entries as FootageEntry[]).map((e) => [e.slug, e]),
);
const CONCEPTS_BY_SLUG: Map<string, ConceptEntry> = new Map(
  (conceptsManifest.entries as ConceptEntry[]).map((e) => [e.slug, e]),
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

        // Resolve surface + footage with the precedence:
        //   concept clip (Arcads) > footage clip (Pexels) > declared surface.
        // A concept clip implies the scene plays on a 'footage' surface
        // even if it declared 'cream' / 'forest' — the AI clip is the
        // backdrop. If neither concept nor footage are available, the
        // scene falls back to the declared surface so the render is
        // never broken by a missing asset.
        const declaredSurface = (scene as { surface?: SurfaceKind }).surface ?? 'forest';
        const conceptDecl = (scene as { concept?: { slug: string; push?: FootageRef['push'] } }).concept;
        const footageDecl = (scene as { footage?: { slug: string; push?: FootageRef['push'] } }).footage;

        let surface: SurfaceKind = declaredSurface;
        let footage: FootageRef | undefined;

        if (conceptDecl) {
          const conceptEntry = CONCEPTS_BY_SLUG.get(conceptDecl.slug);
          if (conceptEntry) {
            surface = 'footage';
            footage = { file: conceptEntry.file, push: conceptDecl.push };
          }
        }

        if (!footage && footageDecl) {
          const entry = FOOTAGE_BY_SLUG.get(footageDecl.slug);
          if (entry) {
            surface = 'footage';
            footage = { file: entry.file, push: footageDecl.push };
          } else if (declaredSurface === 'footage') {
            // Scene declared footage as primary but the asset is missing.
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
