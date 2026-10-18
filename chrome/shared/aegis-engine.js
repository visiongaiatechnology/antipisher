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

  // 8. Beacon & Telemetry Defusal
  const injectBeaconDefense = () => {
    if (!CONFIG.ENABLED || !CONFIG.DEFUSE_TRACKERS || CONFIG.DEFUSE_BEACONS === false || !WIN.navigator || !WIN.navigator.sendBeacon) return;
    try {
      const origSendBeacon = WIN.navigator.sendBeacon.bind(WIN.navigator);
      const trackingRegex = /(google-analytics|analytics|telemetry|doubleclick|clarity|hotjar|facebook\.com\/tr|stats|collector|event-log|bat\.bing)/i;

      const defendedSendBeacon = function(url, data) {
        const urlStr = String(url || '');
        if (trackingRegex.test(urlStr)) {
          notifyTrackerBlocked('sendBeacon: ' + urlStr);
          return true; // Fake success so telemetry payload is dropped without error
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

    const sanitizeHTML = (dirtyHtml) => {
      if (typeof dirtyHtml !== 'string') return dirtyHtml;
      if (dirtyHtml.trim() === '') return '';

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
          if (!CONFIG.GEDEFENSE_LIGHT) {
            _origInnerHTMLDesc.set.call(this, value);
            return;
          }
          const safeVal = vgtPolicy ? vgtPolicy.createHTML(value) : sanitizeHTML(value);
          _origInnerHTMLDesc.set.call(this, safeVal);
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
          if (!CONFIG.GEDEFENSE_LIGHT) {
            _origOuterHTMLDesc.set.call(this, value);
            return;
          }
          const safeVal = vgtPolicy ? vgtPolicy.createHTML(value) : sanitizeHTML(value);
          _origOuterHTMLDesc.set.call(this, safeVal);
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
        if (!CONFIG.GEDEFENSE_LIGHT) {
          return _origInsertAdjacentHTML.call(this, position, text);
        }
        const safeText = vgtPolicy ? vgtPolicy.createHTML(text) : sanitizeHTML(text);
        return _origInsertAdjacentHTML.call(this, position, safeText);
      };
      cloak(hookedInsertAdjacentHTML, _origInsertAdjacentHTML, 'insertAdjacentHTML');
      WIN.Element.prototype.insertAdjacentHTML = hookedInsertAdjacentHTML;
    }

    // Hook setAttribute for protocol injection
    if (_origSetAttribute) {
      const hookedSetAttribute = function(name, value) {
        if (CONFIG.GEDEFENSE_LIGHT && CONFIG.BLOCK_PROTOCOL_INJECTION !== false && typeof name === 'string' && typeof value === 'string') {
          const lName = name.toLowerCase();
          if (['href', 'src', 'data', 'formaction'].includes(lName)) {
            const trimmed = value.trim();
            if (/^(?:javascript|vbscript):/i.test(trimmed)) {
              notifyTrackerBlocked('gedefense:attr-protocol');
              return _origSetAttribute.call(this, name, '#vgt-blocked-protocol');
            }
          }
        }
        return _origSetAttribute.call(this, name, value);
      };
      cloak(hookedSetAttribute, _origSetAttribute, 'setAttribute');
      WIN.Element.prototype.setAttribute = hookedSetAttribute;
    }
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
    '[class*="video-ad-unit"]'
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
    injectCosmeticCSS,
    removeCosmeticCSS,
    injectAdBlockDefusers,
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
