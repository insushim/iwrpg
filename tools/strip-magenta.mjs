// Remove the magenta chroma-key background from NPC sprites → transparent alpha.
// Originals are backed up to npcs_orig_magenta/ first.
import sharp from 'sharp';
import { readdirSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import path from 'path';

const dir = 'apps/client/public/assets/img/npcs';
const backup = 'apps/client/public/assets/img/npcs_orig_magenta';
if (!existsSync(backup)) mkdirSync(backup, { recursive: true });

const TOL = 110;       // colour distance to treat as background
const FRINGE = 175;    // wider band → partial fade to kill the halo
// Saturated chroma-key magenta the codex renders backgrounds in (~rgb(246,3,233)).
const isMagenta = (r, g, b) => g < 70 && r > 180 && b > 170;

const files = readdirSync(dir).filter(f => f.endsWith('.png'));
let changed = 0;

for (const f of files) {
  const p = path.join(dir, f);
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const total = width * height;

  // Find the average magenta key colour from all clearly-magenta pixels.
  let kr = 0, kg = 0, kb = 0, n = 0;
  for (let i = 0; i < data.length; i += channels) {
    if (data[i + 3] > 200 && isMagenta(data[i], data[i + 1], data[i + 2])) {
      kr += data[i]; kg += data[i + 1]; kb += data[i + 2]; n++;
    }
  }
  if (n < total * 0.01) continue; // <1% magenta → not a chroma-key bg, skip
  kr /= n; kg /= n; kb /= n;

  let keyed = 0;
  for (let i = 0; i < data.length; i += channels) {
    const d = Math.hypot(data[i] - kr, data[i + 1] - kg, data[i + 2] - kb);
    if (d < TOL) { if (data[i + 3] !== 0) keyed++; data[i + 3] = 0; }
    else if (d < FRINGE) {
      const a = Math.round(255 * (d - TOL) / (FRINGE - TOL));
      if (a < data[i + 3]) data[i + 3] = a;
    }
  }
  if (keyed > 0) {
    copyFileSync(p, path.join(backup, f));
    await sharp(data, { raw: { width, height, channels } }).png().toFile(p);
    changed++;
    console.log(`✓ ${f}  (${keyed}px keyed, key=rgb(${kr|0},${kg|0},${kb|0}))`);
  }
}
console.log(`\nDone. ${changed}/${files.length} files updated. Originals → ${backup}`);
