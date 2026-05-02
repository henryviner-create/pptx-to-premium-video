import React from 'react';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme } from '../theme';

type Props = {
  body: string;
  attribution?: string;
};

export const QuoteScene: React.FC<Props> = ({ body, attribution }) => {
  return (
    <SceneFrame>
      <div style={{ maxWidth: 1500, color: theme.ink }}>
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontWeight: 300,
            fontSize: 84,
            lineHeight: 1.18,
            letterSpacing: -1.6,
            color: theme.ink,
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: -90,
              left: -30,
              fontSize: 240,
              color: theme.accent,
              opacity: 0.35,
              fontFamily: theme.fontDisplay,
            }}
          >
            “
          </span>
          <KineticText text={body} staggerFrames={1.2} />
        </div>
        {attribution ? (
          <div
            style={{
              marginTop: 60,
              fontFamily: theme.fontMono,
              fontSize: 26,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: theme.accentWarm,
            }}
          >
            <KineticText text={`— ${attribution}`} delay={40} />
          </div>
        ) : null}
      </div>
    </SceneFrame>
  );
};
