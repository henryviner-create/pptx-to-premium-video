import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme, sizes } from '../theme';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

/**
 * Editorial single-statement scene. One thought, full frame, hero scale.
 * No imagery, no list, no logo. Used for the opening line and any other
 * scene whose entire job is to land one sentence cleanly.
 */
export const StatementScene: React.FC<Props> = ({ eyebrow, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const subtitleDelayFrames = Math.round((title.split(/\s+/).length + 8) * fps * 0.06);

  return (
    <SceneFrame>
      <div style={{ width: '100%', maxWidth: 1500, color: theme.ink }}>
        {eyebrow ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: sizes.eyebrow,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: theme.gold,
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
            color: theme.ink,
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
              color: theme.inkSoft,
              marginTop: 48,
              maxWidth: 1200,
            }}
          >
            <KineticText
              text={subtitle}
              delay={subtitleDelayFrames}
              staggerFrames={1.6}
            />
          </div>
        ) : null}
        <div
          style={{
            marginTop: 80,
            width: 120,
            height: 2,
            background: theme.gold,
            opacity: Math.min(1, frame / Math.max(1, fps * 0.6)),
            transformOrigin: 'left',
          }}
        />
      </div>
    </SceneFrame>
  );
};
