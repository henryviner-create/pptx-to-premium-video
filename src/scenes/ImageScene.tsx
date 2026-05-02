import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SceneFrame } from '../components/SceneFrame';
import { theme } from '../theme';

type Props = {
  title: string;
  caption?: string;
  imageSrc: string;
};

export const ImageScene: React.FC<Props> = ({ title, caption, imageSrc }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1.06, 1.16]);
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <SceneFrame padding={0}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity,
            transform: `scale(${scale})`,
            transformOrigin: 'center',
          }}
        >
          <Img
            src={staticFile(imageSrc)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.9) contrast(1.05)' }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(6,8,13,0.05) 0%, rgba(6,8,13,0.1) 40%, rgba(6,8,13,0.92) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 140,
            right: 140,
            bottom: 140,
            color: theme.ink,
          }}
        >
          {title ? (
            <h2
              style={{
                fontFamily: theme.fontDisplay,
                fontWeight: 700,
                fontSize: 96,
                letterSpacing: -2,
                margin: 0,
              }}
            >
              <KineticText text={title} />
            </h2>
          ) : null}
          {caption ? (
            <div
              style={{
                marginTop: 24,
                fontFamily: theme.fontDisplay,
                fontSize: 32,
                color: theme.inkSoft,
                maxWidth: 1300,
              }}
            >
              <KineticText text={caption} delay={18} />
            </div>
          ) : null}
        </div>
      </div>
    </SceneFrame>
  );
};
