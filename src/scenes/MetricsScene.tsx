import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { KineticText } from '../components/KineticText';
import { SceneShell, type FootageRef } from '../components/SceneShell';
import { theme, sizes, inkFor } from '../theme';
import type { SurfaceKind } from '../components/Surface';

export type ScaleMetric = {
  display: string;
  value: number;
  caption: string;
  /** Seconds (within the scene) at which this metric takes the full frame. */
  revealSec: number;
};

type Props = {
  surface: SurfaceKind;
  sceneFrames: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  metrics: ScaleMetric[];
  footnote?: string;
  /** Seconds at which the metrics-row collection beat begins. */
  finaleSec?: number;
  footage?: FootageRef;
};

/**
 * Metrics scene plays as four (or N) hero shots in sequence — each
 * number takes the entire frame as the narrator says it — followed by
 * a row that collects the figures together as a synthesis. This kills
 * the "metrics-as-row" look and replaces it with an Apple-keynote
 * sequence of reveals.
 */
export const MetricsScene: React.FC<Props> = ({
  surface,
  sceneFrames,
  eyebrow,
  title,
  subtitle,
  metrics,
  footnote,
  finaleSec,
  footage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(surface);

  const titleEnd = metrics[0]?.revealSec ?? 4;
  const finalSec = finaleSec ?? Math.max(titleEnd + 4, sceneFrames / fps - 6);
  const FADE = 14;

  const beats = [
    { kind: 'title' as const, startSec: 0, endSec: titleEnd },
    ...metrics.map((m, i) => ({
      kind: 'metric' as const,
      startSec: m.revealSec,
      endSec: metrics[i + 1]?.revealSec ?? finalSec,
      metric: m,
      index: i,
    })),
    { kind: 'finale' as const, startSec: finalSec, endSec: sceneFrames / fps },
  ];

  return (
    <SceneShell surface={surface} sceneFrames={sceneFrames} footage={footage}>
      {beats.map((beat, beatIdx) => {
        const startFrame = beat.startSec * fps;
        const endFrame = beat.endSec * fps;
        const opacity = interpolate(
          frame,
          [startFrame - FADE, startFrame, endFrame, endFrame + FADE],
          [0, 1, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        if (opacity < 0.001) return null;
        const shotShift = (beatIdx % 2 === 0 ? -1 : 1) * 14;
        return (
          <AbsoluteFill
            key={beatIdx}
            style={{
              opacity,
              padding: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `translateX(${shotShift}px)`,
            }}
          >
            {beat.kind === 'title' ? (
              <TitleBeat
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                ink={ink}
                startFrame={startFrame}
                fps={fps}
                frame={frame}
              />
            ) : null}
            {beat.kind === 'metric' ? (
              <MetricBeat
                metric={beat.metric}
                ink={ink}
                surface={surface}
                startFrame={startFrame}
                fps={fps}
                frame={frame}
              />
            ) : null}
            {beat.kind === 'finale' ? (
              <FinaleBeat
                title={title}
                metrics={metrics}
                footnote={footnote}
                ink={ink}
                surface={surface}
                startFrame={startFrame}
                fps={fps}
                frame={frame}
              />
            ) : null}
          </AbsoluteFill>
        );
      })}
    </SceneShell>
  );
};

const TitleBeat: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ink: ReturnType<typeof inkFor>;
  startFrame: number;
  fps: number;
  frame: number;
}> = ({ eyebrow, title, subtitle, ink, startFrame, fps, frame }) => {
  const local = frame - startFrame;
  const ruleW = interpolate(local, [16, 36], [0, 140], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{ width: '100%', maxWidth: 1500, color: ink.ink }}>
      {eyebrow ? (
        <div
          style={{
            fontFamily: theme.fontMono,
            fontSize: sizes.eyebrow,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: ink.gold,
            marginBottom: 36,
          }}
        >
          <KineticText text={eyebrow} delay={Math.round(fps * 0.1)} />
        </div>
      ) : null}
      <h2
        style={{
          fontFamily: theme.fontDisplay,
          fontWeight: 600,
          fontSize: 152,
          lineHeight: 1.02,
          letterSpacing: -3,
          margin: 0,
        }}
      >
        <KineticText text={title} delay={Math.round(fps * 0.25)} staggerFrames={2.6} />
      </h2>
      {subtitle ? (
        <div
          style={{
            marginTop: 36,
            fontFamily: theme.fontDisplay,
            fontWeight: 300,
            fontSize: sizes.subtitle,
            color: ink.inkSoft,
            maxWidth: 1100,
          }}
        >
          <KineticText
            text={subtitle}
            delay={Math.round(fps * 0.9)}
            staggerFrames={1.6}
          />
        </div>
      ) : null}
      <div
        style={{
          marginTop: 64,
          width: ruleW,
          height: 2,
          background: ink.gold,
          borderRadius: 1,
        }}
      />
    </div>
  );
};

const MetricBeat: React.FC<{
  metric: ScaleMetric;
  ink: ReturnType<typeof inkFor>;
  surface: SurfaceKind;
  startFrame: number;
  fps: number;
  frame: number;
}> = ({ metric, ink, surface, startFrame, fps, frame }) => {
  const local = frame - startFrame;
  const ruleW = interpolate(local, [10, 30], [0, 96], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const isText = !/\d/.test(metric.display);
  const figSize = isText ? 240 : 320;

  return (
    <div style={{ textAlign: 'center', maxWidth: 1700, color: ink.ink }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <span
          style={{
            height: 2,
            width: ruleW,
            background: ink.gold,
            borderRadius: 1,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontWeight: 600,
          fontSize: figSize,
          lineHeight: 0.95,
          letterSpacing: isText ? -4 : -8,
          color: ink.ink,
          fontVariantNumeric: 'tabular-nums',
          textShadow:
            surface !== 'cream'
              ? `0 8px 90px ${theme.goldFaint}`
              : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <AnimatedNumber
          value={metric.value}
          display={metric.display}
          delay={Math.round(fps * 0.18)}
          durationInFrames={Math.round(fps * 1.4)}
        />
      </div>
      <div
        style={{
          marginTop: 32,
          fontFamily: theme.fontMono,
          fontSize: 26,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: ink.gold,
        }}
      >
        {metric.caption}
      </div>
    </div>
  );
};

const FinaleBeat: React.FC<{
  title: string;
  metrics: ScaleMetric[];
  footnote?: string;
  ink: ReturnType<typeof inkFor>;
  surface: SurfaceKind;
  startFrame: number;
  fps: number;
  frame: number;
}> = ({ title, metrics, footnote, ink, surface, startFrame, fps, frame }) => {
  const local = frame - startFrame;
  return (
    <div style={{ width: '100%', maxWidth: 1700, color: ink.ink }}>
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: sizes.eyebrow,
          letterSpacing: 8,
          textTransform: 'uppercase',
          color: ink.gold,
          marginBottom: 64,
          opacity: interpolate(local, [0, 14], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {title.replace(/\.$/, '')}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))`,
          gap: metrics.length >= 4 ? 48 : 64,
        }}
      >
        {metrics.map((m, i) => {
          const itemDelay = Math.round(fps * 0.2) + i * Math.round(fps * 0.16);
          const s = spring({
            frame: local - itemDelay,
            fps,
            config: { damping: 22, stiffness: 100, mass: 0.85 },
          });
          const op = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
          const ty = interpolate(s, [0, 1], [22, 0], { extrapolateRight: 'clamp' });
          const isText = !/\d/.test(m.display);
          const baseSize = metrics.length <= 2 ? 160 : metrics.length === 3 ? 132 : 100;
          const figSize = Math.round(baseSize * (isText ? 0.88 : 1));
          return (
            <div key={i} style={{ opacity: op, transform: `translateY(${ty}px)` }}>
              <span
                style={{
                  display: 'block',
                  height: 2,
                  width: 48,
                  background: ink.gold,
                  marginBottom: 24,
                  borderRadius: 1,
                }}
              />
              <div
                style={{
                  fontFamily: theme.fontDisplay,
                  fontWeight: 600,
                  fontSize: figSize,
                  lineHeight: 0.96,
                  letterSpacing: metrics.length >= 4 ? -2 : -3,
                  color: ink.ink,
                  fontVariantNumeric: 'tabular-nums',
                  textShadow:
                    surface !== 'cream'
                      ? `0 6px 60px ${theme.goldFaint}`
                      : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.display}
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontFamily: theme.fontDisplay,
                  fontWeight: 400,
                  fontSize: 22,
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
            marginTop: 64,
            fontFamily: theme.fontMono,
            fontSize: 22,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: ink.inkFaint,
            opacity: interpolate(local, [30, 60], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {footnote}
        </div>
      ) : null}
    </div>
  );
};
