#!/usr/bin/env node
/**
 * Rasterize favicon.svg to multi-size favicon.ico (16, 32, 48).
 * Run from project root: npm run build:favicons
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import ico from 'to-ico';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SVG_PATH = join(ROOT, 'favicon.svg');
const ICO_PATH = join(ROOT, 'favicon.ico');
const SIZES = [16, 32, 48];

const svg = readFileSync(SVG_PATH);
const pngBuffers = await Promise.all(
  SIZES.map((size) => sharp(svg).resize(size, size).png().toBuffer())
);
writeFileSync(ICO_PATH, await ico(pngBuffers));
console.log(`Wrote ${ICO_PATH} (${SIZES.join(', ')}px)`);
