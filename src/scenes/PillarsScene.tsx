import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SceneShell, type FootageRef } from '../components/SceneShell';
import { theme, sizes, inkFor } from '../theme';
import type { SurfaceKind } from '../components/Surface';

export type Pillar = {
  index?: string;
  label: string;
  body?: string;
  /** Seconds (within the scene) at which this pillar takes the full frame. */
  revealSec: number;
};

type Props = {
  surface: SurfaceKind;
  sceneFrames: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  items: Pillar[];
  /** Seconds at which the synthesis (all items stacked) begins. */
  finaleSec?: number;
  footage?: FootageRef;
};

/**
 * Pillars don't render as a numbered list — that reads as a slide.
 * Instead the scene plays as a sequence of full-frame beats, each
 * driven by the narration cue:
 *
 *   1. Title beat      0 → revealSec[0]
 *   2. Item beats      revealSec[i] → revealSec[i+1] (each item a hero)
 *   3. Synthesis beat  finaleSec → sceneEnd (all items collected)
 *
 * Beats cross-dissolve into each other. Between beats, the scene
 * carries a slight horizontal parallax so each beat feels like a
 * different camera position, not a static frame.
 */
export const PillarsScene: React.FC<Props> = ({
  surface,
  sceneFrames,
  eyebrow,
  title,
  subtitle,
  items,
  finaleSec,
  footage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(surface);

  const titleStart = 0;
  const titleEnd = items[0]?.revealSec ?? sceneFrames / fps;
  const finalSec = finaleSec ?? Math.max(titleEnd + 4, sceneFrames / fps - 2);
  const FADE = 14;

  // Per-beat frame windows.
  const beats = [
    { kind: 'title' as const, startSec: titleStart, endSec: titleEnd },
    ...items.map((item, i) => {
      const start = item.revealSec;
      const next = items[i + 1]?.revealSec ?? finalSec;
      return { kind: 'item' as const, startSec: start, endSec: next, item, index: i };
    }),
    { kind: 'finale' as const, startSec: finalSec, endSec: sceneFrames / fps },
  ];

  return (
    <SceneShell surface={surface} sceneFrames={sceneFrames} footage={footage}>
      {beats.map((beat, beatIdx) => {
        const startFrame = beat.startSec * fps;
        const endFrame = beat.endSec * fps;
        const opacity = interpolate(
          frame,
          [startFrame - FADE, startFrame, endFrame, endFrame + FADE],
          [0, 1, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        if (opacity < 0.001) return null;

        // Subtle camera-position offset per beat — every beat reads as
        // a different shot rather than a redraw of the same frame.
        const shotShift = (beatIdx % 2 === 0 ? -1 : 1) * 18;

        return (
          <AbsoluteFill
            key={beatIdx}
            style={{
              opacity,
              padding: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              transform: `translateX(${shotShift}px)`,
            }}
          >
            {beat.kind === 'title' ? (
              <TitleBeat
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                ink={ink}
                startFrame={startFrame}
                fps={fps}
                frame={frame}
              />
            ) : null}
            {beat.kind === 'item' ? (
              <ItemBeat
                item={beat.item}
                ink={ink}
                startFrame={startFrame}
                fps={fps}
                frame={frame}
              />
            ) : null}
            {beat.kind === 'finale' ? (
              <FinaleBeat
                title={title}
                items={items}
                ink={ink}
                startFrame={startFrame}
                fps={fps}
                frame={frame}
              />
            ) : null}
          </AbsoluteFill>
        );
      })}
    </SceneShell>
  );
};

const TitleBeat: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ink: ReturnType<typeof inkFor>;
  startFrame: number;
  fps: number;
  frame: number;
}> = ({ eyebrow, title, subtitle, ink, startFrame, fps, frame }) => {
  const local = frame - startFrame;
  const ruleW = interpolate(local, [16, 36], [0, 140], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: '100%', maxWidth: 1500, color: ink.ink }}>
      {eyebrow ? (
        <div
          style={{
            fontFamily: theme.fontMono,
            fontSize: sizes.eyebrow,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: ink.gold,
            marginBottom: 36,
          }}
        >
          <KineticText text={eyebrow} delay={Math.round(fps * 0.1)} />
        </div>
      ) : null}
      <h2
        style={{
          fontFamily: theme.fontDisplay,
          fontWeight: 600,
          fontSize: 152,
          lineHeight: 1.02,
          letterSpacing: -3,
          margin: 0,
          color: ink.ink,
        }}
      >
        <KineticText text={title} delay={Math.round(fps * 0.25)} staggerFrames={2.6} />
      </h2>
      {subtitle ? (
        <div
          style={{
            marginTop: 36,
            fontFamily: theme.fontDisplay,
            fontWeight: 300,
            fontSize: sizes.subtitle,
            color: ink.inkSoft,
            maxWidth: 1100,
          }}
        >
          <KineticText
            text={subtitle}
            delay={Math.round(fps * 0.9)}
            staggerFrames={1.6}
          />
        </div>
      ) : null}
      <div
        style={{
          marginTop: 64,
          width: ruleW,
          height: 2,
          background: ink.gold,
          borderRadius: 1,
        }}
      />
    </div>
  );
};

