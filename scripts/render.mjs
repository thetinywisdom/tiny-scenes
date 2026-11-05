import { createServer } from 'vite';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PRESETS = {
  '1080p': { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

function usage() {
  return `Usage: npm run render -- <scene> [options]

Options:
  --preset 1080p|vertical|square   Frame size (default 1080p)
  --seconds N                      Loop length for video (default 8)
  --fps N                          Frames per second (default 30)
  --still                          Write one PNG instead of an MP4
  --frame N                        Frame index for --still (default 0)
  --out path                       Output file
  --check                          Open the interactive page, assert no console
                                   errors, and exercise orbit controls
`;
}

function parseArgs(argv) {
  const out = {
    scene: null,
    preset: '1080p',
    seconds: 8,
    fps: 30,
    still: false,
    frame: 0,
    out: null,
    check: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--preset') out.preset = argv[++i];
    else if (arg === '--seconds') out.seconds = Number(argv[++i]);
    else if (arg === '--fps') out.fps = Number(argv[++i]);
    else if (arg === '--still') out.still = true;
    else if (arg === '--frame') out.frame = Number(argv[++i]);
    else if (arg === '--out') out.out = argv[++i];
    else if (arg === '--check') out.check = true;
    else if (!arg.startsWith('--') && !out.scene) out.scene = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function assertPng(buffer, width, height) {
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('Capture is not a PNG');
  }
  const size = pngSize(buffer);
  if (size.width !== width || size.height !== height) {
    throw new Error(`Expected ${width}x${height}, got ${size.width}x${size.height}`);
  }
}

async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });
}

function watchConsole(page, errors) {
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
}

async function captureFrame(page, frame) {
  const payload = await page.evaluate((index) => {
    const stats = window.__timeline.setFrame(index);
    const png = document.querySelector('#view').toDataURL('image/png');
    return { stats, png };
  }, frame);
  const buffer = Buffer.from(payload.png.split(',')[1], 'base64');
  return { stats: payload.stats, buffer };
}

