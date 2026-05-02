import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BrandLogo } from '../components/BrandLogo';
import { SceneFrame } from '../components/SceneFrame';
import { theme, sizes } from '../theme';

type Props = {
  /** Three short lines at equal weight. */
  lines: string[];
  /** Optional location stamp under the logo, e.g. "Guernsey, Channel Islands". */
  location?: string;
};

/**
 * Closing beat. Logo lockup at the top, three editorial lines beneath,
 * a quiet horizontal rule between. Holds for the longest of any scene
 * so the audio fade lands clean.
 */
export const ClosingScene: React.FC<Props> = ({ lines, location }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineDelay = (i: number) =>
    Math.round(fps * 0.9) + i * Math.round(fps * 0.55);

  return (
    <SceneFrame>
      <div style={{ textAlign: 'center', color: theme.ink, maxWidth: 1500 }}>
        <BrandLogo
          variant="horizontal-white"
          width={520}
          delay={Math.round(fps * 0.2)}
          fadeFrames={Math.round(fps * 0.9)}
          maxOpacity={0.95}
          style={{ marginLeft: 'auto', marginRight: 'auto' }}
        />

        <div
          style={{
            margin: '64px auto 0',
            height: 2,
            width: interpolate(frame, [10, 50], [0, 220], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            background: theme.gold,
            borderRadius: 1,
          }}
        />

        <div
          style={{
            marginTop: 56,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {lines.map((line, i) => {
            const local = frame - lineDelay(i);
            const s = spring({
              frame: local,
              fps,
              config: { damping: 22, stiffness: 110, mass: 0.85 },
            });
            const opacity = interpolate(s, [0, 1], [0, 1], {
              extrapolateRight: 'clamp',
            });
            const ty = interpolate(s, [0, 1], [16, 0], { extrapolateRight: 'clamp' });
            return (
              <div
                key={i}
                style={{
                  fontFamily: theme.fontDisplay,
                  fontWeight: 500,
                  fontSize: 64,
                  lineHeight: 1.18,
                  letterSpacing: -1,
                  color: theme.ink,
                  opacity,
                  transform: `translateY(${ty}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        {location ? (
          <div
            style={{
              marginTop: 64,
              fontFamily: theme.fontMono,
              fontSize: sizes.eyebrow,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: theme.inkFaint,
            }}
          >
            {location}
          </div>
        ) : null}
      </div>
    </SceneFrame>
  );
};