const ItemBeat: React.FC<{
  item: Pillar;
  ink: ReturnType<typeof inkFor>;
  startFrame: number;
  fps: number;
  frame: number;
}> = ({ item, ink, startFrame, fps, frame }) => {
  const local = frame - startFrame;
  const indexSpring = spring({
    frame: local,
    fps,
    config: { damping: 22, stiffness: 110, mass: 0.8 },
  });
  const indexOpacity = interpolate(indexSpring, [0, 1], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const indexShift = interpolate(indexSpring, [0, 1], [-30, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: '100%', maxWidth: 1500, color: ink.ink }}>
      <div
        style={{
          opacity: indexOpacity,
          transform: `translateX(${indexShift}px)`,
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          marginBottom: 56,
        }}
      >
        <span
          style={{
            fontFamily: theme.fontMono,
            fontSize: 26,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: ink.gold,
          }}
        >
          {item.index ?? ''}
        </span>
        <span
          style={{
            height: 2,
            width: 88,
            background: ink.gold,
            borderRadius: 1,
          }}
        />
      </div>

      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontWeight: 600,
          fontSize: 168,
          lineHeight: 1.0,
          letterSpacing: -4,
          color: ink.ink,
          maxWidth: 1500,
        }}
      >
        <KineticText
          text={item.label}
          delay={Math.round(fps * 0.18)}
          staggerFrames={2.4}
        />
      </div>

      {item.body ? (
        <div
          style={{
            marginTop: 48,
            fontFamily: theme.fontDisplay,
            fontWeight: 300,
            fontSize: 36,
            lineHeight: 1.4,
            color: ink.inkSoft,
            maxWidth: 1300,
          }}
        >
          <KineticText
            text={item.body}
            delay={Math.round(fps * 0.9)}
            staggerFrames={1.4}
          />
        </div>
      ) : null}
    </div>
  );
};

const FinaleBeat: React.FC<{
  title: string;
  items: Pillar[];
  ink: ReturnType<typeof inkFor>;
  startFrame: number;
  fps: number;
  frame: number;
}> = ({ title, items, ink, startFrame, fps, frame }) => {
  const local = frame - startFrame;

  return (
    <div style={{ width: '100%', maxWidth: 1500, color: ink.ink }}>
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: sizes.eyebrow,
          letterSpacing: 8,
          textTransform: 'uppercase',
          color: ink.gold,
          marginBottom: 36,
          opacity: interpolate(local, [0, 14], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {title.replace(/\.$/, '')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {items.map((item, i) => {
          const itemDelay = Math.round(fps * 0.2) + i * Math.round(fps * 0.18);
          const s = spring({
            frame: local - itemDelay,
            fps,
            config: { damping: 22, stiffness: 110, mass: 0.8 },
          });
          const op = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
          const tx = interpolate(s, [0, 1], [-22, 0], { extrapolateRight: 'clamp' });
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 56px 1fr',
                alignItems: 'baseline',
                gap: 28,
                opacity: op,
                transform: `translateX(${tx}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: theme.fontMono,
                  fontSize: 22,
                  letterSpacing: 4,
                  color: ink.gold,
                  textTransform: 'uppercase',
                }}
              >
                {item.index ?? String(i + 1).padStart(2, '0')}
              </span>
              <span
                style={{
                  height: 2,
                  width: 56,
                  background: ink.gold,
                  transform: 'translateY(-14px)',
                  borderRadius: 1,
                }}
              />
              <div
                style={{
                  fontFamily: theme.fontDisplay,
                  fontWeight: 500,
                  fontSize: 56,
                  lineHeight: 1.18,
                  letterSpacing: -1,
                  color: ink.ink,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
