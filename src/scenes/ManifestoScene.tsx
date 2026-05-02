import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme, sizes } from '../theme';

type Props = {
  eyebrow?: string;
  /** Three short lines, set as a creed. */
  lines: string[];
  /** Optional closing tagline rendered in inkSoft below the lines. */
  closer?: string;
};

/**
 * Three-line creed scene. Each line lands with a settled spring, and a
 * gold rule travels in beside the active line. The cumulative effect
 * reads as a manifesto, not a bullet list.
 */
export const ManifestoScene: React.FC<Props> = ({ eyebrow, lines, closer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineDelayFrames = (i: number) =>
    Math.round(fps * 0.4) + i * Math.round(fps * 1.6);

  return (
    <SceneFrame>
      <div style={{ maxWidth: 1500, color: theme.ink }}>
        {eyebrow ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: sizes.eyebrow,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: theme.gold,
              marginBottom: 80,
            }}
          >
            <KineticText text={eyebrow} />
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {lines.map((line, i) => {
            const local = frame - lineDelayFrames(i);
            const s = spring({
              frame: local,
              fps,
              config: { damping: 22, stiffness: 110, mass: 0.8 },
            });
            const opacity = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
            const tx = interpolate(s, [0, 1], [-32, 0], { extrapolateRight: 'clamp' });
            const ruleW = interpolate(s, [0, 1], [0, 80], { extrapolateRight: 'clamp' });
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 32,
                  opacity,
                  transform: `translateX(${tx}px)`,
                }}
              >
                <span
                  style={{
                    flex: '0 0 auto',
                    height: 4,
                    width: ruleW,
                    background: theme.gold,
                    transform: 'translateY(-18px)',
                    borderRadius: 2,
                  }}
                />
                <span
                  style={{
                    fontFamily: theme.fontDisplay,
                    fontWeight: 500,
                    fontSize: sizes.manifesto,
                    lineHeight: 1.12,
                    letterSpacing: -1.4,
                    color: theme.ink,
                  }}
                >
                  {line}
                </span>
              </div>
            );
          })}
        </div>

        {closer ? (
          <div
            style={{
              marginTop: 80,
              fontFamily: theme.fontDisplay,
              fontWeight: 300,
              fontSize: sizes.subtitle,
              color: theme.inkSoft,
              maxWidth: 1100,
            }}
          >
            <KineticText
              text={closer}
              delay={lineDelayFrames(lines.length)}
              staggerFrames={1.6}
            />
          </div>
        ) : null}
      </div>
    </SceneFrame>
  );
};
