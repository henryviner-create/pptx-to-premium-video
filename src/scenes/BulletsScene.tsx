import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme } from '../theme';

type Props = {
  title: string;
  items: string[];
};

export const BulletsScene: React.FC<Props> = ({ title, items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <SceneFrame>
      <div style={{ width: '100%', maxWidth: 1500, color: theme.ink }}>
        {title ? (
          <h2
            style={{
              fontFamily: theme.fontDisplay,
              fontWeight: 700,
              fontSize: 96,
              lineHeight: 1.05,
              letterSpacing: -2,
              margin: 0,
              marginBottom: 80,
            }}
          >
            <KineticText text={title} />
          </h2>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {items.map((it, i) => {
            const local = frame - 18 - i * 14;
            const s = spring({ frame: local, fps, config: { damping: 22, stiffness: 110, mass: 0.7 } });
            const opacity = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
            const tx = interpolate(s, [0, 1], [-40, 0], { extrapolateRight: 'clamp' });
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 28,
                  opacity,
                  transform: `translateX(${tx}px)`,
                }}
              >
                <span
                  style={{
                    fontFamily: theme.fontMono,
                    fontSize: 22,
                    color: theme.accent,
                    minWidth: 64,
                    letterSpacing: 2,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontFamily: theme.fontDisplay,
                    fontWeight: 500,
                    fontSize: 52,
                    lineHeight: 1.25,
                    color: theme.ink,
                  }}
                >
                  {it}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </SceneFrame>
  );
};
