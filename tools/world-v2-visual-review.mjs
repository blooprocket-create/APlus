#!/usr/bin/env node
/**
 * World V2 visual evidence runner, no Puppeteer/Playwright dependency.
 * - Starts the BUILT Vite preview.
 * - Uses stock Chrome DevTools Protocol to drive fixed camera anchors.
 * - Waits for exact desired streamed-cell IDs, not arbitrary sleeps.
 * - Records both 3D screenshots and non-visual technical diagnostics.
 * - Produces an offline gallery, SVG contact sheet and review checklist.
 *
 * Automated pixel metrics detect broken captures; they DO NOT replace an
 * artist/assistant visually inspecting the actual screenshots.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = process.cwd();
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : fallback;
};
const output = path.resolve(root, opt('--out', 'test-artifacts/world-v2-review'));
const baseline = opt('--baseline', '');
const baseUrl = opt('--base-url', 'http://127.0.0.1:4187/').replace(/\/?$/, '/');
const cdpUrl = 'http://127.0.0.1:9237/';
const specification = JSON.parse(readFileSync('tools/world-v2-review-shots.json', 'utf8'));
const shots = specification.shots;
if (specification.schemaVersion !== 1 || !Array.isArray(shots) || shots.length < 5) {
  throw new Error('Invalid World V2 visual shot registry');
}
if (new Set(shots.map(s => s.id)).size !== shots.length ||
  shots.some(s => !/^[a-z0-9-]+$/.test(s.id))) {
  throw new Error('Screenshot shot IDs must be unique and path-safe');
}
function chromeBin() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const name of ['google-chrome', 'chromium', 'chromium-browser']) {
    const proc = spawnSync('which', [name], { encoding: 'utf8' });
    if (proc.status === 0) return proc.stdout.trim();
  }
  throw new Error('Chrome/Chromium is required for screenshot review');
}
async function poll(fn, label, timeout = 40000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try { const result = await fn(); if (result) return result; }
    catch (error) { last = error; }
    await delay(150);
  }
  throw new Error('Timed out: ' + label + (last ? ' (' + last.message + ')' : ''));
}
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.serial = 0;
    this.pending = new Map();
    this.exceptions = [];
    ws.addEventListener('message', event => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.method === 'Runtime.exceptionThrown') {
        this.exceptions.push(message.params?.exceptionDetails?.text || 'Unhandled JavaScript exception');
      }
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
      else pending.resolve(message.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
    return result.result?.value;
  }
}
function esc(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
async function measureScreenshot(cdp, base64) {
  const script = '(async () => {' +
    'const image = new Image(); image.src = ' + JSON.stringify('data:image/png;base64,' + base64) + ';' +
    'await image.decode(); const canvas = document.createElement("canvas");' +
    'canvas.width=256; canvas.height=144; const ctx=canvas.getContext("2d",{willReadFrequently:true});' +
    'ctx.drawImage(image,0,0,256,144); const p=ctx.getImageData(0,0,256,144).data;' +
    'let dark=0, navy=0, bright=0, edges=0, sum=0; const colors=new Set();' +
    'for(let y=0;y<144;y++)for(let x=0;x<256;x++){' +
      'const i=(y*256+x)*4,r=p[i],g=p[i+1],b=p[i+2];' +
      'sum += (r*0.213+g*0.715+b*0.072);' +
      'if(Math.max(r,g,b)<22)dark++;' +
      'if(r<70 && g<87 && b<135)navy++;' +
      'if(Math.min(r,g,b)>245)bright++;' +
      'colors.add(((r>>4)<<8)|((g>>4)<<4)|(b>>4));' +
      'if(x>0){const l=i-4; if(Math.abs(r-p[l])+Math.abs(g-p[l+1])+Math.abs(b-p[l+2])>52)edges++;}' +
    '}' +
    'const n=256*144;' +
    'return {width:image.width,height:image.height,meanLuma:Math.round(sum/n),' +
    'darkFraction:Number((dark/n).toFixed(4)), navyFraction:Number((navy/n).toFixed(4)),' +
    'brightFraction:Number((bright/n).toFixed(4)),edgeFraction:Number((edges/n).toFixed(4)),' +
    'colorBuckets:colors.size}; })()';
  return cdp.eval(script);
}
function renderGallery(rows) {
  const cards = rows.map(row => {
    const image = esc(row.image);
    const before = row.before
      ? '<figure class="before"><img loading="lazy" src="' + esc(row.before) +
          '" alt="Prior capture for ' + esc(row.name) + '"><figcaption>Before</figcaption></figure>'
      : '';
    const metric = row.metrics;
    const problems = row.warnings.length
      ? '<p class="warning">' + row.warnings.map(esc).join(' · ') + '</p>' : '';
    return '<article class="tile"><h2>' + esc(row.name) + '</h2>' +
      '<p class="focus">' + esc(row.focus) + '</p>' +
      '<div class="images">' + before +
      '<figure><a href="' + image + '"><img loading="lazy" src="' + image +
      '" alt="' + esc(row.name) + ' world screenshot"></a><figcaption>Current</figcaption></figure></div>' +
      '<p class="meta">World ' + esc(row.state.worldX) + ', ' + esc(row.state.worldZ) +
      ' · ' + esc(row.state.currentBiome) + '/' + esc(row.state.water) +
      ' · tiles ' + row.state.resident + '/' + row.state.expected +
      ' · scenery ' + row.state.scenery + '</p>' +
      '<p class="meta">Canvas ' + metric.width + '×' + metric.height +
      ' · image variation ' + metric.colorBuckets +
      ' buckets · dark navy ' + (metric.navyFraction * 100).toFixed(1) + '%</p>' +
      problems + '</article>';
  }).join('\n');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>World V2 — visual review gallery</title><style>' +
    ':root{background:#0f1f28;color:#eef7f2;font:14px system-ui,sans-serif}' +
    'body{max-width:1560px;margin:0 auto;padding:24px}' +
    'h1{font-size:26px}h2{font-size:18px;margin:0 0 6px}' +
    '.lead{max-width:930px;line-height:1.55;color:#cbded9}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:18px}' +
    '.tile{background:#17323d;border:1px solid #ffffff2b;padding:14px;border-radius:12px}' +
    '.focus{margin:0 0 14px;color:#bbd5cc}' +
    '.images{display:flex;gap:8px}.images figure{margin:0;min-width:0;flex:1}' +
    'figure img{display:block;width:100%;border-radius:7px;border:1px solid #4e7883;object-fit:contain}' +
    'figcaption{font-size:11px;padding:4px;color:#bad3cc}' +
    '.meta{font:12px ui-monospace,monospace;color:#bed3d2}' +
    '.warning{color:#ffd08e}.foot{margin-top:20px;color:#bbd5cc}' +
    '@media(max-width:500px){body{padding:12px}.grid{grid-template-columns:1fr}}' +
    '</style></head><body><h1>Astral Chronicles — World V2 visual review</h1>' +
    '<p class="lead">Deterministic camera locations from the Phase 2 staging atlas. ' +
    'Screenshots are actual Chrome/Three.js renders, not concept art. Automated metrics ' +
    'flag failures and large dark areas; <strong>they do not judge visual quality</strong>. ' +
    'Inspect individual images and record actionable observations in review-checklist.md.</p>' +
    '<p><a href="contact-sheet.svg" style="color:#85e2d6">Open full contact sheet</a> · ' +
    '<a href="visual-review.json" style="color:#85e2d6">Machine-readable diagnostics</a></p>' +
    '<div class="grid">' + cards + '</div><p class="foot">Review focus: coastline, sea gaps, ' +
    'biome silhouettes, artistic consistency, road/river readability and mobile framing. ' +
    'This is not a player-approved final map.</p></body></html>';
}
function contactSvg(rows, shotsById) {
  const width = 1280, columns = 3, cellW = 410, cellH = 270, gap = 14;
  const rowsCount = Math.ceil(rows.length / columns);
  const svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + width +
    '" height="' + (rowsCount * (cellH + gap) + 45) + '" viewBox="0 0 ' + width +
    ' ' + (rowsCount * (cellH + gap) + 45) + '">',
    '<rect width="100%" height="100%" fill="#10232e"/>',
    '<text x="18" y="29" font-family="sans-serif" font-size="20" fill="#eef6ed">World V2 · visual review contact sheet</text>'];
  rows.forEach((row, index) => {
    const col = index % columns, line = Math.floor(index / columns);
    const x = 15 + col * (cellW + gap), y = 40 + line * (cellH + gap);
    svg.push('<rect x="' + x + '" y="' + y + '" width="' + cellW +
      '" height="' + cellH + '" rx="9" fill="#21424b"/>');
    const screenshot = shotsById.get(row.id);
    svg.push('<image x="' + (x + 8) + '" y="' + (y + 8) + '" width="' + (cellW - 16) +
      '" height="218" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,' +
      screenshot + '"/>');
    svg.push('<text x="' + (x + 10) + '" y="' + (y + 247) +
      '" font-family="sans-serif" font-size="14" fill="#f4f3e2">' + esc(row.name) + '</text>');
  });
  svg.push('</svg>');
  return svg.join('\n') + '\n';
}
function reviewChecklist(rows) {
  const intro = [
    '# World V2 — visual review checklist',
    '',
    'Captures are real browser pixels. Mechanical checks do **not** evaluate artistic quality.',
    'For each view, compare terrain readability and the user’s storybook/cel-shaded direction.',
    'Record screenshot-grounded defects and fixes, not invented performance results.',
    '',
    '**Global review questions:**',
    '- [ ] No exposed square ocean-tile boundaries, black voids, or flickering coastline seams.',
    '- [ ] Continent/island silhouettes are distinct at isometric gameplay distance.',
    '- [ ] Roads, riverbanks, shorelines and vegetation have readable layered shapes.',
    '- [ ] No floating/clipped props or scenery blocking story-anchor clearances.',
    '- [ ] There is enough authored-looking variation without excessive instancing/drawcalls.',
    '- [ ] Mobile portrait still has clear foreground/background and useful navigation cues.',
    '',
  ];
  for (const row of rows) {
    intro.push('## ' + row.name, '',
      'Screenshot: [' + row.image + '](' + row.image + ')',
      'Focus: ' + row.focus, '',
      '- [ ] Inspect visually and record specific observations.',
      '- [ ] Mark severity: critical / major / minor / acceptable.',
      '- [ ] Describe a targeted geometry, camera or rendering improvement.',
      'Notes: _not yet reviewed_', '');
  }
  return intro.join('\n');
}
async function run() {
  mkdirSync(output, { recursive: true });
  const profile = mkdtempSync(path.join(os.tmpdir(), 'world-v2-review-chrome-'));
  const children = [];
  let cdp;
  const report = { schemaVersion: 1, atlasStage: 'review-only-not-canon',
    source: 'actual Chrome Three.js rendering', capturedAt: new Date().toISOString(),
    shots: [], technicalFailures: [], browserExceptions: [],
    visualReviewRequired: true,
  };
  const pngById = new Map();
  try {
    if (!args.includes('--base-url')) {
      const vite = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1',
        '--port', '4187', '--strictPort'], { stdio: 'ignore' });
      children.push(vite);
    }
    await poll(async () => (await fetch(baseUrl)).ok, 'Vite built-site preview');
    const chrome = spawn(chromeBin(), ['--headless=new', '--no-sandbox',
      '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
      '--use-gl=angle', '--use-angle=swiftshader',
      '--window-size=1280,800', '--remote-debugging-port=9237',
      '--remote-allow-origins=*', '--user-data-dir=' + profile,
      'about:blank'], { stdio: 'ignore' });
    children.push(chrome);
    const page = await poll(async () => {
      const tabs = await (await fetch(cdpUrl + 'json/list')).json();
      return tabs.find(tab => tab.type === 'page' && tab.webSocketDebuggerUrl);
    }, 'Chrome debugging page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: baseUrl + 'world-v2-geography.html?visualReview=1' });
    await poll(async () => await cdp.eval('!!window.__worldV2Review'), 'visual review API', 30000);

    for (const shot of shots) {
      try {
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: shot.viewport.width, height: shot.viewport.height,
          deviceScaleFactor: 1, mobile: shot.viewport.width < 600,
        });
        await cdp.eval('window.dispatchEvent(new Event("resize"))');
        await cdp.eval('window.__worldV2Review.setView(' + JSON.stringify({
          x: shot.position.x, z: shot.position.z,
          angle: shot.camera.angle, zoom: shot.camera.zoom,
        }) + ')');
        const readyState = await poll(async () => {
          const state = await cdp.eval('window.__worldV2Review.snapshot()');
          return state?.ready ? state : null;
        }, shot.id + ' streaming ready', 25000);
        await poll(async () => {
          const state = await cdp.eval('window.__worldV2Review.snapshot()');
          return state?.frame >= readyState.frame + 3;
        }, shot.id + ' presented frames', 8000);
        const state = await cdp.eval('window.__worldV2Review.snapshot()');
        const picture = await cdp.send('Page.captureScreenshot', {
          format: 'png', captureBeyondViewport: false,
        });
        const filename = 'shots/' + shot.id + '.png';
        mkdirSync(path.dirname(path.join(output, filename)), { recursive: true });
        writeFileSync(path.join(output, filename), Buffer.from(picture.data, 'base64'));
        pngById.set(shot.id, picture.data);
        const metrics = await measureScreenshot(cdp, picture.data);
        const warnings = [];
        if (metrics.width !== shot.viewport.width || metrics.height !== shot.viewport.height) {
          warnings.push('Viewport pixels differ from requested capture');
        }
        if (metrics.colorBuckets < 10 || metrics.darkFraction > 0.7) {
          warnings.push('Potential blank/broken render');
        }
        if (shot.id === 'open-ocean' && metrics.navyFraction > 0.14) {
          warnings.push('Large dark-blue shapes in ocean view; inspect for streaming gaps');
        }
        if (shot.expectWater !== 'any' && state.water !== shot.expectWater) {
          warnings.push('Expected ' + shot.expectWater + ' at screenshot origin but found ' + state.water);
        }
        if (state.scenery < shot.minScenery) warnings.push('Expected scenery absent in this view');
        const beforePath = baseline
          ? path.join(baseline, filename)
          : '';
        let before;
        if (beforePath && existsSync(beforePath)) {
          before = 'before/' + shot.id + '.png';
          mkdirSync(path.join(output, 'before'), { recursive: true });
          copyFileSync(beforePath, path.join(output, before));
        }
        const row = { id: shot.id, name: shot.name, focus: shot.focus, image: filename,
          ...(before ? { before } : {}), state, metrics, warnings };
        report.shots.push(row);
        console.log('VISUAL', shot.id, JSON.stringify({
          loaded: state.resident, scenery: state.scenery,
          biome: state.currentBiome, water: state.water,
          colors: metrics.colorBuckets, warnings,
        }));
      } catch (error) {
        const reason = shot.id + ': ' + String(error);
        report.technicalFailures.push(reason);
        console.error('SCREENSHOT FAILURE', reason);
        // Continue to capture remaining regions even if one region is broken.
      }
    }
    report.browserExceptions = cdp.exceptions;
    const strongIssues = report.shots.flatMap(s => s.warnings.filter(w =>
      w.includes('blank/broken') || w.includes('Viewport pixels') ||
      w.includes('Expected scenery absent') || w.includes('Expected ')));
    if (strongIssues.length) report.technicalFailures.push(...strongIssues);
    if (report.shots.length !== shots.length) report.technicalFailures.push('Not all required screenshots captured');
    if (report.browserExceptions.length) report.technicalFailures.push('Browser JavaScript exceptions');
    if (report.shots.length) {
      writeFileSync(path.join(output, 'gallery.html'), renderGallery(report.shots));
      writeFileSync(path.join(output, 'contact-sheet.svg'), contactSvg(report.shots, pngById));
      writeFileSync(path.join(output, 'review-checklist.md'), reviewChecklist(report.shots));
    }
    console.log('World V2 screenshot audit: ' + report.shots.length + '/' + shots.length +
      ' frames; issues: ' + report.technicalFailures.length);
  } finally {
    writeFileSync(path.join(output, 'visual-review.json'), JSON.stringify(report, null, 2) + '\n');
    if (cdp?.ws?.readyState === WebSocket.OPEN) cdp.ws.close();
    for (const child of children.reverse()) { try { child.kill('SIGTERM'); } catch {} }
    await delay(150);
    rmSync(profile, { recursive: true, force: true, maxRetries: 12, retryDelay: 250 });
  }
  if (report.technicalFailures.length) process.exitCode = 1;
}
run().catch(error => {
  console.error('World V2 visual evidence runner failed:', error);
  process.exitCode = 1;
});
