import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { KineticText } from '../components/KineticText';
import { SceneShell, type FootageRef } from '../components/SceneShell';
import { theme, sizes, inkFor } from '../theme';
import type { SurfaceKind } from '../components/Surface';

export type ScaleMetric = {
  display: string;
  value: number;
  caption: string;
};

type Props = {
  surface: SurfaceKind;
  sceneFrames: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  metrics: ScaleMetric[];
  footnote?: string;
  footage?: FootageRef;
};

export const MetricsScene: React.FC<Props> = ({
  surface,
  sceneFrames,
  eyebrow,
  title,
  subtitle,
  metrics,
  footnote,
  footage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(surface);

  const titleDelay = Math.round(fps * 0.2);
  const subtitleDelay = titleDelay + Math.round(fps * 0.6);
  const firstMetricDelay = subtitleDelay + Math.round(fps * 0.5);
  const metricStride = Math.round(fps * 0.4);

  return (
    <SceneShell surface={surface} sceneFrames={sceneFrames} footage={footage}>
      <div style={{ width: '100%', maxWidth: 1700, color: ink.ink }}>
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
          }}
        >
          <KineticText text={title} delay={titleDelay} staggerFrames={2.2} />
        </h2>

        {subtitle ? (
          <div
            style={{
              marginTop: 24,
              fontFamily: theme.fontDisplay,
              fontWeight: 300,
              fontSize: sizes.subtitle,
              color: ink.inkSoft,
              maxWidth: 1300,
            }}
          >
            <KineticText text={subtitle} delay={subtitleDelay} staggerFrames={1.6} />
          </div>
        ) : null}

        <div
          style={{
            marginTop: 96,
            display: 'grid',
            gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))`,
            gap: metrics.length >= 4 ? 48 : 64,
          }}
        >
          {metrics.map((m, i) => {
            const localDelay = firstMetricDelay + i * metricStride;
            const local = frame - localDelay;
            const s = spring({
              frame: local,
              fps,
              config: { damping: 22, stiffness: 100, mass: 0.9 },
            });
            const opacity = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
            const ty = interpolate(s, [0, 1], [22, 0], { extrapolateRight: 'clamp' });
            const ruleW = interpolate(s, [0, 1], [0, 56], { extrapolateRight: 'clamp' });
            return (
              <div
                key={i}
                style={{
                  opacity,
                  transform: `translateY(${ty}px)`,
                }}
              >
                <span
                  style={{
                    display: 'block',
                    height: 2,
                    width: ruleW,
                    background: ink.gold,
                    marginBottom: 28,
                    borderRadius: 1,
                  }}
                />
                <div
                  style={{
                    fontFamily: theme.fontDisplay,
                    fontWeight: 600,
                    fontSize: figureSize(metrics.length, m.display),
                    lineHeight: 0.96,
                    letterSpacing: metrics.length >= 4 ? -2 : -3,
                    color: ink.ink,
                    fontVariantNumeric: 'tabular-nums',
                    textShadow:
                      surface === 'forest' || surface === 'footage'
                        ? `0 6px 60px ${theme.goldFaint}`
                        : 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <AnimatedNumber
                    value={m.value}
                    display={m.display}
                    delay={localDelay + 6}
                    durationInFrames={Math.round(fps * 1.4)}
                  />
                </div>
                <div
                  style={{
                    marginTop: 18,
                    fontFamily: theme.fontDisplay,
                    fontWeight: 400,
                    fontSize: 26,
                    lineHeight: 1.4,
                    color: ink.inkSoft,
                    maxWidth: 360,
                  }}
                >
                  {m.caption}
                </div>
              </div>
            );
          })}
        </div>

        {footnote ? (
          <div
            style={{
              marginTop: 80,
              fontFamily: theme.fontMono,
              fontSize: 22,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: ink.inkFaint,
            }}
          >
            {footnote}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};

function figureSize(count: number, display: string): number {
  const base = count <= 2 ? 160 : count === 3 ? 132 : count === 4 ? 100 : 84;
  const isText = !/\d/.test(display);
  return Math.round(base * (isText ? 0.88 : 1));
}
