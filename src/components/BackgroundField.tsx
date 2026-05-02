import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

/**
 * Slow, drifting gradient + vignette + film grain feel.
 * Continuous across the whole timeline so cuts feel cinematic instead of slidey.
 */
export const BackgroundField: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / Math.max(1, durationInFrames);
  const angle = 200 + t * 40;
  const x = 50 + Math.sin(t * Math.PI * 2) * 8;
  const y = 50 + Math.cos(t * Math.PI * 2) * 6;

  return (
    <>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${x}% ${y}%, ${theme.bgGradientA} 0%, ${theme.bgGradientB} 60%, ${theme.bg} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(${angle}deg, rgba(124,196,255,0.06), rgba(244,194,122,0.04))`,
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 360px 80px rgba(0,0,0,0.65)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};
