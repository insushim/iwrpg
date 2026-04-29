#!/usr/bin/env node
// Slice a grid spritesheet PNG into individual frames using sharp.
// Usage:
//   node tools/slice-spritesheet.js \
//     --input /abs/in.png --output /abs/out_dir/ \
//     --cols 4 --rows 3 \
//     --naming "{anim}_{frame}" \
//     --row-names "idle,walk,attack"

import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const args = parseArgs(process.argv.slice(2));

if (!args.input || !args.output || !args.cols || !args.rows) {
  console.error('Usage: --input <png> --output <dir> --cols N --rows N [--naming "{anim}_{frame}"] [--row-names "idle,walk"]');
  process.exit(1);
}

const cols = Number(args.cols);
const rows = Number(args.rows);
const rowNames = args['row-names'] ? args['row-names'].split(',') : null;
const naming = args.naming ?? '{row}_{col}';

const outDir = resolve(args.output);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const img = sharp(args.input);
const meta = await img.metadata();
const cellW = Math.floor(meta.width / cols);
const cellH = Math.floor(meta.height / rows);

console.log(`Source: ${meta.width}x${meta.height}, cols=${cols}, rows=${rows}, cell=${cellW}x${cellH}`);

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const rowName = rowNames?.[r] ?? `r${r}`;
    const flatIdx = r * cols + c;
    const filename = naming
      .replace('{row}', String(r))
      .replace('{col}', String(c))
      .replace('{anim}', rowName)
      .replace('{frame}', String(flatIdx));
    const out = resolve(outDir, `${filename}.png`);
    await sharp(args.input)
      .extract({ left: c * cellW, top: r * cellH, width: cellW, height: cellH })
      .toFile(out);
  }
}

console.log(`✅ Sliced ${cols * rows} frames → ${outDir}`);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      out[argv[i].slice(2)] = argv[i+1];
      i++;
    }
  }
  return out;
}
