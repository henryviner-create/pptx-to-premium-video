import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

type Props = {
  text: string;
  delay?: number;
  staggerFrames?: number;
  style?: React.CSSProperties;
  splitBy?: 'word' | 'char';
};

/**
 * Word/character level entrance: each unit fades up with a small spring,
 * staggered to feel hand-tuned.
 */
export const KineticText: React.FC<Props> = ({
  text,
  delay = 0,
  staggerFrames = 2.2,
  style,
  splitBy = 'word',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!text) return null;
  const units = splitBy === 'word' ? text.split(/(\s+)/) : Array.from(text);

  return (
    <span style={{ display: 'inline-block', ...style }}>
      {units.map((u, i) => {
        if (/^\s+$/.test(u)) return <span key={i}>{u}</span>;
        const local = frame - delay - i * staggerFrames;
        const s = spring({ frame: local, fps, config: { damping: 18, stiffness: 120, mass: 0.6 } });
        const opacity = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
        const ty = interpolate(s, [0, 1], [22, 0], { extrapolateRight: 'clamp' });
        const blur = interpolate(s, [0, 1], [10, 0], { extrapolateRight: 'clamp' });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform: `translateY(${ty}px)`,
              filter: `blur(${blur}px)`,
              willChange: 'transform, opacity, filter',
            }}
          >
            {u}
          </span>
        );
      })}
    </span>
  );
};
