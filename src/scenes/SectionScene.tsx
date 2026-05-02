import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme } from '../theme';

type Props = {
  kicker?: string;
  label: string;
};

export const SectionScene: React.FC<Props> = ({ kicker, label }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ruleW = interpolate(frame, [4, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ruleOpacity = interpolate(
    frame,
    [0, 18, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <SceneFrame>
      <div style={{ textAlign: 'center', color: theme.ink, maxWidth: 1500 }}>
        {kicker ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: 22,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: theme.accent,
              marginBottom: 60,
            }}
          >
            <KineticText text={kicker} />
          </div>
        ) : null}
        <div
          style={{
            height: 2,
            background: theme.ink,
            margin: '0 auto 60px',
            transform: `scaleX(${ruleW})`,
            transformOrigin: 'center',
            width: 480,
            opacity: ruleOpacity,
          }}
        />
        <h2
          style={{
            fontFamily: theme.fontDisplay,
            fontWeight: 600,
            fontSize: 132,
            lineHeight: 1.05,
            letterSpacing: -2.5,
            margin: 0,
          }}
        >
          <KineticText text={label} delay={16} />
        </h2>
      </div>
    </SceneFrame>
  );
};
