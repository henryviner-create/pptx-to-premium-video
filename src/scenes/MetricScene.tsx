import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme, sizes } from '../theme';

type Props = {
  /** Mono uppercase label above the number. */
  eyebrow?: string;
  /** Numeric driver for the count-up. Negative values are allowed. */
  value: number;
  /** Display string preserving prefix/suffix, e.g. "−16.3" or "100M+". */
  display: string;
  /** Units row directly below the number, e.g. "tCO₂ ha⁻¹ yr⁻¹". */
  units?: string;
  /** Long-form caption below the units. */
  caption?: string;
};

/**
 * Hero-metric scene. The number is the picture; nothing else competes.
 * Used for the −16.3 NEE figure that anchors the film's evidence.
 */
export const MetricScene: React.FC<Props> = ({ eyebrow, value, display, units, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ruleW = interpolate(frame, [0, 24], [0, 96], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const captionDelay = Math.round(fps * 1.6);

  return (
    <SceneFrame>
      <div style={{ textAlign: 'center', color: theme.ink, maxWidth: 1700 }}>
        {eyebrow ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: 24,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: theme.gold,
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
              background: theme.gold,
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
            color: theme.ink,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 10px 100px ${theme.goldFaint}`,
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
              color: theme.goldStrong,
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
              color: theme.inkSoft,
              maxWidth: 1300,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <KineticText text={caption} delay={captionDelay} staggerFrames={1.6} />
          </div>
        ) : null}
      </div>
    </SceneFrame>
  );
};
