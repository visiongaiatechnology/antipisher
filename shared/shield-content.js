/*
 * Antipisher — In-Page Content Shield & Form Interceptor
 * AGPLv3 · VisionGaiaTechnology
 *
 * Runs at document_start in the isolated extension world. Intercepts form
 * submissions at the DOM capture phase and shows an isolated warning inside a
 * closed Shadow DOM. This is a UX barrier, not a complete POST preflight.
 */

(() => {
  'use strict';

  if (globalThis.__ANTIPISHER_SHIELD_ACTIVE__) return;
  globalThis.__ANTIPISHER_SHIELD_ACTIVE__ = true;

  const engine = globalThis.Antipisher || globalThis.VGT_DomainGuard;
  const engineAvailable = Boolean(engine && typeof engine.classify === 'function');
  const allowedForms = new WeakSet();

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function getCurrentVerdict() {
    if (!engineAvailable) return null;
    try { return engine.classify(window.location.href); } catch { return null; }
  }

  function getTargetVerdict(form, submitter) {
    if (!engineAvailable) return null;
    try {
      const rawAction = (submitter && submitter.formAction) || form.getAttribute('action');
      const actionUrl = rawAction ? new URL(rawAction, window.location.href).href : window.location.href;
      return engine.classify(actionUrl);
    } catch { return null; }
  }

  function hasPasswordField(form) {
    try {
      return Boolean(form && form.querySelector && form.querySelector('input[type="password"]'));
    } catch { return false; }
  }

  function isHardBlock(verdict) {
    return Boolean(verdict && verdict.status === 'block' && verdict.action !== 'warn');
  }

  const BRAND_MARK = `
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 2.6 20 5.6v6.1c0 5-3.4 8.2-8 9.7-4.6-1.5-8-4.7-8-9.7V5.6L12 2.6Z"/>
      <path d="M8.4 8.8 12 14l3.6-5.2"/>
    </svg>`;

  const SHIELD_STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .backdrop {
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      padding: 20px; background: rgba(4, 8, 7, 0.78);
      -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #f2f7f5; -webkit-font-smoothing: antialiased;
    }
    .panel {
      position: relative; width: 100%; max-width: 560px; padding: 28px;
      border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 24px;
      background: linear-gradient(180deg, rgba(23, 36, 32, 0.97), rgba(12, 20, 18, 0.96));
      box-shadow: 0 40px 100px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }
    .panel::before {
      content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 24%);
    }
    .brandbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 22px; }
    .brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
    .mark {
      width: 36px; height: 36px; flex: 0 0 auto; display: grid; place-items: center;
      color: #6fe3bd; border: 1px solid rgba(111, 227, 189, 0.32); border-radius: 11px;
      background: linear-gradient(145deg, rgba(111, 227, 189, 0.16), rgba(111, 227, 189, 0.03));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
    }
    .brand-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; line-height: 1.2; }
    .brand-org { font-size: 9px; font-weight: 650; letter-spacing: 0.2em; text-transform: uppercase; color: #93a7a1; white-space: nowrap; }
    .brand-product { font-size: 14px; font-weight: 680; color: #f2f7f5; }
    .brand-product span { margin-left: 7px; padding-left: 7px; border-left: 1px solid rgba(255, 255, 255, 0.15); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #93a7a1; }
    .status {
      display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 999px;
      border: 1px solid rgba(239, 143, 157, 0.34); background: rgba(239, 143, 157, 0.10);
      color: #ef8f9d; font-size: 9px; font-weight: 720; letter-spacing: 0.13em; text-transform: uppercase; white-space: nowrap;
    }
    .status::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
    .eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 720; letter-spacing: 0.16em; text-transform: uppercase; color: #bfcec8; margin-bottom: 10px; }
    .eyebrow::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #ef8f9d; box-shadow: 0 0 0 4px rgba(239, 143, 157, 0.10); }
    h2 { font-size: 26px; line-height: 1.12; letter-spacing: -0.03em; font-weight: 680; color: #ffffff; margin-bottom: 8px; }
    .explanation { font-size: 13.5px; line-height: 1.55; color: #bfcec8; }
    .facts { margin: 20px 0 4px; border-top: 1px solid rgba(255, 255, 255, 0.09); }
    .fact { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 14px; padding: 11px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.09); align-items: baseline; }
    .fact-label { font-size: 9.5px; font-weight: 650; letter-spacing: 0.15em; text-transform: uppercase; color: #93a7a1; }
    .fact-value { font-size: 13px; color: #f2f7f5; overflow-wrap: anywhere; }
    .fact-value.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
    .fact-value.official { color: #6fe3bd; font-weight: 640; }
    .actions { display: flex; gap: 10px; margin-top: 20px; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px;
      border-radius: 11px; border: 1px solid transparent; font: inherit; font-size: 13.5px; font-weight: 640;
      cursor: pointer; transition: background 0.16s ease, border-color 0.16s ease;
    }
    .btn:focus-visible { outline: 2px solid #9cc9ff; outline-offset: 3px; }
    .btn-safe {
      color: #f6fffb; background: linear-gradient(180deg, #227f69, #186452);
      border-color: rgba(111, 227, 189, 0.42); box-shadow: 0 10px 24px rgba(20, 90, 72, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.16);
    }
    .btn-safe:hover { background: linear-gradient(180deg, #2a9178, #1c715c); }
    .btn-proceed { color: #ffd9df; background: rgba(239, 143, 157, 0.08); border-color: rgba(239, 143, 157, 0.34); }
    .footer { margin-top: 18px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.09); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #93a7a1; }
    @media (max-width: 520px) {
      .panel { padding: 22px 18px; }
      h2 { font-size: 22px; }
      .actions { flex-direction: column; }
      .actions .btn { width: 100%; }
      .fact { grid-template-columns: 1fr; gap: 3px; }
      .brand-product span { display: none; }
    }
  `;

  function detectShieldLang() {
    try {
      const raw = (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage || 'en';
      const l = String(raw).toLowerCase();
      if (l.startsWith('de')) return 'de';
      if (l.startsWith('ru')) return 'ru';
      if (l.startsWith('zh')) return 'zh';
      return 'en';
    } catch {
      return 'en';
    }
  }

  const SHIELD_I18N = {
    en: {
      tag: 'Form Shield',
      status: 'Paused',
      eyebrow: 'Form submission paused',
      title: 'This input submission was paused',
      target: 'Target Address',
      brand: 'Known Brand',
      official: 'Official Domain',
      btnCancel: 'Cancel – Keep My Input',
      btnProceed: 'Send Anyway',
      footer: 'Verified locally · zero data transmitted to Antipisher · VisionGaiaTechnology',
      badge: 'Possible Phishing Site · Antipisher Warning',
      defaultDesc: 'This address impersonates a protected brand or uses a deceptive domain structure.',
      toastTitle: 'Domain verified',
      toastSub: 'Antipisher · Protected'
    },
    de: {
      tag: 'Formularschutz',
      status: 'Angehalten',
      eyebrow: 'Formularübertragung gestoppt',
      title: 'Diese Eingabe wurde angehalten',
      target: 'Zieladresse',
      brand: 'Bekannte Marke',
      official: 'Offizielle Domain',
      btnCancel: 'Abbrechen – Daten bleiben erhalten',
      btnProceed: 'Trotzdem senden',
      footer: 'Lokal geprüft · keine Übertragung an Antipisher · VisionGaiaTechnology',
      badge: 'Mögliche Phishing-Seite · Antipisher warnt',
      defaultDesc: 'Diese Adresse imitiert eine geschützte Marke oder nutzt eine verdächtige Domainstruktur.',
      toastTitle: 'Domain verifiziert',
      toastSub: 'Antipisher · Geschützt'
    },
    ru: {
      tag: 'Защита форм',
      status: 'Приостановлено',
      eyebrow: 'Отправка формы приостановлена',
      title: 'Отправка данных была приостановлена',
      target: 'Целевой адрес',
      brand: 'Известный бренд',
      official: 'Официальный домен',
      btnCancel: 'Отмена — сохранить данные',
      btnProceed: 'Все равно отправить',
      footer: 'Проверено локально · данные не передаются в Antipisher · VisionGaiaTechnology',
      badge: 'Возможный фишинг · Предупреждение Antipisher',
      defaultDesc: 'Этот адрес имитирует защищенный бренд или использует подозрительную структуру домена.',
      toastTitle: 'Домен проверен',
      toastSub: 'Antipisher · Защищено'
    },
    zh: {
      tag: '表单防护',
      status: '已暂停',
      eyebrow: '表单提交已暂停',
      title: '输入提交已被暂停',
      target: '目标地址',
      brand: '已知品牌',
      official: '官方域名',
      btnCancel: '取消 — 保留输入数据',
      btnProceed: '仍然发送',
      footer: '本地验证 · 无数据传输至 Antipisher · VisionGaiaTechnology',
      badge: '疑似钓鱼网站 · Antipisher 提醒',
      defaultDesc: '该地址假冒受保护的品牌或采用可疑的域名结构。',
      toastTitle: '域名已验证',
      toastSub: 'Antipisher · 安全守护'
    }
  };

  function showWarningModal(verdict, targetUrl, onCancel, onProceed) {
    const existing = document.getElementById('antipisher-shield-root');
    if (existing) existing.remove();

    const rootHost = document.createElement('div');
    rootHost.id = 'antipisher-shield-root';
    rootHost.style.position = 'fixed';
    rootHost.style.zIndex = '2147483647';
    rootHost.style.top = '0';
    rootHost.style.left = '0';
    rootHost.style.width = '100vw';
    rootHost.style.height = '100vh';
    rootHost.style.pointerEvents = 'auto';
    if (typeof rootHost.style.setProperty === 'function') {
      rootHost.style.setProperty('display', 'block', 'important');
    } else {
      rootHost.style.display = 'block';
    }

    const shadow = rootHost.attachShadow({ mode: 'closed' });
    const lang = detectShieldLang();
    const str = SHIELD_I18N[lang] || SHIELD_I18N.en;

    const reasonItem = verdict.reasons?.[0];
    const explanation = reasonItem?.['explanation_' + lang] || reasonItem?.explanation || reasonItem?.explanation_de || reasonItem?.detail ||
      str.defaultDesc;
    const official = verdict.official || '';
    const site = verdict.site || str.brand;

    shadow.innerHTML = `
      <style>${SHIELD_STYLE}</style>
      <div class="backdrop">
        <section class="panel" role="alertdialog" aria-labelledby="shield-title" aria-describedby="shield-desc">
          <header class="brandbar">
            <div class="brand">
              <div class="mark">${BRAND_MARK}</div>
              <div class="brand-copy">
                <span class="brand-org">VisionGaiaTechnology</span>
                <span class="brand-product">Antipisher<span>${escapeHtml(str.tag)}</span></span>
              </div>
            </div>
            <span class="status">${escapeHtml(str.status)}</span>
          </header>

          <span class="eyebrow">${escapeHtml(str.eyebrow)}</span>
          <h2 id="shield-title">${escapeHtml(str.title)}</h2>
          <p class="explanation" id="shield-desc">${escapeHtml(explanation)}</p>

          <div class="facts">
            <div class="fact">
              <span class="fact-label">${escapeHtml(str.target)}</span>
              <span class="fact-value mono">${escapeHtml(targetUrl)}</span>
            </div>
            <div class="fact">
              <span class="fact-label">${escapeHtml(str.brand)}</span>
              <span class="fact-value">${escapeHtml(site)}</span>
            </div>
            ${official ? `<div class="fact">
              <span class="fact-label">${escapeHtml(str.official)}</span>
              <span class="fact-value official">${escapeHtml(official)}</span>
            </div>` : ''}
          </div>

          <div class="actions">
            <button type="button" class="btn btn-safe" id="btn-cancel">${escapeHtml(str.btnCancel)}</button>
            <button type="button" class="btn btn-proceed" id="btn-proceed">${escapeHtml(str.btnProceed)}</button>
          </div>
          <div class="footer">${escapeHtml(str.footer)}</div>
        </section>
      </div>
    `;

    const cancelBtn = shadow.getElementById('btn-cancel');
    const proceedBtn = shadow.getElementById('btn-proceed');
    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      if (typeof document.removeEventListener === 'function') {
        document.removeEventListener('keydown', onKeydown, true);
      }
      rootHost.remove();
    };
    const onKeydown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      cleanup();
      if (onCancel) onCancel();
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      if (onCancel) onCancel();
    });
    proceedBtn.addEventListener('click', () => {
      cleanup();
      if (onProceed) onProceed();
    });

    document.addEventListener('keydown', onKeydown, true);
    document.documentElement.appendChild(rootHost);
    try { cancelBtn.focus(); } catch { /* older engines */ }
  }

  function onFormSubmit(e) {
    const form = e.target;
    if (!form || !(form instanceof HTMLFormElement)) return;
    if (allowedForms.has(form)) return;

    const submitter = e.submitter || null;
    const currentVerdict = getCurrentVerdict();
    const targetVerdict = getTargetVerdict(form, submitter);

    if (!engineAvailable) {
      if (!hasPasswordField(form)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showWarningModal({
        status: 'block',
        action: 'block',
        site: 'Sicherheitsprüfung',
        official: '',
        reasons: [{
          explanation_de: 'Die lokale Prüf-Engine ist nicht verfügbar. Aus Sicherheitsgründen wird die Übertragung von Passwortdaten blockiert. Bitte lade die Erweiterung neu.'
        }]
      }, window.location.href, () => {}, () => {});
      return;
    }

    if (!isHardBlock(currentVerdict) && !isHardBlock(targetVerdict)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const verdict = isHardBlock(targetVerdict) ? targetVerdict : currentVerdict;
    let targetUrl = window.location.href;
    try {
      const rawAction = (submitter && submitter.formAction) || form.getAttribute('action');
      targetUrl = rawAction ? new URL(rawAction, window.location.href).href : window.location.href;
    } catch { /* keep current URL */ }

    showWarningModal(
      verdict,
      targetUrl,
      () => { /* user aborted safely, inputs stay intact */ },
      () => {
        let freshUrl = window.location.href;
        try {
          const rawAction = (submitter && submitter.formAction) || form.getAttribute('action');
          freshUrl = rawAction ? new URL(rawAction, window.location.href).href : window.location.href;
        } catch { /* ignore */ }
        if (freshUrl !== targetUrl) return;
        allowedForms.add(form);
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else HTMLFormElement.prototype.submit.call(form);
      }
    );
  }

  function checkPasswordFields() {
    const currentVerdict = getCurrentVerdict();
    if (!currentVerdict || currentVerdict.status !== 'block' || currentVerdict.action === 'warn') return;
    let hasPassword = false;
    try { hasPassword = Boolean(document.querySelector('input[type="password"]')); } catch { /* ignore */ }
    if (!hasPassword) return;
    if (document.getElementById('antipisher-shield-badge')) return;

    const bannerHost = document.createElement('div');
    bannerHost.id = 'antipisher-shield-badge';
    bannerHost.style.position = 'fixed';
    bannerHost.style.top = '14px';
    bannerHost.style.right = '14px';
    bannerHost.style.zIndex = '2147483646';
    const shadow = bannerHost.attachShadow({ mode: 'closed' });
      const badgeText = (SHIELD_I18N[detectShieldLang()] || SHIELD_I18N.en).badge;
      shadow.innerHTML = `
        <style>
          :host { all: initial; }
          .pill {
            display: flex; align-items: center; gap: 8px; padding: 8px 12px;
            border-radius: 999px; border: 1px solid rgba(239, 143, 157, 0.4);
            background: rgba(16, 24, 21, 0.92); color: #ffd9df;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          }
          .dot { width: 6px; height: 6px; border-radius: 50%; background: #ef8f9d; }
        </style>
        <div class="pill" role="status">
          <span class="dot"></span>
          <span>${escapeHtml(badgeText)}</span>
        </div>
      `;
    document.documentElement.appendChild(bannerHost);
  }

  function renderSafeToast() {
    if (typeof document === 'undefined' || !document.documentElement) return null;
    if (document.getElementById('antipisher-safe-toast-root')) return null;

    const host = document.createElement('div');
    host.id = 'antipisher-safe-toast-root';
    host.style.position = 'fixed';
    host.style.top = '16px';
    host.style.right = '16px';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';

    const shadow = host.attachShadow({ mode: 'closed' });
    const lang = (globalThis.AntipisherI18n && typeof globalThis.AntipisherI18n.detectLanguage === 'function')
      ? globalThis.AntipisherI18n.detectLanguage()
      : detectShieldLang();
    const str = SHIELD_I18N[lang] || SHIELD_I18N.en;
    const titleText = (globalThis.AntipisherI18n ? globalThis.AntipisherI18n.t('toastSafeTitle', lang) : null) || str.toastTitle;
    const subText = (globalThis.AntipisherI18n ? globalThis.AntipisherI18n.t('toastSafeSub', lang) : null) || str.toastSub;

    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        @keyframes vgt-toast-in {
          0% { opacity: 0; transform: translateY(-8px) scale(0.97); filter: blur(3px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes vgt-toast-out {
          0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translateY(-6px) scale(0.98); filter: blur(2px); }
        }
        .toast-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(111, 227, 189, 0.35);
          background: linear-gradient(135deg, rgba(16, 28, 24, 0.94), rgba(8, 16, 14, 0.96));
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.16);
          -webkit-backdrop-filter: blur(16px);
          backdrop-filter: blur(16px);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #f2f7f5;
          user-select: none;
          pointer-events: none;
          animation: vgt-toast-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .toast-pill.fading {
          animation: vgt-toast-out 0.35s cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        .toast-mark {
          width: 24px;
          height: 24px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          color: #6fe3bd;
          border: 1px solid rgba(111, 227, 189, 0.4);
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(111, 227, 189, 0.22), rgba(111, 227, 189, 0.05));
          box-shadow: 0 0 10px rgba(111, 227, 189, 0.28);
        }
        .toast-mark svg {
          width: 14px;
          height: 14px;
        }
        .toast-copy {
          display: flex;
          flex-direction: column;
          gap: 1px;
          line-height: 1.2;
        }
        .toast-title {
          font-size: 11px;
          font-weight: 680;
          letter-spacing: -0.01em;
          color: #ffffff;
          white-space: nowrap;
        }
        .toast-sub {
          font-size: 8.5px;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: #6fe3bd;
          text-transform: uppercase;
          white-space: nowrap;
        }
      </style>
      <div class="toast-pill" id="pill" role="status" aria-live="polite">
        <div class="toast-mark" aria-hidden="true">${BRAND_MARK}</div>
        <div class="toast-copy">
          <span class="toast-title">${escapeHtml(titleText)}</span>
          <span class="toast-sub">${escapeHtml(subText)}</span>
        </div>
      </div>
    `;

    document.documentElement.appendChild(host);

    const pill = shadow.getElementById('pill');
    const timerFn = (typeof setTimeout === 'function' ? setTimeout : (typeof window !== 'undefined' && typeof window.setTimeout === 'function' ? window.setTimeout : null));
    if (timerFn) {
      timerFn(() => {
        if (pill) pill.classList.add('fading');
        timerFn(() => {
          try { host.remove(); } catch {}
        }, 360);
      }, 2400);
    }

    return host;
  }

  function showSafeToast() {
    if (typeof window === 'undefined' || !window.location) return;
    const protocol = window.location.protocol;
    if (protocol !== 'http:' && protocol !== 'https:') return;

    const currentVerdict = getCurrentVerdict();
    if (!currentVerdict || currentVerdict.status !== 'safe') return;

    const api = globalThis.chrome || globalThis.browser;
    if (api && api.storage && api.storage.local && typeof api.storage.local.get === 'function') {
      try {
        const getRes = api.storage.local.get(['showSafeToast'], (res) => {
          if (res && res.showSafeToast === false) return;
          renderSafeToast();
        });
        if (getRes && typeof getRes.then === 'function') {
          getRes.then((res) => {
            if (res && res.showSafeToast === false) return;
            renderSafeToast();
          }).catch(() => renderSafeToast());
        }
        return;
      } catch {
        // Fallback below
      }
    }
    renderSafeToast();
  }

  function initContentShield() {
    checkPasswordFields();
    showSafeToast();
  }

  window.addEventListener('submit', onFormSubmit, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContentShield);
  } else {
    initContentShield();
  }

  globalThis.AntipisherShield = {
    onFormSubmit,
    getCurrentVerdict,
    getTargetVerdict,
    allowedForms,
    showSafeToast,
    renderSafeToast
  };
})();
