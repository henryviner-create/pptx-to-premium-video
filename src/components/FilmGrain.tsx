import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

/**
 * Subtle film-grain layer.
 *
 * Pure CSS noise driven by an SVG turbulence filter, animated per frame
 * so the grain shimmers organically without ever calling attention to
 * itself. Sits over every surface so cuts feel like film, not slides.
 */
type Props = {
  opacity?: number;
  /** Grain seed offset; used internally to drift it per frame. */
  speed?: number;
};

export const FilmGrain: React.FC<Props> = ({ opacity = 0.08, speed = 0.35 }) => {
  const frame = useCurrentFrame();
  const seed = (frame * speed) % 360;
  const turbId = 'grain-turb';

  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <filter id={turbId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.4"
            numOctaves={2}
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.96  0 0 0 0 0.92  0 0 0 0 0.82  0 0 0 0.55 0"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${turbId})`} />
      </svg>
    </AbsoluteFill>
  );
};
