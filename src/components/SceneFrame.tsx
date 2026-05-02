import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * Wraps every scene with a slow zoom + fade-in/out so adjacent scenes
 * dissolve into each other instead of cutting hard.
 */
export const SceneFrame: React.FC<{ children: React.ReactNode; padding?: number }> = ({
  children,
  padding = 140,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = Math.min(18, Math.round(durationInFrames * 0.22));
  const fadeOut = Math.min(18, Math.round(durationInFrames * 0.22));

  const opacity = interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const scale = interpolate(frame, [0, durationInFrames], [1.015, 1.045]);
  const ty = interpolate(frame, [0, durationInFrames], [0, -10]);

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${ty}px) scale(${scale})`,
        transformOrigin: 'center',
        padding,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
