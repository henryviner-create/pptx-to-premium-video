import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';
import scenesData from './data/scenes.json';

export const Root: React.FC = () => {
  const fps = scenesData.fps ?? 30;
  const width = scenesData.width ?? 1920;
  const height = scenesData.height ?? 1080;
  const duration = Math.max(1, scenesData.audio?.duration ?? 30);
  const durationInFrames = Math.max(1, Math.ceil(duration * fps));

  return (
    <>
      <Composition
        id="Main"
        component={Video}
        durationInFrames={durationInFrames}
        fps={fps}
        width={width}
        height={height}
      />
    </>
  );
};
