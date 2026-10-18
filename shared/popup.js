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

  function setStatus(state, title, sub, pill) {
    document.body.dataset.state = state;
    lastState = state;
    if ($('statusTitle')) $('statusTitle').textContent = title;
    if ($('statusSub')) $('statusSub').textContent = sub;
    if ($('statusPill')) $('statusPill').textContent = pill;
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
    } else if (!isStrict) {
      setStatus(
        'reduced',
        i18n ? i18n.t('statusReduced', lang) : 'Best-Effort-Modus',
        i18n ? i18n.t('statusReducedSub', lang) : 'Nur Beobachtung ohne präventive Blockade.',
        i18n ? i18n.t('pillOff', lang) : 'AUS'
      );
      if ($('notice')) $('notice').textContent = i18n ? i18n.t('noticeInactive', lang) : 'Inaktiv: keine präventive Blockade.';
    } else {
      setStatus(
        'active',
        i18n ? i18n.t('statusActive', lang) : 'Schutz aktiv',
        i18n ? i18n.t('statusActiveSub', lang) : 'GET-Navigationen werden lokal geprüft.',
        i18n ? i18n.t('pillOn', lang) : 'AN'
      );
      if ($('notice')) $('notice').textContent = i18n ? i18n.t('noticeActive', lang) : 'Aktiv: GET-Navigationen werden vor der Anfrage klassifiziert.';
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
    if ($('settingTitle')) $('settingTitle').textContent = i18n ? i18n.t('settingPreflight', lang) : 'Vorabprüfung';
    if ($('urlLabel')) $('urlLabel').textContent = i18n ? i18n.t('checkLabel', lang) : 'Adresse prüfen';
    if ($('check')) $('check').textContent = i18n ? i18n.t('btnCheck', lang) : 'Prüfen';
    if ($('popupFooterOffline')) $('popupFooterOffline').textContent = 'AGPLv3 · ' + (i18n ? i18n.t('footerOffline', lang) : '100 % offline');

    updateStatusDisplay();
    if ($('url') && $('url').value.trim()) {
      evaluate();
    }
  }

  if (globalThis.VGT_SITES) {
    $('sitecount').textContent = String(globalThis.VGT_SITES.length);
  }

  api.storage.local.get(['blocked', 'strictMode', 'protectionDegraded', 'user_locale']).then(x => {
    $('blocked').textContent = String(x.blocked || 0);
    isStrict = x.strictMode !== false;
    isDegraded = !!x.protectionDegraded;
    $('strict').checked = isStrict;

    const savedLocale = x.user_locale;
    if (savedLocale && savedLocale !== 'auto') {
      applyLanguage(savedLocale, savedLocale);
    } else {
      applyLanguage(i18n ? i18n.detectLanguage() : 'en', 'auto');
    }
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
})();
