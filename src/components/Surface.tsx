import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { FilmGrain } from './FilmGrain';
import { Particles } from './Particles';

export type SurfaceKind = 'forest' | 'cream' | 'footage';

/**
 * Per-scene surface treatment.
 *
 * Forest: deep `#0E2A1C` with a slow radial well drift, gold wash, and
 *         a darker vignette. Used for the bookend scenes.
 * Cream:  `#FAF8F3` paper with a soft warm shadow, a faint vertical
 *         gradient, and grain pitched warm. Used for the body.
 * Footage: transparent — the FootageScene supplies the visual; this
 *         layer only adds the unified film grain so the type-led and
 *         footage-led scenes share a finish.
 *
 * Each surface gets the same FilmGrain layer on top, calibrated to
 * intensity. Cuts between surfaces are choreographed by ChapterCut —
 * the surface itself never flashes.
 */
type Props = {
  kind: SurfaceKind;
  children?: React.ReactNode;
};

export const Surface: React.FC<Props> = ({ kind, children }) => {
  if (kind === 'forest') return <ForestSurface>{children}</ForestSurface>;
  if (kind === 'cream') return <CreamSurface>{children}</CreamSurface>;
  return <FootageSurface>{children}</FootageSurface>;
};

const ForestSurface: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / Math.max(1, durationInFrames);
  const x = 50 + Math.sin(t * Math.PI * 2) * 9;
  const y = 50 + Math.cos(t * Math.PI * 2 * 0.7) * 6;
  const angle = 200 + t * 30;
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: theme.forestBg }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${x}% ${y}%, rgba(20, 60, 38, 0.55) 0%, ${theme.forestBg} 55%, ${theme.forestBgLow} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(${angle}deg, ${theme.goldFaint}, rgba(0,0,0,0))`,
          mixBlendMode: 'screen',
          opacity: 0.55,
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 460px 110px rgba(0,0,0,0.78)',
          pointerEvents: 'none',
        }}
      />
      <Particles count={42} colour="#D9BB78" intensity={0.9} />
      <FilmGrain opacity={0.08} />
      {children}
    </>
  );
};

const CreamSurface: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / Math.max(1, durationInFrames);
  const x = 50 + Math.sin(t * Math.PI * 2) * 5;
  const y = 50 + Math.cos(t * Math.PI * 2 * 0.65) * 4;
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: theme.creamBg }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${x}% ${y}%, rgba(255, 252, 240, 0.95) 0%, ${theme.creamBg} 55%, ${theme.creamBgLow} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(255,252,240,0) 0%, rgba(140,117,68,0.06) 100%)',
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 260px 70px rgba(140,117,68,0.14)',
          pointerEvents: 'none',
        }}
      />
      {/* Subtle paper texture: a tile of warm noise via SVG turbulence. */}
      <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.18 }}>
        <svg width="100%" height="100%">
          <filter id="paper-tex">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={3} />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.55  0 0 0 0 0.46  0 0 0 0 0.27  0 0 0 0.55 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#paper-tex)" />
        </svg>
      </AbsoluteFill>
      <Particles count={26} colour="#A88643" intensity={0.45} />
      <FilmGrain opacity={0.06} />
      {children}
    </>
  );
};

const FootageSurface: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: theme.forestBgLow }} />
      {children}
      <Particles count={20} colour="#FAF8F3" intensity={0.4} />
      <FilmGrain opacity={0.07} />
    </>
  );
};
