export const BRAZIL_FLAG_CHANCE = .02;
export const BRAZIL_FLAG_SPIN = 1.5;

// Independent of position, pilot, car and previous unlocks.
export function rollBrazilFlag(random = Math.random) {
  return random() < BRAZIL_FLAG_CHANCE;
}

export function useBrazilFlag(user, racers) {
  const targets = racers.filter(k => k !== user && k.chegada === null);
  for (const kart of targets) kart.rodar(BRAZIL_FLAG_SPIN, .2);
  return targets;
}

// Native pixel icon, authored like the game's other canvas item icons.
export function brazilFlagIcon() {
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 24;
  const ctx = canvas.getContext('2d');
  const rect = (color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  rect('#19251f', 2, 0, 29, 19);
  rect('#008c45', 5, 2, 24, 15);
  rect('#25b85a', 5, 2, 24, 2);
  rect('#005b34', 5, 15, 24, 2);
  for (let row = 0; row < 11; row++) {
    const half = Math.min(row, 10 - row) * 2;
    rect('#ffda32', 17 - half, 4 + row, half * 2 + 1, 1);
  }
  for (const [y, x, w] of [[6,15,5],[7,13,9],[8,13,9],[9,12,11],[10,13,9],[11,13,9],[12,15,5]]) rect('#164a9d', x, y, w, 1);
  rect('#fff9df', 13, 8, 4, 1);
  rect('#fff9df', 17, 9, 5, 1);
  rect('#fff9df', 16, 11, 1, 1);
  rect('#fff9df', 19, 11, 1, 1);
  rect('#19251f', 2, 0, 3, 24);
  rect('#ded9bd', 3, 1, 1, 22);
  return canvas;
}
