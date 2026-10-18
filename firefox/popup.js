(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const $ = id => document.getElementById(id);
  const i18n = globalThis.AntipisherI18n;

  let currentLang = i18n ? i18n.detectLanguage() : 'en';
  let userChoice = 'auto';
  let lastState = 'active';
  let isStrict = true;
  let isDegraded = false;

  let isShowSafeToast = true;
  let isAegis = true;
  let isTrackerShield = true;
  let isGeDefense = true;

  let currentTabCount = 0;
  let totalTrackers = 0;

  function setStatus(state, title, sub, pill) {
    document.body.dataset.state = state;
    lastState = state;
    if ($('statusTitle')) $('statusTitle').textContent = title;
    if ($('statusSub')) $('statusSub').textContent = sub;
    if ($('statusPill')) $('statusPill').textContent = pill;
  }

  function updateTrackersDisplay() {
    const lang = currentLang;
    if ($('trackersBlocked')) $('trackersBlocked').textContent = String(currentTabCount);
    if ($('trackersScope')) {
      $('trackersScope').textContent = i18n ? i18n.t('metricTrackersScope', lang, {
        tab: String(currentTabCount),
        total: String(totalTrackers)
      }) : `Tab: ${currentTabCount} · Gesamt: ${totalTrackers}`;
    }
  }

  async function queryActiveTabStats() {
    try {
      let tabs = await api.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tabs || tabs.length === 0) {
        tabs = await api.tabs.query({ active: true, currentWindow: true });
      }
      const tab = tabs && tabs[0];
      if (tab && tab.id) {
        let count = 0;
        if (api.action && typeof api.action.getBadgeText === 'function') {
          const badge = await api.action.getBadgeText({ tabId: tab.id }).catch(() => '');
          if (badge && !isNaN(parseInt(badge, 10))) {
            count = Math.max(count, parseInt(badge, 10));
          }
        }
        if (api.runtime && typeof api.runtime.sendMessage === 'function') {
          const resp = await api.runtime.sendMessage({ type: 'getTabTrackerStats', tabId: tab.id }).catch(() => null);
          if (resp && typeof resp.count === 'number' && resp.count > count) {
            count = resp.count;
          }
        }
        currentTabCount = count;
      }
    } catch {}
    updateTrackersDisplay();
  }

  function updateStatusDisplay() {
    const lang = currentLang;
    if (isDegraded) {
      setStatus(
        'degraded',
        i18n ? i18n.t('statusDegraded', lang) : 'Schutz eingeschränkt',
        i18n ? i18n.t('statusDegradedSub', lang) : 'Vorabprüfung nicht installiert – Best-Effort-Erkennung aktiv. Bitte Erweiterung neu laden.',
        i18n ? i18n.t('pillDegraded', lang) : 'EINGESCHRÄNKT'
      );
      if ($('notice')) $('notice').textContent = i18n ? i18n.t('noticeInactive', lang) : 'Die DNR-Vorabprüfung konnte nicht installiert werden.';
    } else if (isStrict) {
      setStatus(
        'active',
        i18n ? i18n.t('statusActive', lang) : 'Schutz aktiv',
        i18n ? i18n.t('noticeStrictActive', lang) : 'Streng: Jede Navigation durchläuft die Vollbild-Vorabprüfung.',
        i18n ? i18n.t('pillOn', lang) : 'AN'
      );
      if ($('notice')) $('notice').textContent = i18n ? i18n.t('noticeStrictActive', lang) : 'Streng: Jede Navigation durchläuft die Vollbild-Vorabprüfung.';
    } else {
      setStatus(
        'active',
        i18n ? i18n.t('statusActive', lang) : 'Schutz aktiv',
        i18n ? i18n.t('statusActiveSub', lang) : 'Verdächtige Seiten werden blockiert, sichere Seiten laden direkt.',
        i18n ? i18n.t('pillOn', lang) : 'AN'
      );
      if ($('notice')) $('notice').textContent = i18n ? i18n.t('noticeStrictInactive', lang) : 'Standard: Flüssiges Surfen ohne Vollbild-Unterbrechung bei sicheren Seiten.';
    }
  }

  function applyLanguage(lang, choice) {
    currentLang = lang;
    userChoice = choice || 'auto';
    document.documentElement.lang = lang;

    const btns = document.querySelectorAll('#popupLangBar .popup-lang-btn');
    btns.forEach(b => {
      b.classList.toggle('active', b.dataset.lang === userChoice);
    });

    if ($('lblBrands')) $('lblBrands').textContent = i18n ? i18n.t('metricBrands', lang) : 'Marken';
    if ($('lblBlocked')) $('lblBlocked').textContent = i18n ? i18n.t('metricBlocked', lang) : 'Abgewehrt';
    if ($('lblTrackers')) $('lblTrackers').textContent = i18n ? i18n.t('metricTrackers', lang) : 'Tracker blockiert';
    if ($('settingTitle')) $('settingTitle').textContent = i18n ? i18n.t('settingPreflight', lang) : 'Strenger Preflight-Modus';
    if ($('toastSettingTitle')) $('toastSettingTitle').textContent = i18n ? i18n.t('settingSafeToast', lang) : 'Status-Toast bei sicheren Seiten';
    if ($('toastNotice')) $('toastNotice').textContent = i18n ? i18n.t('noticeSafeToast', lang) : 'Blendet beim Öffnen verifizierter Websites kurz ein dezentes Glas-Badge ein.';
    if ($('trackerSettingTitle')) $('trackerSettingTitle').textContent = i18n ? i18n.t('settingTrackers', lang) : 'AEGIS Tracker- & Telemetrie-Schutz';
    if ($('trackerNotice')) $('trackerNotice').textContent = i18n ? i18n.t('noticeTrackers', lang) : 'Blockiert Analyse-Netzwerke, Werbe-Telemetrie und entfernt Tracking-Parameter aus URLs.';
    if ($('geDefenseSettingTitle')) $('geDefenseSettingTitle').textContent = i18n ? i18n.t('settingGeDefense', lang) : 'GeDefense Light (DOM- & Script-Schutz)';
    if ($('geDefenseNotice')) $('geDefenseNotice').textContent = i18n ? i18n.t('noticeGeDefense', lang) : 'Schützt JavaScript vor schädlicher DOM-Manipulation, Self-XSS, Prototypen-Angriffen und bösartigen Skript-Injektionen.';
    if ($('aegisSettingTitle')) $('aegisSettingTitle').textContent = i18n ? i18n.t('settingAegis', lang) : 'AEGIS Anti-Fingerprinting';
    if ($('aegisNotice')) $('aegisNotice').textContent = i18n ? i18n.t('noticeAegis', lang) : 'Offline-Schutz vor Canvas-, WebGL-, Audio- & Schriftarten-Fingerprinting und Tracking.';
    if ($('lblRotateSeed')) $('lblRotateSeed').textContent = i18n ? i18n.t('btnRotateSeed', lang) : 'Identität neu würfeln';
    if ($('urlLabel')) $('urlLabel').textContent = i18n ? i18n.t('checkLabel', lang) : 'Adresse prüfen';
    if ($('check')) $('check').textContent = i18n ? i18n.t('btnCheck', lang) : 'Prüfen';
    if ($('popupFooterOffline')) $('popupFooterOffline').textContent = 'AGPLv3 · ' + (i18n ? i18n.t('footerOffline', lang) : '100 % offline');

    updateStatusDisplay();
    updateTrackersDisplay();
    if ($('url') && $('url').value.trim()) {
      evaluate();
    }
  }

  if (globalThis.VGT_SITES) {
    $('sitecount').textContent = String(globalThis.VGT_SITES.length);
  }

  api.storage.local.get(['blocked', 'trackersBlocked', 'strictMode', 'showSafeToast', 'aegisProtection', 'aegisTrackerShield', 'geDefenseLight', 'protectionDegraded', 'user_locale']).then(x => {
    $('blocked').textContent = String(x.blocked || 0);
    totalTrackers = x.trackersBlocked || 0;
    isStrict = x.strictMode === true;
    isShowSafeToast = x.showSafeToast !== false;
    isAegis = x.aegisProtection !== false;
    isTrackerShield = x.aegisTrackerShield !== false;
    isGeDefense = x.geDefenseLight !== false;
    isDegraded = !!x.protectionDegraded;
    $('strict').checked = isStrict;
    if ($('safeToastToggle')) $('safeToastToggle').checked = isShowSafeToast;
    if ($('aegisToggle')) $('aegisToggle').checked = isAegis;
    if ($('trackerToggle')) $('trackerToggle').checked = isTrackerShield;
    if ($('geDefenseToggle')) $('geDefenseToggle').checked = isGeDefense;

    const savedLocale = x.user_locale;
    if (savedLocale && savedLocale !== 'auto') {
      applyLanguage(savedLocale, savedLocale);
    } else {
      applyLanguage(i18n ? i18n.detectLanguage() : 'en', 'auto');
    }
    queryActiveTabStats();
  }).catch(() => {
    applyLanguage(currentLang, 'auto');
  });

  const isChrome = !!api.declarativeNetRequest;
  if (!isChrome) {
    $('chromeOption').hidden = true;
  }

  $('strict').addEventListener('change', async () => {
    isStrict = $('strict').checked;
    await api.storage.local.set({ strictMode: isStrict });
    updateStatusDisplay();
  });

  if ($('safeToastToggle')) {
    $('safeToastToggle').addEventListener('change', async () => {
      isShowSafeToast = $('safeToastToggle').checked;
      await api.storage.local.set({ showSafeToast: isShowSafeToast });
    });
  }

  if ($('trackerToggle')) {
    $('trackerToggle').addEventListener('change', async () => {
      isTrackerShield = $('trackerToggle').checked;
      await api.storage.local.set({ aegisTrackerShield: isTrackerShield });
      if (api.declarativeNetRequest && typeof api.declarativeNetRequest.updateEnabledRulesets === 'function') {
        try {
          if (isTrackerShield) {
            await api.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ['aegis_trackers'] });
          } else {
            await api.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ['aegis_trackers'] });
          }
        } catch {}
      }
    });
  }

  if ($('geDefenseToggle')) {
    $('geDefenseToggle').addEventListener('change', async () => {
      isGeDefense = $('geDefenseToggle').checked;
      await api.storage.local.set({ geDefenseLight: isGeDefense });
    });
  }

  if ($('aegisToggle')) {
    $('aegisToggle').addEventListener('change', async () => {
      isAegis = $('aegisToggle').checked;
      await api.storage.local.set({ aegisProtection: isAegis });
    });
  }

  const rotateBtn = $('btnRotateSeed');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', async () => {
      try {
        const tabs = await api.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs[0] && tabs[0].id) {
          api.tabs.sendMessage(tabs[0].id, { type: 'aegis:rotate-seed' }).catch(() => {});
        }
      } catch {}
      const lbl = $('lblRotateSeed');
      if (lbl) {
        const origText = i18n ? i18n.t('btnRotateSeed', currentLang) : 'Identität neu würfeln';
        lbl.textContent = i18n ? i18n.t('toastAegisRotated', currentLang) : 'Erneuert';
        setTimeout(() => {
          lbl.textContent = origText;
        }, 1200);
      }
    });
  }

  // Language bar buttons
  const langBar = $('popupLangBar');
  if (langBar) {
    langBar.addEventListener('click', async (e) => {
      const btn = e.target.closest('.popup-lang-btn');
      if (!btn || !btn.dataset.lang) return;
      const chosen = btn.dataset.lang;
      if (chosen === 'auto') {
        const detected = i18n ? i18n.detectLanguage() : 'en';
        await api.storage.local.set({ user_locale: 'auto' });
        applyLanguage(detected, 'auto');
      } else {
        await api.storage.local.set({ user_locale: chosen });
        applyLanguage(chosen, chosen);
      }
    });
  }

  const evaluate = () => {
    const typed = $('url').value.trim();
    if (!typed) {
      $('result').style.display = 'none';
      $('result').className = 'result';
      $('result').textContent = '';
      return;
    }
    const testUrl = /^[a-z]+:\/\//i.test(typed) ? typed : 'https://' + typed;
    const engine = globalThis.Antipisher || globalThis.VGT_DomainGuard;
    const r = engine.classify(testUrl);
    const lang = currentLang;

    if (r.status === 'block') {
      if (r.action === 'warn') {
        $('result').className = 'result block';
        $('result').textContent = i18n
          ? i18n.t('resWarn', lang, { site: r.site, official: r.official })
          : ('Prüfung eingeschränkt: Ähnlich zu ' + r.site + ' (' + r.official + '). Domain nicht eindeutig verifizierbar.');
      } else {
        $('result').className = 'result block';
        $('result').textContent = i18n
          ? i18n.t('resSuspicious', lang, { site: r.site, official: r.official })
          : ('Verdächtig: Imitation von ' + r.site + ' (' + r.official + ').');
      }
    } else if (r.status === 'safe') {
      $('result').className = 'result safe';
      $('result').textContent = i18n
        ? i18n.t('resSafe', lang)
        : 'Kein Treffer in der lokalen Schutzliste – keine Garantie für Sicherheit.';
    } else {
      $('result').className = 'result skip';
      $('result').textContent = i18n
        ? i18n.t('resSkip', lang)
        : 'Ungültige oder nicht unterstützte Webadresse.';
    }
  };

  $('check').addEventListener('click', evaluate);
  $('url').addEventListener('keydown', e => {
    if (e.key === 'Enter') evaluate();
  });

  const btnOpenOptions = $('btnOpenOptions');
  if (btnOpenOptions) {
    btnOpenOptions.addEventListener('click', () => {
      if (api.runtime && typeof api.runtime.openOptionsPage === 'function') {
        api.runtime.openOptionsPage();
      } else {
        window.open(api.runtime.getURL('options.html'));
      }
    });
  }

  if (api.runtime && api.runtime.onMessage && typeof api.runtime.onMessage.addListener === 'function') {
    api.runtime.onMessage.addListener((msg) => {
      if (msg && (msg.type === 'tracker-blocked-event' || msg.type === 'trackers-updated')) {
        queryActiveTabStats();
        if (api.storage && api.storage.local) {
          api.storage.local.get(['blocked', 'trackersBlocked']).then(res => {
            totalTrackers = res?.trackersBlocked || 0;
            updateTrackersDisplay();
          }).catch(()=>{});
        }
      }
    });
  }
})();
