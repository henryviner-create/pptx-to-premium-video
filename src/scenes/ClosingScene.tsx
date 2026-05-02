import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BrandLogo } from '../components/BrandLogo';
import { SceneShell, type FootageRef } from '../components/SceneShell';
import { theme, sizes, inkFor } from '../theme';
import type { SurfaceKind } from '../components/Surface';

type Props = {
  surface: SurfaceKind;
  sceneFrames: number;
  lines: string[];
  location?: string;
  footage?: FootageRef;
};

export const ClosingScene: React.FC<Props> = ({
  surface,
  sceneFrames,
  lines,
  location,
  footage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(surface);
  const logoVariant = surface === 'cream' ? 'horizontal-gold' : 'horizontal-white';

  const lineDelay = (i: number) =>
    Math.round(fps * 0.9) + i * Math.round(fps * 0.55);

  return (
    <SceneShell surface={surface} sceneFrames={sceneFrames} footage={footage}>
      <div style={{ width: '100%', textAlign: 'center', color: ink.ink, maxWidth: 1500 }}>
        <BrandLogo
          variant={logoVariant}
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
            background: ink.gold,
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
                  color: ink.ink,
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
              color: ink.inkFaint,
            }}
          >
            {location}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};
