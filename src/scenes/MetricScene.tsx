import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { KineticText } from '../components/KineticText';
import { SceneShell, type FootageRef } from '../components/SceneShell';
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
  footage?: FootageRef;
};

/**
 * Hero-metric scene. The number is the picture; nothing else competes.
 */
export const MetricScene: React.FC<Props> = ({
  surface,
  sceneFrames,
  eyebrow,
  value,
  display,
  units,
  caption,
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

  return (
    <SceneShell surface={surface} sceneFrames={sceneFrames} footage={footage}>
      <div
        style={{
          width: '100%',
          maxWidth: 1700,
          textAlign: 'center',
          color: ink.ink,
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
              marginBottom: 56,
            }}
          >
            <KineticText text={eyebrow} />
          </div>
        ) : null}

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
            fontSize: sizes.metric,
            lineHeight: 0.94,
            letterSpacing: -10,
            color: ink.ink,
            fontVariantNumeric: 'tabular-nums',
            textShadow:
              surface !== 'cream'
                ? `0 10px 100px ${theme.goldFaint}`
                : 'none',
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
              marginTop: 28,
              fontFamily: theme.fontMono,
              fontSize: 30,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: ink.gold,
            }}
          >
            {units}
          </div>
        ) : null}

        {caption ? (
          <div
            style={{
              marginTop: 56,
              fontFamily: theme.fontDisplay,
              fontWeight: 300,
              fontSize: 34,
              lineHeight: 1.4,
              color: ink.inkSoft,
              maxWidth: 1300,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <KineticText text={caption} delay={captionDelay} staggerFrames={1.6} />
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};
