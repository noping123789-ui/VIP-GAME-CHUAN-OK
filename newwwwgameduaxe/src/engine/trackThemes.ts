export interface TrackVisualTheme {
  trackColor: number;
  centerLineWidth: number;
  centerLineColor: number;
  bollardReflectorColor: number;
  lampColor: number;
  archColor: number;
}

const DEFAULT_THEME: TrackVisualTheme = {
  trackColor: 0x1a1a24,
  centerLineWidth: 0.35,
  centerLineColor: 0xffffff,
  bollardReflectorColor: 0xffaa00,
  lampColor: 0x38bdf8,
  archColor: 0x0284c7
};

const THEMES: Record<string, TrackVisualTheme> = {
  GRAND_PRIX_OVAL: {
    trackColor: 0x1e1e24,
    centerLineWidth: 0.4,
    centerLineColor: 0xffffff,
    bollardReflectorColor: 0xf59e0b,
    lampColor: 0x60a5fa,
    archColor: 0x2563eb
  },
  MONZA_TEMPLE_OF_SPEED: {
    trackColor: 0x18181f,
    centerLineWidth: 0.35,
    centerLineColor: 0xffffff,
    bollardReflectorColor: 0xef4444,
    lampColor: 0x38bdf8,
    archColor: 0xd97706
  },
  TOKYO_EXPRESSWAY_RING: {
    trackColor: 0x111118,
    centerLineWidth: 0.45,
    centerLineColor: 0xfacc15,
    bollardReflectorColor: 0xec4899,
    lampColor: 0xa855f7,
    archColor: 0xec4899
  },
  NEON_TUNNEL_METRO: {
    trackColor: 0x0c0d14,
    centerLineWidth: 0.5,
    centerLineColor: 0x22d3ee,
    bollardReflectorColor: 0xf43f5e,
    lampColor: 0x06b6d4,
    archColor: 0x8b5cf6
  },
  MOUNTAIN_HAIRPIN_PASS: {
    trackColor: 0x27272a,
    centerLineWidth: 0.3,
    centerLineColor: 0xfde047,
    bollardReflectorColor: 0xf97316,
    lampColor: 0xfbbf24,
    archColor: 0xca8a04
  },
  COASTAL_CLIFF_HIGHWAY: {
    trackColor: 0x1c1917,
    centerLineWidth: 0.35,
    centerLineColor: 0xffffff,
    bollardReflectorColor: 0x06b6d4,
    lampColor: 0x67e8f9,
    archColor: 0x0891b2
  },
  DESERT_CANYON_DUNES: {
    trackColor: 0x292524,
    centerLineWidth: 0.4,
    centerLineColor: 0xfef08a,
    bollardReflectorColor: 0xea580c,
    lampColor: 0xf59e0b,
    archColor: 0xb45309
  },
  NURBURGRING_ROLLER_COASTER: {
    trackColor: 0x1f2421,
    centerLineWidth: 0.35,
    centerLineColor: 0xffffff,
    bollardReflectorColor: 0x22c55e,
    lampColor: 0x86efac,
    archColor: 0x16a34a
  },
  FUTURISTIC_HYPERLOOP: {
    trackColor: 0x0f172a,
    centerLineWidth: 0.5,
    centerLineColor: 0x38bdf8,
    bollardReflectorColor: 0x6366f1,
    lampColor: 0x818cf8,
    archColor: 0x4f46e5
  }
};

export function getTrackVisualTheme(layoutKey?: string): TrackVisualTheme {
  if (!layoutKey || typeof layoutKey !== 'string') return DEFAULT_THEME;
  return THEMES[layoutKey] || DEFAULT_THEME;
}
