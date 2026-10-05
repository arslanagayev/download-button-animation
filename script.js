import { mountReel, sleep } from './reel/reel.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const root = document.querySelector('.dl');
const button = root.querySelector('.dl-btn');
const label = root.querySelector('.dl-label');
const bar = root.querySelector('.dl-ring-bar');
const check = root.querySelector('.dl-check');
const done = root.querySelector('.dl-done');
const num = root.querySelector('.dl-num');
const line = root.querySelector('.dl-line');
const status = root.querySelector('[role="status"]');

const CIRC = 339.29;                 // ring circumference (matches --circ in style.css)
const CHECK = 36;                    // check icon size
const GAP = 10;                      // gap between the check and "Downloaded"
const DOWNLOAD_MS = 2100;
// Slight overshoot, like the spring the pill uses in the Figma prototype.
const OVERSHOOT = 'cubic-bezier(.34, 1.45, .64, 1)';
const SMOOTH = 'cubic-bezier(.65, 0, .35, 1)';

const setState = (state) => { root.dataset.state = state; };
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** Drives the ring, the giant counter and the bottom rule from one progress value. */
function setProgress(p) {
  bar.style.strokeDashoffset = `${CIRC * (1 - p)}`;
  num.textContent = String(Math.round(p * 100));
  line.style.setProperty('--p', p.toFixed(4));
}

/** Fake download: eases from 0 to 1 over `duration` ms on requestAnimationFrame. */
function fakeDownload(duration) {
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(easeInOut(t));
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

async function download() {
  if (root.dataset.state === 'done') { reset(); return; }
  if (root.dataset.state !== 'idle') return;
  setState('pressed');
  status.textContent = 'Downloading brand-assets.zip';
  const w = button.offsetWidth;
  const h = button.offsetHeight;

  if (!reducedMotion) {
    // 1. Press, then the pill collapses into a circle. The icon is anchored right, so it ends centred.
    button.animate([{ scale: 1 }, { scale: 0.95 }, { scale: 1 }], { duration: 320, easing: OVERSHOOT });
    await sleep(120);
    label.animate([{ opacity: 1, translate: '0 -50%' }, { opacity: 0, translate: '-18px -50%' }], { duration: 200, easing: 'ease-out', fill: 'forwards' });
    await button.animate([{ width: `${w}px` }, { width: `${h}px` }], { duration: 480, easing: SMOOTH, fill: 'forwards' }).finished;
  }

  // 2. Download: the ring draws, the arrow bobs (CSS) and the counter ticks up.
  setState('downloading');
  await fakeDownload(reducedMotion ? 300 : DOWNLOAD_MS);

  // 3. Done: the circle turns orange, the ring pulses away and the check draws itself.
  setState('done');
  status.textContent = 'Saved to Downloads';
  if (!reducedMotion) {
    await check.animate([{ strokeDashoffset: 24 }, { strokeDashoffset: 0 }], { duration: 350, delay: 120, easing: 'ease-out', fill: 'forwards' }).finished;

    // 4. Expand back into a pill; the check and "Downloaded" settle side by side, centred.
    const group = CHECK + GAP + done.offsetWidth;
    const checkX = -group / 2 + CHECK / 2;
    const doneX = -group / 2 + CHECK + GAP + done.offsetWidth / 2;
    const spring = { duration: 560, easing: OVERSHOOT, fill: 'forwards' };
    button.animate([{ width: `${h}px` }, { width: `${w}px` }], spring);
    check.animate([{ translate: '-50% -50%' }, { translate: `calc(-50% + ${checkX}px) -50%` }], spring);
    done.animate([
      { opacity: 0, translate: `calc(-50% + ${doneX + 18}px) -50%` },
      { opacity: 1, translate: `calc(-50% + ${doneX}px) -50%` },
    ], { duration: 360, delay: 200, easing: 'ease-out', fill: 'forwards' });
  } else {
    check.style.strokeDashoffset = '0';
    done.style.opacity = '1';
  }
}

function reset() {
  for (const el of [button, label, check, done]) el.getAnimations().forEach((a) => a.cancel());
  check.style.strokeDashoffset = '';
  done.style.opacity = '';
  setProgress(0);
  setState('idle');
  status.textContent = '';
}

button.addEventListener('click', download);
setProgress(0);

/* ---------- Reel mode ---------- */

mountReel({
  eyebrow: 'UI animation #05',
  title: 'Download',
  accent: 'Button.',
  demo: root,
  demoScale: 1.6,
  file: 'download-button-animation/script.js',
  code: `
// One progress value drives three things
function setProgress(p) {
  bar.style.strokeDashoffset = \`\${CIRC * (1 - p)}\`;
  num.textContent = String(Math.round(p * 100));
  line.style.setProperty('--p', p.toFixed(4));
}

// Collapse the pill into a circle...
await button.animate(
  [{ width: \`\${w}px\` }, { width: \`\${h}px\` }],
  { duration: 480, easing: SMOOTH, fill: 'forwards' },
).finished;`,
  reset,
  async play({ cursor, sleep, waitFor }) {
    await cursor.click(button);
    await waitFor(() => root.dataset.state === 'done');
    await sleep(2000);
  },
});
