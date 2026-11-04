// Prepare only runtime files for the existing Cloudflare Pages project.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.codex', 'build', `publicacao-${Date.now()}`);
fs.mkdirSync(output, { recursive: true });
const runtime = /\.(png|webp|jpe?g|gif|js|css)$/i;
for (const file of ['index.html', '_headers', '_worker.js']) fs.copyFileSync(path.join(root, file), path.join(output, file));
for (const folder of ['assets', 'sprites', 'cenario']) {
  fs.cpSync(path.join(root, folder), path.join(output, folder), {
    recursive: true,
    filter: file => fs.statSync(file).isDirectory() || runtime.test(file),
  });
}
fs.mkdirSync(path.join(output, 'arte'));
for (const file of ['fundo.webp', 'logo.png']) fs.copyFileSync(path.join(root, 'arte', file), path.join(output, 'arte', file));

function hashFolder(folder) {
  const hash = createHash('sha256');
  function visit(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      const file = path.join(dir, name);
      if (fs.statSync(file).isDirectory()) visit(file);
      else hash.update(path.relative(folder, file).replaceAll('\\', '/')).update(fs.readFileSync(file));
    }
  }
  visit(folder);
  return hash.digest('hex').slice(0, 10);
}

let script = fs.readFileSync(path.join(output, 'assets/jogo.js'), 'utf8');
let html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
const spritesName = `sprites-${hashFolder(path.join(output, 'sprites'))}`;
fs.renameSync(path.join(output, 'sprites'), path.join(output, spritesName));
if (!script.includes('sprites/')) throw new Error('Sprite paths missing from game bundle');
script = script.replaceAll('sprites/', `${spritesName}/`);
html = html.replaceAll('sprites/', `${spritesName}/`);

const cidName = `cidreira-${hashFolder(path.join(output, 'assets/cidreira'))}`;
fs.renameSync(path.join(output, 'assets/cidreira'), path.join(output, 'assets', cidName));
if (!script.includes('./cidreira/') || !html.includes('./assets/cidreira/')) throw new Error('Cidreira imports missing');
script = script.replaceAll('./cidreira/', `./${cidName}/`);
html = html.replaceAll('./assets/cidreira/', `./assets/${cidName}/`);

// Standalone feature modules also need fresh URLs when their contents change.
for (const name of fs.readdirSync(path.join(output, 'assets')).sort()) {
  if (name === 'jogo.js' || !name.endsWith('.js')) continue;
  const file = path.join(output, 'assets', name);
  const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
  const versioned = `${name.slice(0, -3)}-${hash}.js`;
  fs.renameSync(file, path.join(output, 'assets', versioned));
  script = script.replaceAll(`./${name}`, `./${versioned}`);
}

const scriptName = `jogo-${createHash('sha256').update(script).digest('hex').slice(0, 10)}.js`;
fs.renameSync(path.join(output, 'assets/jogo.js'), path.join(output, 'assets', scriptName));
fs.writeFileSync(path.join(output, 'assets', scriptName), script);
if (!html.includes('./assets/jogo.js')) throw new Error('Game script tag missing');
fs.writeFileSync(path.join(output, 'index.html'), html.replace('./assets/jogo.js', `./assets/${scriptName}`));
const manifest = { output, project: 'vermes-kart', branch: 'main', scriptName, spritesName, cidName };
fs.mkdirSync(path.join(root, '.codex/verification'), { recursive: true });
fs.writeFileSync(path.join(root, '.codex/verification/publicacao.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
