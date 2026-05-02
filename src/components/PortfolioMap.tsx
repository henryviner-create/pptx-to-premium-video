import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

/**
 * Stylised geographic map for the portfolio scene.
 *
 * Not a literal cartographic projection — that would read as
 * infographic. Instead, an abstract longitude/latitude field with a
 * faint equator line and two coordinate markers (Shabunda, Gabon).
 * Markers ripple outward as they reveal; a thin gold line connects
 * them once both are present.
 *
 * Coordinates sit on a normalised plane: X = longitude, Y = latitude.
 * Africa-relevant range: lon −20° → +50°, lat −15° → +20°.
 */
type MapPoint = {
  /** Display name. */
  name: string;
  /** Decimal longitude (positive east). */
  lonDeg: number;
  /** Decimal latitude (positive north). */
  latDeg: number;
  /** Seconds (within scene) at which this point reveals. */
  revealSec: number;
};

type Props = {
  points: MapPoint[];
  surface: 'forest' | 'cream' | 'footage';
};

const W = 900;
const H = 540;
const LON_MIN = -20;
const LON_MAX = 50;
const LAT_MIN = -15;
const LAT_MAX = 20;
const MARGIN = 60;

export const PortfolioMap: React.FC<Props> = ({ points, surface }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inkAxis =
    surface === 'cream' ? 'rgba(26,24,19,0.32)' : 'rgba(243,238,226,0.36)';
  const equatorInk =
    surface === 'cream' ? 'rgba(168,134,67,0.55)' : 'rgba(217,184,120,0.55)';
  const goldInk = surface === 'cream' ? '#A88643' : theme.goldStrong;
  const labelInk =
    surface === 'cream' ? 'rgba(26,24,19,0.78)' : 'rgba(243,238,226,0.85)';

  const xFor = (lon: number) =>
    MARGIN + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (W - 2 * MARGIN);
  const yFor = (lat: number) =>
    MARGIN + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - 2 * MARGIN);

  // Faint graticule: a few longitude/latitude reference lines.
  const lonGrid = [-10, 0, 10, 20, 30, 40];
  const latGrid = [-10, 0, 10];

  // Equator emphasis at lat = 0.
  const equatorY = yFor(0);

  // Connecting line between two points draws after both are revealed.
  const lineDrawStart = points.length >= 2 ? points[1]!.revealSec + 0.6 : Infinity;
  const lineProgress = interpolate(
    frame - lineDrawStart * fps,
    [0, fps * 0.9],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Latitude graticule */}
      {latGrid.map((lat) => (
        <line
          key={`lat-${lat}`}
          x1={MARGIN}
          x2={W - MARGIN}
          y1={yFor(lat)}
          y2={yFor(lat)}
          stroke={inkAxis}
          strokeWidth={lat === 0 ? 1.2 : 0.5}
          strokeDasharray={lat === 0 ? '0' : '2 8'}
        />
      ))}
      {/* Longitude graticule */}
      {lonGrid.map((lon) => (
        <line
          key={`lon-${lon}`}
          x1={xFor(lon)}
          x2={xFor(lon)}
          y1={MARGIN}
          y2={H - MARGIN}
          stroke={inkAxis}
          strokeWidth={0.4}
          strokeDasharray="2 8"
        />
      ))}

      {/* Equator label */}
      <text
        x={W - MARGIN}
        y={equatorY - 8}
        textAnchor="end"
        fontFamily={theme.fontMono}
        fontSize={14}
        letterSpacing={4}
        fill={equatorInk}
      >
        EQUATOR
      </text>

      {/* Connecting line between markers */}
      {points.length >= 2 ? (() => {
        const a = points[0]!;
        const b = points[1]!;
        const x1 = xFor(a.lonDeg);
        const y1 = yFor(a.latDeg);
        const x2 = xFor(b.lonDeg);
        const y2 = yFor(b.latDeg);
        const cx = x1 + (x2 - x1) * lineProgress;
        const cy = y1 + (y2 - y1) * lineProgress;
        return (
          <line
            x1={x1}
            y1={y1}
            x2={cx}
            y2={cy}
            stroke={goldInk}
            strokeWidth={1.4}
            strokeDasharray="6 8"
            opacity={0.9}
          />
        );
      })() : null}

      {/* Markers */}
      {points.map((p, i) => {
        const local = frame - p.revealSec * fps;
        const opacity = interpolate(local, [0, 12], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const ripple = interpolate(local, [0, 30], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const x = xFor(p.lonDeg);
        const y = yFor(p.latDeg);
        const labelOffsetX = 18;
        const labelOffsetY = 6;
        return (
          <g key={i} style={{ opacity }}>
            {/* ripple ring */}
            <circle
              cx={x}
              cy={y}
              r={6 + ripple * 28}
              fill="none"
              stroke={goldInk}
              strokeWidth={1}
              opacity={(1 - ripple) * 0.7}
            />
            {/* solid dot */}
            <circle cx={x} cy={y} r={5} fill={goldInk} />
            {/* label */}
            <g transform={`translate(${x + labelOffsetX}, ${y + labelOffsetY})`}>
              <text
                x={0}
                y={0}
                fontFamily={theme.fontDisplay}
                fontSize={26}
                fontWeight={500}
                fill={labelInk}
              >
                {p.name}
              </text>
              <text
                x={0}
                y={22}
                fontFamily={theme.fontMono}
                fontSize={13}
                letterSpacing={3}
                fill={equatorInk}
              >
                {formatCoord(p.latDeg, 'lat')}  ·  {formatCoord(p.lonDeg, 'lon')}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};

function formatCoord(value: number, kind: 'lat' | 'lon'): string {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = Math.round((abs - deg) * 60);
  const dir = kind === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${String(deg).padStart(2, '0')}° ${String(min).padStart(2, '0')}′ ${dir}`;
}
