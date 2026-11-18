/*
 * AEGIS PROTOCOL :: OMEGA (V17.1 Engine)
 * Integrated into Antipisher · VisionGaiaTechnology
 * 100% Offline, Zero-Telemetry Browser Anti-Fingerprinting & Tracking Defense
 *
 * Farbling Protection for Canvas, WebGL, AudioContext, Font Metrics & ClientRects.
 */

(() => {
  'use strict';

  const WIN = (typeof window !== 'undefined') ? window : globalThis;
  if (WIN.__AEGIS_ACTIVE__) return;
  WIN.__AEGIS_ACTIVE__ = true;

  const DOC = (typeof document !== 'undefined') ? document : null;
  const HOST = (WIN.location && WIN.location.hostname) ? WIN.location.hostname.toLowerCase() : '';

  // --- DOMAIN INTELLIGENCE ---
  // Layout- and bot-detection sensitive services (Zero-Touch or Adaptive)
  const IS_X = HOST.includes('x.com') || HOST.includes('twitter.com');
  const IS_LAYOUT_SENSITIVE = (
    HOST.includes('tuta') ||
    HOST.includes('instagram.com') ||
    HOST.includes('facebook.com') ||
    HOST.includes('figma.com') ||
    HOST.includes('docs.google.com') ||
    HOST.includes('sheets.google.com') ||
    IS_X
  );

  // --- SYSTEM CONFIGURATION ---
  const isExplicitlyDisabled = () => {
    try {
      if (WIN.sessionStorage && WIN.sessionStorage.getItem('aegis_protection_enabled') === 'false') return true;
    } catch { /* ignore */ }
    try {
      if (DOC && DOC.documentElement && DOC.documentElement.getAttribute('data-aegis-protection') === 'false') return true;
    } catch { /* ignore */ }
    return false;
  };

  const CONFIG = {
    ENABLED: !isExplicitlyDisabled(),
    SESSION_PERSISTENCE: true,
    NOISE_AMPLITUDE: 3,
    NOISE_DENSITY: 0.95,

    // Zero-Touch for sensitive anti-bot hosts (like X)
    SPOOF_WEBGL: !IS_X,
    SPOOF_AUDIO: !IS_X,
    SPOOF_CANVAS: !IS_X,
    SPOOF_DPI: !IS_X,

    // Prevent layout/click misalignment on layout-sensitive apps
    SPOOF_RECTS: !IS_LAYOUT_SENSITIVE,
    SPOOF_FONTS: !IS_LAYOUT_SENSITIVE,

    // AEGIS Tracker & Privacy Shield
    DEFUSE_TRACKERS: true,
    SANITIZE_URL_PARAMS: true,
    DEFUSE_BEACONS: true,

    // VGT Ad Shield & Cosmetic Filtering (uBlock-inspired)
    AD_SHIELD: true,
    COSMETIC_FILTERING: true,
    ANTI_ADBLOCK_DEFUSER: true,
    POPUNDER_DEFENSE: true,

    // GeDefense Light (DOM Hypervisor & Script Inoculation)
    GEDEFENSE_LIGHT: true,
    SELF_XSS_WARNING: true,
    BLOCK_PROTOCOL_INJECTION: true,

    CANVAS_WRITEBACK: true,
    DEBUG_MODE: false
  };

  if (DOC && typeof DOC.addEventListener === 'function') {
    DOC.addEventListener('aegis:configure', (e) => {
      if (e && e.detail && typeof e.detail === 'object') {
        Object.assign(CONFIG, e.detail);
        if (typeof injectCosmeticCSS === 'function') {
          if (CONFIG.AD_SHIELD && CONFIG.COSMETIC_FILTERING) {
            injectCosmeticCSS();
          } else if (typeof removeCosmeticCSS === 'function') {
            removeCosmeticCSS();
          }
        }
      }
    });
    DOC.addEventListener('aegis:rotate-seed', () => {
      if (typeof AegisInterface !== 'undefined' && AegisInterface.rotateSeed) {
        AegisInterface.rotateSeed();
      }
    });
  }

  // --- SEED ENGINE ---
  let SEED = '';
  const initSeed = () => {
    const key = 'aegis_omega_seed';
    let seed = '';
    try {
      if (CONFIG.SESSION_PERSISTENCE && WIN.sessionStorage) {
        seed = WIN.sessionStorage.getItem(key) || '';
      }
    } catch { /* storage access restricted */ }

    if (!seed) {
      seed = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
      try {
        if (WIN.sessionStorage) WIN.sessionStorage.setItem(key, seed);
      } catch { /* ignore */ }
    }
    return seed;
  };
  SEED = initSeed();

  // 32-bit FNV-1a deterministic PRNG
  const prng = (input) => {
    let h = 0x811c9dc5;
    const s = SEED + String(input);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return ((h >>> 0) / 4294967296);
  };

  // --- NATIVE CLOAKING ---
  const cloak = (target, original, name) => {
    const fnName = name || (original && original.name) || '';
    const nativeCode = `function ${fnName}() { [native code] }`;
    try {
      Object.defineProperty(target, 'toString', {
        value: () => nativeCode,
        writable: true,
        enumerable: false,
        configurable: true
      });
    } catch { /* ignore */ }
    return target;
  };

  // =========================================================================
  // DEFENSE MODULES
  // =========================================================================

  // 1. Canvas Fingerprint Noise Defense
  const injectCanvasDefense = () => {
    if (!CONFIG.ENABLED || !CONFIG.SPOOF_CANVAS || !WIN.CanvasRenderingContext2D || !WIN.HTMLCanvasElement) return;

    const applyNoise = (imageData) => {
      if (!imageData || !imageData.data) return imageData;
      const w = imageData.width;
      const h = imageData.height;
      const data = imageData.data;
      for (let i = 0; i < h; i += 2) {
        if (prng(i) > CONFIG.NOISE_DENSITY) continue;
        for (let j = 0; j < w; j += 4) {
          const idx = (i * w + j) * 4;
          const n = Math.floor(prng(idx) * CONFIG.NOISE_AMPLITUDE * 2) - CONFIG.NOISE_AMPLITUDE;
          data[idx] = Math.max(0, Math.min(255, data[idx] + n));
          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + n));
          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + n));
        }
      }
      return imageData;
    };

    const originalGetImageData = WIN.CanvasRenderingContext2D.prototype.getImageData;
    if (typeof originalGetImageData === 'function') {
      const hookedGetImageData = function(sx, sy, sw, sh) {
        const res = originalGetImageData.apply(this, arguments);
        return applyNoise(res);
      };
      WIN.CanvasRenderingContext2D.prototype.getImageData = cloak(hookedGetImageData, originalGetImageData, 'getImageData');
    }

    const originalToDataURL = WIN.HTMLCanvasElement.prototype.toDataURL;
    if (typeof originalToDataURL === 'function') {
      const hookedToDataURL = function() {
        if (this.width > 0 && this.height > 0 && CONFIG.CANVAS_WRITEBACK) {
          try {
            const ctx = this.getContext('2d');
            if (ctx && !ctx._aegis_locked) {
              ctx._aegis_locked = true;
              const imgData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
              applyNoise(imgData);
              ctx.putImageData(imgData, 0, 0);
              ctx._aegis_locked = false;
            }
          } catch { /* canvas might be tainted or WebGL */ }
        }
        return originalToDataURL.apply(this, arguments);
      };
      WIN.HTMLCanvasElement.prototype.toDataURL = cloak(hookedToDataURL, originalToDataURL, 'toDataURL');
    }
  };

  // 2. WebGL Hardware Masking
  const injectWebGLSpoof = () => {
    if (!CONFIG.ENABLED || !CONFIG.SPOOF_WEBGL) return;

    const GPU_POOLS = {
      MAC: [{ vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)' }],
      WIN: [{ vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 4090/PCIe/SSE2' }],
      LINUX: [{ vendor: 'Intel Open Source Technology Center', renderer: 'Mesa Intel(R) UHD Graphics 630 (CFL GT2)' }]
    };

    const ua = (WIN.navigator && WIN.navigator.userAgent) ? WIN.navigator.userAgent : '';
    const isMac = ua.includes('Mac');
    const isLinux = ua.includes('Linux');
    const selected = isMac ? GPU_POOLS.MAC[0] : (isLinux ? GPU_POOLS.LINUX[0] : GPU_POOLS.WIN[0]);

    const makeHandler = (originalGetParameter) => {
      const hooked = function(param) {
        if (param === 37445) return selected.vendor;   // UNMASKED_VENDOR_WEBGL
        if (param === 37446) return selected.renderer; // UNMASKED_RENDERER_WEBGL
        return originalGetParameter.apply(this, arguments);
      };
      return cloak(hooked, originalGetParameter, 'getParameter');
    };

    if (WIN.WebGLRenderingContext && WIN.WebGLRenderingContext.prototype.getParameter) {
      WIN.WebGLRenderingContext.prototype.getParameter = makeHandler(WIN.WebGLRenderingContext.prototype.getParameter);
    }
    if (WIN.WebGL2RenderingContext && WIN.WebGL2RenderingContext.prototype.getParameter) {
      WIN.WebGL2RenderingContext.prototype.getParameter = makeHandler(WIN.WebGL2RenderingContext.prototype.getParameter);
    }
    WIN._aegis_gpu = selected.renderer;
  };

  // 3. AudioContext Fingerprint Defense
  const injectAudioSpoof = () => {
    if (!CONFIG.ENABLED || !CONFIG.SPOOF_AUDIO) return;

    const contextClasses = [WIN.AudioContext, WIN.webkitAudioContext, WIN.OfflineAudioContext];
    contextClasses.forEach((AudioCls) => {
      if (!AudioCls || !AudioCls.prototype || !AudioCls.prototype.createDynamicsCompressor) return;

      const originalCreateDynamicsCompressor = AudioCls.prototype.createDynamicsCompressor;
      const hookedCreateDynamicsCompressor = function() {
        const compressor = originalCreateDynamicsCompressor.apply(this, arguments);
        const noise = (prng(500) - 0.5) * 5;
        try {
          if (compressor.threshold) {
            const originalVal = compressor.threshold.value;
            Object.defineProperty(compressor.threshold, 'value', {
              get: () => originalVal + (noise * 0.05),
              configurable: true
            });
          }
          if (compressor.knee) {
            const originalVal = compressor.knee.value;
            Object.defineProperty(compressor.knee, 'value', {
              get: () => originalVal + (noise * 0.1),
              configurable: true
            });
          }
        } catch { /* ignore */ }
        return compressor;
      };
      AudioCls.prototype.createDynamicsCompressor = cloak(hookedCreateDynamicsCompressor, originalCreateDynamicsCompressor, 'createDynamicsCompressor');
    });
  };

  // 4. Font Measurement Jitter
  const injectFontSpoof = () => {
    if (!CONFIG.ENABLED || !CONFIG.SPOOF_FONTS || !WIN.CanvasRenderingContext2D) return;

    const originalMeasureText = WIN.CanvasRenderingContext2D.prototype.measureText;
    if (typeof originalMeasureText === 'function') {
      const hookedMeasureText = function(text) {
        const metrics = originalMeasureText.apply(this, arguments);
        if (metrics && typeof metrics.width === 'number') {
          const noise = (prng(String(text).length) - 0.5) * 0.0001;
          try {
            Object.defineProperty(metrics, 'width', {
              value: metrics.width + noise,
              writable: false,
              configurable: true
            });
          } catch { /* ignore */ }
        }
        return metrics;
      };
      WIN.CanvasRenderingContext2D.prototype.measureText = cloak(hookedMeasureText, originalMeasureText, 'measureText');
    }
  };

  // 5. DOM ClientRect Layout Jitter
  const injectRectSpoof = () => {
    if (!CONFIG.ENABLED || !CONFIG.SPOOF_RECTS || !WIN.Element) return;

    const originalGetBoundingClientRect = WIN.Element.prototype.getBoundingClientRect;
    if (typeof originalGetBoundingClientRect === 'function') {
      const hookedGetBoundingClientRect = function() {
        const rect = originalGetBoundingClientRect.apply(this, arguments);
        if (!rect) return rect;
        const noise = (prng(rect.width + rect.height) - 0.5) * 0.00002;
        return {
          x: rect.x + noise,
          y: rect.y + noise,
          width: rect.width + noise,
          height: rect.height + noise,
          top: rect.top + noise,
          bottom: rect.bottom + noise,
          left: rect.left + noise,
          right: rect.right + noise,
          toJSON: () => (typeof rect.toJSON === 'function' ? rect.toJSON() : rect)
        };
      };
      WIN.Element.prototype.getBoundingClientRect = cloak(hookedGetBoundingClientRect, originalGetBoundingClientRect, 'getBoundingClientRect');
    }
  };

  // 6. DevicePixelRatio Normalization
  const injectDPISpoof = () => {
    if (!CONFIG.ENABLED || !CONFIG.SPOOF_DPI) return;
    try {
      Object.defineProperty(WIN, 'devicePixelRatio', {
        get: () => 1.0,
        configurable: true
      });
    } catch { /* ignore */ }
  };

  const notifyTrackerBlocked = (detail) => {
    try {
      if (DOC && typeof DOC.dispatchEvent === 'function') {
        const CEvent = (WIN && WIN.CustomEvent) || (typeof CustomEvent !== 'undefined' ? CustomEvent : null);
        if (CEvent) {
          DOC.dispatchEvent(new CEvent('aegis:tracker-blocked', { detail: { target: detail } }));
        }
      }
    } catch { /* ignore */ }
  };

  const safeAsync = (fn) => {
    if (typeof fn !== 'function') return;
    const timer = (WIN && typeof WIN.setTimeout === 'function')
      ? WIN.setTimeout
      : (typeof setTimeout === 'function' ? setTimeout : null);
    if (timer) {
      timer(fn, 0);
    } else {
      try { fn(); } catch { /* ignore */ }
    }
  };

  // 7. Surrogate Safe Defusers (Google Analytics, GTM, FB, TikTok, Hotjar, Clarity, etc.)
  const injectSurrogates = () => {
    if (!CONFIG.ENABLED || !CONFIG.DEFUSE_TRACKERS) return;

    // Google Analytics (ga / analytics.js / ga.js)
    try {
      if (!WIN.ga) {
        const Tracker = function() {};
        Tracker.prototype.get = () => {};
        Tracker.prototype.set = () => {};
        Tracker.prototype.send = function(...args) {
          notifyTrackerBlocked('ga.send');
          const last = args[args.length - 1];
          if (last && typeof last === 'object' && typeof last.hitCallback === 'function') {
            safeAsync(last.hitCallback);
          } else if (typeof args[0] === 'object' && typeof args[0].hitCallback === 'function') {
            safeAsync(args[0].hitCallback);
          }
        };
        const ga = function(...args) {
          const last = args[args.length - 1];
          if (last && typeof last === 'object' && typeof last.hitCallback === 'function') {
            safeAsync(last.hitCallback);
          } else if (typeof last === 'function') {
            safeAsync(() => last(new Tracker()));
          }
        };
        ga.create = () => new Tracker();
        ga.getByName = () => new Tracker();
        ga.getAll = () => [new Tracker()];
        ga.remove = () => {};
        ga.loaded = true;
        cloak(ga, null, 'ga');
        WIN.ga = ga;
        WIN.GoogleAnalyticsObject = 'ga';
      }
    } catch { /* ignore */ }

    // dataLayer (Google Tag Manager)
    try {
      WIN.dataLayer = WIN.dataLayer || [];
      if (WIN.dataLayer && typeof WIN.dataLayer.push === 'function') {
        const origPush = WIN.dataLayer.push.bind(WIN.dataLayer);
        WIN.dataLayer.push = function(...items) {
          for (const item of items) {
            if (item && typeof item === 'object') {
              if (typeof item.eventCallback === 'function') {
                const cb = item.eventCallback;
                item.eventCallback = () => {};
                safeAsync(cb);
                notifyTrackerBlocked('dataLayer.eventCallback');
              }
            }
          }
          return origPush(...items);
        };
        cloak(WIN.dataLayer.push, null, 'push');
      }
    } catch { /* ignore */ }

    // gtag
    try {
      if (!WIN.gtag) {
        const gtag = function(...args) {
          notifyTrackerBlocked('gtag');
          const last = args[args.length - 1];
          if (last && typeof last === 'object' && typeof last.event_callback === 'function') {
            safeAsync(last.event_callback);
          }
        };
        cloak(gtag, null, 'gtag');
        WIN.gtag = gtag;
      }
    } catch { /* ignore */ }

    // Meta / Facebook Pixel (fbq)
    try {
      if (!WIN.fbq) {
        const fbq = function() {
          notifyTrackerBlocked('fbq');
        };
        fbq.push = fbq;
        fbq.loaded = true;
        fbq.version = '2.0';
        fbq.queue = [];
        cloak(fbq, null, 'fbq');
        WIN.fbq = fbq;
        WIN._fbq = fbq;
      }
    } catch { /* ignore */ }

    // TikTok Pixel (ttq)
    try {
      if (!WIN.ttq) {
        const ttq = {
          load: () => notifyTrackerBlocked('ttq.load'),
          page: () => {},
          track: () => notifyTrackerBlocked('ttq.track'),
          identify: () => {},
          instances: {}
        };
        WIN.ttq = ttq;
      }
    } catch { /* ignore */ }

    // Microsoft Clarity
    try {
      if (!WIN.clarity) {
        const clarity = function() { notifyTrackerBlocked('clarity'); };
        cloak(clarity, null, 'clarity');
        WIN.clarity = clarity;
      }
    } catch { /* ignore */ }

    // Hotjar (hj)
    try {
      if (!WIN.hj) {
        const hj = function() { notifyTrackerBlocked('hj'); };
        cloak(hj, null, 'hj');
        WIN.hj = hj;
        WIN._hjSettings = WIN._hjSettings || { hjid: 0, hjsv: 6 };
      }
    } catch { /* ignore */ }

    // Yandex Metrika (ym)
    try {
      if (!WIN.ym) {
        const ym = function(id, action, ...args) {
          notifyTrackerBlocked('ym');
          const last = args[args.length - 1];
          if (last && typeof last === 'object' && typeof last.callback === 'function') {
            safeAsync(last.callback);
          }
        };
        cloak(ym, null, 'ym');
        WIN.ym = ym;
      }
    } catch { /* ignore */ }

    // Additional safe stubs
    try {
      WIN._hsq = WIN._hsq || [];
      if (!WIN.pintrk) {
        WIN.pintrk = function() {};
        cloak(WIN.pintrk, null, 'pintrk');
      }
    } catch { /* ignore */ }
  };

  // 8. Beacon & Telemetry Defusal (+ Anti-Magecart Exfiltration Guard)
  let isMaliciousResourceUrlRef = () => false;

  const injectBeaconDefense = () => {
    if (!CONFIG.ENABLED || !WIN.navigator || !WIN.navigator.sendBeacon) return;
    try {
      const origSendBeacon = WIN.navigator.sendBeacon.bind(WIN.navigator);
      const trackingRegex = /(google-analytics|analytics|telemetry|doubleclick|clarity|hotjar|facebook\.com\/tr|stats|collector|event-log|bat\.bing|optimizely|1688360\.cc|webshell\.lol|linkforge\.cc|ios-hack\.icu|\/card\.php|\/hit\.php)/i;

      const defendedSendBeacon = function(url, data) {
        const urlStr = String(url || '');
        if (CONFIG.DEFUSE_TRACKERS && CONFIG.DEFUSE_BEACONS !== false && trackingRegex.test(urlStr)) {
          notifyTrackerBlocked('sendBeacon: ' + urlStr);
          return true; // Fake success so telemetry payload is dropped without error
        }
        if (CONFIG.GEDEFENSE_LIGHT && isMaliciousResourceUrlRef(urlStr, 'beacon')) {
          notifyTrackerBlocked('gedefense:magecart-beacon-blocked: ' + urlStr);
          return true;
        }
        return origSendBeacon(url, data);
      };
      cloak(defendedSendBeacon, origSendBeacon, 'sendBeacon');
      WIN.navigator.sendBeacon = defendedSendBeacon;
    } catch { /* ignore */ }
  };

  // 9. URL Tracking Parameter Sanitization (Anti-Bounce Tracking)
  const injectURLParamSanitizer = () => {
    if (!CONFIG.ENABLED || !CONFIG.SANITIZE_URL_PARAMS || !WIN.history || !WIN.location) return;
    try {
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'mc_eid', 'yclid',
        '_openstat', 'igshid', 'ttclid', 'twclid', '_hsenc', '_hsmi', 'mkt_tok'
      ];
      if (WIN.location.search) {
        const url = new URL(WIN.location.href);
        let cleaned = false;
        for (const p of trackingParams) {
          if (url.searchParams.has(p)) {
            url.searchParams.delete(p);
            cleaned = true;
          }
        }
        if (cleaned) {
          const newUrl = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
          WIN.history.replaceState(WIN.history.state, '', newUrl);
          notifyTrackerBlocked('url_params');
        }
      }
    } catch { /* ignore */ }
  };

  // 10. GeDefense Light (DOM Hypervisor & Script Defense)
  let sanitizeHTMLRef = (s) => s;

  const injectGeDefenseLight = () => {
    if (!CONFIG.ENABLED || !CONFIG.GEDEFENSE_LIGHT) return;

    // A. Self-XSS Console Defender (Social Engineering Protection)
    if (CONFIG.SELF_XSS_WARNING !== false) {
      try {
        if (typeof console !== 'undefined' && console.log) {
        console.log(
          "%cVisionGaiaTechnology",
          "color: #6fe3bd; font-family: 'Arial Black', sans-serif; font-size: 20px; font-weight: 900; text-shadow: 1px 1px 0 rgba(111, 227, 189, 0.4);"
        );
        console.log(
          "%c⚠️ HALT! / STOP! ⚠️",
          "color: #ef8f9d; font-family: 'Arial Black', sans-serif; font-size: 36px; font-weight: 900; text-shadow: 2px 2px 0 #000;"
        );
        console.log(
          "%cDies ist eine Browser-Funktion für Entwickler.\n" +
          "Wenn Ihnen jemand gesagt hat, dass Sie hier Code einfügen sollen, um ein Feature freizuschalten, handelt es sich um einen Betrugsversuch (Self-XSS).\n" +
          "FÜGEN SIE HIER NIEMALS FREMDEN CODE EIN!\n\n" +
          "%cThis is a browser feature intended strictly for developers.\n" +
          "If someone told you to paste code here, it is a scam (Self-XSS). NEVER PASTE CODE HERE!",
          "color: #bfcec8; font-size: 13px; font-family: sans-serif; line-height: 1.4;",
          "color: #93a7a1; font-size: 12px; font-family: sans-serif; line-height: 1.4;"
        );
      }
    } catch { /* ignore */ }
    }

    // B. Cognitive DOM Sanitizer & Hypervisor (DOM Clobbering / XSS Defense)
    if (!WIN.Element || !WIN.Element.prototype) return;

    const getDescriptor = (obj, prop) => {
      let current = obj;
      while (current) {
        const desc = Object.getOwnPropertyDescriptor(current, prop);
        if (desc) return desc;
        current = Object.getPrototypeOf(current);
      }
      return null;
    };

    const _origInnerHTMLDesc = getDescriptor(WIN.Element.prototype, 'innerHTML') || 
                               (WIN.HTMLElement ? getDescriptor(WIN.HTMLElement.prototype, 'innerHTML') : null);
    const _origInnerHTML_set = _origInnerHTMLDesc ? _origInnerHTMLDesc.set : null;
    const _origOuterHTMLDesc = getDescriptor(WIN.Element.prototype, 'outerHTML');
    const _origInsertAdjacentHTML = WIN.Element.prototype.insertAdjacentHTML;
    const _origSetAttribute = WIN.Element.prototype.setAttribute;

    const SAFE_PROTOCOLS = /^(?:https?|mailto|tel|blob|data):/i;
    const killTags = ['script', 'iframe', 'object', 'embed', 'applet', 'base', 'meta'];

    const isTrustedHTML = (val) => {
      return Boolean(WIN.trustedTypes && typeof WIN.trustedTypes.isHTML === 'function' && WIN.trustedTypes.isHTML(val));
    };

    let _trustedTypesEnforced = null;
    const isTrustedTypesEnforced = () => {
      if (_trustedTypesEnforced !== null) return _trustedTypesEnforced;
      if (!WIN.trustedTypes || !DOC || typeof DOC.createElement !== 'function') return (_trustedTypesEnforced = false);
      try {
        const dummy = DOC.createElement('div');
        if (_origInnerHTML_set) {
          _origInnerHTML_set.call(dummy, '');
        } else {
          dummy.innerHTML = '';
        }
        return (_trustedTypesEnforced = false);
      } catch {
        return (_trustedTypesEnforced = true);
      }
    };

    const sanitizeHTML = (dirtyHtml) => {
      if (typeof dirtyHtml !== 'string') return dirtyHtml;
      if (dirtyHtml.trim() === '') return '';
      if (isTrustedHTML(dirtyHtml) || isTrustedTypesEnforced()) return dirtyHtml;

      // Cognitive Fast-Path Engine:
      const hasSusTag   = /<\s*(script|iframe|object|embed|applet|base|meta)/i.test(dirtyHtml);
      const hasSusAttr  = /\b(on[a-z]+|srcdoc)\s*=/i.test(dirtyHtml);
      const hasSusProto = /(javascript|vbscript)\s*:/i.test(dirtyHtml);
      const hasObfuscatedUrl = /\b(href|src|data|poster|background)\s*=\s*["']?[^"'>]*(&|%|[\x00-\x1F])/i.test(dirtyHtml);

      if (!hasSusTag && !hasSusAttr && !hasSusProto && !hasObfuscatedUrl) {
        return dirtyHtml; // Safe fast-path bypass
      }

      if (!DOC || typeof DOC.createElement !== 'function') return dirtyHtml;

      try {
        const template = DOC.createElement('template');
        if (_origInnerHTML_set) {
          _origInnerHTML_set.call(template, dirtyHtml);
        } else {
          template.innerHTML = dirtyHtml;
        }

        let threatFound = false;
        if (template.content) {
          const walker = DOC.createTreeWalker(template.content, 1, null, false);
          let node;
          const toRemove = [];

          while ((node = walker.nextNode())) {
            const tagName = (node.nodeName || '').toLowerCase();
            if (killTags.includes(tagName)) {
              toRemove.push(node);
              threatFound = true;
              continue;
            }

            if (node.attributes) {
              for (let i = node.attributes.length - 1; i >= 0; i--) {
                const attr = node.attributes[i];
                const name = (attr.name || '').toLowerCase();
                const val = (attr.value || '').trim();

                if (name.startsWith('on') || name === 'srcdoc') {
                  node.removeAttribute(attr.name);
                  threatFound = true;
                  continue;
                }

                if (CONFIG.BLOCK_PROTOCOL_INJECTION !== false && ['href', 'src', 'data', 'poster', 'background'].includes(name)) {
                  const hasProtocol = /^[a-z0-9+\-.]+:/i.test(val);
                  const isProtocolRelative = val.startsWith('//');
                  if (isProtocolRelative || (hasProtocol && !SAFE_PROTOCOLS.test(val))) {
                    node.setAttribute(attr.name, '#vgt-blocked-protocol');
                    threatFound = true;
                  }
                }
              }
            }
          }
          toRemove.forEach(n => n.remove());
        }

        if (threatFound) {
          notifyTrackerBlocked('gedefense:dom-threat');
        }

        return template.innerHTML;
      } catch {
        return dirtyHtml;
      }
    };
    sanitizeHTMLRef = sanitizeHTML;

    // Trusted Types Policy integration
    let vgtPolicy = null;
    if (WIN.trustedTypes && typeof WIN.trustedTypes.createPolicy === 'function') {
      try {
        vgtPolicy = WIN.trustedTypes.createPolicy('vgt-gedefense-light', {
          createHTML: (s) => sanitizeHTML(s),
          createScript: () => '',
          createScriptURL: () => ''
        });
      } catch { /* ignore */ }
    }

    // Hook innerHTML
    if (_origInnerHTMLDesc && _origInnerHTMLDesc.set) {
      const hookedInnerHTML = {
        set: function(value) {
          if (!CONFIG.GEDEFENSE_LIGHT || isTrustedHTML(value) || isTrustedTypesEnforced()) {
            if (_origInnerHTML_set) _origInnerHTML_set.call(this, value);
            else this.innerHTML = value;
            return;
          }
          try {
            const safeVal = vgtPolicy ? vgtPolicy.createHTML(value) : sanitizeHTML(value);
            if (_origInnerHTML_set) {
              _origInnerHTML_set.call(this, safeVal);
            } else {
              this.innerHTML = safeVal;
            }
          } catch (err) {
            try {
              if (_origInnerHTML_set) _origInnerHTML_set.call(this, value);
              else this.innerHTML = value;
            } catch { /* suppress to prevent page breakage on strict CSP */ }
          }
        },
        get: _origInnerHTMLDesc.get,
        configurable: true,
        enumerable: true
      };
      cloak(hookedInnerHTML.set, _origInnerHTMLDesc.set, 'set innerHTML');
      try {
        Object.defineProperty(WIN.Element.prototype, 'innerHTML', hookedInnerHTML);
      } catch { /* ignore */ }
    }

    // Hook outerHTML
    if (_origOuterHTMLDesc && _origOuterHTMLDesc.set) {
      const hookedOuterHTML = {
        set: function(value) {
          if (!CONFIG.GEDEFENSE_LIGHT || isTrustedHTML(value) || isTrustedTypesEnforced()) {
            if (_origOuterHTMLDesc.set) _origOuterHTMLDesc.set.call(this, value);
            else this.outerHTML = value;
            return;
          }
          try {
            const safeVal = vgtPolicy ? vgtPolicy.createHTML(value) : sanitizeHTML(value);
            if (_origOuterHTMLDesc.set) {
              _origOuterHTMLDesc.set.call(this, safeVal);
            } else {
              this.outerHTML = safeVal;
            }
          } catch (err) {
            try {
              if (_origOuterHTMLDesc.set) _origOuterHTMLDesc.set.call(this, value);
              else this.outerHTML = value;
            } catch { /* suppress to prevent page breakage on strict CSP */ }
          }
        },
        get: _origOuterHTMLDesc.get,
        configurable: true,
        enumerable: true
      };
      cloak(hookedOuterHTML.set, _origOuterHTMLDesc.set, 'set outerHTML');
      try {
        Object.defineProperty(WIN.Element.prototype, 'outerHTML', hookedOuterHTML);
      } catch { /* ignore */ }
    }

    // Hook insertAdjacentHTML
    if (_origInsertAdjacentHTML) {
      const hookedInsertAdjacentHTML = function(position, text) {
        if (!CONFIG.GEDEFENSE_LIGHT || isTrustedHTML(text) || isTrustedTypesEnforced()) {
          return _origInsertAdjacentHTML.call(this, position, text);
        }
        try {
          const safeText = vgtPolicy ? vgtPolicy.createHTML(text) : sanitizeHTML(text);
          return _origInsertAdjacentHTML.call(this, position, safeText);
        } catch {
          return _origInsertAdjacentHTML.call(this, position, text);
        }
      };
      cloak(hookedInsertAdjacentHTML, _origInsertAdjacentHTML, 'insertAdjacentHTML');
      WIN.Element.prototype.insertAdjacentHTML = hookedInsertAdjacentHTML;
    }

      // E. Supply-Chain & Dynamic Script/Iframe Gatekeeper (Anti-Optimizely / Anti-Exploit-Kit)
      const SUPPLY_CHAIN_IOCS = [
        '1688360.cc', 'webshell.lol', 'linkforge.cc', 'ios-hack.icu',
        '5vobauua3ojpklx.icu', 'eil786npto9u5bq.icu', 'l7bcsnwc7nzr3uo.icu',
        'je4ft3gn8vxudum.icu', 'q1ls1ho9x7wsxlu.icu', 'p55abnw2pnsz0bo.icu',
        '1y69gy2mdzaltz1.icu', 'gm38duxoihbmy5o.icu'
      ];
      const HIGH_RISK_SCRIPT_TLDS = [
        '.icu', '.lol', '.top', '.xyz', '.click', '.gq', '.cf', '.tk', '.ml', '.ga', '.buzz', '.rest', '.fit'
      ];

      const isSameOrParentDomain = (targetHost, currentHost) => {
        if (!targetHost || !currentHost) return false;
        const t = targetHost.toLowerCase();
        const c = currentHost.toLowerCase();
        if (t === c || t.endsWith('.' + c) || c.endsWith('.' + t)) return true;
        const tParts = t.split('.');
        const cParts = c.split('.');
        if (tParts.length >= 2 && cParts.length >= 2) {
          const tBase = tParts.slice(-2).join('.');
          const cBase = cParts.slice(-2).join('.');
          if (tBase === cBase && tBase.length > 4) return true;
        }
        return false;
      };

      const isMaliciousResourceUrl = (rawUrl, tagContext = '') => {
        if (!CONFIG.GEDEFENSE_LIGHT) return false;
        if (!rawUrl || typeof rawUrl !== 'string') return false;
        const trimmed = rawUrl.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('blob:')) return false;

        if (CONFIG.BLOCK_PROTOCOL_INJECTION !== false && /^(?:javascript|vbscript):/i.test(trimmed)) {
          return true;
        }

        const lTag = String(tagContext || '').toLowerCase();
        if (lTag === 'script' && /^data:/i.test(trimmed) && /(base64|_k7|1688360|webshell|card\.php|eval\()/i.test(trimmed)) {
          return true;
        }

        try {
          const baseHref = (WIN.location && WIN.location.href) ? WIN.location.href : 'https://localhost/';
          const parsed = new URL(trimmed, baseHref);
          const targetHost = (parsed.hostname || '').toLowerCase();
          if (!targetHost) return false;

          // 1. Known Supply-Chain IOCs (always blocked)
          if (SUPPLY_CHAIN_IOCS.some(ioc => targetHost === ioc || targetHost.endsWith('.' + ioc))) {
            return true;
          }

          const currentHost = (WIN.location && WIN.location.hostname) ? WIN.location.hostname.toLowerCase() : '';
          if (isSameOrParentDomain(targetHost, currentHost)) return false;

          // 2. Cross-origin dynamic script / iframe / exfiltration to high-risk TLDs or raw public IPs
          const isHighRiskTld = HIGH_RISK_SCRIPT_TLDS.some(tld => targetHost.endsWith(tld));
          const isSuspiciousNumericCc = /^(?:\d{4,}|[a-z0-9]{12,})\.cc$/i.test(targetHost);
          const isRawPublicIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(targetHost) &&
                                !/^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(targetHost);
          const isSkimmerEndpoint = /\/(?:card|hit|skimmer|collect_card|gate)\.php$/i.test(parsed.pathname || '');

          if (isHighRiskTld || isSuspiciousNumericCc || isRawPublicIp || (isSkimmerEndpoint && targetHost !== currentHost)) {
            return true;
          }
        } catch {
          // Ignore malformed relative URLs
        }
        return false;
      };

      const hasSensitivePaymentOrAuthInputs = () => {
        if (!DOC || typeof DOC.querySelector !== 'function') return false;
        try {
          return Boolean(DOC.querySelector(
            'input[type="password"], input[autocomplete*="cc-"], input[name*="card" i], input[name*="cvv" i], input[name*="cvc" i], input[id*="card" i], input[id*="cvv" i]'
          ));
        } catch {
          return false;
        }
      };

      const containsSensitiveCardOrAuthData = (payload) => {
        if (!payload) return false;
        try {
          let str = '';
          if (typeof payload === 'string') {
            str = payload;
          } else if (typeof URLSearchParams !== 'undefined' && payload instanceof URLSearchParams) {
            str = payload.toString();
          } else if (typeof payload === 'object') {
            str = JSON.stringify(payload);
          }
          if (!str || str.length < 8) return false;
          const hasCardDigits = /\b(?:\d[ -]*?){13,19}\b/.test(str);
          const hasCardKeywords = /(?:card_?number|cc_?num|cvv|cvc|exp_?date|expiry|pan|password|passwd)/i.test(str);
          return hasCardDigits || hasCardKeywords;
        } catch {
          return false;
        }
      };

      // Hook setAttribute for protocol injection & supply-chain script/iframe sources
      if (_origSetAttribute) {
        const hookedSetAttribute = function(name, value) {
          if (CONFIG.GEDEFENSE_LIGHT && typeof name === 'string' && typeof value === 'string') {
            const lName = name.toLowerCase();
            const tagName = (this && this.nodeName) ? String(this.nodeName).toLowerCase() : '';
            if (['href', 'src', 'data', 'formaction', 'action'].includes(lName)) {
              const trimmed = value.trim();
              if (CONFIG.BLOCK_PROTOCOL_INJECTION !== false && /^(?:javascript|vbscript):/i.test(trimmed)) {
                notifyTrackerBlocked('gedefense:attr-protocol');
                return _origSetAttribute.call(this, name, '#vgt-blocked-protocol');
              }
              if ((lName === 'src' || lName === 'data' || lName === 'formaction' || lName === 'action') &&
                  isMaliciousResourceUrl(trimmed, tagName)) {
                notifyTrackerBlocked('gedefense:supply-chain-blocked:' + trimmed);
                return _origSetAttribute.call(this, name, 'about:blank#vgt-blocked-supply-chain');
              }
            }
          }
          return _origSetAttribute.call(this, name, value);
        };
        cloak(hookedSetAttribute, _origSetAttribute, 'setAttribute');
        WIN.Element.prototype.setAttribute = hookedSetAttribute;
      }

      // Hook HTMLScriptElement.prototype.src and HTMLIFrameElement.prototype.src property setters
      const hookSrcProperty = (Ctor, tagLabel) => {
        if (!Ctor || !Ctor.prototype) return;
        const desc = getDescriptor(Ctor.prototype, 'src');
        if (!desc || !desc.set) return;
        const origSet = desc.set;
        const hookedSet = function(val) {
          if (CONFIG.GEDEFENSE_LIGHT && isMaliciousResourceUrl(String(val || ''), tagLabel)) {
            notifyTrackerBlocked(`gedefense:${tagLabel}-src-blocked:` + String(val || ''));
            return;
          }
          return origSet.call(this, val);
        };
        cloak(hookedSet, origSet, 'set src');
        try {
          Object.defineProperty(Ctor.prototype, 'src', {
            get: desc.get,
            set: hookedSet,
            configurable: true,
            enumerable: true
          });
        } catch {}
      };
      hookSrcProperty(WIN.HTMLScriptElement, 'script');
      hookSrcProperty(WIN.HTMLIFrameElement, 'iframe');

      // Hook Node.prototype.appendChild & insertBefore to inspect dynamically injected <script> / <iframe> nodes
      if (WIN.Node && WIN.Node.prototype) {
        const inspectInjectedNode = (node) => {
          if (!CONFIG.GEDEFENSE_LIGHT || !node) return false;
          const tag = (node.nodeName || node.tagName || '').toLowerCase();
          if (tag !== 'script' && tag !== 'iframe' && tag !== 'object' && tag !== 'embed') return false;

          let srcVal = '';
          try {
            srcVal = node.src || (typeof node.getAttribute === 'function' ? node.getAttribute('src') : '') || '';
          } catch {}
          if (srcVal && isMaliciousResourceUrl(srcVal, tag)) {
            notifyTrackerBlocked(`gedefense:dom-inject-blocked:${tag}:${srcVal}`);
            try {
              if (typeof node.removeAttribute === 'function') node.removeAttribute('src');
              node.src = 'about:blank#vgt-blocked';
            } catch {}
            return true;
          }

          // Check inline script content for Optimizely-style eval/atob/C2 loader signatures
          if (tag === 'script') {
            const code = String(node.textContent || node.innerText || '');
            if (code && /(?:1688360\.cc|webshell\.lol|ios-hack\.icu|5vobauua3ojpklx\.icu|eil786npto9u5bq\.icu|window\._k7\b|data-channel-code=["']02111110["'])/i.test(code)) {
              notifyTrackerBlocked('gedefense:inline-loader-blocked');
              try { node.textContent = '/* blocked by GeDefense Light */'; } catch {}
              return true;
            }
          }
          return false;
        };

        const origAppendChild = WIN.Node.prototype.appendChild;
        if (typeof origAppendChild === 'function') {
          const hookedAppendChild = function(child) {
            if (inspectInjectedNode(child)) return child;
            return origAppendChild.call(this, child);
          };
          cloak(hookedAppendChild, origAppendChild, 'appendChild');
          WIN.Node.prototype.appendChild = hookedAppendChild;
        }

        const origInsertBefore = WIN.Node.prototype.insertBefore;
        if (typeof origInsertBefore === 'function') {
          const hookedInsertBefore = function(newNode, referenceNode) {
            if (inspectInjectedNode(newNode)) return newNode;
            return origInsertBefore.call(this, newNode, referenceNode);
          };
          cloak(hookedInsertBefore, origInsertBefore, 'insertBefore');
          WIN.Node.prototype.insertBefore = hookedInsertBefore;
        }
      }

      // F. Anti-Magecart Exfiltration Guard (fetch & XMLHttpRequest)
      try {
        const origFetch = WIN.fetch;
        if (typeof origFetch === 'function') {
          const defendedFetch = async function(input, init) {
            if (CONFIG.GEDEFENSE_LIGHT) {
              const urlStr = typeof input === 'string' ? input : (input && input.url) || '';
              const bodyPayload = (init && init.body) || (input && typeof input === 'object' && input.body) || null;
              if (urlStr) {
                if (isMaliciousResourceUrl(urlStr, 'fetch')) {
                  notifyTrackerBlocked('gedefense:magecart-fetch-blocked:' + urlStr);
                  const ResponseCtor = (WIN && WIN.Response) || (typeof Response !== 'undefined' ? Response : null);
                  if (ResponseCtor) return new ResponseCtor('{}', { status: 200, statusText: 'OK' });
                  return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
                }
                if (bodyPayload && hasSensitivePaymentOrAuthInputs() && containsSensitiveCardOrAuthData(bodyPayload)) {
                  try {
                    const baseHref = (WIN.location && WIN.location.href) ? WIN.location.href : 'https://localhost/';
                    const parsed = new URL(urlStr, baseHref);
                    const targetHost = (parsed.hostname || '').toLowerCase();
                    const currentHost = (WIN.location && WIN.location.hostname) ? WIN.location.hostname.toLowerCase() : '';
                    if (targetHost && currentHost && !isSameOrParentDomain(targetHost, currentHost) && isMaliciousResourceUrl(urlStr, 'skimmer')) {
                      notifyTrackerBlocked('gedefense:card-skimmer-exfil-blocked:' + urlStr);
                      const ResponseCtor = (WIN && WIN.Response) || (typeof Response !== 'undefined' ? Response : null);
                      if (ResponseCtor) return new ResponseCtor('{}', { status: 200, statusText: 'OK' });
                    }
                  } catch {}
                }
              }
            }
            return origFetch.apply(this, arguments);
          };
          cloak(defendedFetch, origFetch, 'fetch');
          WIN.fetch = defendedFetch;
        }
      } catch {}

      // G. Crypto Address Clipper & Clipboard Hijack Guard
      const CRYPTO_WALLET_REGEX = /\b(?:bc1[ac-hj-np-z02-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|0x[a-fA-F0-9]{40}|T[A-Za-z1-9]{33})\b/;

      if (WIN.navigator && WIN.navigator.clipboard && typeof WIN.navigator.clipboard.writeText === 'function') {
        try {
          const origWriteText = WIN.navigator.clipboard.writeText.bind(WIN.navigator.clipboard);
          const defendedWriteText = async function(text) {
            if (CONFIG.GEDEFENSE_LIGHT && typeof text === 'string' && CRYPTO_WALLET_REGEX.test(text)) {
              try {
                const selection = (WIN.getSelection && WIN.getSelection()) ? String(WIN.getSelection().toString()).trim() : '';
                if (selection && CRYPTO_WALLET_REGEX.test(selection) && selection !== text.trim()) {
                  notifyTrackerBlocked('gedefense:crypto-clipper-blocked');
                  return origWriteText(selection);
                }
              } catch {}
            }
            return origWriteText(text);
          };
          cloak(defendedWriteText, origWriteText, 'writeText');
          try {
            WIN.navigator.clipboard.writeText = defendedWriteText;
          } catch {
            Object.defineProperty(WIN.navigator.clipboard, 'writeText', {
              value: defendedWriteText,
              configurable: true,
              writable: true
            });
          }
        } catch {}
      }

      isMaliciousResourceUrlRef = isMaliciousResourceUrl;
    };

  // =========================================================================
  // VGT AD SHIELD MODULES (uBlock Origin inspired · 100% Offline)
  // =========================================================================

  // 11. Zero-Flicker Cosmetic Element Hiding Engine
  const AD_SELECTORS = [
    'ins.adsbygoogle',
    '[id^="google_ads_"]',
    '[id^="div-gpt-ad"]',
    '[id^="ad-slot-"]',
    '[id^="ad_slot_"]',
    '[id*="banner-ad"]',
    '[class*="banner-ad"]',
    '.ad-container',
    '.ad-wrapper',
    '.ad-box',
    '.ad-slot',
    '.ad-banner',
    '.ad-holder',
    '.ad-unit',
    '.ad-placement',
    '.advertisement',
    '.advert',
    '[data-ad-unit]',
    '[data-ad-slot]',
    '[data-ad-client]',
    '[data-ad-name]',
    '[id^="taboola-"]',
    '.trc_rbox_div',
    '.trc_related_container',
    '.OUTBRAIN',
    '[data-widget-id^="outbrain"]',
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="adservice"]',
    'iframe[src*="adnxs"]',
    'iframe[src*="smartadserver"]',
    'iframe[src*="criteo"]',
    'iframe[src*="rubiconproject"]',
    'iframe[src*="adform"]',
    'iframe[src*="teads"]',
    '.sponsored-post',
    '.sponsored-content',
    '[data-sponsored="true"]',
    '.native-ad',
    '[class*="floating-ad"]',
    '[class*="sticky-ad"]',
    '[id*="floating-video-ad"]',
    '[class*="video-ad-unit"]',
    // YouTube Cosmetic Filters (uBlock Origin inspired · 100% Offline)
    'ytd-ad-slot-renderer',
    '#masthead-ad',
    'ytd-banner-promo-renderer',
    'ytd-statement-banner-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-player-legacy-desktop-watch-ads-renderer',
    '.ytd-merch-shelf-renderer',
    '.ytp-ad-module',
    '.ytp-ad-overlay-container',
    '.ytp-ad-player-overlay',
    '.ytp-ad-image-overlay',
    '.ytp-ad-text',
    '#player-ads',
    'ytd-promoted-video-renderer',
    'ytd-compact-promoted-video-renderer',
    '#shopping-timely-shelf',
    '#panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    'ytd-rich-item-renderer:has(> #content > ytd-ad-slot-renderer)',
    '#contents > ytd-rich-item-renderer:has(> ytd-ad-slot-renderer)',
    '.ytd-watch-flexy > .ytd-watch-next-secondary-results-renderer > ytd-ad-slot-renderer'
  ];

  const COSMETIC_CSS = AD_SELECTORS.join(',\n') + ` {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
    visibility: hidden !important;
  }`;

  let cosmeticStyleNode = null;
  let cosmeticSheet = null;

  const injectCosmeticCSS = () => {
    if (!CONFIG.ENABLED || !CONFIG.AD_SHIELD || !CONFIG.COSMETIC_FILTERING) return;
    if (!DOC) return;

    try {
      const CSSSheet = (WIN && WIN.CSSStyleSheet) || (typeof CSSStyleSheet !== 'undefined' ? CSSStyleSheet : null);
      if (DOC.adoptedStyleSheets && CSSSheet) {
        if (!cosmeticSheet) {
          cosmeticSheet = new CSSSheet();
          cosmeticSheet.replaceSync(COSMETIC_CSS);
        }
        if (!DOC.adoptedStyleSheets.includes(cosmeticSheet)) {
          DOC.adoptedStyleSheets.push(cosmeticSheet);
        }
        return;
      }
    } catch { /* adoptedStyleSheets fallback */ }

    const attachStyle = () => {
      try {
        const target = DOC.head || DOC.documentElement;
        if (target && !DOC.getElementById('vgt-ad-shield-style')) {
          cosmeticStyleNode = DOC.createElement('style');
          cosmeticStyleNode.id = 'vgt-ad-shield-style';
          cosmeticStyleNode.textContent = COSMETIC_CSS;
          target.insertBefore(cosmeticStyleNode, target.firstChild);
        }
      } catch {}
    };

    if (DOC.head || DOC.documentElement) {
      attachStyle();
    } else if (typeof DOC.addEventListener === 'function') {
      DOC.addEventListener('DOMContentLoaded', attachStyle, { once: true });
    }
  };

  const removeCosmeticCSS = () => {
    try {
      if (cosmeticSheet && DOC && DOC.adoptedStyleSheets) {
        DOC.adoptedStyleSheets = DOC.adoptedStyleSheets.filter(s => s !== cosmeticSheet);
      }
      if (cosmeticStyleNode && cosmeticStyleNode.parentNode) {
        cosmeticStyleNode.parentNode.removeChild(cosmeticStyleNode);
        cosmeticStyleNode = null;
      }
      const existing = DOC && DOC.getElementById && DOC.getElementById('vgt-ad-shield-style');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    } catch {}
  };

  // 12. Dynamic Ad Element Observer & Collapser
  const injectDynamicAdObserver = () => {
    if (!CONFIG.ENABLED || !CONFIG.AD_SHIELD || !CONFIG.COSMETIC_FILTERING || !WIN.MutationObserver || !DOC) return;

    const query = AD_SELECTORS.join(',');
    let debounceTimer = null;
    let pendingCount = 0;

    const flushBlockedCount = () => {
      if (pendingCount > 0) {
        notifyTrackerBlocked(`ad-elements (${pendingCount})`);
        pendingCount = 0;
      }
    };

    const processElement = (el) => {
      if (!el || el.nodeType !== 1) return;
      try {
        if (el.hasAttribute && el.hasAttribute('data-vgt-ad-blocked')) return;

        // Skip anti-adblock honeypots/baits to avoid triggering script detection
        const cls = typeof el.className === 'string' ? el.className : '';
        if (cls.includes('adsbox') || cls.includes('pub_300x250') || cls.includes('ad-test')) return;

        let matched = false;
        if (el.matches && el.matches(query)) {
          matched = true;
          el.style.setProperty('display', 'none', 'important');
          el.setAttribute('data-vgt-ad-blocked', 'true');
          pendingCount++;
        }
        if (el.querySelectorAll) {
          const descendants = el.querySelectorAll(query);
          for (let i = 0; i < descendants.length; i++) {
            const d = descendants[i];
            const dCls = typeof d.className === 'string' ? d.className : '';
            if (dCls.includes('adsbox') || dCls.includes('pub_300x250')) continue;
            if (!d.hasAttribute('data-vgt-ad-blocked')) {
              d.style.setProperty('display', 'none', 'important');
              d.setAttribute('data-vgt-ad-blocked', 'true');
              pendingCount++;
              matched = true;
            }
          }
        }
      } catch {}
    };

    const observer = new WIN.MutationObserver((mutations) => {
      if (!CONFIG.ENABLED || !CONFIG.AD_SHIELD || !CONFIG.COSMETIC_FILTERING) return;
      for (const m of mutations) {
        if (m.addedNodes) {
          for (let i = 0; i < m.addedNodes.length; i++) {
            processElement(m.addedNodes[i]);
          }
        }
      }
      if (pendingCount > 0) {
        if (debounceTimer) {
          if (WIN && WIN.clearTimeout) WIN.clearTimeout(debounceTimer);
          else if (typeof clearTimeout !== 'undefined') clearTimeout(debounceTimer);
        }
        const timerFn = (WIN && WIN.setTimeout) || (typeof setTimeout !== 'undefined' ? setTimeout : null);
        if (timerFn) {
          debounceTimer = timerFn(flushBlockedCount, 200);
        } else {
          flushBlockedCount();
        }
      }
    });

    const start = () => {
      try {
        const root = DOC.documentElement || DOC.body;
        if (root) {
          observer.observe(root, { childList: true, subtree: true });
          processElement(root);
          flushBlockedCount();
        }
      } catch {}
    };

    if (DOC.readyState === 'loading') {
      DOC.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  };

  // 13. Anti-Adblock Defusers & Script Inoculation (uBlock-inspired)
  const injectAdBlockDefusers = () => {
    if (!CONFIG.ENABLED || !CONFIG.AD_SHIELD) return;

    // A. Google AdSense / AdManager (adsbygoogle) stub
    try {
      if (!WIN.adsbygoogle || !Array.isArray(WIN.adsbygoogle)) {
        const ads = [];
        ads.push = function(arg) {
          notifyTrackerBlocked('adsbygoogle.push');
          return 0;
        };
        ads.loaded = true;
        cloak(ads.push, null, 'push');
        WIN.adsbygoogle = ads;
      } else if (typeof WIN.adsbygoogle.push === 'function') {
        const origPush = WIN.adsbygoogle.push.bind(WIN.adsbygoogle);
        WIN.adsbygoogle.push = function(...args) {
          notifyTrackerBlocked('adsbygoogle.push');
          try { return origPush(...args); } catch { return 0; }
        };
        cloak(WIN.adsbygoogle.push, null, 'push');
      }
    } catch {}

    // B. Anti-Adblock Flags (uBlock set-constant inspired)
    if (CONFIG.ANTI_ADBLOCK_DEFUSER !== false) {
      try {
        WIN.canRunAds = true;
        WIN.isAdBlockActive = false;
        WIN.adblock = false;
        WIN.google_ad_status = 1;
      } catch {}

      // C. Bait Element Defuser (prevent-bab inspired)
      try {
        if (WIN.HTMLElement && WIN.HTMLElement.prototype) {
          const origHeightDesc = Object.getOwnPropertyDescriptor(WIN.HTMLElement.prototype, 'offsetHeight');
          const origWidthDesc = Object.getOwnPropertyDescriptor(WIN.HTMLElement.prototype, 'offsetWidth');

          const isBaitElement = (el) => {
            if (!el || !el.className || typeof el.className !== 'string') return false;
            const cls = el.className;
            return (
              cls.includes('adsbox') ||
              cls.includes('pub_300x250') ||
              cls.includes('ad-test') ||
              cls.includes('ad-probe') ||
              cls.includes('ad_test') ||
              cls.includes('ad_unit_test')
            );
          };

          const origHeightGet = origHeightDesc && origHeightDesc.get;
          Object.defineProperty(WIN.HTMLElement.prototype, 'offsetHeight', {
            get: function() {
              if (isBaitElement(this)) {
                notifyTrackerBlocked('anti-adblock-bait:offsetHeight');
                return 250;
              }
              return origHeightGet ? origHeightGet.call(this) : (this._offsetHeight || 0);
            },
            configurable: true,
            enumerable: true
          });
          cloak(WIN.HTMLElement.prototype.offsetHeight, null, 'get offsetHeight');

          const origWidthGet = origWidthDesc && origWidthDesc.get;
          Object.defineProperty(WIN.HTMLElement.prototype, 'offsetWidth', {
            get: function() {
              if (isBaitElement(this)) {
                return 300;
              }
              return origWidthGet ? origWidthGet.call(this) : (this._offsetWidth || 0);
            },
            configurable: true,
            enumerable: true
          });
          cloak(WIN.HTMLElement.prototype.offsetWidth, null, 'get offsetWidth');
        }
      } catch {}
    }

    // D. Popunder & Click-Trap Defuser
    if (CONFIG.POPUNDER_DEFENSE !== false && WIN.open) {
      try {
        const origOpen = WIN.open.bind(WIN);
        const POPUNDER_DOMAINS = [
          'popads.net', 'popcash.net', 'propellerads.com', 'adsterra.com',
          'exoclick.com', 'juicyads.com', 'mgid.com', 'bidvertiser.com'
        ];
        const isPopunderTarget = (url) => {
          if (!url || typeof url !== 'string') return false;
          const lUrl = url.toLowerCase();
          return POPUNDER_DOMAINS.some(d => lUrl.includes(d));
        };

        const defendedOpen = function(url, ...args) {
          if (isPopunderTarget(url)) {
            notifyTrackerBlocked('popunder: ' + url);
            return null;
          }
          return origOpen(url, ...args);
        };
        cloak(defendedOpen, origOpen, 'open');
        WIN.open = defendedOpen;
      } catch {}
    }
  };

  // 14. YouTube Ad Shield Engine (uBlock Origin inspired · 100% Offline)
  const injectYouTubeShield = () => {
    if (!CONFIG.ENABLED || !CONFIG.AD_SHIELD) return;

    const isYouTube = () => {
      try {
        const hn = WIN.location ? (WIN.location.hostname || '') : '';
        return hn.includes('youtube.com') || hn.includes('youtube-nocookie.com') || hn.includes('youtubekids.com');
      } catch {
        return false;
      }
    };

    if (!isYouTube()) return;

    // Helper: Prune adPlacements, playerAds, and adSlots from YouTube JSON response
    const prunePlayerResponse = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      try {
        delete obj.adPlacements;
        delete obj.adSlots;
        delete obj.playerAds;
        if (obj.playerResponse && typeof obj.playerResponse === 'object') {
          delete obj.playerResponse.adPlacements;
          delete obj.playerResponse.adSlots;
          delete obj.playerResponse.playerAds;
        }
      } catch {}
      return obj;
    };

    // A. Intercept & neutralize window.ytInitialPlayerResponse
    try {
      let _ytPlayerResponse = WIN.ytInitialPlayerResponse;
      if (_ytPlayerResponse) {
        prunePlayerResponse(_ytPlayerResponse);
      }
      Object.defineProperty(WIN, 'ytInitialPlayerResponse', {
        configurable: true,
        enumerable: true,
        get: () => _ytPlayerResponse,
        set: (val) => {
          _ytPlayerResponse = prunePlayerResponse(val);
        }
      });
    } catch {}

    // B. Intercept fetch for /youtubei/v1/player & /reel_watch_sequence
    try {
      const origFetch = WIN.fetch;
      if (typeof origFetch === 'function') {
        WIN.fetch = async function(...args) {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
          if (typeof url === 'string' && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/reel/reel_watch_sequence'))) {
            try {
              const response = await origFetch.apply(this, args);
              const cloned = response.clone();
              const data = await cloned.json();
              if (data && typeof data === 'object') {
                prunePlayerResponse(data);
                notifyTrackerBlocked('adshield:youtube-player-pruned');
                const ResponseCtor = (WIN && WIN.Response) || (typeof Response !== 'undefined' ? Response : null);
                if (ResponseCtor) {
                  return new ResponseCtor(JSON.stringify(data), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                  });
                }
              }
              return response;
            } catch {
              return origFetch.apply(this, args);
            }
          }
          return origFetch.apply(this, args);
        };
        cloak(WIN.fetch, origFetch, 'fetch');
      }
    } catch {}

    // C. Intercept XMLHttpRequest for /youtubei/v1/player
    try {
      if (WIN.XMLHttpRequest) {
        const origOpen = WIN.XMLHttpRequest.prototype.open;
        const _xhrUrls = new WeakMap();

        WIN.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
          if (typeof url === 'string') {
            _xhrUrls.set(this, url);
          }
          return origOpen.call(this, method, url, ...rest);
        };
        cloak(WIN.XMLHttpRequest.prototype.open, origOpen, 'open');

        const origResponseTextDesc = Object.getOwnPropertyDescriptor(WIN.XMLHttpRequest.prototype, 'responseText');
        if (origResponseTextDesc && origResponseTextDesc.get) {
          Object.defineProperty(WIN.XMLHttpRequest.prototype, 'responseText', {
            configurable: true,
            enumerable: true,
            get: function() {
              const raw = origResponseTextDesc.get.call(this);
              const url = _xhrUrls.get(this);
              if (typeof url === 'string' && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/reel/reel_watch_sequence'))) {
                try {
                  const data = JSON.parse(raw);
                  prunePlayerResponse(data);
                  notifyTrackerBlocked('adshield:youtube-player-pruned');
                  return JSON.stringify(data);
                } catch {}
              }
              return raw;
            }
          });
        }
      }
    } catch {}

    // D. Video Ad Accelerator & Auto-Skip Fallback Engine
    // IMPORTANT: Never rely on static `.ytp-ad-player-overlay` or `.ytp-ad-module` presence
    // in the DOM, as YouTube keeps those containers persistently in the DOM after an ad ends!
    // Only accelerate when `#movie_player` explicitly carries `ad-showing` or `ad-interrupting`,
    // and always restore normal playbackRate (1.0) & mute state once the ad finishes.
    const runAdSkipper = () => {
      if (!DOC) return;
      try {
        const player = DOC.querySelector('#movie_player, .html5-video-player');
        if (player) {
          const isAd = player.classList.contains('ad-showing') || 
                       player.classList.contains('ad-interrupting');
          const video = player.querySelector('video') || DOC.querySelector('video');

          if (isAd) {
            if (video) {
              if (!video._vgtAdActive) {
                video._vgtAdActive = true;
                video._vgtUserRate = (video.playbackRate && video.playbackRate < 8) ? video.playbackRate : 1.0;
                video._vgtUserMuted = Boolean(video.muted);
              }
              video.muted = true;
              video.playbackRate = 16.0;
              // Only jump to the end if duration is finite and below 300s (prevents seeking the
              // main video stream before YouTube swaps the media source to the ad clip).
              if (isFinite(video.duration) && video.duration > 0.5 && video.duration <= 300) {
                video.currentTime = Math.max(0, video.duration - 0.1);
              }
            }

            const skipBtns = player.querySelectorAll([
              '.ytp-ad-skip-button',
              '.ytp-ad-skip-button-modern',
              '.ytp-skip-ad-button',
              'button.ytp-ad-skip-button-icon',
              '.ytp-ad-overlay-close-button'
            ].join(','));

            for (let i = 0; i < skipBtns.length; i++) {
              const btn = skipBtns[i];
              if (typeof btn.click === 'function') {
                btn.click();
                notifyTrackerBlocked('adshield:youtube-video-skipped');
              }
            }
          } else if (video && video._vgtAdActive) {
            video._vgtAdActive = false;
            try {
              video.playbackRate = video._vgtUserRate || 1.0;
              video.muted = Boolean(video._vgtUserMuted);
            } catch {}
          }
        }

        // Anti-Adblock Warning / Modal Auto-Dismissal
        const modals = DOC.querySelectorAll('ytd-enforcement-message-view-model, #dialog[role="dialog"]:has(ytd-enforcement-message-view-model)');
        for (let i = 0; i < modals.length; i++) {
          modals[i].remove();
          notifyTrackerBlocked('adshield:youtube-anti-adblock-dismissed');
          const v = DOC.querySelector('video');
          if (v && v.paused) v.play().catch(() => {});
          if (DOC.body) DOC.body.style.overflow = 'auto';
        }
      } catch {}
    };

    try {
      if (WIN.setInterval) {
        WIN.setInterval(runAdSkipper, 150);
      }
      if (typeof DOC.addEventListener === 'function') {
        DOC.addEventListener('timeupdate', runAdSkipper, true);
      }
    } catch {}
  };

  // --- INITIALIZATION ---
  const applyAllDefenses = () => {
    try {
      injectDPISpoof();
      injectWebGLSpoof();
      injectCanvasDefense();
      injectAudioSpoof();
      injectFontSpoof();
      injectRectSpoof();
      injectSurrogates();
      injectBeaconDefense();
      injectURLParamSanitizer();
      injectGeDefenseLight();
      injectCosmeticCSS();
      injectDynamicAdObserver();
      injectAdBlockDefusers();
      injectYouTubeShield();
    } catch (e) {
      if (CONFIG.DEBUG_MODE) console.error('AEGIS PROTOCOL error:', e);
    }
  };

  applyAllDefenses();

  // Export control interface
  const AegisInterface = {
    version: '17.1.0',
    getSeed: () => SEED,
    rotateSeed: () => {
      try {
        if (WIN.sessionStorage) WIN.sessionStorage.removeItem('aegis_omega_seed');
      } catch {}
      SEED = initSeed();
      return SEED;
    },
    getConfig: () => ({ ...CONFIG }),
    setConfig: (opts) => {
      Object.assign(CONFIG, opts);
      return CONFIG;
    },
    sanitizeHTML: (s) => sanitizeHTMLRef(s),
    isMaliciousResourceUrl: (u, tag) => isMaliciousResourceUrlRef(u, tag),
    injectCosmeticCSS,
    removeCosmeticCSS,
    injectAdBlockDefusers,
    injectYouTubeShield,
    AD_SELECTORS,
    prng,
    cloak
  };

  WIN.__AEGIS_OMEGA__ = AegisInterface;
  globalThis.__AEGIS_OMEGA__ = AegisInterface;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AegisInterface;
  }
})();
