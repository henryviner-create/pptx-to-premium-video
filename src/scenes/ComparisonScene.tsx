import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SceneShell, type FootageRef } from '../components/SceneShell';
import { theme, sizes, inkFor } from '../theme';
import type { SurfaceKind } from '../components/Surface';

export type ComparisonColumn = {
  kicker: string;
  label: string;
  items: string[];
  tone: 'muted' | 'accent';
};

type Props = {
  surface: SurfaceKind;
  sceneFrames: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  left: ComparisonColumn;
  right: ComparisonColumn;
  footage?: FootageRef;
};

export const ComparisonScene: React.FC<Props> = ({
  surface,
  sceneFrames,
  eyebrow,
  title,
  subtitle,
  left,
  right,
  footage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(surface);

  const titleDelay = Math.round(fps * 0.2);
  const subtitleDelay = titleDelay + Math.round(fps * 0.55);
  const colDelay = subtitleDelay + Math.round(fps * 0.55);
  const itemStride = Math.round(fps * 0.3);

  return (
    <SceneShell surface={surface} sceneFrames={sceneFrames} footage={footage}>
      <div style={{ width: '100%', maxWidth: 1700, color: ink.ink }}>
        {eyebrow ? (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: sizes.eyebrow,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: ink.gold,
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
              color: ink.inkSoft,
              maxWidth: 1300,
            }}
          >
            <KineticText text={subtitle} delay={subtitleDelay} staggerFrames={1.6} />
          </div>
        ) : null}

        <div
          style={{
            marginTop: 80,
            display: 'grid',
            gridTemplateColumns: '1fr 80px 1fr',
            alignItems: 'start',
            gap: 0,
          }}
        >
          <Column
            col={left}
            startFrame={colDelay}
            itemStride={itemStride}
            now={frame}
            fps={fps}
            ink={ink}
          />
          <div
            style={{
              alignSelf: 'stretch',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: interpolate(frame - colDelay, [0, 30], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <span
              style={{
                fontFamily: theme.fontMono,
                fontSize: 28,
                color: ink.gold,
              }}
            >
              →
            </span>
          </div>
          <Column
            col={right}
            startFrame={colDelay + Math.round(fps * 0.45)}
            itemStride={itemStride}
            now={frame}
            fps={fps}
            ink={ink}
          />
        </div>
      </div>
    </SceneShell>
  );
};

const Column: React.FC<{
  col: ComparisonColumn;
  startFrame: number;
  itemStride: number;
  now: number;
  fps: number;
  ink: ReturnType<typeof inkFor>;
}> = ({ col, startFrame, itemStride, now, fps, ink }) => {
  const headerLocal = now - startFrame;
  const headerSpring = spring({
    frame: headerLocal,
    fps,
    config: { damping: 22, stiffness: 110, mass: 0.8 },
  });
  const opacity = interpolate(headerSpring, [0, 1], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const ty = interpolate(headerSpring, [0, 1], [22, 0], { extrapolateRight: 'clamp' });
  const labelColor = col.tone === 'accent' ? ink.ink : ink.inkSoft;
  const kickerColor = col.tone === 'accent' ? ink.gold : ink.inkFaint;

  return (
    <div style={{ opacity, transform: `translateY(${ty}px)` }}>
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: 22,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: kickerColor,
          marginBottom: 24,
        }}
      >
        {col.kicker}
      </div>
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontWeight: 600,
          fontSize: 60,
          lineHeight: 1.08,
          letterSpacing: -1.4,
          color: labelColor,
          marginBottom: 32,
        }}
      >
        {col.label}
      </div>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {col.items.map((item, i) => {
          const local = now - (startFrame + Math.round(fps * 0.5) + i * itemStride);
          const s = spring({
            frame: local,
            fps,
            config: { damping: 24, stiffness: 100, mass: 0.7 },
          });
          const op = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
          const tx = interpolate(s, [0, 1], [-18, 0], { extrapolateRight: 'clamp' });
          return (
            <li
              key={i}
              style={{
                opacity: op,
                transform: `translateX(${tx}px)`,
                fontFamily: theme.fontDisplay,
                fontWeight: 400,
                fontSize: 28,
                lineHeight: 1.4,
                color: col.tone === 'accent' ? ink.ink : ink.inkSoft,
                paddingLeft: 28,
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '0.45em',
                  width: 12,
                  height: 2,
                  background: col.tone === 'accent' ? ink.gold : ink.inkFaint,
                }}
              />
              {item}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
