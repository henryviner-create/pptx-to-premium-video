import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SceneShell, type FootageRef } from '../components/SceneShell';
import { PortfolioMap } from '../components/PortfolioMap';
import { theme, sizes, inkFor } from '../theme';
import type { SurfaceKind } from '../components/Surface';

export type Region = {
  kicker: string;
  name: string;
  context: string;
  coordinates?: string;
  lonDeg: number;
  latDeg: number;
  metric: string;
  metricCaption: string;
  revealSec: number;
};

type Props = {
  surface: SurfaceKind;
  sceneFrames: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  regions: [Region, Region];
  footage?: FootageRef;
};

/**
 * Portfolio scene with a real geographic visualisation:
 *   - title + subtitle at top
 *   - PortfolioMap centred (graticule + equator + two animated markers
 *     + connecting line)
 *   - a metrics row beneath the map giving each region's headline figure
 */
export const PortfolioScene: React.FC<Props> = ({
  surface,
  sceneFrames,
  eyebrow,
  title,
  subtitle,
  regions,
  footage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(surface);

  const titleDelay = Math.round(fps * 0.1);
  const subtitleDelay = titleDelay + Math.round(fps * 0.5);

  return (
    <SceneShell surface={surface} sceneFrames={sceneFrames} footage={footage}>
      <div
        style={{
          width: '100%',
          maxWidth: 1700,
          color: ink.ink,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {eyebrow ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: sizes.eyebrow,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: ink.gold,
              marginBottom: 20,
            }}
          >
            <KineticText text={eyebrow} />
          </div>
        ) : null}

        <h2
          style={{
            fontFamily: theme.fontDisplay,
            fontWeight: 600,
            fontSize: 88,
            lineHeight: 1.04,
            letterSpacing: -1.8,
            margin: 0,
            textAlign: 'center',
          }}
        >
          <KineticText text={title} delay={titleDelay} staggerFrames={2.2} />
        </h2>

        {subtitle ? (
          <div
            style={{
              marginTop: 18,
              fontFamily: theme.fontDisplay,
              fontWeight: 300,
              fontSize: 30,
              color: ink.inkSoft,
              maxWidth: 1300,
              textAlign: 'center',
            }}
          >
            <KineticText text={subtitle} delay={subtitleDelay} staggerFrames={1.6} />
          </div>
        ) : null}

        <div style={{ marginTop: 32 }}>
          <PortfolioMap
            surface={surface}
            points={regions.map((r) => ({
              name: r.name,
              lonDeg: r.lonDeg,
              latDeg: r.latDeg,
              revealSec: r.revealSec,
            }))}
          />
        </div>

        <div
          style={{
            marginTop: 28,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 96,
            width: '100%',
            maxWidth: 1400,
          }}
        >
          {regions.map((r, i) => (
            <RegionCard key={i} region={r} ink={ink} fps={fps} now={frame} />
          ))}
        </div>
      </div>
    </SceneShell>
  );
};

const RegionCard: React.FC<{
  region: Region;
  ink: ReturnType<typeof inkFor>;
  fps: number;
  now: number;
}> = ({ region, ink, fps, now }) => {
  const local = now - region.revealSec * fps;
  const s = spring({
    frame: local,
    fps,
    config: { damping: 22, stiffness: 100, mass: 0.85 },
  });
  const opacity = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
  const ty = interpolate(s, [0, 1], [16, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{ opacity, transform: `translateY(${ty}px)` }}>
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: 18,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: ink.gold,
          marginBottom: 14,
        }}
      >
        {region.kicker}
      </div>
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontWeight: 600,
          fontSize: 72,
          lineHeight: 0.96,
          letterSpacing: -1.6,
          color: ink.ink,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {region.metric}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: theme.fontDisplay,
          fontSize: 22,
          color: ink.inkSoft,
        }}
      >
        {region.metricCaption}
      </div>
    </div>
  );
};
