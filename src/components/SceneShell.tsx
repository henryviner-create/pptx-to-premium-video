import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { Surface, type SurfaceKind } from './Surface';
import { theme } from '../theme';

/**
 * Wraps every scene with:
 *   - the right Surface (forest / cream / footage),
 *   - an optional footage video (graded, letterboxed, parallaxed),
 *   - a synchronous fade-in/out at scene boundaries that produces a
 *     true cross-dissolve when adjacent Sequences overlap,
 *   - a slow Ken Burns push so cuts never feel like slides.
 *
 * Replaces the previous SceneFrame + BackgroundField combo. The shell
 * is driven entirely by props supplied via Video.tsx — there is no
 * scene-level guesswork about timing.
 */
export type FootageRef = {
  /** Path under public/, served by Remotion staticFile(). */
  file: string;
  /** Start time in seconds within the source clip (default 0). */
  startFromSec?: number;
  /** Optional caption shown over the footage in mono uppercase. */
  caption?: string;
  /** Direction of the slow Ken Burns push on the footage. */
  push?: 'in' | 'out' | 'left' | 'right';
};

type Props = {
  surface: SurfaceKind;
  sceneFrames: number;
  /** Optional B-roll played beneath the type. Only used when surface === 'footage'. */
  footage?: FootageRef;
  /** Extra padding around the content. Defaults to 140. Footage scenes use 160. */
  padding?: number;
  children: React.ReactNode;
};

const FADE_FRAMES = 18;
const LETTERBOX_PX = 80;

export const SceneShell: React.FC<Props> = ({
  surface,
  sceneFrames,
  footage,
  padding,
  children,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, Math.max(FADE_FRAMES + 1, sceneFrames - FADE_FRAMES), sceneFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Slow Ken Burns of the entire scene composition.
  const compScale = interpolate(frame, [0, sceneFrames], [1.012, 1.038]);
  const compShift = interpolate(frame, [0, sceneFrames], [0, -8]);

  const realPadding = padding ?? (surface === 'footage' ? 160 : 140);

  return (
    <AbsoluteFill style={{ opacity }}>
      <Surface kind={surface}>
        {surface === 'footage' && footage ? (
          <FootageLayer ref={footage} sceneFrames={sceneFrames} />
        ) : null}
        <AbsoluteFill
          style={{
            transform: `translateY(${compShift}px) scale(${compScale})`,
            transformOrigin: 'center',
            padding: realPadding,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          {children}
        </AbsoluteFill>
        {surface === 'footage' ? <Letterbox /> : null}
      </Surface>
    </AbsoluteFill>
  );
};

const FootageLayer: React.FC<{ ref: FootageRef; sceneFrames: number }> = ({
  ref,
  sceneFrames,
}) => {
  const frame = useCurrentFrame();
  const t = frame / Math.max(1, sceneFrames);
  const push = ref.push ?? 'in';

  // Slow camera move on the video itself.
  const scaleStart = push === 'in' ? 1.06 : 1.18;
  const scaleEnd = push === 'in' ? 1.18 : 1.06;
  const scale = interpolate(t, [0, 1], [scaleStart, scaleEnd]);

  let tx = 0;
  let ty = 0;
  if (push === 'left') tx = interpolate(t, [0, 1], [40, -40]);
  if (push === 'right') tx = interpolate(t, [0, 1], [-40, 40]);
  if (push === 'in') ty = interpolate(t, [0, 1], [12, -12]);
  if (push === 'out') ty = interpolate(t, [0, 1], [-12, 12]);

  return (
    <>
      <AbsoluteFill
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: 'center',
          overflow: 'hidden',
        }}
      >
        <OffthreadVideo
          src={staticFile(ref.file)}
          startFrom={Math.round((ref.startFromSec ?? 0) * 30)}
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // Unified colour grade for every footage clip in the film:
            // slight desaturation, warmth, and contrast so disparate
            // sources read as one director's edit.
            filter:
              'saturate(0.78) contrast(1.06) brightness(0.92) sepia(0.08)',
          }}
        />
      </AbsoluteFill>
      {/* Top + bottom gradient scrim so type stays readable on any plate. */}
      <AbsoluteFill
        style={{
          background: theme.footageScrim,
          pointerEvents: 'none',
        }}
      />
      {/* Subtle gold-tinted vignette on the corners. */}
      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 360px 90px rgba(8, 24, 15, 0.7)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

const Letterbox: React.FC = () => {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: LETTERBOX_PX,
          background: '#000',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: LETTERBOX_PX,
          background: '#000',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};
