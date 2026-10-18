/*
 * Antipisher — Options & Settings Controller (GLASS 2100)
 * AGPLv3 · VisionGaiaTechnology
 * 100% Offline, Zero Telemetry, Full Local Configuration
 */

(() => {
  'use strict';

  const api = globalThis.browser || globalThis.chrome;
  const i18n = globalThis.AntipisherI18n;
  const detector = globalThis.Antipisher || globalThis.VGT_DomainGuard;

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  let currentLang = i18n ? i18n.detectLanguage() : 'de';
  let toastTimer = null;

  // Default configuration map
  const DEFAULTS = {
    // Phishing & Preflight
    strictMode: false,
    formShieldEnabled: true,
    showSafeToast: true,
    toastDuration: 2500,

    // Trackers & Telemetry
    aegisTrackerShield: true,
    sanitizeUrlParams: true,
    defuseBeacons: true,
    showBadgeCount: true,

    // GeDefense Light
    geDefenseLight: true,
    selfXssWarning: true,
    blockProtocolInjection: true,

    // Anti-Fingerprinting
    aegisProtection: true,
    spoofCanvas: true,
    spoofWebGL: true,
    spoofAudio: true,

    // Exceptions
    customWhitelist: [],

    // System
    user_locale: 'auto',
    blocked: 0,
    trackersBlocked: 0
  };

  let currentConfig = { ...DEFAULTS };

  // Toast feedback
  function showSavedToast(msg) {
    const toast = $('savedToast');
    if (!toast) return;
    const label = $('lblSavedToast');
    if (label && msg) label.textContent = msg;
    else if (label && i18n) label.textContent = i18n.t('savedToast', currentLang);

    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  // --- TAB SWITCHING ---
  function initTabs() {
    const tabBtns = $$('.options-tabs .tab-btn');
    const panels = $$('.options-content .tab-panel');

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetPanelId = btn.getAttribute('aria-controls');

        tabBtns.forEach((b) => {
          const isActive = b === btn;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        panels.forEach((p) => {
          const isMatch = p.id === targetPanelId;
          p.classList.toggle('active', isMatch);
          p.hidden = !isMatch;
        });
      });
    });
  }

  // --- SETTINGS PERSISTENCE ---
  async function loadSettings() {
    if (!api || !api.storage || !api.storage.local) return;
    try {
      const keys = Object.keys(DEFAULTS);
      const data = await api.storage.local.get(keys);
      currentConfig = { ...DEFAULTS, ...data };
      applyConfigToUI(currentConfig);
    } catch (err) {
      console.error('Antipisher Options: Failed to load storage', err);
      applyConfigToUI(DEFAULTS);
    }
  }

  async function saveSetting(key, value) {
    currentConfig[key] = value;
    if (api && api.storage && api.storage.local) {
      try {
        await api.storage.local.set({ [key]: value });
        showSavedToast();
      } catch (err) {
        console.error('Antipisher Options: Failed to save', key, err);
      }
    }
  }

  function applyConfigToUI(cfg) {
    // 1. Phishing & Preflight
    if ($('chkStrictMode')) $('chkStrictMode').checked = Boolean(cfg.strictMode);
    if ($('chkFormShield')) $('chkFormShield').checked = cfg.formShieldEnabled !== false;
    if ($('chkSafeToast')) $('chkSafeToast').checked = cfg.showSafeToast !== false;
    if ($('selToastDuration')) $('selToastDuration').value = String(cfg.toastDuration || 2500);

    // 2. Trackers & Telemetry
    if ($('chkTrackerShield')) $('chkTrackerShield').checked = cfg.aegisTrackerShield !== false;
    if ($('chkUrlStrip')) $('chkUrlStrip').checked = cfg.sanitizeUrlParams !== false;
    if ($('chkBeacon')) $('chkBeacon').checked = cfg.defuseBeacons !== false;
    if ($('chkBadge')) $('chkBadge').checked = cfg.showBadgeCount !== false;

    // 3. GeDefense Light
    if ($('chkGeDefense')) $('chkGeDefense').checked = cfg.geDefenseLight !== false;
    if ($('chkSelfXss')) $('chkSelfXss').checked = cfg.selfXssWarning !== false;
    if ($('chkProtocol')) $('chkProtocol').checked = cfg.blockProtocolInjection !== false;

    // 4. Anti-Fingerprinting
    if ($('chkAegis')) $('chkAegis').checked = cfg.aegisProtection !== false;
    if ($('chkCanvas')) $('chkCanvas').checked = cfg.spoofCanvas !== false;
    if ($('chkWebGL')) $('chkWebGL').checked = cfg.spoofWebGL !== false;
    if ($('chkAudio')) $('chkAudio').checked = cfg.spoofAudio !== false;

    // 5. Whitelist
    renderWhitelist(cfg.customWhitelist || []);

    // 6. System & Data
    if ($('selLocale')) $('selLocale').value = cfg.user_locale || 'auto';
    updateStatsDisplay(cfg.blocked || 0, cfg.trackersBlocked || 0);

    // Seed display
    updateSeedDisplay();
  }

  // --- WHITELIST MANAGEMENT ---
  function cleanDomainInput(raw) {
    if (!raw) return '';
    let val = String(raw).trim().toLowerCase();
    val = val.replace(/^[a-z]+:\/\//, '');
    val = val.split('/')[0];
    val = val.split(':')[0];
    val = val.replace(/\.+$/, '');
    return val;
  }

  function renderWhitelist(list) {
    const container = $('whitelistContainer');
    if (!container) return;

    container.innerHTML = '';
    const safeList = Array.isArray(list) ? list : [];

    if (safeList.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'whitelist-empty';
      emptyDiv.id = 'lblWhitelistEmpty';
      emptyDiv.textContent = i18n ? i18n.t('optWhitelistEmpty', currentLang) : 'Keine benutzerdefinierten Ausnahmen vorhanden.';
      container.appendChild(emptyDiv);
      return;
    }

    safeList.forEach((domain, idx) => {
      const item = document.createElement('div');
      item.className = 'whitelist-item';

      const copy = document.createElement('div');
      copy.className = 'whitelist-item-copy';

      const hostSpan = document.createElement('span');
      hostSpan.className = 'whitelist-host';
      hostSpan.textContent = domain;

      const subSpan = document.createElement('span');
      subSpan.className = 'whitelist-sub';
      subSpan.textContent = i18n ? i18n.t('optWhitelistItemNote', currentLang) || 'Ausnahme aktiv' : 'Ausnahme aktiv';

      copy.appendChild(hostSpan);
      copy.appendChild(subSpan);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'whitelist-del-btn';
      delBtn.title = i18n ? i18n.t('optWhitelistDelete', currentLang) || 'Entfernen' : 'Entfernen';
      delBtn.setAttribute('aria-label', `Entferne ${domain}`);
      delBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      delBtn.addEventListener('click', async () => {
        const updated = safeList.filter((_, i) => i !== idx);
        await saveSetting('customWhitelist', updated);
        renderWhitelist(updated);
      });

      item.appendChild(copy);
      item.appendChild(delBtn);
      container.appendChild(item);
    });
  }

  async function handleAddWhitelist() {
    const input = $('txtWhitelistInput');
    if (!input) return;
    const clean = cleanDomainInput(input.value);

    if (!clean || !clean.includes('.') || clean.length < 3) {
      input.focus();
      return;
    }

    const currentList = Array.isArray(currentConfig.customWhitelist) ? [...currentConfig.customWhitelist] : [];
    if (!currentList.includes(clean)) {
      currentList.push(clean);
      currentList.sort();
      await saveSetting('customWhitelist', currentList);
      renderWhitelist(currentList);
    }

    input.value = '';
    input.focus();
  }

  // --- SEED DISPLAY & ROTATION ---
  function updateSeedDisplay(newSeed) {
    const seedEl = $('lblSeedVal');
    if (!seedEl) return;
    if (newSeed) {
      seedEl.textContent = newSeed;
      return;
    }
    let seed = '';
    try {
      if (globalThis.sessionStorage) {
        seed = globalThis.sessionStorage.getItem('aegis_omega_seed') || '';
      }
    } catch {}
    if (!seed) {
      seed = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
    }
    seedEl.textContent = seed;
  }

  function rotateSeed() {
    const freshSeed = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
    try {
      if (globalThis.sessionStorage) {
        globalThis.sessionStorage.setItem('aegis_omega_seed', freshSeed);
      }
    } catch {}
    updateSeedDisplay(freshSeed);

    if (api && api.runtime && typeof api.runtime.sendMessage === 'function') {
      api.runtime.sendMessage({ type: 'aegis:rotate-seed', seed: freshSeed }).catch(() => {});
    }

    const rotatedMsg = i18n ? i18n.t('toastAegisRotated', currentLang) : 'Identitäts-Seed erneuert';
    showSavedToast(rotatedMsg);
  }

  // --- STATS DISPLAY ---
  function updateStatsDisplay(phish, trackers) {
    const desc = $('optStatsDesc');
    if (!desc) return;
    if (i18n) {
      desc.textContent = i18n.t('optStatsDesc', currentLang, {
        phish: String(phish),
        trackers: String(trackers)
      });
    } else {
      desc.textContent = `${phish} Phishing-Versuche abgewehrt · ${trackers} Tracker neutralisiert`;
    }
  }

  async function resetStats() {
    currentConfig.blocked = 0;
    currentConfig.trackersBlocked = 0;
    if (api && api.storage && api.storage.local) {
      await api.storage.local.set({ blocked: 0, trackersBlocked: 0 });
    }
    updateStatsDisplay(0, 0);
    showSavedToast();
  }

  // --- EXPORT & IMPORT ---
  function exportConfig() {
    const exportData = {
      version: '0.2.1',
      exportedAt: new Date().toISOString(),
      generator: 'Antipisher / VisionGaiaTechnology',
      settings: {
        strictMode: currentConfig.strictMode,
        formShieldEnabled: currentConfig.formShieldEnabled,
        showSafeToast: currentConfig.showSafeToast,
        toastDuration: currentConfig.toastDuration,
        aegisTrackerShield: currentConfig.aegisTrackerShield,
        sanitizeUrlParams: currentConfig.sanitizeUrlParams,
        defuseBeacons: currentConfig.defuseBeacons,
        showBadgeCount: currentConfig.showBadgeCount,
        geDefenseLight: currentConfig.geDefenseLight,
        selfXssWarning: currentConfig.selfXssWarning,
        blockProtocolInjection: currentConfig.blockProtocolInjection,
        aegisProtection: currentConfig.aegisProtection,
        spoofCanvas: currentConfig.spoofCanvas,
        spoofWebGL: currentConfig.spoofWebGL,
        spoofAudio: currentConfig.spoofAudio,
        user_locale: currentConfig.user_locale,
        customWhitelist: currentConfig.customWhitelist || []
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `antipisher-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const importedSettings = parsed.settings || parsed;

        const updated = { ...currentConfig };
        const allowedKeys = [
          'strictMode', 'formShieldEnabled', 'showSafeToast', 'toastDuration',
          'aegisTrackerShield', 'sanitizeUrlParams', 'defuseBeacons', 'showBadgeCount',
          'geDefenseLight', 'selfXssWarning', 'blockProtocolInjection',
          'aegisProtection', 'spoofCanvas', 'spoofWebGL', 'spoofAudio',
          'user_locale', 'customWhitelist'
        ];

        for (const k of allowedKeys) {
          if (k in importedSettings) {
            updated[k] = importedSettings[k];
          }
        }

        if (api && api.storage && api.storage.local) {
          await api.storage.local.set(updated);
        }
        currentConfig = updated;
        applyConfigToUI(currentConfig);
        applyLanguage(currentConfig.user_locale || 'auto');
        showSavedToast();
      } catch (err) {
        console.error('Antipisher Options: Import parse failed', err);
        alert('Fehler beim Importieren der Datei: Ungültiges JSON-Format.');
      }
    };
    reader.readAsText(file);
  }

  async function resetDefaults() {
    const confirmMsg = i18n
      ? i18n.t('optConfirmReset', currentLang)
      : 'Möchtest du wirklich alle Einstellungen und Statistiken auf die Standardwerte zurücksetzen?';
    if (!confirm(confirmMsg)) return;

    currentConfig = { ...DEFAULTS };
    if (api && api.storage && api.storage.local) {
      await api.storage.local.clear();
      await api.storage.local.set(DEFAULTS);
    }
    applyConfigToUI(currentConfig);
    applyLanguage('auto');
    showSavedToast();
  }

  // --- LOCALIZATION ENGINE ---
  function applyLanguage(langChoice) {
    const effectiveLang = (langChoice === 'auto' || !langChoice)
      ? (i18n ? i18n.detectLanguage() : 'de')
      : langChoice;
    currentLang = effectiveLang;
    document.documentElement.lang = effectiveLang;

    if (!i18n) return;

    // Headers & Navigation
    if ($('optionsTitle')) $('optionsTitle').textContent = i18n.t('optionsTitle', currentLang);
    if ($('optionsSubtitle')) $('optionsSubtitle').textContent = i18n.t('optionsSubtitle', currentLang);
    if ($('lblOfflineChip')) $('lblOfflineChip').textContent = i18n.t('footerOffline', currentLang);

    if ($('tabLblGeneral')) $('tabLblGeneral').textContent = i18n.t('tabGeneral', currentLang);
    if ($('tabLblTrackers')) $('tabLblTrackers').textContent = i18n.t('tabTrackers', currentLang);
    if ($('tabLblGeDefense')) $('tabLblGeDefense').textContent = i18n.t('tabGeDefense', currentLang);
    if ($('tabLblFingerprinting')) $('tabLblFingerprinting').textContent = i18n.t('tabFingerprinting', currentLang);
    if ($('tabLblWhitelist')) $('tabLblWhitelist').textContent = i18n.t('tabWhitelist', currentLang);
    if ($('tabLblData')) $('tabLblData').textContent = i18n.t('tabData', currentLang);

    // Section 1: General
    if ($('lblSecGeneral')) $('lblSecGeneral').textContent = i18n.t('tabGeneral', currentLang);
    if ($('lblSecGeneralNote')) $('lblSecGeneralNote').textContent = i18n.t('appDesc', currentLang);
    if ($('optStrictTitle')) $('optStrictTitle').textContent = i18n.t('settingPreflight', currentLang);
    if ($('optStrictNote')) $('optStrictNote').textContent = i18n.t('noticeStrictInactive', currentLang);
    if ($('optFormShieldTitle')) $('optFormShieldTitle').textContent = i18n.t('optFormShieldTitle', currentLang);
    if ($('optFormShieldNote')) $('optFormShieldNote').textContent = i18n.t('optFormShieldNote', currentLang);
    if ($('optSafeToastTitle')) $('optSafeToastTitle').textContent = i18n.t('settingSafeToast', currentLang);
    if ($('optSafeToastNote')) $('optSafeToastNote').textContent = i18n.t('noticeSafeToast', currentLang);
    if ($('optToastDurationTitle')) $('optToastDurationTitle').textContent = i18n.t('optToastDurationTitle', currentLang);
    if ($('optToastDurationNote')) $('optToastDurationNote').textContent = i18n.t('optToastDurationNote', currentLang);
    if ($('optDurFast')) $('optDurFast').textContent = i18n.t('optDurationFast', currentLang);
    if ($('optDurNormal')) $('optDurNormal').textContent = i18n.t('optDurationNormal', currentLang);
    if ($('optDurLong')) $('optDurLong').textContent = i18n.t('optDurationLong', currentLang);

    // Section 2: Trackers
    if ($('lblSecTrackers')) $('lblSecTrackers').textContent = i18n.t('settingTrackers', currentLang);
    if ($('lblSecTrackersNote')) $('lblSecTrackersNote').textContent = i18n.t('noticeTrackers', currentLang);
    if ($('optTrackerMasterTitle')) $('optTrackerMasterTitle').textContent = i18n.t('settingTrackers', currentLang);
    if ($('optTrackerMasterNote')) $('optTrackerMasterNote').textContent = i18n.t('noticeTrackers', currentLang);
    if ($('optUrlStripTitle')) $('optUrlStripTitle').textContent = i18n.t('optUrlStripTitle', currentLang);
    if ($('optUrlStripNote')) $('optUrlStripNote').textContent = i18n.t('optUrlStripNote', currentLang);
    if ($('optBeaconTitle')) $('optBeaconTitle').textContent = i18n.t('optBeaconTitle', currentLang);
    if ($('optBeaconNote')) $('optBeaconNote').textContent = i18n.t('optBeaconNote', currentLang);
    if ($('optBadgeTitle')) $('optBadgeTitle').textContent = i18n.t('optBadgeTitle', currentLang);
    if ($('optBadgeNote')) $('optBadgeNote').textContent = i18n.t('optBadgeNote', currentLang);

    // Section 3: GeDefense
    if ($('lblSecGeDefense')) $('lblSecGeDefense').textContent = i18n.t('settingGeDefense', currentLang);
    if ($('lblSecGeDefenseNote')) $('lblSecGeDefenseNote').textContent = i18n.t('noticeGeDefense', currentLang);
    if ($('optGeDefenseMasterTitle')) $('optGeDefenseMasterTitle').textContent = i18n.t('settingGeDefense', currentLang);
    if ($('optGeDefenseMasterNote')) $('optGeDefenseMasterNote').textContent = i18n.t('noticeGeDefense', currentLang);
    if ($('optSelfXssTitle')) $('optSelfXssTitle').textContent = i18n.t('optSelfXssTitle', currentLang);
    if ($('optSelfXssNote')) $('optSelfXssNote').textContent = i18n.t('optSelfXssNote', currentLang);
    if ($('optProtocolTitle')) $('optProtocolTitle').textContent = i18n.t('optProtocolTitle', currentLang);
    if ($('optProtocolNote')) $('optProtocolNote').textContent = i18n.t('optProtocolNote', currentLang);

    // Section 4: Anti-Fingerprinting
    if ($('lblSecFingerprinting')) $('lblSecFingerprinting').textContent = i18n.t('settingAegis', currentLang);
    if ($('lblSecFingerprintingNote')) $('lblSecFingerprintingNote').textContent = i18n.t('noticeAegis', currentLang);
    if ($('optAegisMasterTitle')) $('optAegisMasterTitle').textContent = i18n.t('settingAegis', currentLang);
    if ($('optAegisMasterNote')) $('optAegisMasterNote').textContent = i18n.t('noticeAegis', currentLang);
    if ($('optCanvasTitle')) $('optCanvasTitle').textContent = i18n.t('optCanvasTitle', currentLang);
    if ($('optCanvasNote')) $('optCanvasNote').textContent = i18n.t('optCanvasNote', currentLang);
    if ($('optWebGLTitle')) $('optWebGLTitle').textContent = i18n.t('optWebGLTitle', currentLang);
    if ($('optWebGLNote')) $('optWebGLNote').textContent = i18n.t('optWebGLNote', currentLang);
    if ($('optAudioTitle')) $('optAudioTitle').textContent = i18n.t('optAudioTitle', currentLang);
    if ($('optAudioNote')) $('optAudioNote').textContent = i18n.t('optAudioNote', currentLang);
    if ($('optSeedTitle')) $('optSeedTitle').textContent = i18n.t('btnRotateSeed', currentLang);
    if ($('lblBtnRotate')) $('lblBtnRotate').textContent = i18n.t('btnRotateSeed', currentLang);

    // Section 5: Whitelist
    if ($('optWhitelistTitle')) $('optWhitelistTitle').textContent = i18n.t('optWhitelistTitle', currentLang);
    if ($('optWhitelistNote')) $('optWhitelistNote').textContent = i18n.t('optWhitelistNote', currentLang);
    if ($('txtWhitelistInput')) $('txtWhitelistInput').placeholder = i18n.t('optWhitelistPlaceholder', currentLang);
    if ($('lblBtnAddWhitelist')) $('lblBtnAddWhitelist').textContent = i18n.t('optWhitelistAdd', currentLang);
    if ($('lblWhitelistEmpty')) $('lblWhitelistEmpty').textContent = i18n.t('optWhitelistEmpty', currentLang);

    // Section 6: System & Data
    if ($('lblSecData')) $('lblSecData').textContent = i18n.t('tabData', currentLang);
    if ($('optLangTitle')) $('optLangTitle').textContent = i18n.t('optLangTitle', currentLang);
    if ($('optLangNote')) $('optLangNote').textContent = i18n.t('optLangNote', currentLang);
    if ($('optStatsTitle')) $('optStatsTitle').textContent = i18n.t('optStatsTitle', currentLang);
    if ($('lblBtnResetStats')) $('lblBtnResetStats').textContent = i18n.t('optBtnResetStats', currentLang);
    if ($('lblBtnExport')) $('lblBtnExport').textContent = i18n.t('optBtnExport', currentLang);
    if ($('lblBtnImport')) $('lblBtnImport').textContent = i18n.t('optBtnImport', currentLang);
    if ($('lblBtnResetDefaults')) $('lblBtnResetDefaults').textContent = i18n.t('optBtnResetDefaults', currentLang);
    if ($('lblSavedToast')) $('lblSavedToast').textContent = i18n.t('savedToast', currentLang);

    updateStatsDisplay(currentConfig.blocked || 0, currentConfig.trackersBlocked || 0);
  }

  // --- WIRE EVENTS ---
  function wireEvents() {
    // 1. Phishing & Preflight
    if ($('chkStrictMode')) {
      $('chkStrictMode').addEventListener('change', (e) => saveSetting('strictMode', e.target.checked));
    }
    if ($('chkFormShield')) {
      $('chkFormShield').addEventListener('change', (e) => saveSetting('formShieldEnabled', e.target.checked));
    }
    if ($('chkSafeToast')) {
      $('chkSafeToast').addEventListener('change', (e) => saveSetting('showSafeToast', e.target.checked));
    }
    if ($('selToastDuration')) {
      $('selToastDuration').addEventListener('change', (e) => saveSetting('toastDuration', Number(e.target.value)));
    }

    // 2. Trackers
    if ($('chkTrackerShield')) {
      $('chkTrackerShield').addEventListener('change', (e) => saveSetting('aegisTrackerShield', e.target.checked));
    }
    if ($('chkUrlStrip')) {
      $('chkUrlStrip').addEventListener('change', (e) => saveSetting('sanitizeUrlParams', e.target.checked));
    }
    if ($('chkBeacon')) {
      $('chkBeacon').addEventListener('change', (e) => saveSetting('defuseBeacons', e.target.checked));
    }
    if ($('chkBadge')) {
      $('chkBadge').addEventListener('change', (e) => saveSetting('showBadgeCount', e.target.checked));
    }

    // 3. GeDefense
    if ($('chkGeDefense')) {
      $('chkGeDefense').addEventListener('change', (e) => saveSetting('geDefenseLight', e.target.checked));
    }
    if ($('chkSelfXss')) {
      $('chkSelfXss').addEventListener('change', (e) => saveSetting('selfXssWarning', e.target.checked));
    }
    if ($('chkProtocol')) {
      $('chkProtocol').addEventListener('change', (e) => saveSetting('blockProtocolInjection', e.target.checked));
    }

    // 4. Anti-Fingerprinting
    if ($('chkAegis')) {
      $('chkAegis').addEventListener('change', (e) => saveSetting('aegisProtection', e.target.checked));
    }
    if ($('chkCanvas')) {
      $('chkCanvas').addEventListener('change', (e) => saveSetting('spoofCanvas', e.target.checked));
    }
    if ($('chkWebGL')) {
      $('chkWebGL').addEventListener('change', (e) => saveSetting('spoofWebGL', e.target.checked));
    }
    if ($('chkAudio')) {
      $('chkAudio').addEventListener('change', (e) => saveSetting('spoofAudio', e.target.checked));
    }
    if ($('btnRotateSeedOpt')) {
      $('btnRotateSeedOpt').addEventListener('click', rotateSeed);
    }

    // 5. Whitelist
    if ($('btnAddWhitelist')) {
      $('btnAddWhitelist').addEventListener('click', handleAddWhitelist);
    }
    if ($('txtWhitelistInput')) {
      $('txtWhitelistInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddWhitelist();
        }
      });
    }

    // 6. System & Data
    if ($('selLocale')) {
      $('selLocale').addEventListener('change', async (e) => {
        const chosen = e.target.value;
        await saveSetting('user_locale', chosen);
        applyLanguage(chosen);
      });
    }
    if ($('btnResetStats')) {
      $('btnResetStats').addEventListener('click', resetStats);
    }
    if ($('btnExportConfig')) {
      $('btnExportConfig').addEventListener('click', exportConfig);
    }
    if ($('fileImportConfig')) {
      $('fileImportConfig').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleImportFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }
    if ($('btnResetDefaults')) {
      $('btnResetDefaults').addEventListener('click', resetDefaults);
    }
  }

  // Initial setup
  document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    wireEvents();
    await loadSettings();
    applyLanguage(currentConfig.user_locale || 'auto');
  });
})();
