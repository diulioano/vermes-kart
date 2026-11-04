// Crossing scenery shares the motorcyclist's stop / cross / turn behaviour.
// Simulation owns positions and collisions; rendering only displays this state.
export function createTraffic(track) {
  const configurations = [
    ['policial', 2, 130, 36, 1.8], ['policial', 5, 140, 33, 4.2],
    ['caranguejo', 13, 120, 43, .4], ['caranguejo', 13, 215, 47, 2.1],
    ['camarao', 14, 180, 51, 1.3], ['camarao', 14, 270, 48, 3.5],
  ];
  const actors = configurations.map(([kind, control, advance, speed, pause], id) => {
    const base = track.points.find(p => p.control === control);
    return {id, kind, anchor: track.pointAt(base.s + advance), speed,
      initialPause: pause, extent: track.width / 2 + 52};
  });
  let cooldowns = new WeakMap();
  function place(a) {
    a.x = a.anchor.x - a.anchor.ty * a.offset;
    a.y = a.anchor.y + a.anchor.tx * a.offset;
    a.height = Math.max(0, track.sample(a.x, a.y).height);
  }
  function reset() {
    cooldowns = new WeakMap();
    for (const a of actors) {
      a.direction = a.id % 2 ? -1 : 1;
      a.offset = -a.direction * a.extent;
      a.pause = a.initialPause; a.walkTime = 0; a.walking = false;
      place(a);
    }
  }
  function update(dt, karts, onHit = () => {}) {
    if (dt <= 0) return;
    for (const k of karts) cooldowns.set(k, Math.max(0, (cooldowns.get(k) || 0) - dt));
    for (const a of actors) {
      const oldX = a.x, oldY = a.y;
      a.walking = a.pause <= 0;
      if (!a.walking) a.pause = Math.max(0, a.pause - dt);
      else {
        a.walkTime += dt;
        a.offset += a.direction * a.speed * dt;
        if (Math.abs(a.offset) >= a.extent) {
          a.offset = Math.sign(a.offset) * a.extent;
          a.direction *= -1; a.pause = 2.3 + a.id * .23;
        }
      }
      place(a);
      if (!a.walking) continue;
      for (const k of karts) {
        if (cooldowns.get(k) > 0 || k.girando > 0 || k._cidreira?.recovering > 0 ||
            Math.abs((k.altura || 0) - a.height) > (a.kind === 'policial' ? 28 : 12)) continue;
        const rx = (k._cidreira?.oldX ?? k.x) - oldX;
        const ry = (k._cidreira?.oldY ?? k.y) - oldY;
        const dx = k.x - a.x - rx, dy = k.y - a.y - ry;
        const u = Math.max(0, Math.min(1, -(rx*dx + ry*dy) / (dx*dx + dy*dy || 1)));
        const radius = a.kind === 'policial' ? 21 : 13;
        if ((rx+dx*u)**2 + (ry+dy*u)**2 < radius**2) {
          k.rodar(a.kind === 'policial' ? .75 : .35, a.kind === 'policial' ? .45 : .75);
          cooldowns.set(k, 1.3); onHit(k, a);
        }
      }
    }
  }
  reset();
  return {actors, update, reset};
}
