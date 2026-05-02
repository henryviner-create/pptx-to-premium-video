import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { KineticText } from '../components/KineticText';
import { SceneShell, type FootageRef } from '../components/SceneShell';
import { FluxChart } from '../components/FluxChart';
import { theme, sizes, inkFor } from '../theme';
import type { SurfaceKind } from '../components/Surface';

type Props = {
  surface: SurfaceKind;
  sceneFrames: number;
  eyebrow?: string;
  value: number;
  display: string;
  units?: string;
  caption?: string;
  /** Optional chart kind to render alongside the hero figure. */
  chart?: 'flux';
  /** Seconds (within scene) at which the chart begins drawing. */
  chartStartSec?: number;
  footage?: FootageRef;
};

/**
 * Hero-metric scene. The number is the picture; if a chart is provided,
 * it sits beside the number as the data referent. For the −16.3 NEE
 * scene that means the chart is the visual evidence the narrator is
 * citing — Apple-keynote-style: claim, then proof.
 */
export const MetricScene: React.FC<Props> = ({
  surface,
  sceneFrames,
  eyebrow,
  value,
  display,
  units,
  caption,
  chart,
  chartStartSec,
  footage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(surface);

  const ruleW = interpolate(frame, [0, 24], [0, 96], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const captionDelay = Math.round(fps * 1.6);
  const chartStart = Math.round((chartStartSec ?? 8.85) * fps);

  return (
    <SceneShell surface={surface} sceneFrames={sceneFrames} footage={footage}>
      <div
        style={{
          width: '100%',
          maxWidth: 1700,
          color: ink.ink,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {eyebrow ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: 24,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: ink.gold,
              textAlign: 'center',
            }}
          >
            <KineticText text={eyebrow} />
          </div>
        ) : null}

        <span
          style={{
            height: 2,
            width: ruleW,
            background: ink.gold,
            borderRadius: 1,
          }}
        />

        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontWeight: 600,
            fontSize: chart ? 200 : sizes.metric,
            lineHeight: 0.94,
            letterSpacing: chart ? -6 : -10,
            color: ink.ink,
            fontVariantNumeric: 'tabular-nums',
            textShadow:
              surface !== 'cream' ? `0 10px 100px ${theme.goldFaint}` : 'none',
            textAlign: 'center',
          }}
        >
          <AnimatedNumber
            value={value}
            display={display}
            delay={Math.round(fps * 0.3)}
            durationInFrames={Math.round(fps * 1.6)}
          />
        </div>

        {units ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: chart ? 24 : 30,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: ink.gold,
            }}
          >
            {units}
          </div>
        ) : null}

        {chart === 'flux' ? (
          <div style={{ marginTop: 8 }}>
            <FluxChart
              startFrame={chartStart}
              totalFrames={Math.round(fps * 6)}
              surface={surface}
            />
          </div>
        ) : null}

        {caption ? (
          <div
            style={{
              marginTop: chart ? 8 : 32,
              fontFamily: theme.fontDisplay,
              fontWeight: 300,
              fontSize: chart ? 24 : 30,
              lineHeight: 1.4,
              color: ink.inkSoft,
              maxWidth: 1300,
              textAlign: 'center',
            }}
          >
            <KineticText text={caption} delay={captionDelay} staggerFrames={1.6} />
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};
