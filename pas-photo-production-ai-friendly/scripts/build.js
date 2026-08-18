const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'extension');
const DIST = path.join(ROOT, 'dist', 'extension');

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function copyDir(src, dst) { fs.cpSync(src, dst, { recursive: true }); }

rmrf(DIST);
fs.mkdirSync(path.dirname(DIST), { recursive: true });
copyDir(SRC, DIST);
console.log(`Built CEP package: ${DIST}`);
