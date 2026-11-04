// Fence colliders share the rendered planes' position, length and orientation.
export function registerFence(track, x, y, nx, ny, width, height) {
  const length = Math.hypot(nx, ny) || 1;
  nx /= length; ny /= length;
  (track.fences ??= []).push({ x, y, nx, ny, tx: ny, ty: -nx, half: width / 2, height });
}

// Sweep a circle against the fence's straight side and rounded ends. Checking
// the whole movement prevents tunnelling during boosts and long physics steps.
function sweep(x, y, dx, dy, fence, radius) {
  const f = fence, normal = (x - f.x) * f.nx + (y - f.y) * f.ny;
  const velocity = dx * f.nx + dy * f.ny;
  let hit = null;
  const accept = (time, nx, ny) => {
    if (time >= -1e-7 && time <= 1 && dx * nx + dy * ny < -1e-8 && (!hit || time < hit.time)) {
      hit = { time: Math.max(0, time), nx, ny };
    }
  };
  for (const side of [-1, 1]) {
    if (Math.abs(velocity) < 1e-9) continue;
    const time = (side * radius - normal) / velocity;
    const along = (x + dx * time - f.x) * f.tx + (y + dy * time - f.y) * f.ty;
    if (Math.abs(along) <= f.half) accept(time, f.nx * side, f.ny * side);
  }
  const speed2 = dx * dx + dy * dy;
  if (speed2 > 1e-12) for (const side of [-1, 1]) {
    const ex = f.x + f.tx * f.half * side, ey = f.y + f.ty * f.half * side;
    const px = x - ex, py = y - ey;
    const b = px * dx + py * dy, c = px * px + py * py - radius * radius;
    const discriminant = b * b - speed2 * c;
    if (discriminant < 0) continue;
    const time = (-b - Math.sqrt(discriminant)) / speed2;
    const nx = x + dx * time - ex, ny = y + dy * time - ey;
    const length = Math.hypot(nx, ny) || 1;
    accept(time, nx / length, ny / length);
  }
  return hit;
}

export function blockFences(kart, track, dt, radius = 11) {
  if (!track.fences?.length) return false;
  let dx = kart.vx * dt, dy = kart.vy * dt;
  let x = kart.x - dx, y = kart.y - dy, collided = false;
  const fences = track.fences.filter(f => (kart.pulo || 0) < f.height);

  // Recover a small overlap after network corrections or another kart's push.
  for (const f of fences) {
    const along = Math.max(-f.half, Math.min(f.half, (x - f.x) * f.tx + (y - f.y) * f.ty));
    const px = x - f.x - f.tx * along, py = y - f.y - f.ty * along;
    const distance = Math.hypot(px, py);
    if (distance >= radius - 1e-5) continue;
    const side = Math.sign(px * f.nx + py * f.ny) || 1;
    const nx = distance > 1e-6 ? px / distance : f.nx * side;
    const ny = distance > 1e-6 ? py / distance : f.ny * side;
    x += nx * (radius - distance + .001); y += ny * (radius - distance + .001);
  }

  for (let step = 0; step < 4; step++) {
    let first = null;
    for (const f of fences) {
      const hit = sweep(x, y, dx, dy, f, radius);
      if (hit && (!first || hit.time < first.time)) first = hit;
    }
    if (!first) { x += dx; y += dy; break; }
    collided = true;
    x += dx * first.time + first.nx * .001;
    y += dy * first.time + first.ny * .001;
    dx *= 1 - first.time; dy *= 1 - first.time;
    const into = Math.min(0, dx * first.nx + dy * first.ny);
    dx -= first.nx * into; dy -= first.ny * into;
    const speedInto = Math.min(0, kart.vx * first.nx + kart.vy * first.ny);
    kart.vx -= first.nx * speedInto; kart.vy -= first.ny * speedInto;
  }
  kart.x = x; kart.y = y;
  if (collided) {
    kart.boost = 0;
    kart.fwd = kart.vx * Math.cos(kart.h) + kart.vy * Math.sin(kart.h);
  }
  return collided;
}
