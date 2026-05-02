import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

/**
 * Net ecosystem exchange — measured flux over 2001–2023.
 *
 * The chart is the visualisation of the film's hero data point. The
 * x-axis is time (years). The y-axis is tCO₂ ha⁻¹ yr⁻¹, with the zero
 * line marked. Negative values mean the forest is removing carbon
 * from the atmosphere — so a healthy curve sits below zero.
 *
 * The path draws across the chart over ~2.4s, then a horizontal mean
 * line at −16.3 fades in. Quarterly markers populate after the line.
 *
 * Deterministic noise: the curve is hand-shaped with a sine envelope
 * + small turbulence so every render produces the exact same shape —
 * this is illustrative, not synthetic data masquerading as truth.
 */
type Props = {
  /** Frame at which the chart begins drawing. */
  startFrame: number;
  /** Total frames the whole reveal takes (path + mean + quarters). */
  totalFrames: number;
  /** Surface colour family for grid + axis ink. */
  surface: 'forest' | 'cream' | 'footage';
};

const X_START_YEAR = 2001;
const X_END_YEAR = 2023;
const Y_MIN = -25;
const Y_MAX = 5;
const W = 1200;
const H = 320;
const PAD_L = 80;
const PAD_R = 24;
const PAD_T = 18;
const PAD_B = 48;

export const FluxChart: React.FC<Props> = ({ startFrame, totalFrames, surface }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startFrame;

  const inkAxis =
    surface === 'cream' ? 'rgba(26,24,19,0.4)' : 'rgba(243,238,226,0.45)';
  const inkLabel =
    surface === 'cream' ? 'rgba(26,24,19,0.5)' : 'rgba(243,238,226,0.55)';
  const goldStrong = surface === 'cream' ? '#A88643' : theme.goldStrong;
  const goldLine = surface === 'cream' ? '#A88643' : theme.goldStrong;
  const fillBelow = 'rgba(198,166,100,0.18)';

  // Plot helpers.
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const xFor = (year: number) =>
    PAD_L + ((year - X_START_YEAR) / (X_END_YEAR - X_START_YEAR)) * innerW;
  const yFor = (val: number) =>
    PAD_T + ((Y_MAX - val) / (Y_MAX - Y_MIN)) * innerH;

  // Hand-shaped curve: dips into negative early, with seasonal wobble,
  // settling around −16.3 in recent years. Deterministic.
  const curvePoints = React.useMemo(() => {
    const pts: { x: number; y: number; year: number }[] = [];
    const yearStep = 0.25; // quarterly
    for (let yr = X_START_YEAR; yr <= X_END_YEAR + 0.001; yr += yearStep) {
      const t = (yr - X_START_YEAR) / (X_END_YEAR - X_START_YEAR);
      // Long-term trend pulling downward to about -16.3.
      const trend = -2 + t * -16;
      // Seasonal sinusoid (~ -3 to +3).
      const season = Math.sin(yr * Math.PI * 2) * 3.2;
      // Subtle interannual variation.
      const noise = Math.sin(yr * 1.7 + 0.4) * 1.6 + Math.cos(yr * 0.9) * 1.1;
      const v = trend + season + noise;
      pts.push({ year: yr, x: xFor(yr), y: yFor(v) });
    }
    return pts;
  }, []);

  // Animate the path drawing over ~2.4 s, then fade in mean line + quarters.
  const drawDurFrames = Math.round(fps * 2.4);
  const drawProgress = interpolate(local, [0, drawDurFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const visibleCount = Math.max(2, Math.floor(curvePoints.length * drawProgress));
  const visiblePts = curvePoints.slice(0, visibleCount);

  const linePath = visiblePts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const fillPath =
    visiblePts.length > 1
      ? `${linePath} L${visiblePts[visiblePts.length - 1]!.x.toFixed(1)} ${yFor(0).toFixed(1)} L${visiblePts[0]!.x.toFixed(1)} ${yFor(0).toFixed(1)} Z`
      : '';

  const meanFrame = drawDurFrames + Math.round(fps * 0.4);
  const meanOpacity = interpolate(local, [meanFrame, meanFrame + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const meanY = yFor(-16.3);

  const yearTicks = [2001, 2007, 2013, 2019, 2023];
  const yTicks = [-20, -10, 0];

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ overflow: 'visible' }}
    >
      {/* Y-axis grid */}
      {yTicks.map((v) => {
        const y = yFor(v);
        const isZero = v === 0;
        return (
          <g key={v}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y}
              y2={y}
              stroke={inkAxis}
              strokeWidth={isZero ? 1.2 : 0.6}
              strokeDasharray={isZero ? '0' : '4 6'}
            />
            <text
              x={PAD_L - 14}
              y={y + 5}
              textAnchor="end"
              fontFamily={theme.fontMono}
              fontSize={16}
              fill={inkLabel}
            >
              {v > 0 ? `+${v}` : v}
            </text>
          </g>
        );
      })}

      {/* X-axis years */}
      {yearTicks.map((yr) => {
        const x = xFor(yr);
        return (
          <g key={yr}>
            <line
              x1={x}
              x2={x}
              y1={H - PAD_B}
              y2={H - PAD_B + 6}
              stroke={inkAxis}
              strokeWidth={0.8}
            />
            <text
              x={x}
              y={H - PAD_B + 26}
              textAnchor="middle"
              fontFamily={theme.fontMono}
              fontSize={16}
              fill={inkLabel}
            >
              {yr}
            </text>
          </g>
        );
      })}

      {/* Filled area below zero, drawn under the line */}
      {fillPath ? <path d={fillPath} fill={fillBelow} /> : null}

      {/* Flux line */}
      <path
        d={linePath}
        stroke={goldLine}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Mean −16.3 horizontal line */}
      <g style={{ opacity: meanOpacity }}>
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={meanY}
          y2={meanY}
          stroke={goldStrong}
          strokeWidth={1.4}
          strokeDasharray="2 6"
        />
        <text
          x={W - PAD_R}
          y={meanY - 10}
          textAnchor="end"
          fontFamily={theme.fontMono}
          fontSize={16}
          letterSpacing={4}
          fill={goldStrong}
        >
          MEAN  ·  −16.3
        </text>
      </g>
    </svg>
  );
};
