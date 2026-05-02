import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme, sizes } from '../theme';

export type Region = {
  /** "FLAGSHIP · ACTIVE" / "PIPELINE · FORWARD" — the status kicker. */
  kicker: string;
  /** Place name in display weight, e.g. "Shabunda" or "Gabon". */
  name: string;
  /** Country / system descriptor. */
  context: string;
  /** Coordinates as a single string, e.g. "02° S · 27° E". */
  coordinates?: string;
  /** Headline metric for the region. */
  metric: string;
  /** Sub-metric, e.g. "credits · immediate" or "credits · forward". */
  metricCaption: string;
};

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  regions: [Region, Region];
};

/**
 * Two-region portfolio layout. Used for the Shabunda + Gabon scene. Each
 * region animates in with a confident spring; the gold rule between the
 * two columns travels in vertically as a divider.
 */
export const PortfolioScene: React.FC<Props> = ({
  eyebrow,
  title,
  subtitle,
  regions,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleDelay = Math.round(fps * 0.2);
  const subtitleDelay = titleDelay + Math.round(fps * 0.6);
  const firstRegionDelay = subtitleDelay + Math.round(fps * 0.6);
  const dividerProgress = interpolate(
    frame - firstRegionDelay,
    [0, 24],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <SceneFrame>
      <div style={{ width: '100%', maxWidth: 1700, color: theme.ink }}>
        {eyebrow ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: sizes.eyebrow,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: theme.gold,
              marginBottom: 28,
            }}
          >
            <KineticText text={eyebrow} />
          </div>
        ) : null}

        <h2
          style={{
            fontFamily: theme.fontDisplay,
            fontWeight: 600,
            fontSize: sizes.title,
            lineHeight: 1.06,
            letterSpacing: -2,
            margin: 0,
          }}
        >
          <KineticText text={title} delay={titleDelay} staggerFrames={2.2} />
        </h2>

        {subtitle ? (
          <div
            style={{
              marginTop: 24,
              fontFamily: theme.fontDisplay,
              fontWeight: 300,
              fontSize: sizes.subtitle,
              color: theme.inkSoft,
              maxWidth: 1300,
            }}
          >
            <KineticText text={subtitle} delay={subtitleDelay} staggerFrames={1.6} />
          </div>
        ) : null}

        <div
          style={{
            marginTop: 96,
            display: 'grid',
            gridTemplateColumns: '1fr 2px 1fr',
            gap: 64,
            alignItems: 'start',
          }}
        >
          <RegionBlock region={regions[0]} delay={firstRegionDelay} now={frame} fps={fps} />
          <span
            style={{
              alignSelf: 'stretch',
              background: theme.gold,
              opacity: 0.45,
              transform: `scaleY(${dividerProgress})`,
              transformOrigin: 'top',
              width: 2,
            }}
          />
          <RegionBlock
            region={regions[1]}
            delay={firstRegionDelay + Math.round(fps * 0.5)}
            now={frame}
            fps={fps}
          />
        </div>
      </div>
    </SceneFrame>
  );
};

const RegionBlock: React.FC<{
  region: Region;
  delay: number;
  now: number;
  fps: number;
}> = ({ region, delay, now, fps }) => {
  const local = now - delay;
  const s = spring({
    frame: local,
    fps,
    config: { damping: 22, stiffness: 100, mass: 0.85 },
  });
  const opacity = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
  const ty = interpolate(s, [0, 1], [22, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{ opacity, transform: `translateY(${ty}px)` }}>
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: 20,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: theme.gold,
          marginBottom: 24,
        }}
      >
        {region.kicker}
      </div>
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontWeight: 600,
          fontSize: 96,
          lineHeight: 1.0,
          letterSpacing: -2.6,
          color: theme.ink,
        }}
      >
        {region.name}.
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: theme.fontDisplay,
          fontWeight: 300,
          fontSize: 30,
          color: theme.inkSoft,
        }}
      >
        {region.context}
      </div>
      {region.coordinates ? (
        <div
          style={{
            marginTop: 12,
            fontFamily: theme.fontMono,
            fontSize: 22,
            letterSpacing: 4,
            color: theme.inkFaint,
          }}
        >
          {region.coordinates}
        </div>
      ) : null}
      <div style={{ marginTop: 56 }}>
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontWeight: 600,
            fontSize: 88,
            lineHeight: 0.95,
            letterSpacing: -2,
            color: theme.ink,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 6px 60px ${theme.goldFaint}`,
          }}
        >
          {region.metric}
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: theme.fontDisplay,
            fontSize: 24,
            color: theme.inkSoft,
          }}
        >
          {region.metricCaption}
        </div>
      </div>
    </div>
  );
};
