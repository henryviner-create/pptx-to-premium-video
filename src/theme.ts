/**
 * TenTrinity Carbon brand tokens — sourced directly from slide*.xml fills.
 *
 * The film carries an editorial duality:
 *   - Forest surfaces (`#0E2A1C`) for the title and closing bookends.
 *   - Cream surfaces (`#FAF8F3`) for the body — institutional paper.
 *   - Gold (`#C6A664`) is the only accent that crosses surfaces.
 *
 * For the Arabic audience: the palette is sober and warm; nothing
 * strobing or saturated. Composition leans symmetric so the frame
 * reads cleanly regardless of reading direction.
 */
export const theme = {
  // Forest surfaces — title slide + closing.
  forestBg: '#0E2A1C',
  forestBgLow: '#08180F',
  forestInk: '#FAF8F3',
  forestInkSoft: 'rgba(250, 248, 243, 0.72)',
  forestInkFaint: 'rgba(250, 248, 243, 0.36)',
  forestRule: 'rgba(250, 248, 243, 0.18)',

  // Cream surfaces — body content. Warm, paper-stock institutional.
  creamBg: '#FAF8F3',
  creamBgLow: '#F0EBDF',
  creamInk: '#1A1813',
  creamInkSoft: 'rgba(26, 24, 19, 0.66)',
  creamInkFaint: 'rgba(26, 24, 19, 0.32)',
  creamRule: 'rgba(26, 24, 19, 0.18)',

  // Universal gold accents.
  gold: '#C6A664',
  goldStrong: '#D9BB78',
  goldDeep: '#8C7544',
  goldFaint: 'rgba(198, 166, 100, 0.22)',
  goldRule: 'rgba(198, 166, 100, 0.7)',
  goldOnCream: '#A88643',

  // Footage scenes — type-on-video uses a graded scrim.
  footageScrim:
    'linear-gradient(180deg, rgba(8,24,15,0.20) 0%, rgba(8,24,15,0.55) 60%, rgba(8,24,15,0.85) 100%)',
  footageInk: '#FAF8F3',

  // Type families.
  fontDisplay:
    '"Inter", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif',
  fontMono: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
} as const;

export const sizes = {
  eyebrow: 22,
  caption: 30,
  subtitle: 38,
  body: 30,
  bullet: 44,
  title: 96,
  hero: 160,
  manifesto: 88,
  metric: 360,
} as const;

/**
 * Per-surface ink colours. Scenes use this map so they stay correct
 * regardless of which surface they're rendered on.
 */
export const inkFor = (
  surface: 'forest' | 'cream' | 'footage',
): {
  ink: string;
  inkSoft: string;
  inkFaint: string;
  rule: string;
  gold: string;
} => {
  if (surface === 'cream') {
    return {
      ink: theme.creamInk,
      inkSoft: theme.creamInkSoft,
      inkFaint: theme.creamInkFaint,
      rule: theme.creamRule,
      gold: theme.goldOnCream,
    };
  }
  if (surface === 'footage') {
    return {
      ink: theme.footageInk,
      inkSoft: 'rgba(250,248,243,0.78)',
      inkFaint: 'rgba(250,248,243,0.42)',
      rule: 'rgba(250,248,243,0.30)',
      gold: theme.goldStrong,
    };
  }
  return {
    ink: theme.forestInk,
    inkSoft: theme.forestInkSoft,
    inkFaint: theme.forestInkFaint,
    rule: theme.forestRule,
    gold: theme.gold,
  };
};
