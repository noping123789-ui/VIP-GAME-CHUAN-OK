import * as THREE from 'three';

/**
 * Generates 3D control points for 20 high-speed racing circuit layouts.
 * Scaled for long 32km - 42km racing tracks ensuring 2+ minutes of unique curves.
 */
export function generatePointsForLayout(layout: string, seed: number = 42): THREE.Vector3[] {
  // Simple seeded pseudo-random generator
  let s = Math.abs(seed) || 42;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const points: THREE.Vector3[] = [];
  const scale = 1400; // Large scale for ultra-fast speeds (450-520 km/h)

  switch (layout) {
    case 'FIGURE_EIGHT_BRIDGE': {
      const numPts = 32;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.sin(t) * scale * 1.6;
        const z = Math.sin(t * 2) * scale * 1.2;
        // Elevation change so the bridge crosses over cleanly without intersecting
        const y = Math.cos(t) > 0 ? Math.sin(t * 2) * 45 + 50 : -20;
        points.push(new THREE.Vector3(x, Math.max(0, y), z));
      }
      break;
    }

    case 'MOUNTAIN_HAIRPIN_PASS': {
      const numPts = 36;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.1 + 0.5 * Math.sin(3 * t) + 0.25 * Math.sin(6 * t));
        const x = Math.cos(t) * r;
        const z = Math.sin(t) * r * 1.3;
        const y = Math.sin(t * 4) * 60 + Math.cos(t * 2) * 40 + 30;
        points.push(new THREE.Vector3(x, Math.max(0, y), z));
      }
      break;
    }

    case 'AIRPORT_RUNWAY_DRAG': {
      // Long high-speed straights with high-banked sweeper turns
      const l = scale * 2.6;
      const w = scale * 0.45;
      points.push(
        new THREE.Vector3(-l, 0, -w),
        new THREE.Vector3(-l * 0.5, 5, -w),
        new THREE.Vector3(0, 8, -w),
        new THREE.Vector3(l * 0.5, 4, -w),
        new THREE.Vector3(l, 0, -w),
        new THREE.Vector3(l + 300, 20, 0),
        new THREE.Vector3(l, 10, w),
        new THREE.Vector3(l * 0.5, 0, w),
        new THREE.Vector3(0, 12, w),
        new THREE.Vector3(-l * 0.5, 6, w),
        new THREE.Vector3(-l, 0, w),
        new THREE.Vector3(-l - 300, 20, 0)
      );
      break;
    }

    case 'COASTAL_CLIFF_HIGHWAY': {
      const numPts = 28;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.cos(t) * scale * 1.5 + Math.sin(t * 3) * (scale * 0.2);
        const z = Math.sin(t) * scale * 1.2 + Math.cos(t * 2) * (scale * 0.3);
        const y = Math.sin(t * 2) * 55 + 25;
        points.push(new THREE.Vector3(x, Math.max(0, y), z));
      }
      break;
    }

    case 'SUZUKA_TECHNICAL_S': {
      const numPts = 32;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const x = Math.sin(t) * scale * 1.4 + Math.sin(t * 4) * 220;
        const z = Math.cos(t) * scale * 1.1 + Math.cos(t * 3) * 180;
        const y = Math.sin(t * 3) * 30 + 10;
        points.push(new THREE.Vector3(x, Math.max(0, y), z));
      }
      break;
    }

    case 'MONZA_TEMPLE_OF_SPEED': {
      // Classic Monza: Parabolica sweeper, Curva Grande, Lesmo, Ascari chicane
      points.push(
        new THREE.Vector3(-scale * 1.6, 0, -scale * 0.5),
        new THREE.Vector3(-scale * 0.7, 5, -scale * 0.55),
        new THREE.Vector3(0, 0, -scale * 0.5),
        new THREE.Vector3(scale * 0.8, 4, -scale * 0.4),
        new THREE.Vector3(scale * 1.4, 12, -scale * 0.1),
        new THREE.Vector3(scale * 1.7, 18, scale * 0.4),
        new THREE.Vector3(scale * 1.3, 10, scale * 0.9),
        new THREE.Vector3(scale * 0.6, 0, scale * 0.7),
        new THREE.Vector3(scale * 0.1, 15, scale * 0.95),
        new THREE.Vector3(-scale * 0.4, 8, scale * 0.75),
        new THREE.Vector3(-scale * 1.1, 0, scale * 0.6),
        new THREE.Vector3(-scale * 1.8, 14, scale * 0.1)
      );
      break;
    }

    case 'TOKYO_EXPRESSWAY_RING': {
      const numPts = 30;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.3 + 0.18 * Math.sin(t * 5));
        const x = Math.cos(t) * r;
        const z = Math.sin(t) * r * 1.15;
        const y = Math.sin(t * 6) * 35 + 20;
        points.push(new THREE.Vector3(x, Math.max(0, y), z));
      }
      break;
    }

    case 'NURBURGRING_ROLLER_COASTER': {
      const numPts = 40;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.2 + 0.35 * Math.sin(2 * t) + 0.2 * Math.cos(5 * t));
        const x = Math.cos(t) * r;
        const z = Math.sin(t) * r * 1.25;
        const y = Math.sin(t * 5) * 65 + Math.cos(t * 3) * 45 + 30;
        points.push(new THREE.Vector3(x, Math.max(0, y), z));
      }
      break;
    }

    case 'DESERT_CANYON_DUNES': {
      const numPts = 26;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const r = scale * (1.35 + 0.28 * Math.sin(3 * t));
        const x = Math.sin(t) * r;
        const z = Math.cos(t) * r * 0.95;
        const y = Math.sin(t * 4) * 40 + 15;
        points.push(new THREE.Vector3(x, Math.max(0, y), z));
      }
      break;
    }

    case 'GRAND_PRIX_OVAL':
    default: {
      const numPts = 24;
      for (let i = 0; i < numPts; i++) {
        const t = (i / numPts) * Math.PI * 2;
        const variation = 1.0 + (rand() * 0.15 - 0.075);
        const x = Math.cos(t) * scale * 1.8 * variation;
        const z = Math.sin(t) * scale * 1.1 * variation;
        const y = Math.sin(t * 2) * 20 + 10;
        points.push(new THREE.Vector3(x, Math.max(0, y), z));
      }
      break;
    }
  }

  return points;
}
