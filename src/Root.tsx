import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';
import sceneTimings from './data/scene-timings.json';
import motionPlan from './data/motion-plan.json';

/**
 * The render entry point. There is one composition: AnimatedPresentation.
 *
 * Total duration is read from scene-timings.json (the canonical timing
 * source) — never re-derived. fps and resolution are read from
 * motion-plan.json so they stay in sync with the design document.
 */
export const Root: React.FC = () => {
  const fps = motionPlan.fps;
  const width = motionPlan.resolution.width;
  const height = motionPlan.resolution.height;
  const durationInFrames = Math.max(
    1,
    Math.ceil(sceneTimings.totalDurationSec * fps),
  );

  return (
    <>
      <Composition
        id="AnimatedPresentation"
        component={Video}
        durationInFrames={durationInFrames}
        fps={fps}
        width={width}
        height={height}
      />
    </>
  );
};
