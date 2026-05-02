import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

/**
 * Continuous background that drifts across the entire timeline.
 *
 * Three stacked layers:
 *   1. A radial well that breathes from one corner to the other.
 *   2. A faint gold wash that crosses the frame, heightening cuts without
 *      ever reading as a transition itself.
 *   3. An inner-shadow vignette that pulls focus to the type.
 *
 * Cuts must never feel like PowerPoint transitions — keeping this layer
 * unbroken across scenes is the cheapest way to enforce that.
 */
export const BackgroundField: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / Math.max(1, durationInFrames);

  // Slow, parallaxed drift.
  const x = 50 + Math.sin(t * Math.PI * 2) * 9;
  const y = 50 + Math.cos(t * Math.PI * 2 * 0.7) * 6;
  const angle = 200 + t * 30;

  return (
    <>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${x}% ${y}%, ${theme.bgGradientA} 0%, ${theme.bgGradientB} 62%, ${theme.bg} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(${angle}deg, ${theme.goldFaint}, rgba(0,0,0,0))`,
          mixBlendMode: 'screen',
          opacity: 0.7,
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 360px 80px rgba(0,0,0,0.7)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};
