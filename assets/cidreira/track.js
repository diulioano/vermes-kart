// Cidreira uses the existing game's x/y ground coordinates; height is vertical.
export const WORLD_SIZE = 6656;
export const ROAD_WIDTH = 166;
export const SAMPLE_SPACING = 12;
export const GROUND_GRID = 160, GROUND_STEP = WORLD_SIZE / GROUND_GRID;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => (t = clamp(t, 0, 1), t * t * (3 - 2 * t));

// [x, y, elevation, sector]. The gap is an airborne route for the AI/checkpoints,
// not a physical road. Adjacent beach and pier approach never share a junction.
// A short lap (~40 s) whose town and dunes have tight corners, so handling matters.
export const CONTROLS = [
  [3650, 1460, 0, 'centro'], [3850, 1430, 0, 'centro'],
  [4050, 1400, 0, 'concha'], [4440, 1560, 0, 'concha'],
  [4500, 1910, 0, 'orla'], [4150, 2290, 0, 'orla'],
  [4670, 2600, 15, 'plataforma'], [5120, 2600, 50, 'plataforma'],
  [5560, 2600, 50, 'plataforma'], [5790, 2670, 58, 'rampa'],
  [5820, 2820, 94, 'voo'], [5820, 3050, 30, 'voo'],
  [5820, 3320, 0, 'praia'], [5520, 3590, 0, 'praia'],
  [4780, 3830, 12, 'lencois'], [4450, 4000, 30, 'lencois'],
  [4330, 4340, 76, 'lencois'], [4060, 4460, 30, 'lencois'],
  [3860, 4180, 12, 'lencois'], [3720, 3950, 80, 'lencois'],
  [3660, 3620, 10, 'retorno'], [3650, 3350, 0, 'retorno'],
  [3900, 3090, 0, 'retorno'], [3650, 2830, 0, 'retorno'],
  [3650, 2600, 0, 'retorno'], [3420, 2340, 0, 'retorno'],
  [3650, 2080, 0, 'retorno'], [3530, 1720, 0, 'retorno'],
  [3500, 1540, 0, 'centro'],
];

function catmull(a, b, c, d, t) {
  return .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
}

export function shoreline(y) {
  if (y >= 3320 && y <= 3950) return 6050 - (y-3320)*1.4;
  if (y > 3950) return mix(5168,6360,smooth((y-3950)/250));
  return mix(4775 + Math.sin(y / 600) * 24, 6050, smooth((y - 2890) / 320));
}

// Shared wave boundary for rendering and contact; leaves the inland lane dry.
export function waveEdge(y, seconds) {
  return shoreline(y) - 70 - 115 * (.5 + .5*Math.sin(seconds*1.1-y*.003));
}

export function duneHeight(x, y) {
  if (y < 3750) return 0;
  return smooth((y - 3750) / 400) * Math.max(0,
    19 + 27 * Math.sin(x / 210 + y / 400) + 25 * Math.cos(y / 185 - x / 510));
}

