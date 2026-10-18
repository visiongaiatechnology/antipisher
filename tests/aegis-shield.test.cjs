const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function createAegisSandbox(opts = {}) {
  const hostname = opts.hostname || 'example.com';
  const userAgent = opts.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
  const sessionData = { ...opts.sessionStorage };

  class FakeCanvasRenderingContext2D {
    constructor() {
      this._aegis_locked = false;
    }
    getImageData(sx, sy, sw, sh) {
      // 4x4 RGBA dummy image data
      const data = new Uint8ClampedArray(sw * sh * 4);
      data.fill(128); // baseline gray
      return { width: sw, height: sh, data };
    }
    measureText(text) {
      return { width: String(text).length * 10 };
    }
    putImageData(imageData, dx, dy) {
      this._lastPut = imageData;
    }
  }

  class FakeHTMLCanvasElement {
    constructor(w = 100, h = 100) {
      this.width = w;
      this.height = h;
      this._ctx = new FakeCanvasRenderingContext2D();
    }
    getContext(type) {
      if (type === '2d') return this._ctx;
      return null;
    }
    toDataURL(type) {
      return 'data:image/png;base64,FAKE_IMAGE_DATA';
    }
  }

  class FakeWebGLRenderingContext {
    getParameter(param) {
      if (param === 37445) return 'Real Hardware Vendor Inc.';
      if (param === 37446) return 'Real GPU Model 1234';
      return 'default';
    }
  }

  class FakeDynamicsCompressor {
    constructor() {
      this.threshold = { value: -24 };
      this.knee = { value: 30 };
    }
  }

  class FakeAudioContext {
    createDynamicsCompressor() {
      return new FakeDynamicsCompressor();
    }
  }

  class FakeElement {
    getBoundingClientRect() {
      return { x: 10, y: 20, width: 200, height: 100, top: 20, right: 210, bottom: 120, left: 10, toJSON: () => ({}) };
    }
  }

  const fakeWindow = {
    location: { hostname },
    navigator: { userAgent },
    sessionStorage: {
      getItem(k) { return sessionData[k] || null; },
      setItem(k, v) { sessionData[k] = String(v); },
      removeItem(k) { delete sessionData[k]; }
    },
    CanvasRenderingContext2D: FakeCanvasRenderingContext2D,
    HTMLCanvasElement: FakeHTMLCanvasElement,
    WebGLRenderingContext: FakeWebGLRenderingContext,
    WebGL2RenderingContext: FakeWebGLRenderingContext,
    AudioContext: FakeAudioContext,
    Element: FakeElement,
    devicePixelRatio: 2.0
  };

  const ctx = {
    window: fakeWindow,
    document: {},
    console,
    Math,
    Object,
    String,
    Uint8ClampedArray
  };
  ctx.globalThis = ctx;

  const context = vm.createContext(ctx);
  const aegisCode = fs.readFileSync(path.join(__dirname, '..', 'shared', 'aegis-engine.js'), 'utf8');
  vm.runInContext(aegisCode, context);

  return { ctx, fakeWindow, FakeCanvasRenderingContext2D, FakeHTMLCanvasElement, FakeWebGLRenderingContext, FakeAudioContext, FakeElement };
}

test('AEGIS: Injects deterministic pseudo-random noise into Canvas getImageData', () => {
  const { fakeWindow } = createAegisSandbox({ hostname: 'browserleaks.com' });
  const ctx2d = new fakeWindow.CanvasRenderingContext2D();

  const imgData = ctx2d.getImageData(0, 0, 10, 10);
  assert.ok(imgData && imgData.data);

  // Some pixels must deviate from the baseline 128 due to noise
  let noiseDetected = false;
  for (let i = 0; i < imgData.data.length; i += 4) {
    if (imgData.data[i] !== 128) {
      noiseDetected = true;
      break;
    }
  }
  assert.equal(noiseDetected, true, 'Canvas data must have pseudo-random noise applied');
});

test('AEGIS: Masks WebGL vendor and renderer with clean generic platform GPUs', () => {
  const { fakeWindow } = createAegisSandbox({ hostname: 'example.com', userAgent: 'Windows' });
  const gl = new fakeWindow.WebGLRenderingContext();

  const vendor = gl.getParameter(37445);
  const renderer = gl.getParameter(37446);

  assert.equal(vendor, 'NVIDIA Corporation');
  assert.equal(renderer, 'NVIDIA GeForce RTX 4090/PCIe/SSE2');

  // Verify Mac spoofing
  const { fakeWindow: macWin } = createAegisSandbox({ hostname: 'example.com', userAgent: 'Macintosh; Intel Mac OS X 10_15_7' });
  const macGl = new macWin.WebGLRenderingContext();
  assert.match(macGl.getParameter(37446), /Apple M2/);
});

test('AEGIS: Injects subtle noise into AudioContext dynamics compressor parameters', () => {
  const { fakeWindow } = createAegisSandbox({ hostname: 'example.com' });
  const audioCtx = new fakeWindow.AudioContext();
  const compressor = audioCtx.createDynamicsCompressor();

  assert.ok(typeof compressor.threshold.value === 'number');
  assert.notEqual(compressor.threshold.value, -24, 'Threshold value must be jittered');
  assert.ok(compressor.threshold.value > -30 && compressor.threshold.value < -18);
});

test('AEGIS: Cloaks hooked native functions to return [native code]', () => {
  const { fakeWindow } = createAegisSandbox({ hostname: 'example.com' });
  const str = fakeWindow.CanvasRenderingContext2D.prototype.getImageData.toString();
  assert.match(str, /function\s+getImageData\(\)\s*\{\s*\[native code\]\s*\}/);

  const webglStr = fakeWindow.WebGLRenderingContext.prototype.getParameter.toString();
  assert.match(webglStr, /function\s+getParameter\(\)\s*\{\s*\[native code\]\s*\}/);
});

test('AEGIS: Sensitive domains (X / Twitter) run in Zero-Touch mode without layout distortion', () => {
  const { fakeWindow } = createAegisSandbox({ hostname: 'x.com' });
  const aegis = fakeWindow.__AEGIS_OMEGA__;
  assert.ok(aegis);

  const cfg = aegis.getConfig();
  assert.equal(cfg.SPOOF_WEBGL, false, 'WebGL spoofing must be disabled on X.com');
  assert.equal(cfg.SPOOF_CANVAS, false, 'Canvas spoofing must be disabled on X.com');
  assert.equal(cfg.SPOOF_FONTS, false, 'Font spoofing must be disabled on X.com');
  assert.equal(cfg.SPOOF_RECTS, false, 'Rect spoofing must be disabled on X.com');
});

test('AEGIS: Identity seed can be dynamically rotated', () => {
  const { fakeWindow } = createAegisSandbox({ hostname: 'example.com' });
  const aegis = fakeWindow.__AEGIS_OMEGA__;

  const initialSeed = aegis.getSeed();
  assert.ok(typeof initialSeed === 'string' && initialSeed.length >= 8);

  const newSeed = aegis.rotateSeed();
  assert.ok(typeof newSeed === 'string' && newSeed.length >= 8);
  // Probabilistically new random seed differs
  assert.notEqual(initialSeed, newSeed);
});

test('AEGIS: Respects disabled configuration via sessionStorage', () => {
  const { fakeWindow } = createAegisSandbox({
    hostname: 'example.com',
    sessionStorage: { aegis_protection_enabled: 'false' }
  });
  const aegis = fakeWindow.__AEGIS_OMEGA__;
  assert.ok(aegis);
  assert.equal(aegis.getConfig().ENABLED, false, 'AEGIS must be disabled when flag is false');
});

