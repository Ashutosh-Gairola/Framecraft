/**
 * Life on Earth — one continuous journey, as a pure function of film time.
 *
 * Two stages share one WebGL renderer: the reef (sea.js) and the land (land.js), where the
 * coast, the countryside, the city, and the forest lie on one map under one moving sun. The
 * seam is the surface break: the camera rises with the bubbles into bright water, and comes
 * out through a sheet of droplets on the lens. No cuts, no clock, no Math.random().
 * skills/html-anime-3d-actor/SKILL.md describes the method.
 */

import { THREE, W, H, canvas2d, mulberry32, fbm, smoothstep } from "./lib.js";
import { sea } from "./sea.js";
import { land } from "./land.js";

export const DURATION = 120;
const SWAP = 19.65;

let shared = null;

/** A scene's view: the journey is built once per page; each scene's canvas copies the frame. */
export function createWorld(canvas, PAINT) {
  if (!shared) shared = buildJourney(PAINT);
  const ctx = canvas.getContext("2d");
  return {
    render(t) {
      shared.render(t);
      ctx.drawImage(shared.frame, 0, 0, canvas.width, canvas.height);
    },
  };
}

/** Bright water seen from just under the surface: rippled light. */
function surfaceImage(PAINT) {
  const w = 480;
  const h = 270;
  const c = canvas2d(w, h);
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  const a = new THREE.Color(PAINT.cyan).lerp(new THREE.Color(PAINT.sclera), 0.55);
  const b = new THREE.Color(PAINT.sclera);
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const n = fbm(x / 40, y / 40, 4);
      const k = Math.pow(Math.abs(Math.sin(n * 14)), 6);
      const col = a.clone().lerp(b, k * 0.8 + (1 - y / h) * 0.2);
      const i = (y * w + x) * 4;
      img.data[i] = col.r * 255;
      img.data[i + 1] = col.g * 255;
      img.data[i + 2] = col.b * 255;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  return c;
}

/** Droplets on the lens: clear beads with a bright rim and a dark edge, running down. */
function dropletImage() {
  const c = canvas2d(W, H);
  const g = c.getContext("2d");
  const rand = mulberry32(55);
  for (let i = 0; i < 140; i += 1) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 6 + rand() ** 2 * 46;
    const grad = g.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.10)");
    grad.addColorStop(0.75, "rgba(255,255,255,0.05)");
    grad.addColorStop(0.9, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(20,30,40,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(x, y, r, r * (0.85 + rand() * 0.3), 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.75)";
    g.beginPath();
    g.ellipse(x - r * 0.35, y - r * 0.4, r * 0.14, r * 0.09, -0.6, 0, Math.PI * 2);
    g.fill();
    // A trail where the drop ran.
    if (rand() < 0.35) {
      g.fillStyle = "rgba(255,255,255,0.06)";
      g.fillRect(x - r * 0.25, y - r * 4, r * 0.5, r * 4);
    }
  }
  return c;
}

function buildJourney(PAINT) {
  const glCanvas = canvas2d(W, H);
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const frame = canvas2d(W, H);
  const fx = frame.getContext("2d");

  const stages = { sea: sea(PAINT), land: land(PAINT, renderer) };
  const surface = surfaceImage(PAINT);
  const drops = dropletImage();

  // The break: bright water fills the frame as the camera reaches the surface, and the land
  // comes up through droplets running off the lens.
  const brightAt = (t) => smoothstep(18.9, SWAP - 0.05, t) * (1 - smoothstep(SWAP + 0.05, SWAP + 0.75, t));
  const dropsAt = (t) => smoothstep(SWAP - 0.2, SWAP + 0.1, t) * (1 - smoothstep(SWAP + 0.8, SWAP + 2.6, t));

  function render(t) {
    const s = t < SWAP ? stages.sea : stages.land;
    s.update(t);
    renderer.render(s.scene, s.camera);
    fx.globalAlpha = 1;
    fx.drawImage(glCanvas, 0, 0);
    const b = brightAt(t);
    if (b > 0.002) {
      fx.globalAlpha = Math.min(1, b * 1.1);
      const shift = (t * 40) % 60;
      fx.drawImage(surface, shift, 0, surface.width - 60, surface.height, 0, 0, W, H);
    }
    const d = dropsAt(t);
    if (d > 0.002) {
      fx.globalAlpha = d;
      // The drops slide down as the water runs off.
      const fall = Math.max(0, t - SWAP) * 120;
      fx.drawImage(drops, 0, fall);
      fx.drawImage(drops, 0, fall - H);
    }
    fx.globalAlpha = 1;
  }
  return { render, frame };
}
