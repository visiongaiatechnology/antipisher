(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const $ = id => document.getElementById(id);
  const i18n = globalThis.AntipisherI18n;

  const reasonNames = {
    unicode: 'Die Adresse verwendet Zeichen aus fremden Alphabeten oder diakritische Varianten, die einer geschützten Marke täuschend ähneln.',
    'unicode-hidden': 'Die Adresse enthält unsichtbare Unicode-Steuerzeichen zur Verschleierung.',
    'bidi-override': 'Die Adresse enthält bidirektionale Steuerzeichen, die den tatsächlichen Domainnamen optisch verschleiern.',
    'foreign-domain': 'Ein geschützter Markenname wird auf einer fremden Domain oder Subdomain verwendet.',
    'brand-variant': 'Die Domain imitiert einen Markennamen mit abweichender Schreibweise oder Zeichenersetzung.',
    'credential-bait': 'Die Adresse kombiniert einen Markennamen mit typischen Anmelde-, Konto- oder Sicherheitsbegriffen.',
    typosquat: 'Die Domain unterscheidet sich nur durch minimale Tippfehler vom offiziellen Original.',
    bitsquat: 'Die Domain unterscheidet sich durch einen einzelnen Bitfehler von einer geschützten Marke.',
    'path-impersonation': 'Der Pfad der Adresse imitiert einen Anmelde- oder Verifizierungsvorgang einer Marke auf einer fremden Domain.',
    userinfo: 'Vor dem @-Zeichen werden Marken- oder Anmeldedaten vorgetäuscht, um eine vertrauenswürdige Adresse zu suggerieren.'
  };

  const fromQuery = new URL(location.href).searchParams.get('url');
  const fromHash = location.hash.startsWith('#http') ? location.hash.slice(1) : null;
  const target = fromQuery || fromHash;
  const engine = globalThis.Antipisher || globalThis.VGT_DomainGuard;
  const result = engine.classify(target);
  const isWarn = result.action === 'warn';

  let currentLang = i18n ? i18n.detectLanguage() : 'en';

  function setState(state, label, badge) {
    document.body.dataset.state = state;
    if ($('stateLabel')) $('stateLabel').textContent = label;
    if ($('badge')) $('badge').textContent = badge;
  }

  function error(message) {
    if (!$('error')) return;
    $('error').hidden = false;
    $('error').textContent = message;
  }

  async function go(url, blocked) {
    try {
      const tab = await api.tabs.getCurrent();
      if (!tab || typeof tab.id !== 'number') throw Error('Tab-Identifikator nicht auflösbar');
      const response = await api.runtime.sendMessage({
        type: 'allow-once',
        url,
        tabId: tab.id,
        recordBlock: !!blocked
      });
      if (!response?.ok) throw Error(response?.error || 'Temporäre Sicherheitsfreigabe fehlgeschlagen');
      location.replace(url);
    } catch (e) {
      const failLabel = i18n ? i18n.t('releaseFailed', currentLang) : 'FREIGABE FEHLGESCHLAGEN';
      const prefix = i18n ? i18n.t('releaseErrorPrefix', currentLang) : 'Navigation konnte nicht freigegeben werden: ';
      setState('block', failLabel, 'FEHLER');
      error(prefix + (e.message || e));
    }
  }

  function focusTitle() {
    const title = $('title');
    if (!title) return;
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
  }

  function isValidOfficialDomain(value) {
    return typeof value === 'string' && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(value);
  }

  function hideResidualPanels() {
    if ($('danger')) $('danger').hidden = true;
    if ($('confirm')) $('confirm').hidden = true;
  }

  function renderLocalizedUI(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;

    // Highlight active language button
    const buttons = document.querySelectorAll('#guardLangSwitcher .lang-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    if ($('labelTarget')) $('labelTarget').textContent = i18n ? i18n.t('labelTarget', lang) : 'Zieladresse';
    if ($('labelFinding')) $('labelFinding').textContent = i18n ? i18n.t('labelFinding', lang) : 'Befund';
    if ($('labelOfficial')) $('labelOfficial').textContent = i18n ? i18n.t('labelOfficial', lang) : 'Offizielle Domain';
    if ($('safe')) $('safe').textContent = i18n ? i18n.t('btnOpenOfficial', lang) : 'Offizielle Seite öffnen';
    if ($('back')) $('back').textContent = i18n ? i18n.t('btnBack', lang) : 'Zurück';
    if ($('reveal')) {
      $('reveal').textContent = isWarn
        ? (i18n ? i18n.t('disclosureToggleWarn', lang) : 'Trotzdem fortfahren (unverifiziert)')
        : (i18n ? i18n.t('disclosureToggle', lang) : 'Erweitert: Risiko verstehen und fortfahren');
    }
    if ($('confirm-heading')) $('confirm-heading').textContent = i18n ? i18n.t('confirmHeading', lang) : 'Warnung vor Datenverlust';
    if ($('confirm-desc')) $('confirm-desc').textContent = i18n ? i18n.t('confirmDesc', lang) : 'Die Seite kann Anmeldedaten, Sitzungscookies oder 2FA-Codes abfangen. Öffne sie nur, wenn du die Domain selbst kontrollierst.';
    if ($('proceed')) $('proceed').textContent = i18n ? i18n.t('btnProceedOnce', lang) : 'Einmalig fortfahren';
    if ($('footerOffline')) $('footerOffline').textContent = i18n ? i18n.t('footerOffline', lang) : '100 % offline';
    if ($('footerZero')) $('footerZero').textContent = i18n ? i18n.t('footerZeroTelemetry', lang) : 'Zero telemetry';

    if (!target || result.status === 'skip') {
      const stateLbl = i18n ? i18n.t('invalidState', lang) : 'SYSTEMHINWEIS';
      const badgeLbl = i18n ? i18n.t('invalidBadge', lang) : 'SYSTEMHINWEIS';
      setState('invalid', stateLbl, badgeLbl);
      if ($('title')) $('title').textContent = i18n ? i18n.t('invalidTitle', lang) : 'Ungültige Webadresse';
      if ($('description')) $('description').textContent = i18n ? i18n.t('invalidLead', lang) : 'Antipisher prüft ausschließlich standardisierte HTTP- und HTTPS-Adressen.';
      hideResidualPanels();
      return;
    }

    if (result.status === 'safe') {
      const stateLbl = i18n ? i18n.t('safeState', lang) : 'ADRESSE GEPRÜFT';
      const badgeLbl = i18n ? i18n.t('safeBadge', lang) : 'SCHUTZ AKTIV';
      setState('safe', stateLbl, badgeLbl);
      if ($('title')) $('title').textContent = i18n ? i18n.t('safeTitle', lang) : 'Adresse geprüft';
      if ($('description')) $('description').textContent = i18n ? i18n.t('safeLead', lang) : 'Kein Treffer in der lokalen Schutzliste. Das ist keine Garantie für die Sicherheit der Website.';
      hideResidualPanels();
      return;
    }

    if (isWarn) {
      const warnStateLabel = lang === 'de' ? 'PRÜFUNG EINGESCHRÄNKT' : (i18n ? i18n.t('warnState', lang) : 'PRÜFUNG EINGESCHRÄNKT');
      const warnBadge = i18n ? i18n.t('warnBadge', lang) : 'WARNUNG';
      setState('warn', warnStateLabel, warnBadge);
      if ($('title')) $('title').textContent = i18n ? i18n.t('warnTitle', lang) : 'Domain nicht eindeutig verifizierbar';
      if ($('description')) $('description').textContent = i18n ? i18n.t('warnLead', lang) : 'Die Adresse ähnelt einer geschützten Marke, konnte aber nicht als offizielle Domain bestätigt werden. Prüfe sie, bevor du fortfährst.';
    } else {
      const blockState = i18n ? i18n.t('blockedState', lang) : 'BEDROHUNG ABGEWEHRT';
      const blockBadge = i18n ? i18n.t('blockedBadge', lang) : 'ABWEHR AKTIV';
      setState('block', blockState, blockBadge);
      if ($('title')) $('title').textContent = i18n ? i18n.t('blockedTitle', lang) : 'Möglicher Domain-Betrug abgewehrt';
      if ($('description')) $('description').textContent = i18n ? i18n.t('blockedLead', lang) : 'Diese Adresse imitiert eine geschützte Marke oder nutzt eine verdächtige Domainstruktur.';
    }

    const displayHost = result.decodedHost && result.decodedHost !== result.host
      ? result.host + '  ·  Unicode: ' + result.decodedHost
      : result.host;
    if ($('host')) $('host').textContent = displayHost;
    if ($('official')) $('official').textContent = result.official
      ? result.site + ' · ' + result.official
      : (result.site || (i18n ? i18n.t('unknownBrand', lang) : 'Unbekannte Marke'));

    let reasonText = '';
    if (i18n && typeof i18n.getReasonText === 'function') {
      reasonText = i18n.getReasonText(result.reason, lang);
    } else {
      reasonText = reasonNames[result.reason] || 'Verdächtige Domain-Manipulation erkannt.';
    }
    if ($('reason')) $('reason').textContent = reasonText;
  }

  // Language switcher interaction
  const switcher = $('guardLangSwitcher');
  if (switcher) {
    switcher.addEventListener('click', (e) => {
      const btn = e.target.closest('.lang-btn');
      if (btn && btn.dataset.lang) {
        const chosen = btn.dataset.lang;
        try { localStorage.setItem('antipisher_lang', chosen); } catch {}
        try { api?.storage?.local?.set({ user_locale: chosen }); } catch {}
        renderLocalizedUI(chosen);
      }
    });
  }

  // Initial load
  try {
    api?.storage?.local?.get('user_locale').then(res => {
      if (res?.user_locale) {
        renderLocalizedUI(res.user_locale);
      } else {
        renderLocalizedUI(currentLang);
      }
    }).catch(() => renderLocalizedUI(currentLang));
  } catch {
    renderLocalizedUI(currentLang);
  }

  if (!target || result.status === 'skip') {
    hideResidualPanels();
    focusTitle();
    return;
  }

  if (result.status === 'safe') {
    hideResidualPanels();
    go(target, false);
    return;
  }

  if ($('danger')) $('danger').hidden = false;

  if (isValidOfficialDomain(result.official)) {
    $('safe').addEventListener('click', () => go('https://' + result.official + '/', false));
  } else {
    $('safe').hidden = true;
  }

  $('back').addEventListener('click', () => history.back());
  $('reveal').addEventListener('click', () => {
    const isHidden = $('confirm').hidden;
    $('confirm').hidden = !isHidden;
    $('reveal').setAttribute('aria-expanded', String(isHidden));
    if (isHidden) $('proceed').focus();
  });
  $('proceed').addEventListener('click', () => go(target, true));

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!$('confirm').hidden) {
      $('confirm').hidden = true;
      $('reveal').setAttribute('aria-expanded', 'false');
      $('reveal').focus();
    }
  });

  focusTitle();
})();
