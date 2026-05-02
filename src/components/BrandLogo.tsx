import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';

/**
 * Reusable TenTrinity Carbon logo.
 *
 * Uses public/logos/* — copied there by `npm run prepare:logos`. Source
 * files live in input/ and are never modified by the renderer.
 *
 * Motion is deliberately restrained: a slow opacity fade only. No spin,
 * no bounce, no glow, no scale pop. The logo is a brand artefact, not
 * a motion graphic.
 */
type Variant =
  | 'horizontal-white'
  | 'horizontal-gold'
  | 'icon-gold'
  | 'icon-gold-white'
  | 'icon-gold-lightgrey';

const FILE: Record<Variant, string> = {
  'horizontal-white': 'logos/tentrinity-carbon-horizontal-white.png',
  'horizontal-gold': 'logos/tentrinity-carbon-horizontal-gold.png',
  'icon-gold': 'logos/tentrinity-carbon-icon-gold.png',
  'icon-gold-white': 'logos/tentrinity-carbon-icon-gold-white.png',
  'icon-gold-lightgrey': 'logos/tentrinity-carbon-icon-gold-lightgrey.png',
};

type Props = {
  variant: Variant;
  /** Rendered width in px. Height auto-scales. */
  width?: number;
  /** Frames to wait before the fade begins. */
  delay?: number;
  /** Fade-in duration in frames. */
  fadeFrames?: number;
  /** Maximum opacity (0–1). Defaults to 1. */
  maxOpacity?: number;
  style?: React.CSSProperties;
};

export const BrandLogo: React.FC<Props> = ({
  variant,
  width = 420,
  delay = 0,
  fadeFrames = 22,
  maxOpacity = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const opacity =
    interpolate(frame - delay, [0, fadeFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) * maxOpacity;

  return (
    <Img
      src={staticFile(FILE[variant])}
      style={{
        width,
        height: 'auto',
        opacity,
        display: 'block',
        ...style,
      }}
    />
  );
};
