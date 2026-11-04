import { createTraffic } from './traffic.js';
import { waveEdge } from './track.js';
// Adds a vertical axis and ordered checkpoints without replacing existing drift.
const angle = a => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function attachCidreiraPhysics(track) {
  track.traffic = createTraffic(track);
  function initialize(k) {
    const p = track.nearest(k.x, k.y);
    k.altura = track.sample(k.x, k.y).height;
    k._cidreira = { gate: 0, air: false, cooldown: 0, recovering: 0, stuck: 0,
      safe: { x: k.x, y: k.y, h: k.h, idx: k.idx }, previousS: p.s,
      pierAttempted: false, jumps: 0, resets: 0, visited: [] };
  }

  track.beforeStep = (k, dt, input) => {
    if (!k._cidreira) initialize(k);
    const state = k._cidreira;
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.recovering = Math.max(0, state.recovering - dt);
    state.oldX = k.x; state.oldY = k.y;
    if (!state.air && k.pulo > .01 && k.vz > 0) state.air = true;
    if (state.recovering > 0) {
      k.vx = k.vy = k.fwd = 0;
      return { acel: false, freio: false, dir: 0, drift: false };
    }
    return input;
  };

  function recover(k) {
    const st = k._cidreira;
    let safe = st.safe;
    // A failed mandatory jump may recover on its beach only after the tip gate.
    if (st.pierAttempted && st.gate === 4) {
      const p = track.gates[4];
      safe = { x: p.x, y: p.y, h: Math.atan2(p.ty, p.tx), idx: p.index };
    }
    Object.assign(k, { x: safe.x, y: safe.y, h: safe.h, idx: safe.idx,
      vx: 0, vy: 0, fwd: 0, vz: 0, pulo: 0, drift: 0, carga: 0, boost: 0,
      girando: 0, giroVisual: 0 });
    k.altura = Math.max(0, track.sample(k.x, k.y).height);
    st.air = false; st.airVX = null; st.falling = 0; st.recovering = .65;
    st.cooldown = .9; st.stuck = 0; st.resets++;
    k.eventos.push('recuperou');
  }
  track.recover = recover;

  track.afterMove = (k, dt) => {
    const st = k._cidreira;
    if (st.airVX != null) {
      k.vx = st.airVX; k.vy = st.airVY;
      k.x = st.oldX + k.vx * dt; k.y = st.oldY + k.vy * dt;
      k.h = Math.atan2(k.vy, k.vx); k.fwd = Math.hypot(k.vx, k.vy);
    }
    let p = track.sample(k.x, k.y);
    const speed = Math.hypot(k.vx, k.vy);
    if (!st.air && !st.cooldown) {
      for (const jump of track.jumps) {
        const a = jump.point;
        // Launch on crossing the lip anywhere across the road: a drift slides the
        // car to the rail and sideways, and it must still take off, not fall.
        const along = (k.x - a.x) * a.tx + (k.y - a.y) * a.ty;
        const before = (st.oldX - a.x) * a.tx + (st.oldY - a.y) * a.ty;
        const lateral = Math.abs((k.x - a.x) * -a.ty + (k.y - a.y) * a.tx);
        if ((before < 0 && along >= 0 || Math.abs(along) < 27 + speed * dt) && lateral < track.width / 2 &&
            speed > (jump.pier ? 1 : 25) && k.vx * a.tx + k.vy * a.ty > speed * .2) {
          const v = Math.max(speed, jump.minimum);
          if (k.drift) {
            const n = k.nivelDrift;
            if (n) { k.boost = n === 3 ? 1.6 : n === 2 ? 1.1 : .6; k.eventos.push('turbo'); }
            k.drift = 0; k.carga = 0;
          }
          st.air = true; st.cooldown = 2; st.jumps++;
          k.altura = Math.max(k.altura ?? 0, a.h); k.vz = jump.vertical;
          if (jump.pier) {
            st.pierAttempted = true;
            st.airVX = 0; st.airVY = v;
            k.h = Math.PI / 2;
          }
          k.eventos.push('pulou'); break;
        }
      }
      const cut = p.shortcut;
      if (!st.air && cut?.route.id === 'dunas' && cut.leg === 1 && cut.t < .1 && speed > 70) {
        st.air = true; st.cooldown = 2; st.jumps++; k.vz = 105;
        k.altura = cut.h; k.eventos.push('pulou');
      }
    }
    if (st.air) {
      k.vz -= 260 * dt;
      k.altura += k.vz * dt;
      if (p.drive && k.vz <= 0 && k.altura <= p.height) {
        k.altura = p.height; k.vz = 0; st.air = false; st.airVX = null;
      } else if (k.altura < -15) { recover(k); p = track.sample(k.x, k.y); }
    } else {
      k.altura = p.height;
      // Physical guardrails confine the elevated platform, except the launch gap.
      if (['plataforma', 'rampa'].includes(p.sector) && p.distance > track.width / 2 - 14 && p.distance < 150) {
        const limit = track.width / 2 - 14, sign = Math.sign(p.side);
        k.x = p.x - p.ty * limit * sign; k.y = p.y + p.tx * limit * sign;
        const lateral = k.vx * -p.ty + k.vy * p.tx;
        if (lateral * sign > 0) { k.vx += p.ty * lateral * 1.15; k.vy -= p.tx * lateral * 1.15; }
        k.altura = p.h;
      } else if (p.water || p.distance > 530 && !p.shortcut || k.x < 25 || k.y < 25) {
        st.falling = (st.falling || 0) + dt;
        if (st.falling > .7) recover(k);
      } else {
        st.falling = 0;
        if (p.distance < track.width * .38 && !p.shortcut) {
          st.safe = { x: p.x, y: p.y, h: Math.atan2(p.ty, p.tx), idx: p.index };
        }
      }
    }
    if (!st.air && p.sector === 'praia' && p.height <= 1.5 && k.x > waveEdge(k.y,performance.now()/1000)) {
      const drag=Math.exp(-1.6*dt);k.vx=k.vx*drag-22*dt;k.vy*=drag;
    }
    k.pulo = st.air ? Math.max(.01, k.altura - Math.max(0, p.height)) : 0;
    k.baseAltura = st.air ? Math.max(0, p.height) : k.altura;
    if (!k.humano) {
      st.stuck = speed < 25 && st.recovering <= 0 ? st.stuck + dt : 0;
      if (st.stuck > 4) recover(k);
    }
    k.sprite.visible = st.recovering <= 0 || Math.floor(st.recovering * 12) % 2 === 0;
  };

  track.updateProgress = k => {
    const st = k._cidreira, p = track.nearest(k.x, k.y);
    k.idx = p.index;
    const gate = track.gates[st.gate];
    const forward = k.vx * gate.tx + k.vy * gate.ty > 0;
    const distance = Math.hypot(k.x - gate.x, k.y - gate.y);
    const along = (k.x-gate.x)*gate.tx+(k.y-gate.y)*gate.ty, crossed = along >= 0;
    // The sand beside the road is drivable, so a car may pass a gate well off
    // the centre line: crossing its line on this stretch of road also counts.
    const before = ((st.oldX ?? k.x)-gate.x)*gate.tx+((st.oldY ?? k.y)-gate.y)*gate.ty;
    const lateral = Math.abs((k.x-gate.x)*-gate.ty+(k.y-gate.y)*gate.tx);
    const gap = Math.abs(p.s - gate.s), sameStretch = Math.min(gap, track.length - gap) < 500;
    const wide = before < 0 && crossed && lateral < 420 && sameStretch;
    if ((distance < 100 && crossed || wide) && forward && st.recovering <= 0) {
      st.visited.push(st.gate);
      if (st.gate === 0) { k.voltas++; st.pierAttempted = false; }
      st.gate = (st.gate + 1) % track.gates.length;
    }
    // Ranking follows validated gates, so cutting to the finish cannot win.
    const stage = st.gate === 0 ? track.gates.length : st.gate;
    k.prog = k.voltas * 1e5 + stage * 1000 + p.index / track.N * 100;
  };

  track.botInput = (k, offset = 0) => {
    const p = track.nearest(k.x, k.y), speed = Math.max(0, k.fwd);
    const ahead = track.pointAt(p.s + 70 + speed * .23);
    const targetX = ahead.x - ahead.ty * offset * .35;
    const targetY = ahead.y + ahead.tx * offset * .35;
    const error = angle(Math.atan2(targetY - k.y, targetX - k.x) - k.h);
    const bend = Math.abs(angle(Math.atan2(ahead.ty, ahead.tx) - Math.atan2(p.ty, p.tx)));
    const targetSpeed = Math.max(105, 205 - bend * 140);
    return { acel: speed < targetSpeed + 12, freio: speed > targetSpeed + 25,
      dir: clamp(error * 2.5, -1, 1), drift: false };
  };
  return track;
}
