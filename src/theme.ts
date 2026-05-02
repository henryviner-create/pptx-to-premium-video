/**
 * TenTrinity Carbon brand tokens.
 *
 * Restrained gold accent on a deep institutional dark; warm off-white ink
 * so the type doesn't read clinical. Sizes reflect the cinematic register
 * — anything below 24px breaks the Apple-keynote-meets-investor-film feel.
 */
export const theme = {
  bg: '#07090c',
  bgGradientA: '#11161e',
  bgGradientB: '#03050a',

  ink: '#f3eee2',
  inkSoft: 'rgba(243, 238, 226, 0.68)',
  inkFaint: 'rgba(243, 238, 226, 0.32)',
  inkRule: 'rgba(243, 238, 226, 0.14)',

  gold: '#c9a86a',
  goldStrong: '#d8b878',
  goldSoft: 'rgba(201, 168, 106, 0.55)',
  goldFaint: 'rgba(201, 168, 106, 0.22)',

  // For data viz only — intentionally muted so it never feels infographic-y.
  dataPositive: '#c9a86a',
  dataNegative: '#86b5d9',

  fontDisplay: '"Inter", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif',
  fontMono: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
} as const;

export const sizes = {
  eyebrow: 22,
  caption: 30,
  subtitle: 38,
  body: 36,
  bullet: 44,
  title: 96,
  hero: 160,
  manifesto: 88,
  metric: 360,
} as const;
