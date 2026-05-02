import React from 'react';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme } from '../theme';

type Props = {
  headline: string;
  subline?: string;
};

export const ClosingScene: React.FC<Props> = ({ headline, subline }) => {
  return (
    <SceneFrame>
      <div style={{ textAlign: 'center', color: theme.ink, maxWidth: 1500 }}>
        <h1
          style={{
            fontFamily: theme.fontDisplay,
            fontWeight: 700,
            fontSize: 152,
            letterSpacing: -3,
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          <KineticText text={headline} staggerFrames={2.6} />
        </h1>
        {subline ? (
          <div
            style={{
              marginTop: 48,
              fontFamily: theme.fontDisplay,
              fontWeight: 400,
              fontSize: 36,
              color: theme.inkSoft,
            }}
          >
            <KineticText text={subline} delay={28} />
          </div>
        ) : null}
      </div>
    </SceneFrame>
  );
};
