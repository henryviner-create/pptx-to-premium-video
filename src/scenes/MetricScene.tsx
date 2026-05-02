import React from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme } from '../theme';

type Props = {
  label: string;
  value: number;
  display?: string;
  caption?: string;
};

export const MetricScene: React.FC<Props> = ({ label, value, display, caption }) => {
  return (
    <SceneFrame>
      <div style={{ textAlign: 'center', color: theme.ink, maxWidth: 1600 }}>
        {label ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: 26,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: theme.inkSoft,
              marginBottom: 56,
            }}
          >
            <KineticText text={label} />
          </div>
        ) : null}
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontWeight: 700,
            fontSize: 360,
            lineHeight: 0.95,
            letterSpacing: -10,
            color: theme.ink,
            textShadow: '0 8px 80px rgba(124,196,255,0.18)',
          }}
        >
          <AnimatedNumber value={value} display={display} delay={6} />
        </div>
        {caption ? (
          <div
            style={{
              fontFamily: theme.fontDisplay,
              fontWeight: 400,
              fontSize: 38,
              color: theme.inkSoft,
              marginTop: 56,
              maxWidth: 1300,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <KineticText text={caption} delay={36} staggerFrames={1.6} />
          </div>
        ) : null}
      </div>
    </SceneFrame>
  );
};
