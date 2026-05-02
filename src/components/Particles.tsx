import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * Drifting particles — dust motes catching low-angle light.
 *
 * Pure SVG. Each particle has a deterministic seed, a slow vertical
 * drift, a horizontal sway, and a depth that controls size + opacity +
 * speed. The cumulative effect is atmospheric depth, not animation
 * for-its-own-sake.
 *
 * Tuned to be visible-but-not-distracting on all three surfaces.
 */
type Props = {
  count?: number;
  /** Particle colour at full alpha. */
  colour?: string;
  /** Multiplier on opacity for the surface. Cream needs less. */
  intensity?: number;
};

export const Particles: React.FC<Props> = ({
  count = 38,
  colour = '#C6A664',
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Seeded pseudo-random so the layout is stable across renders.
  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed = (i + 1) * 9301 + 49297;
      const r = (n: number) => {
        const x = Math.sin(seed * (n + 1)) * 10000;
        return x - Math.floor(x);
      };
      return {
        baseX: r(1) * 1.2 - 0.1,        // -0.1 .. 1.1 (some off-screen)
        baseY: r(2),                     // 0 .. 1
        depth: r(3),                     // 0 = far, 1 = close
        swayAmp: 24 + r(4) * 60,
        swayPeriod: 6 + r(5) * 10,       // seconds
        driftRate: 0.04 + r(6) * 0.08,   // % of height per second
        twinkleOffset: r(7) * Math.PI * 2,
      };
    });
  }, [count]);

  const tSec = frame / fps;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {particles.map((p, i) => {
          const sway = Math.sin((tSec / p.swayPeriod + i) * Math.PI * 2) * p.swayAmp;
          const drift = (tSec * p.driftRate) % 1.2;
          const x = (p.baseX + 0) * width + sway;
          const y = ((p.baseY + drift) % 1.1 - 0.05) * height;
          const r = 0.6 + p.depth * 2.4;
          const alpha = (0.18 + p.depth * 0.6) * intensity;
          const twinkle =
            0.7 + 0.3 * Math.sin(tSec * 1.4 + p.twinkleOffset);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill={colour}
              opacity={alpha * twinkle}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
