import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

type Props = {
  value: number;
  display?: string; // e.g. "127%" or "$1.2B"
  durationInFrames?: number;
  delay?: number;
  style?: React.CSSProperties;
};

/**
 * Animates a number from 0 to value with an ease-out cubic. If a display
 * string is provided, we preserve its prefix/suffix and substitute the
 * numeric portion as it counts up.
 */
export const AnimatedNumber: React.FC<Props> = ({
  value,
  display,
  durationInFrames,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = durationInFrames ?? Math.round(fps * 1.6);
  const t = Math.max(0, Math.min(1, (frame - delay) / dur));
  const eased = 1 - Math.pow(1 - t, 3);
  const current = value * eased;

  const formatted = formatCurrent(current, value, display);
  const opacity = interpolate(frame - delay, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ty = interpolate(frame - delay, [0, 12], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <span
      style={{
        display: 'inline-block',
        fontVariantNumeric: 'tabular-nums',
        opacity,
        transform: `translateY(${ty}px)`,
        ...style,
      }}
    >
      {formatted}
    </span>
  );
};

function formatCurrent(current: number, target: number, display?: string): string {
  if (!display) return formatNumber(current, target);
  // Match either ASCII hyphen-minus or Unicode minus (U+2212) before the digit.
  const match = display.match(/([-−]?\d[\d,]*(?:\.\d+)?)/);
  if (!match) return display;
  const numericStr = match[1];
  // Preserve the sign character the designer chose (Unicode minus reads
  // typographically tighter at hero sizes).
  const useUnicodeMinus = display.includes('−');
  const decimals = (numericStr.split('.')[1] ?? '').length;
  const magnitude = Math.abs(current).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = current < 0 ? (useUnicodeMinus ? '−' : '-') : '';
  return display.replace(numericStr, `${sign}${magnitude}`);
}

function formatNumber(current: number, target: number): string {
  const decimals = Number.isInteger(target) ? 0 : 1;
  return current.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
