import React from 'react';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme } from '../theme';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  mood?: string;
};

export const TitleScene: React.FC<Props> = ({ eyebrow, title, subtitle }) => {
  return (
    <SceneFrame>
      <div style={{ maxWidth: 1500, textAlign: 'left', color: theme.ink }}>
        {eyebrow ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: 24,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: theme.accent,
              marginBottom: 36,
            }}
          >
            <KineticText text={eyebrow} />
          </div>
        ) : null}
        <h1
          style={{
            fontFamily: theme.fontDisplay,
            fontWeight: 700,
            fontSize: 168,
            lineHeight: 1.02,
            letterSpacing: -3.5,
            margin: 0,
          }}
        >
          <KineticText text={title} delay={6} staggerFrames={2.4} />
        </h1>
        {subtitle ? (
          <div
            style={{
              fontFamily: theme.fontDisplay,
              fontWeight: 400,
              fontSize: 40,
              color: theme.inkSoft,
              marginTop: 36,
              maxWidth: 1100,
            }}
          >
            <KineticText text={subtitle} delay={28} staggerFrames={1.8} />
          </div>
        ) : null}
      </div>
    </SceneFrame>
  );
};