export function createCidreiraTrack() {
  const dense = [];
  for (let c = 0; c < CONTROLS.length; c++) {
    const p = n => CONTROLS[(n + CONTROLS.length) % CONTROLS.length];
    for (let j = 0; j < 100; j++) {
      const t = j / 100;
      // Straight flight corridor avoids splines pulling the trajectory sideways.
      const air = p(c)[3] === 'voo';
      dense.push({
        x: air ? mix(p(c)[0], p(c + 1)[0], t) : catmull(p(c - 1)[0], p(c)[0], p(c + 1)[0], p(c + 2)[0], t),
        y: air ? mix(p(c)[1], p(c + 1)[1], t) : catmull(p(c - 1)[1], p(c)[1], p(c + 1)[1], p(c + 2)[1], t),
        h: Math.max(0, mix(p(c)[2], p(c + 1)[2], smooth(t))),
        sector: p(c)[3], control: c,
      });
    }
  }
  const points = [dense[0]];
  let accumulated = 0;
  for (let j = 1; j < dense.length; j++) {
    accumulated += Math.hypot(dense[j].x - dense[j - 1].x, dense[j].y - dense[j - 1].y);
    if (accumulated >= SAMPLE_SPACING) {
      points.push(dense[j]); accumulated = 0;
    }
  }
  let length = 0;
  for (let j = 0; j < points.length; j++) {
    const a = points[j], b = points[(j + 1) % points.length];
    a.index = j; a.s = length;
    a.length = Math.hypot(b.x - a.x, b.y - a.y);
    a.tx = (b.x - a.x) / a.length; a.ty = (b.y - a.y) / a.length;
    length += a.length;
  }

  const grid = new Map(), cellSize = 256;
  for (const p of points) {
    const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(p.index);
  }

  function nearest(x, y) {
    const gx = Math.floor(x / cellSize), gy = Math.floor(y / cellSize);
    let candidates = [];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const bucket = grid.get(`${gx + a},${gy + b}`);
      if (bucket) candidates.push(...bucket);
    }
    if (!candidates.length) candidates = points.map(p => p.index);
    let best = null, d2 = Infinity;
    for (const idx of candidates) {
      const a = points[idx], b = points[(idx + 1) % points.length];
      const t = clamp(((x - a.x) * a.tx + (y - a.y) * a.ty) / a.length, 0, 1);
      const px = mix(a.x, b.x, t), py = mix(a.y, b.y, t);
      const d = (x - px) ** 2 + (y - py) ** 2;
      if (d < d2) {
        d2 = d;
        best = { ...a, x: px, y: py, h: mix(a.h, b.h, t), s: a.s + a.length * t,
          distance: Math.sqrt(d), side: (x - px) * -a.ty + (y - py) * a.tx };
      }
    }
    return best;
  }

  const atControl = c => points.find(p => p.control >= c) ?? points[0];
  const shortcuts = [
    { id: 'areia', points: [[4510, 1960, 0], [4680, 2200, 0], [4650, 2500, 8]], width: 65 },
    { id: 'dunas', points: [[4440, 4010, 30], [4240, 4070, 100], [4050, 4120, 55], [3870, 4170, 12]], width: 70 },
  ];
  function shortcutAt(x, y, margin = 0) {
    for (const route of shortcuts) for (let j = 0; j < route.points.length - 1; j++) {
      const a = route.points[j], b = route.points[j + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2, 0, 1);
      const px = mix(a[0], b[0], t), py = mix(a[1], b[1], t);
      const distance = Math.hypot(x - px, y - py);
      if (distance < route.width / 2 + margin) {
        // Near the main road the shortcut eases into the road's height: no step when crossing over.
        const road = nearest(px, py), joined = smooth((road.distance - ROAD_WIDTH / 2) / 90);
        return { route, h: mix(road.h, mix(a[2], b[2], smooth(t)), joined), distance,
          x: px, y: py, tx: dx / Math.sqrt(l2), ty: dy / Math.sqrt(l2), leg: j, t };
      }
    }
    return null;
  }

  function sample(x, y) {
    const p = nearest(x, y), cut = shortcutAt(x, y);
    const water = x > shoreline(y);
    const onRoad = p.distance <= ROAD_WIDTH / 2;
    if (p.sector === 'voo' && onRoad && water) return { ...p, height: -8, water: true, drive: false, floor: 2 };
    if (onRoad && p.sector !== 'voo') return { ...p, height: p.h, water: false, drive: true, floor: 2 };
    if (cut) return { ...p, shortcut: cut, height: cut.h, water: false, drive: true, floor: 3 };
    return { ...p, height: water ? -8 : ground(x, y), water, drive: !water, floor: water ? 0 : 3 };
  }

  // Terrain shape off the road. The scene meshes this same grid and physics reads
  // it with the same triangles, so the car never floats above or sinks into sand.
  function terrainHeight(x, y) {
    if (x > shoreline(y)) return -12;
    const p = nearest(x, y), cut = shortcutAt(x, y, 110);
    const background = duneHeight(x, y);
    // Keep the shortcut's embankment from burying the main racing surface.
    if (p.distance < ROAD_WIDTH/2+45 && !['plataforma','rampa','voo'].includes(p.sector)) return p.h-2;
    if (cut) {
      const blend = clamp((cut.distance-cut.route.width/2)/110, 0, 1);
      return cut.h*(1-blend)+background*blend-.6;
    }
    if (['plataforma', 'rampa', 'voo'].includes(p.sector)) return background;
    const blend = clamp((p.distance - ROAD_WIDTH / 2) / 100, 0, 1);
    return p.h * (1 - blend) + background * blend - .7;
  }
  let heights = null;
  function groundGrid() {
    if (!heights) {
      heights = new Float32Array((GROUND_GRID + 1) ** 2);
      for (let z = 0; z <= GROUND_GRID; z++) for (let x = 0; x <= GROUND_GRID; x++)
        heights[z * (GROUND_GRID + 1) + x] = terrainHeight(x * GROUND_STEP, z * GROUND_STEP);
    }
    return heights;
  }
  function ground(x, y) {
    const g = groundGrid(), n = GROUND_GRID + 1;
    const fx = clamp(x / GROUND_STEP, 0, GROUND_GRID - 1e-6), fz = clamp(y / GROUND_STEP, 0, GROUND_GRID - 1e-6);
    const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz, a = iz * n + ix;
    // Matches the mesh split: (x+1,z)-(x,z+1) diagonal.
    return u + v <= 1 ? g[a] + (g[a+1] - g[a]) * u + (g[a+n] - g[a]) * v
      : g[a+n+1] + (g[a+n] - g[a+n+1]) * (1 - u) + (g[a+1] - g[a+n+1]) * (1 - v);
  }

  // The orla checkpoint is AFTER both routes merge, so its shortcut is legal.
  // Gate 4 must stay the beach gate (pier recovery); the dunes gate follows the shortcut's exit.
  const gateControls = [0, 3, 6, 9, 12, 14, 20, 24, 27];
  const gates = gateControls.map(atControl);
  const jumps = [
    { id: 'plataforma', point: atControl(10), minimum: 285, vertical: 190, pier: true },
    { id: 'duna-1', point: atControl(16), minimum: 0, vertical: 86 },
    { id: 'duna-2', point: atControl(19), minimum: 0, vertical: 90 },
  ];
  function pointAt(s) {
    s = (s % length + length) % length;
    let lo = 0, hi = points.length - 1;
    while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (points[m].s <= s) lo = m; else hi = m - 1; }
    return points[lo];
  }
  return {
    cidreira: true, id: 'cidreira', nome: 'Cidreira', width: ROAD_WIDTH,
    worldSize: WORLD_SIZE, points, length, nearest, sample, pointAt, shortcuts, shortcutAt, gates, jumps,
    terrainHeight, groundGrid, ground,
    centro: points.map(p => [p.x, p.y]), zonas: points.map(p => p.sector), N: points.length,
    piso: (x, y) => sample(x, y).floor,
    terra: (x, y) => !['centro', 'concha', 'plataforma', 'rampa'].includes(nearest(x, y).sector),
    arvores: [], travessias: [], atalho: [[4500, 1960], [4650, 2500]],
  };
}
