const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'extension');
const DIST = path.join(ROOT, 'dist', 'extension');
const manifest = path.join(SRC, 'CSXS', 'manifest.xml');
const required = [
  path.join(SRC, 'CSXS', 'manifest.xml'),
  path.join(SRC, 'client', 'index.html'),
  path.join(SRC, 'client', 'css', 'theme.css'),
  path.join(SRC, 'client', 'js', 'app.js'),
  path.join(SRC, 'client', 'js', 'state.js'),
  path.join(SRC, 'client', 'js', 'bridge.js'),
  path.join(SRC, 'client', 'js', 'layout-engine.js'),
  path.join(SRC, 'host', 'main.jsx'),
  path.join(SRC, 'lib', 'CSInterface.js')
];

for (const p of required) {
  if (!fs.existsSync(p)) throw new Error(`Missing required file: ${path.relative(ROOT, p)}`);
}

const xml = fs.readFileSync(manifest, 'utf8');
if (!xml.includes('<MainPath>./client/index.html</MainPath>')) throw new Error('Unexpected CEP MainPath');
if (!xml.includes('<ScriptPath>./host/main.jsx</ScriptPath>')) throw new Error('Unexpected CEP ScriptPath');

const html = fs.readFileSync(path.join(SRC, 'client', 'index.html'), 'utf8');
const scripts = [
  'src="../lib/CSInterface.js"',
  'src="js/state.js"',
  'src="js/bridge.js"',
  'src="js/layout-engine.js"',
  'src="js/app.js"'
];
for (const s of scripts) if (!html.includes(s)) throw new Error(`Missing panel script reference: ${s}`);

console.log('Source validation: OK');
console.log('Run `node scripts/build.js` before validating dist output.');

if (fs.existsSync(DIST)) {
  const distManifest = path.join(DIST, 'CSXS', 'manifest.xml');
  if (!fs.existsSync(distManifest)) throw new Error('dist/extension exists but manifest is missing');
  console.log('Dist validation: OK');
}
