#!/usr/bin/env node
// Strip solid-color background (chroma key) from PNG → make alpha transparent.
// Detects dominant edge color and removes pixels matching it within tolerance.
// Usage: node tools/strip-bg.js <input.png> [output.png] [tolerance]

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: strip-bg.js <input.png> [output.png] [tolerance=40]');
  process.exit(1);
}
const input = args[0];
const output = args[1] ?? input;
const tolerance = Number(args[2] ?? 40);

const img = sharp(input).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// Sample multiple opaque (alpha>200) candidate-BG pixels at various locations.
// gpt-image-2 sometimes draws solid color BG. Cell gutters may be transparent already
// while cell interiors are filled, so sample from inside cells too.
const samplePts = [
  [Math.floor(width * 0.05), Math.floor(height * 0.05)], // top-left corner
  [Math.floor(width * 0.95), Math.floor(height * 0.05)], // top-right
  [Math.floor(width * 0.05), Math.floor(height * 0.95)], // bottom-left
  [Math.floor(width * 0.95), Math.floor(height * 0.95)], // bottom-right
  [Math.floor(width * 0.20), Math.floor(height * 0.10)], // inside cell
  [Math.floor(width * 0.80), Math.floor(height * 0.10)],
  [Math.floor(width * 0.20), Math.floor(height * 0.90)],
  [Math.floor(width * 0.80), Math.floor(height * 0.90)],
];
// Pick majority opaque sample
const opaqueSamples = [];
for (const [x, y] of samplePts) {
  const i = (y * width + x) * channels;
  if (data[i + 3] > 200) opaqueSamples.push([data[i], data[i + 1], data[i + 2]]);
}
if (opaqueSamples.length === 0) {
  console.log(`${input} → no opaque BG samples (already transparent), skipping`);
  if (output !== input) writeFileSync(output, readFileSync(input));
  process.exit(0);
}
const bg = [
  Math.round(opaqueSamples.reduce((s, p) => s + p[0], 0) / opaqueSamples.length),
  Math.round(opaqueSamples.reduce((s, p) => s + p[1], 0) / opaqueSamples.length),
  Math.round(opaqueSamples.reduce((s, p) => s + p[2], 0) / opaqueSamples.length),
];

const isVibrantBG = Math.max(bg[0], bg[1], bg[2]) - Math.min(bg[0], bg[1], bg[2]) > 60;
if (!isVibrantBG) {
  console.log(`${input} → BG ${bg.join(',')} not vibrant, skipping`);
  if (output !== input) writeFileSync(output, readFileSync(input));
  process.exit(0);
}

// Replace pixels matching bg ± tolerance with alpha=0
let cleared = 0;
for (let i = 0; i < data.length; i += channels) {
  const dr = data[i] - bg[0];
  const dg = data[i + 1] - bg[1];
  const db = data[i + 2] - bg[2];
  if (Math.abs(dr) < tolerance && Math.abs(dg) < tolerance && Math.abs(db) < tolerance) {
    data[i + 3] = 0;
    cleared++;
  }
}

await sharp(data, { raw: { width, height, channels } }).png().toFile(output);
console.log(`${input} → BG ${bg.join(',')}, ${cleared}/${data.length / channels} px cleared → ${output}`);
