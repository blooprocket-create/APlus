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
    if (cdp.exceptions.length) throw new Error('Browser exceptions: ' + JSON.stringify(cdp.exceptions));
    console.log('Phase 0 Chrome smoke: 3/3 heroes entered the actual playable HUD; screenshots saved.');
    ws.close();
  } finally {
    if (cdp?.ws?.readyState === WebSocket.OPEN) cdp.ws.close();
    for (const child of children.reverse()) { try { child.kill('SIGTERM'); } catch {} }
    await delay(200);
    rmSync(profileDir, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
