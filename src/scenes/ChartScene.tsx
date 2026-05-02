import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme } from '../theme';

type Series = { label: string; value: number; display?: string };

type Props = {
  title: string;
  series: Series[];
};

export const ChartScene: React.FC<Props> = ({ title, series }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...series.map((s) => Math.abs(s.value)), 1);

  return (
    <SceneFrame>
      <div style={{ width: '100%', maxWidth: 1500, color: theme.ink }}>
        {title ? (
          <h2
            style={{
              fontFamily: theme.fontDisplay,
              fontWeight: 700,
              fontSize: 84,
              letterSpacing: -2,
              margin: 0,
              marginBottom: 80,
            }}
          >
            <KineticText text={title} />
          </h2>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {series.map((s, i) => {
            const local = frame - 18 - i * 10;
            const grow = spring({ frame: local, fps, config: { damping: 22, stiffness: 90, mass: 0.9 } });
            const width = interpolate(grow, [0, 1], [0, 1], { extrapolateRight: 'clamp' }) * (Math.abs(s.value) / max);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                <div
                  style={{
                    flex: '0 0 320px',
                    fontFamily: theme.fontDisplay,
                    fontSize: 28,
                    color: theme.inkSoft,
                  }}
                >
                  {s.label}
                </div>
                <div style={{ flex: 1, height: 26, background: theme.rule, borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${width * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentWarm})`,
                      borderRadius: 999,
                      boxShadow: `0 0 30px ${theme.accent}55`,
                    }}
                  />
                </div>
                <div
                  style={{
                    flex: '0 0 220px',
                    textAlign: 'right',
                    fontFamily: theme.fontDisplay,
                    fontWeight: 600,
                    fontSize: 44,
                  }}
                >
                  <AnimatedNumber value={s.value} display={s.display} delay={20 + i * 10} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneFrame>
  );
};
