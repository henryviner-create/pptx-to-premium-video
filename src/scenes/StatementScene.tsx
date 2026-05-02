import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SceneShell, type FootageRef } from '../components/SceneShell';
import { theme, sizes, inkFor } from '../theme';
import type { SurfaceKind } from '../components/Surface';

type Props = {
  surface: SurfaceKind;
  sceneFrames: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  footage?: FootageRef;
};

/**
 * Single-statement scene. One thought, full frame, hero scale. Used
 * for the opening line and any other moment whose entire job is to
 * land one sentence cleanly.
 */
export const StatementScene: React.FC<Props> = ({
  surface,
  sceneFrames,
  eyebrow,
  title,
  subtitle,
  footage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(surface);
  const subtitleDelay = Math.round((title.split(/\s+/).length + 8) * fps * 0.06);

  return (
    <SceneShell surface={surface} sceneFrames={sceneFrames} footage={footage}>
      <div style={{ width: '100%', maxWidth: 1500, color: ink.ink }}>
        {eyebrow ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: sizes.eyebrow,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: ink.gold,
              marginBottom: 60,
            }}
          >
            <KineticText text={eyebrow} />
          </div>
        ) : null}
        <h1
          style={{
            fontFamily: theme.fontDisplay,
            fontWeight: 600,
            fontSize: sizes.title,
            lineHeight: 1.06,
            letterSpacing: -2,
            margin: 0,
            color: ink.ink,
          }}
        >
          <KineticText text={title} delay={4} staggerFrames={2.4} />
        </h1>
        {subtitle ? (
          <div
            style={{
              fontFamily: theme.fontDisplay,
              fontWeight: 300,
              fontSize: sizes.subtitle,
              lineHeight: 1.4,
              letterSpacing: -0.3,
              color: ink.inkSoft,
              marginTop: 48,
              maxWidth: 1200,
            }}
          >
            <KineticText text={subtitle} delay={subtitleDelay} staggerFrames={1.6} />
          </div>
        ) : null}
        <div
          style={{
            marginTop: 80,
            width: 120,
            height: 2,
            background: ink.gold,
            opacity: Math.min(1, frame / Math.max(1, fps * 0.6)),
            transformOrigin: 'left',
          }}
        />
      </div>
    </SceneShell>
  );
};