function encodeMp4({ fps, framesDir, outFile }) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-framerate', String(fps),
      '-start_number', '0',
      '-i', path.join(framesDir, 'frame_%04d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-crf', '18',
      outFile,
    ];
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let log = '';
    proc.stderr.on('data', (chunk) => {
      log += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${log.slice(-2000)}`));
    });
  });
}

async function checkInteractive(page, origin, scene) {
  const errors = [];
  watchConsole(page, errors);

  await page.goto(origin, { waitUntil: 'networkidle' });
  const hrefs = await page.locator('a.scene').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  if (!hrefs.some((href) => href && href.includes(`scenes/${scene}`))) {
    throw new Error(`Index does not link to scenes/${scene}`);
  }

  await page.goto(`${origin}scenes/${scene}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__timeline && window.__timeline.ready);
  const orbitOn = await page.evaluate(() => window.__orbit.enabled);
  if (!orbitOn) throw new Error('Expected orbit controls to be enabled');

  const before = await page.evaluate(() => {
    const p = window.__stage.camera.position;
    const t = window.__orbit.controls.target;
    return { x: p.x, y: p.y, z: p.z, tx: t.x, ty: t.y, tz: t.z };
  });

  const box = await page.locator('#view').boundingBox();
  const cx = box.x + box.width * 0.5;
  const cy = box.y + box.height * 0.55;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 220, cy + 30, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(250);

  const afterDrag = await page.evaluate(() => {
    const p = window.__stage.camera.position;
    return { x: p.x, y: p.y, z: p.z };
  });
  const moved = Math.hypot(afterDrag.x - before.x, afterDrag.y - before.y, afterDrag.z - before.z);
  if (moved < 0.05) throw new Error(`Orbit drag did not move the camera (delta ${moved.toFixed(4)})`);

  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(250);
  const afterZoom = await page.evaluate(() => {
    const p = window.__stage.camera.position;
    const t = window.__orbit.controls.target;
    return Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z);
  });
  const beforeDist = Math.hypot(before.x - before.tx, before.y - before.ty, before.z - before.tz);
  if (Math.abs(afterZoom - beforeDist) < 0.05) {
    throw new Error('Scroll zoom did not change camera distance');
  }

  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cx + 120, cy + 40, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(250);
  const afterPan = await page.evaluate(() => {
    const t = window.__orbit.controls.target;
    return { x: t.x, y: t.y, z: t.z };
  });
  const panned = Math.hypot(afterPan.x - before.tx, afterPan.y - before.ty, afterPan.z - before.tz);
  if (panned < 0.02) throw new Error('Right-drag pan did not move the orbit target');

  for (let i = 0; i < 10; i++) {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 200, { steps: 6 });
    await page.mouse.up();
  }
  await page.waitForTimeout(400);
  const lowY = await page.evaluate(() => window.__stage.camera.position.y);
  if (lowY < 0.07) throw new Error(`Camera went under the floor (y=${lowY.toFixed(3)})`);

  await page.locator('body').click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('d');
  await page.waitForFunction(() => (document.querySelector('.stats')?.textContent || '').includes('draws'));
  const statsText = await page.locator('.stats').innerText();
  if (!/draws\s+\d+/.test(statsText) || !/tris\s+\d+/.test(statsText)) {
    throw new Error(`Stats readout missing draw calls:\n${statsText}`);
  }

  if (errors.length) {
    throw new Error(`Console errors:\n${errors.join('\n')}`);
  }
  console.log(`check ok — orbit drag ${moved.toFixed(2)}, zoom dist ${afterZoom.toFixed(2)}, pan ${panned.toFixed(2)}`);
  console.log(statsText);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.scene) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }
  const preset = PRESETS[args.preset];
  if (!preset) throw new Error(`Unknown preset "${args.preset}". Use 1080p, vertical, or square.`);
  if (!Number.isFinite(args.seconds) || args.seconds <= 0) throw new Error('--seconds must be a positive number');
  if (!Number.isFinite(args.fps) || args.fps <= 0) throw new Error('--fps must be a positive number');

  const server = await createServer({
    server: { host: '127.0.0.1', port: 5173, strictPort: false },
    logLevel: 'warn',
  });
  await server.listen();
  const address = server.httpServer.address();
  const origin = `http://127.0.0.1:${address.port}/`;

  const browser = await launchBrowser();
  try {
    if (args.check) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
      await checkInteractive(page, origin, args.scene);
      return;
    }

    const { width, height } = preset;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    watchConsole(page, errors);

    const frameCount = Math.max(1, Math.round(args.fps * args.seconds));
    const url = `${origin}scenes/${args.scene}/?render=1&fps=${args.fps}&seconds=${args.seconds}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__timeline && window.__timeline.ready);

    if (errors.length) throw new Error(`Console errors:\n${errors.join('\n')}`);

    const still = args.still || frameCount === 1;
    const outFile = args.out
      ? path.resolve(args.out)
      : path.resolve('renders', `${args.scene}-${args.preset}.${still ? 'png' : 'mp4'}`);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });

    if (still) {
      const { stats, buffer } = await captureFrame(page, args.frame);
      assertPng(buffer, width, height);
      fs.writeFileSync(outFile, buffer);
      console.log(JSON.stringify({ out: outFile, ...stats }, null, 2));
    } else {
      const framesDir = path.resolve('renders', `frames-${args.scene}-${args.preset}`);
      fs.mkdirSync(framesDir, { recursive: true });
      let firstStats = null;
      for (let frame = 0; frame < frameCount; frame++) {
        const { stats, buffer } = await captureFrame(page, frame);
        assertPng(buffer, width, height);
        fs.writeFileSync(path.join(framesDir, `frame_${String(frame).padStart(4, '0')}.png`), buffer);
        if (frame === 0) firstStats = stats;
        if (frame % 30 === 0 || frame === frameCount - 1) {
          console.log(`frame ${frame + 1}/${frameCount}`);
        }
      }
      await encodeMp4({ fps: args.fps, framesDir, outFile });
      fs.rmSync(framesDir, { recursive: true, force: true });
      console.log(JSON.stringify({ out: outFile, frames: frameCount, ...firstStats }, null, 2));
    }

    if (errors.length) throw new Error(`Console errors during render:\n${errors.join('\n')}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
