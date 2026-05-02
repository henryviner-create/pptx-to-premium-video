import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import scenesData from './data/scenes.json';
import { TitleScene } from './scenes/TitleScene';
import { BulletsScene } from './scenes/BulletsScene';
import { MetricScene } from './scenes/MetricScene';
import { QuoteScene } from './scenes/QuoteScene';
import { ChartScene } from './scenes/ChartScene';
import { ImageScene } from './scenes/ImageScene';
import { SectionScene } from './scenes/SectionScene';
import { ClosingScene } from './scenes/ClosingScene';
import { BackgroundField } from './components/BackgroundField';
import { theme } from './theme';

const COMPONENTS: Record<string, React.FC<any>> = {
  title: TitleScene,
  bullets: BulletsScene,
  metric: MetricScene,
  quote: QuoteScene,
  chart: ChartScene,
  image: ImageScene,
  section: SectionScene,
  closing: ClosingScene,
};

export const Video: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <BackgroundField />
      <Audio src={staticFile(scenesData.audio.src)} />
      {scenesData.scenes.map((scene, i) => {
        const Comp = COMPONENTS[scene.type] ?? BulletsScene;
        const from = Math.max(0, Math.round(scene.start * fps));
        const durationInFrames = Math.max(
          1,
          Math.round((scene.end - scene.start) * fps),
        );
        return (
          <Sequence key={scene.id ?? i} from={from} durationInFrames={durationInFrames} name={`${scene.type}: ${scene.id}`}>
            <Comp {...(scene.props ?? {})} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
