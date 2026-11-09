#!/usr/bin/env node
/**
 * Real Chrome smoke test for the current Hearthmere entrypoint.
 * Does not pretend to be an iPhone FPS benchmark or a complete playthrough.
 * Requires npm run build, a Chrome/Chromium executable and Node 22 WebSocket.
 * Uses built-in DevTools Protocol transport; no extra npm browser dependencies.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const serverUrl = 'http://127.0.0.1:4173/';
const cdpUrl = 'http://127.0.0.1:9223/';
const screenshots = path.resolve(process.cwd(), 'test-artifacts/browser-smoke');

function chromeExecutable() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const bin of ['google-chrome', 'chromium', 'chromium-browser']) {
    const result = spawnSync('which', [bin], { encoding: 'utf8' });
    if (result.status === 0) return result.stdout.trim();
  }
  throw new Error('Chrome/Chromium not found for browser smoke test.');
}

async function poll(fn, label, timeoutMs = 20000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? ': ' + lastError.message : ''}`);
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.serial = 0;
    this.pending = new Map();
    this.exceptions = [];
    ws.addEventListener('message', evt => {
      let payload;
      try { payload = JSON.parse(evt.data); } catch { return; }
      if (payload.method === 'Runtime.exceptionThrown') {
        this.exceptions.push(payload.params?.exceptionDetails?.text ?? 'Browser JavaScript exception');
      }
      if (!payload.id) return;
      const job = this.pending.get(payload.id);
      if (!job) return;
      this.pending.delete(payload.id);
      if (payload.error) job.reject(new Error(JSON.stringify(payload.error)));
      else job.resolve(payload.result);
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
    const result = await this.send('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Evaluation error');
    return result.result?.value;
  }
}

async function main() {
  mkdirSync(screenshots, { recursive: true });
  const profileDir = mkdtempSync(path.join(os.tmpdir(), 'astral-phase0-chrome-'));
  const children = [];
  let cdp;
  try {
    const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
      cwd: process.cwd(), stdio: 'ignore',
    });
    children.push(preview);
    await poll(async () => (await fetch(serverUrl)).ok, 'Vite preview server');
    const chrome = spawn(chromeExecutable(), [
      '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
      '--window-size=1024,640', '--remote-debugging-port=9223',
      '--remote-allow-origins=*', `--user-data-dir=${profileDir}`, 'about:blank',
    ], { stdio: 'ignore' });
    children.push(chrome);

    const page = await poll(async () => {
      const pages = await (await fetch(cdpUrl + 'json/list')).json();
      return pages.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
    }, 'Chrome DevTools page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    for (const role of ['warrior', 'mage', 'assassin']) {
      await cdp.send('Page.navigate', { url: serverUrl });
      await poll(async () => await cdp.eval("!!document.querySelector('#hearthmere-entry')"), role + ' start screen');
      await cdp.eval(`(() => {
        const select = document.querySelector('#hearthmere-hero');
        select.value = '${role}';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      const selected = await cdp.eval("document.querySelector('#hearthmere-hero')?.value");
      if (selected !== role) throw new Error(`Could not select ${role}, got ${selected}`);
      await cdp.eval("document.querySelector('#hearthmere-entry').requestSubmit()");
      const reached = await poll(async () => await cdp.eval(
        "!!document.querySelector('.hearthmere-hud') && !!document.querySelector('#hud-hp-fill') && !!document.querySelector('#game-canvas')"
      ), role + ' playable HUD', 30000);
      if (!reached) throw new Error(`Missing playable HUD for ${role}`);
      await delay(700); // Leave one frame for environment/hero renderer to present.
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync(path.join(screenshots, `hearthmere-${role}.png`), Buffer.from(shot.data, 'base64'));
      const status = await cdp.eval(`({
        role: '${role}',
        quest: document.querySelector('#hud-quest-title')?.textContent?.trim() ?? null,
        canvas: {
          width: document.querySelector('#game-canvas')?.width ?? 0,
          height: document.querySelector('#game-canvas')?.height ?? 0,
        },
        hud: !!document.querySelector('.hearthmere-hud')
      })`);
      if (status.canvas.width < 1 || status.canvas.height < 1) {
        throw new Error(`Canvas size invalid for ${role}: ${JSON.stringify(status.canvas)}`);
      }
      console.log('Browser smoke passed:', JSON.stringify(status));
    }
    // Phase 1: verify the separate lab actually renders and crosses a cell
    // boundary, not merely that a TypeScript heightfield unit test passes.
    await cdp.send('Page.navigate', { url: serverUrl + 'world-v2-lab.html' });
    await poll(async () => await cdp.eval(
      "document.querySelector('#status')?.textContent?.includes('Resident cells:')"
    ), 'World V2 streaming lab rendered status', 30000);
    await poll(async () => await cdp.eval(
      "Number((document.querySelector('#status')?.textContent ?? '').match(/Resident cells: (\\d+)/)?.[1] ?? 0) > 0"
    ), 'World V2 lab loaded its first cell', 30000);
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
    await delay(1400);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
    await poll(async () => await cdp.eval(
      "((document.querySelector('#status')?.textContent ?? '').match(/Cell: (-?\\d+), (-?\\d+)/)?.[1] === '-1')"
    ), 'World V2 lab moved into negative-X neighbor cell', 10000);
    const labStatus = await cdp.eval("document.querySelector('#status')?.textContent?.trim()");
    if (!labStatus.includes('baked preview tiles: 81') || !labStatus.includes('failures: 0')) {
      throw new Error('Lab did not use the compiled atlas cleanly: ' + labStatus);
    }
    const assetTraffic = await cdp.eval(`({
      atlas: performance.getEntriesByType('resource')
        .some(entry => entry.name.includes('/world-v2/preview/atlas-index.json')),
      cellCount: performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('/world-v2/preview/cells/0/')).length,
    })`);
    if (!assetTraffic.atlas || assetTraffic.cellCount < 1) {
      throw new Error('Lab did not fetch precompiled world artifacts: ' + JSON.stringify(assetTraffic));
    }
    const labShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(path.join(screenshots, 'world-v2-lab.png'), Buffer.from(labShot.data, 'base64'));
    console.log('World V2 lab browser smoke passed:', labStatus);

    // Phase 2: exercise the actual OFFLINE-BAKED geographical profile in
    // Chrome, including island-to-ocean transitions and no cell fetch errors.
    await cdp.send('Page.navigate', { url: serverUrl + 'world-v2-geography.html?functionalQA=1' });
    await poll(async () => await cdp.eval(
      "(document.querySelector('#status')?.textContent ?? '').includes('baked geography tiles:')"
    ), 'Phase 2 geography lab rendered', 35000);
    await poll(async () => await cdp.eval(
      "Number((document.querySelector('#status')?.textContent ?? '').match(/Resident cells: (\\d+)/)?.[1] ?? 0) > 0"
    ), 'Phase 2 geography tiles loaded', 35000);
    // Runtime acceptance: the active camera is the SAME perspective used
    // in Hearthmere and the player actually snaps onto streamed ground.
    await poll(async () => await cdp.eval(
      "!!window.__worldV2FunctionalQA && window.__worldV2FunctionalQA.snapshot().groundY !== null"
    ), 'V2 ground collision ready', 25000);
    const beforeMovement = await cdp.eval('window.__worldV2FunctionalQA.snapshot()');
    if (beforeMovement.camera !== 'PerspectiveCamera' ||
      beforeMovement.cameraDistance < 12 || beforeMovement.cameraDistance > 28 ||
      beforeMovement.atlasPages < 60 ||
      Math.abs(beforeMovement.y - beforeMovement.groundY) > 0.3 ||
      !beforeMovement.walkable) {
      throw new Error('V2 camera/ground/page contract violation: ' + JSON.stringify(beforeMovement));
    }
    const pathProbe = await cdp.eval('window.__worldV2FunctionalQA.pathTo(4, 0)');
    if (pathProbe.status !== 'complete') {
      throw new Error('Local baked terrain navigation failed: ' + JSON.stringify(pathProbe));
    }
    await poll(async () => await cdp.eval(
      'window.__worldV2FunctionalQA.snapshot().resident >= 18'
    ), 'Nearby page tiles and collision meshes resident', 25000);
    // Headless software WebGL has wildly variable frame pacing. Hold the
    // actual keyboard input until the *player has moved*, not for a guessed
    // millisecond duration that can elapse entirely during frame compilation.
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68,
    });
    try {
      await poll(async () => await cdp.eval(
        'window.__worldV2FunctionalQA.snapshot().x > 0.3'
      ), 'V2 player moving over rendered ground', 30000);
    } catch (error) {
      const diagnostics = await cdp.eval('window.__worldV2FunctionalQA.snapshot()');
      throw new Error('Grounded WASD movement failed: ' + JSON.stringify(diagnostics) +
        ' / ' + String(error));
    } finally {
      await cdp.send('Input.dispatchKeyEvent', {
        type: 'keyUp', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68,
      });
    }
    const afterMovement = await cdp.eval('window.__worldV2FunctionalQA.snapshot()');
    if (Math.abs(afterMovement.y - afterMovement.groundY) > 0.3 ||
      afterMovement.fetchedPages < 1) {
      throw new Error('V2 movement lost ground lock or bypassed page fetch: ' + JSON.stringify(afterMovement));
    }
    const nativeCameraShot = await cdp.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: false,
    });
    writeFileSync(path.join(screenshots, 'world-v2-native-grounded-camera.png'),
      Buffer.from(nativeCameraShot.data, 'base64'));
    console.log('World V2 native camera, grounded movement and A* browser checks passed:',
      JSON.stringify(afterMovement));
    await cdp.eval("document.querySelector('#geo-jump-island').click()");
    await poll(async () => await cdp.eval(
      "((document.querySelector('#status')?.textContent ?? '').match(/Cell: (-?\\d+), (-?\\d+)/)?.slice(1).join(',') === '21,8')"
    ), 'Phase 2 jump to island', 20000);
    await cdp.eval("document.querySelector('#geo-jump-sea').click()");
    await poll(async () => await cdp.eval(
      "(document.querySelector('#status')?.textContent ?? '').includes('ocean')"
    ), 'Phase 2 island-to-sea traversal', 20000);
    await poll(async () => await cdp.eval(
      "document.querySelector('#geo-overview')?.naturalWidth > 0"
    ), 'precompiled full atlas overview image', 15000);
    const geoStatus = await cdp.eval("document.querySelector('#status')?.textContent?.trim()");
    const geographyTraffic = await cdp.eval(`({
      atlas: performance.getEntriesByType('resource')
        .some(entry => entry.name.includes('/world-v2/geography/atlas-index.json')),
      cells: performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('/world-v2/geography/cells/0/')).length,
    })`);
    if (!geographyTraffic.atlas || geographyTraffic.cells < 1 ||
      !geoStatus.includes('Geography: 5 landmasses') ||
      !geoStatus.includes('failures: 0')) {
      throw new Error('Geographic bake not loaded cleanly: ' + JSON.stringify({ geoStatus, geographyTraffic }));
    }
    const geoShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(path.join(screenshots, 'world-v2-geography.png'), Buffer.from(geoShot.data, 'base64'));
    console.log('Phase 2 geography browser smoke passed:', geoStatus);
    if (cdp.exceptions.length) throw new Error('Browser exceptions: ' + JSON.stringify(cdp.exceptions));
    console.log('Phase 0 Chrome smoke: 3/3 heroes entered the actual playable HUD; screenshots saved.');
    ws.close();
  } finally {
    if (cdp?.ws?.readyState === WebSocket.OPEN) cdp.ws.close();
    for (const child of children.reverse()) { try { child.kill('SIGTERM'); } catch {} }
    await delay(200);
    try { rmSync(profileDir, { recursive: true, force: true, maxRetries: 12, retryDelay: 250 }); }
    catch (error) {
      // CI's ephemeral runner will clean /tmp. A Chromium helper still
      // writing a profile after SIGTERM must not overturn passing gameplay QA.
      console.warn('Nonfatal Chrome profile cleanup:', String(error));
    }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
