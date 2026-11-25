/**
 * Accuracy test for MetalLens.
 *
 * 1. Put test photos in eval/images/
 * 2. List the right answer for each in eval/labels.csv (filename,band,album)
 * 3. Run:  npm run eval            (current settings)
 *          npm run eval -- --max-size 1600 --model gemini-3.7-flash
 *          npm run eval -- --add-to eval/results-XXXX.csv
 *            (runs only the photos that earlier file is missing, or that errored,
 *             with the same model and size, and saves a combined file)
 *
 * Each run prints a summary and saves every answer to eval/results-<time>.csv.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { analyzeImage } from '../api/identify.ts';

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
type Outcome = 'correct' | 'wrong' | 'unknown' | 'error';
type Result = { file: string; expected: string; predicted: string; outcome: Outcome; seconds: number };

// --add-to: reuse an earlier run's results and only test what it is missing.
const addTo = flag('add-to', '');
const previous: Result[] = [];
let prevModel = '', prevSize = '';
if (addTo) {
  const lines = fs.readFileSync(addTo, 'utf8').trim().split(/\r?\n/);
  const header = lines[0].match(/model=(\S+) max_size=(\d+)/);
  if (header) { prevModel = header[1]; prevSize = header[2]; }
  for (const line of lines.slice(2)) {
    const m = line.match(/^([^,]+),([^,]*),"(.*)",(correct|wrong|unknown|error),([\d.]+)$/);
    if (m && m[4] !== 'error') previous.push({ file: m[1], expected: m[2], predicted: m[3], outcome: m[4] as Outcome, seconds: Number(m[5]) });
  }
}
const maxSize = Number(flag('max-size', prevSize || '1024')); // the app currently resizes to 1024 px
const model = flag('model', prevModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash');
process.env.GEMINI_MODEL = model;
const done = new Set(previous.map((r) => r.file));
if (addTo) console.log(`Adding to ${addTo}: ${previous.length} earlier results kept, model ${model}, ${maxSize}px\n`);

const root = path.resolve('eval');
const labelsFile = path.join(root, 'labels.csv');
if (!fs.existsSync(labelsFile)) {
  console.error('Missing eval/labels.csv');
  process.exit(1);
}

const norm = (s: string) =>
  s.toLowerCase().replace(/ł/g, 'l').replace(/ø/g, 'o').replace(/æ/g, 'ae').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const rows = fs.readFileSync(labelsFile, 'utf8').trim().split(/\r?\n/).slice(1)
  .filter((l) => l.trim())
  .map((l) => {
    const [file, band, album = ''] = l.split(',').map((x) => x.trim());
    return { file, band, album };
  });

const results: Result[] = [...previous];

for (const row of rows) {
  if (done.has(row.file)) continue;
  const imgPath = path.join(root, 'images', row.file);
  if (!fs.existsSync(imgPath)) {
    console.warn(`skip: ${row.file} not found in eval/images`);
    continue;
  }
  // Resize and compress the way the app does, so the test matches real use.
  const jpeg = await sharp(imgPath).rotate()
    .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 }).toBuffer();
  const dataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`;

  const t0 = Date.now();
  let predicted = '';
  let outcome: Outcome;
  try {
    const r = await analyzeImage(dataUrl);
    predicted = r.identifiedName;
    const isUnknown = predicted === 'Unknown Entity';
    if (row.band.toUpperCase() === 'NONE') outcome = isUnknown ? 'correct' : 'wrong'; // not metal: should say Unknown
    else if (isUnknown) outcome = 'unknown';
    else outcome = norm(predicted).includes(norm(row.band)) ? 'correct' : 'wrong';
  } catch (e) {
    predicted = e instanceof Error ? e.message : String(e);
    outcome = 'error';
  }
  const seconds = (Date.now() - t0) / 1000;
  results.push({ file: row.file, expected: row.band, predicted, outcome, seconds });
  console.log(`${outcome.padEnd(8)} ${row.file}: expected "${row.band}", got "${predicted}"`);
  await new Promise((r) => setTimeout(r, 2000)); // stay under free-tier rate limits
}

const n = results.length;
const count = (o: Outcome) => results.filter((r) => r.outcome === o).length;
const correct = count('correct'), wrong = count('wrong'), unknown = count('unknown'), errors = count('error');
const answered = correct + wrong;
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : 'n/a');

console.log(`\nModel: ${model} | image size: ${maxSize}px | images: ${n}`);
console.log(`Correct ${correct}, wrong ${wrong}, unknown ${unknown}, errors ${errors}`);
console.log(`Overall accuracy (correct / all):         ${pct(correct, n)}`);
console.log(`Precision (correct / answers it gave):    ${pct(correct, answered)}`);
console.log(`Coverage (gave an answer / all):          ${pct(answered, n)}`);

const csv = ['file,expected,predicted,outcome,seconds',
  ...results.map((r) => [r.file, r.expected, `"${r.predicted.replace(/"/g, "'")}"`, r.outcome, r.seconds].join(','))].join('\n');
const out = path.join(root, `results-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
fs.writeFileSync(out, `# model=${model} max_size=${maxSize}\n${csv}\n`);
console.log(`Saved ${out}`);
