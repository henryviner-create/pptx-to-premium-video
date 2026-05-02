import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

/**
 * Net ecosystem exchange — verified summary statistic over 2001–2023.
 *
 * IMPORTANT: this chart is intentionally minimal. The only data points
 * we have from the narration are:
 *   - Mean annual NEE: −16.3 tCO₂ ha⁻¹ yr⁻¹
 *   - Period: 2001–2023
 *   - Sign convention: negative = net removal
 *
 * We have no public per-year or per-quarter values. So we render ONLY
 * what is verifiable: the zero reference line, the mean line at −16.3
 * across the period, and a subtle fill between them that visualises
 * "below zero = net removal." Nothing is invented.
 *
 * Animation:
 *   - Y/X axes fade in.
 *   - The mean line draws in left→right over ~1.6s.
 *   - The "−16.3 mean annual" label fades in once the line is complete.
 *   - The fill region (zero → mean) wipes in beneath the line.
 */
type Props = {
  /** Frame at which the chart begins drawing. */
  startFrame: number;
  totalFrames: number;
  surface: 'forest' | 'cream' | 'footage';
};

const X_START_YEAR = 2001;
const X_END_YEAR = 2023;
const Y_MIN = -25;
const Y_MAX = 5;
const W = 1200;
const H = 320;
const PAD_L = 90;
const PAD_R = 32;
const PAD_T = 24;
const PAD_B = 56;
const MEAN_VALUE = -16.3;

export const FluxChart: React.FC<Props> = ({ startFrame, surface }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startFrame;

  const inkAxis =
    surface === 'cream' ? 'rgba(26,24,19,0.4)' : 'rgba(243,238,226,0.45)';
  const inkLabel =
    surface === 'cream' ? 'rgba(26,24,19,0.55)' : 'rgba(243,238,226,0.62)';
  const goldStrong = surface === 'cream' ? '#A88643' : theme.goldStrong;
  const fillBelow = 'rgba(198,166,100,0.16)';

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const xFor = (year: number) =>
    PAD_L + ((year - X_START_YEAR) / (X_END_YEAR - X_START_YEAR)) * innerW;
  const yFor = (val: number) =>
    PAD_T + ((Y_MAX - val) / (Y_MAX - Y_MIN)) * innerH;

  // Animation timing.
  const axesIn = interpolate(local, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lineDrawStart = Math.round(fps * 0.3);
  const lineDrawDur = Math.round(fps * 1.6);
  const lineProgress = interpolate(
    local,
    [lineDrawStart, lineDrawStart + lineDrawDur],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const labelStart = lineDrawStart + lineDrawDur + Math.round(fps * 0.2);
  const labelOpacity = interpolate(
    local,
    [labelStart, labelStart + 18],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const fillOpacity = interpolate(
    local,
    [lineDrawStart + lineDrawDur, lineDrawStart + lineDrawDur + 24],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Line geometry.
  const xLeft = xFor(X_START_YEAR);
  const xRight = xFor(X_END_YEAR);
  const yMean = yFor(MEAN_VALUE);
  const yZero = yFor(0);
  const xCursor = xLeft + (xRight - xLeft) * lineProgress;

  const yearTicks = [2001, 2007, 2013, 2019, 2023];
  const yTicks = [-20, -10, 0];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Axes (fade in first) */}
      <g style={{ opacity: axesIn }}>
        {/* Y-axis labels and grid */}
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
                strokeWidth={isZero ? 1.4 : 0.6}
                strokeDasharray={isZero ? '0' : '3 8'}
              />
              <text
                x={PAD_L - 16}
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

        {/* Y-axis title */}
        <text
          x={PAD_L - 70}
          y={PAD_T + 14}
          fontFamily={theme.fontMono}
          fontSize={14}
          letterSpacing={3}
          fill={inkLabel}
        >
          tCO₂ ha⁻¹ yr⁻¹
        </text>
      </g>

      {/* Fill: zero → mean line, masked by line progress */}
      {fillOpacity > 0 ? (
        <rect
          x={xLeft}
          y={Math.min(yZero, yMean)}
          width={xRight - xLeft}
          height={Math.abs(yMean - yZero)}
          fill={fillBelow}
          opacity={fillOpacity}
        />
      ) : null}

      {/* Mean line at -16.3, drawing in left→right */}
      <line
        x1={xLeft}
        x2={xCursor}
        y1={yMean}
        y2={yMean}
        stroke={goldStrong}
        strokeWidth={2.2}
        strokeLinecap="round"
      />

      {/* Mean label at right end */}
      <g style={{ opacity: labelOpacity }}>
        <line
          x1={xRight - 6}
          x2={xRight - 6}
          y1={yMean - 4}
          y2={yMean + 4}
          stroke={goldStrong}
          strokeWidth={1.4}
        />
        <text
          x={xRight + 6}
          y={yMean + 5}
          fontFamily={theme.fontMono}
          fontSize={16}
          letterSpacing={3}
          fill={goldStrong}
        >
          MEAN  ·  −16.3
        </text>
      </g>

      {/* Period bracket beneath x-axis */}
      <g style={{ opacity: axesIn * 0.85 }}>
        <line
          x1={xLeft}
          x2={xRight}
          y1={H - PAD_B + 40}
          y2={H - PAD_B + 40}
          stroke={inkAxis}
          strokeWidth={0.6}
        />
        <text
          x={(xLeft + xRight) / 2}
          y={H - PAD_B + 56}
          textAnchor="middle"
          fontFamily={theme.fontMono}
          fontSize={13}
          letterSpacing={6}
          fill={inkLabel}
        >
          MEASURED COMPOSITE PERIOD
        </text>
      </g>
    </svg>
  );
};
