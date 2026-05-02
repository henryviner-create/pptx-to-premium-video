import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SceneShell, type FootageRef } from '../components/SceneShell';
import { theme, sizes, inkFor } from '../theme';
import type { SurfaceKind } from '../components/Surface';

export type Pillar = {
  index?: string;
  label: string;
  body?: string;
};

type Props = {
  surface: SurfaceKind;
  sceneFrames: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  items: Pillar[];
  footage?: FootageRef;
};

export const PillarsScene: React.FC<Props> = ({
  surface,
  sceneFrames,
  eyebrow,
  title,
  subtitle,
  items,
  footage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(surface);

  const titleDelay = Math.round(fps * 0.2);
  const subtitleDelay = titleDelay + Math.round(fps * 0.6);
  const firstItemDelay = subtitleDelay + Math.round(fps * 0.6);
  const itemStride = Math.round(fps * 0.55);

  return (
    <SceneShell surface={surface} sceneFrames={sceneFrames} footage={footage}>
      <div style={{ width: '100%', maxWidth: 1500, color: ink.ink }}>
        {eyebrow ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: sizes.eyebrow,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: ink.gold,
              marginBottom: 28,
            }}
          >
            <KineticText text={eyebrow} />
          </div>
        ) : null}

        <h2
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
          <KineticText text={title} delay={titleDelay} staggerFrames={2.2} />
        </h2>

        {subtitle ? (
          <div
            style={{
              marginTop: 28,
              fontFamily: theme.fontDisplay,
              fontWeight: 300,
              fontSize: sizes.subtitle,
              color: ink.inkSoft,
              maxWidth: 1100,
            }}
          >
            <KineticText text={subtitle} delay={subtitleDelay} staggerFrames={1.6} />
          </div>
        ) : null}

        <div
          style={{
            marginTop: 72,
            display: 'flex',
            flexDirection: 'column',
            gap: items.length > 4 ? 28 : 36,
          }}
        >
          {items.map((p, i) => {
            const local = frame - (firstItemDelay + i * itemStride);
            const s = spring({
              frame: local,
              fps,
              config: { damping: 22, stiffness: 110, mass: 0.8 },
            });
            const opacity = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
            const tx = interpolate(s, [0, 1], [-44, 0], { extrapolateRight: 'clamp' });
            const ruleW = interpolate(s, [0, 1], [0, 56], { extrapolateRight: 'clamp' });

            return (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 56px 1fr',
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
                    letterSpacing: 4,
                    color: ink.gold,
                    textTransform: 'uppercase',
                  }}
                >
                  {p.index ?? String(i + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    height: 2,
                    width: ruleW,
                    background: ink.gold,
                    transform: 'translateY(-18px)',
                    borderRadius: 1,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: theme.fontDisplay,
                      fontWeight: 500,
                      fontSize: sizes.bullet,
                      lineHeight: 1.18,
                      letterSpacing: -0.6,
                      color: ink.ink,
                    }}
                  >
                    {p.label}
                  </div>
                  {p.body ? (
                    <div
                      style={{
                        marginTop: 8,
                        fontFamily: theme.fontDisplay,
                        fontWeight: 300,
                        fontSize: 28,
                        lineHeight: 1.4,
                        color: ink.inkSoft,
                        maxWidth: 1100,
                      }}
                    >
                      {p.body}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneShell>
  );
};
