import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { BrandLogo } from '../components/BrandLogo';
import { SceneShell, type FootageRef } from '../components/SceneShell';
import { theme, sizes, inkFor } from '../theme';
import type { SurfaceKind } from '../components/Surface';

type LogoVariant =
  | 'horizontal-white'
  | 'horizontal-gold'
  | 'icon-gold'
  | 'icon-gold-white'
  | 'icon-gold-lightgrey';

type Props = {
  surface: SurfaceKind;
  sceneFrames: number;
  /** Plain-text eyebrow. Used if no logo eyebrow is requested. */
  eyebrow?: string;
  /** If set, render the TenTrinity Carbon logo as the eyebrow instead
   *  of plain text. */
  useLogoEyebrow?: LogoVariant;
  /** Mono uppercase label printed alongside the logo eyebrow. */
  eyebrowLabel?: string;
  lines: string[];
  closer?: string;
  footage?: FootageRef;
};

export const ManifestoScene: React.FC<Props> = ({
  surface,
  sceneFrames,
  eyebrow,
  useLogoEyebrow,
  eyebrowLabel,
  lines,
  closer,
  footage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(surface);

  const lineDelay = (i: number) =>
    Math.round(fps * 0.4) + i * Math.round(fps * 1.6);

  return (
    <SceneShell surface={surface} sceneFrames={sceneFrames} footage={footage}>
      <div style={{ maxWidth: 1500, color: ink.ink }}>
        {useLogoEyebrow ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              marginBottom: 88,
            }}
          >
            <BrandLogo
              variant={useLogoEyebrow}
              width={260}
              delay={Math.round(fps * 0.1)}
              fadeFrames={Math.round(fps * 0.7)}
              maxOpacity={1}
            />
            {eyebrowLabel ? (
              <>
                <span
                  style={{
                    width: 1,
                    height: 26,
                    background: ink.inkFaint,
                  }}
                />
                <span
                  style={{
                    fontFamily: theme.fontMono,
                    fontSize: sizes.eyebrow,
                    letterSpacing: 8,
                    textTransform: 'uppercase',
                    color: ink.gold,
                  }}
                >
                  {eyebrowLabel}
                </span>
              </>
            ) : null}
          </div>
        ) : eyebrow ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: sizes.eyebrow,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: ink.gold,
              marginBottom: 80,
            }}
          >
            <KineticText text={eyebrow} />
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {lines.map((line, i) => {
            const local = frame - lineDelay(i);
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
                    background: ink.gold,
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
                    color: ink.ink,
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
              color: ink.inkSoft,
              maxWidth: 1100,
            }}
          >
            <KineticText
              text={closer}
              delay={lineDelay(lines.length)}
              staggerFrames={1.6}
            />
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};
