/*
 * Antipisher — Universal Internationalization (i18n) Engine
 * AGPLv3 · VisionGaiaTechnology
 * Supported Languages: English (en, default), Deutsch (de), Русский (ru), 中文 (zh)
 */

(() => {
  'use strict';

  const SUPPORTED_LANGS = ['en', 'de', 'ru', 'zh'];
  const DEFAULT_LANG = 'en';

  const DICTIONARY = {
    en: {
      appName: 'Antipisher',
      appDesc: 'Local offline protection against phishing, homograph attacks, typosquatting and fake domains.',
      brandOrg: 'VisionGaiaTechnology',
      brandProduct: 'Antipisher',
      brandTag: 'Domain Trust',
      formShieldTitle: 'Form Shield',

      // Guard Page states & badges
      checkingBadge: 'Security Check',
      checkingState: 'Security check in progress',
      checkingTitle: 'Verifying address',
      checkingLead: 'The destination address is being evaluated locally in the browser – zero cloud, zero tracking.',

      blockedBadge: 'DEFENSE ACTIVE',
      blockedState: 'THREAT BLOCKED',
      blockedTitle: 'Possible Domain Impersonation Blocked',
      blockedLead: 'This address impersonates a protected brand or uses a deceptive domain structure.',

      warnBadge: 'WARNING',
      warnState: 'VERIFICATION LIMITED',
      warnTitle: 'Domain Cannot Be Unambiguously Verified',
      warnLead: 'This address resembles a protected brand but could not be confirmed as an official domain. Verify before proceeding.',

      safeBadge: 'PROTECTION ACTIVE',
      safeState: 'ADDRESS VERIFIED',
      safeTitle: 'Address Verified',
      safeLead: 'No match in local protection list. This does not guarantee site security.',

      invalidBadge: 'SYSTEM NOTICE',
      invalidState: 'SYSTEM NOTICE',
      invalidTitle: 'Invalid Web Address',
      invalidLead: 'Antipisher only inspects standardized HTTP and HTTPS addresses.',

      // Guard Data Grid
      labelTarget: 'Target Address',
      labelFinding: 'Finding',
      labelOfficial: 'Official Domain',
      unknownBrand: 'Unknown Brand',

      // Guard Actions
      btnOpenOfficial: 'Open Official Website',
      btnBack: 'Go Back',
      disclosureToggle: 'Advanced: Understand risk and proceed',
      disclosureToggleWarn: 'Proceed anyway (unverified)',
      confirmHeading: 'Warning: Risk of Data Loss',
      confirmDesc: 'This site may intercept credentials, session cookies, or 2FA codes. Proceed only if you control this domain yourself.',
      btnProceedOnce: 'Proceed Once',
      releaseFailed: 'PERMISSION FAILED',
      releaseErrorPrefix: 'Navigation could not be authorized: ',

      // Footer
      footerOffline: '100% offline',
      footerZeroTelemetry: 'Zero telemetry',
      versionText: 'Version 0.2.2 · Alpha',

      // Popup
      statusActive: 'Protection Active',
      statusActiveSub: 'Suspicious domains are blocked, safe pages load instantly.',
      statusDegraded: 'Protection Degraded',
      statusDegradedSub: 'Preflight not active – best-effort mode. Please reload extension.',
      statusReduced: 'Best-Effort Mode',
      statusReducedSub: 'Observation only without preventive preflight.',
      pillOn: 'ON',
      pillOff: 'OFF',
      pillDegraded: 'LIMITED',

      metricBrands: 'Brands',
      metricBlocked: 'Blocked',
      metricTrackers: 'Ads & Trackers',
      metricTrackersScope: 'Tab: {tab} · Total: {total}',

      settingPreflight: 'Strict Preflight Mode',
      noticeActive: 'Active: Suspicious sites are blocked, safe sites navigate directly without full-screen delay.',
      noticeInactive: 'Inactive: no preventive preflight.',
      noticeStrictActive: 'Strict: All GET navigations are redirected through full-screen preflight gate.',
      noticeStrictInactive: 'Standard: Smooth direct browsing without full-screen delay on safe sites.',
      settingSafeToast: 'Status Toast on Safe Pages',
      noticeSafeToast: 'Briefly displays a soft glass badge upon opening verified websites.',
      toastSafeTitle: 'Domain verified',
      toastSafeSub: 'Antipisher · Protected',
      settingAegis: 'AEGIS Anti-Fingerprinting',
      noticeAegis: 'Offline defense against Canvas, WebGL, Audio & Font fingerprinting and cross-site tracking.',
      btnRotateSeed: 'Rotate Identity',
      toastAegisRotated: 'Identity seed refreshed',
      settingTrackers: 'AEGIS Ad & Tracker Defense',
      noticeTrackers: 'Blocks advertising networks, analytics, banners, and strips tracking tokens from URLs.',
      settingGeDefense: 'GeDefense Light (DOM & Script Shield)',
      noticeGeDefense: 'Shields JavaScript against malicious DOM mutation, Self-XSS, prototype exploits, and dangerous script injections.',

      // Options Page
      optionsTitle: 'Settings',
      optionsSubtitle: 'Local Configuration & VGT Protection Parameters',
      tabGeneral: 'Phishing & Core',
      tabAds: 'Ad Blocker',
      tabTrackers: 'Trackers & Telemetry',
      tabGeDefense: 'GeDefense (DOM & Scripts)',
      tabFingerprinting: 'Anti-Fingerprinting',
      tabWhitelist: 'Whitelist & Exceptions',
      tabData: 'System & Data',
      savedToast: 'Settings saved',

      optFormShieldTitle: 'In-Page Form Shield',
      optFormShieldNote: 'Intercepts suspicious password inputs and forms before they are transmitted to phishing targets.',
      optToastDurationTitle: 'Toast Badge Duration',
      optToastDurationNote: 'Controls how long the subtle glass badge remains visible on verified websites.',
      optDurationFast: 'Fast (1.5 seconds)',
      optDurationNormal: 'Standard (2.5 seconds)',
      optDurationLong: 'Long (4 seconds)',

      // VGT Ad Shield
      lblSecAds: 'VGT Ad Shield (Ad Blocker)',
      lblSecAdsNote: 'Network request blocking, zero-flicker cosmetic element hiding, and anti-adblock defusal.',
      optAdMasterTitle: 'VGT Ad Shield Master Protection',
      optAdMasterNote: 'Blocks banner networks, video ads, sponsored feeds, and ad exchanges.',
      optCosmeticTitle: 'Cosmetic Element Hiding',
      optCosmeticNote: 'Collapses empty ad frames, banner slots, and sponsored containers with zero flicker.',
      optAntiAdblockTitle: 'Anti-Adblock Defuser & Script Inoculation',
      optAntiAdblockNote: 'Bypasses ad-blocker detection walls and inoculates bait element checks.',
      optPopunderTitle: 'Popunder & Click-Trap Defense',
      optPopunderNote: 'Neutralizes unsolicited background popups and invisible clickjacking overlays.',

      optUrlStripTitle: 'URL Tracking Token Stripper',
      optUrlStripNote: 'Automatically strips utm_*, fbclid, gclid and 16 other parameters from web addresses.',
      optBeaconTitle: 'sendBeacon Interception',
      optBeaconNote: 'Drops background telemetry and prevents silent tracking upon closing pages.',
      optBadgeTitle: 'Toolbar Action Badge',
      optBadgeNote: 'Displays live counter of blocked trackers directly on the extension icon.',

      optSelfXssTitle: 'Self-XSS DevTools Shield',
      optSelfXssNote: 'Warns in the developer console against fraudulent copy-paste exploit scripts.',
      optProtocolTitle: 'DOM Protocol Shield',
      optProtocolNote: 'Blocks hazardous javascript: and vbscript: injections in hyperlinks and attributes.',

      optCanvasTitle: 'Canvas Farbling',
      optCanvasNote: 'Subtle, deterministic pseudo-random noise injection against Canvas fingerprinting.',
      optWebGLTitle: 'WebGL GPU Masking',
      optWebGLNote: 'Masks GPU hardware vendor and renderer models with generic values.',
      optAudioTitle: 'AudioContext Farbling',
      optAudioNote: 'Prevents acoustic hardware fingerprinting via Web Audio.',

      optWhitelistTitle: 'Custom Whitelist (Exceptions)',
      optWhitelistNote: 'Domains listed here will never be classified as phishing or blocked.',
      optWhitelistAdd: 'Add',
      optWhitelistPlaceholder: 'e.g. internal.company.local',
      optWhitelistEmpty: 'No custom exceptions configured.',
      optWhitelistItemNote: 'Exception active (subdomains included)',
      optWhitelistDelete: 'Remove',

      optLangTitle: 'Language',
      optLangNote: 'Choose interface display language.',
      optStatsTitle: 'Protection Statistics',
      optStatsDesc: '{phish} phishing attempts blocked · {trackers} trackers defused',
      optBtnResetStats: 'Reset Statistics',
      optBtnResetDefaults: 'Restore Default Settings',
      optBtnExport: 'Export Configuration',
      optBtnImport: 'Import Configuration',
      optConfirmReset: 'Do you really want to reset all settings and statistics to factory defaults?',

      checkLabel: 'Check Address',
      checkPlaceholder: 'paypa1.com',
      btnCheck: 'Check',
      resSuspicious: 'Suspicious: Impersonation of {site} ({official}).',
      resWarn: 'Verification limited: Resembles {site} ({official}). Domain not unambiguously verified.',
      resSafe: 'No match in local protection list – does not guarantee security.',
      resSkip: 'Invalid or unsupported web address.',

      // In-page Shield (POST / Form Interceptor)
      shieldEyebrow: 'Form submission paused',
      shieldHeading: 'This input submission was paused',
      shieldDescDefault: 'This address impersonates a protected brand or utilizes a suspicious domain structure.',
      shieldTarget: 'Target Address',
      shieldBrand: 'Known Brand',
      shieldOfficial: 'Official Domain',
      shieldBtnCancel: 'Cancel – Keep My Input',
      shieldBtnProceed: 'Send Anyway',
      shieldFooter: 'Verified locally · zero data transmitted to Antipisher · VisionGaiaTechnology',
      shieldBadgeText: 'Possible Phishing Site · Antipisher Warning',
      shieldEngineUnavailable: 'The local verification engine is unavailable. For your security, password submission is blocked. Please reload the extension.',

      // Reasons
      reasons: {
        unicode: 'The address uses foreign characters or diacritic variants that deceptively mimic a protected brand.',
        'unicode-hidden': 'The address contains invisible Unicode control characters for obfuscation.',
        'bidi-override': 'The address contains bidirectional control characters that visually obscure the true domain name.',
        'foreign-domain': 'A protected brand name is being used on an unauthorized foreign domain or subdomain.',
        'brand-variant': 'The domain imitates a brand name with altered spelling or visual character substitution.',
        'credential-bait': 'The address combines a brand name with typical login, account, or security keywords.',
        typosquat: 'The domain differs only by minor typing errors from the authentic brand domain.',
        bitsquat: 'The domain differs by a single-bit hardware or DNS memory error from a protected brand.',
        'path-impersonation': 'The address path imitates a login or verification process of a brand on a foreign domain.',
        userinfo: 'Brand or login credentials are used before the @ symbol to deceptively suggest a trusted site.',
        suspicious: 'Suspicious domain manipulation or impersonation patterns detected.'
      }
    },

    de: {
      appName: 'Antipisher',
      appDesc: 'Lokaler Offline-Schutz vor Phishing, gefälschten Domains, IDN-Homographen und Typosquatting.',
      brandOrg: 'VisionGaiaTechnology',
      brandProduct: 'Antipisher',
      brandTag: 'Domain Trust',
      formShieldTitle: 'Formularschutz',

      checkingBadge: 'Sicherheitsprüfung',
      checkingState: 'Sicherheitsprüfung läuft',
      checkingTitle: 'Adresse wird überprüft',
      checkingLead: 'Die Zieladresse wird lokal im Browser geprüft – ohne Cloud, ohne Verlauf.',

      blockedBadge: 'ABWEHR AKTIV',
      blockedState: 'BEDROHUNG ABGEWEHRT',
      blockedTitle: 'Möglicher Domain-Betrug abgewehrt',
      blockedLead: 'Diese Adresse imitiert eine geschützte Marke oder nutzt eine verdächtige Domainstruktur.',

      warnBadge: 'WARNUNG',
      warnState: 'PRÜFUNG EINGESCHRÄNKT',
      warnTitle: 'Domain nicht eindeutig verifizierbar',
      warnLead: 'Die Adresse ähnelt einer geschützten Marke, konnte aber nicht als offizielle Domain bestätigt werden. Prüfe sie, bevor du fortfährst.',

      safeBadge: 'SCHUTZ AKTIV',
      safeState: 'ADRESSE GEPRÜFT',
      safeTitle: 'Adresse geprüft',
      safeLead: 'Kein Treffer in der lokalen Schutzliste. Das ist keine Garantie für die Sicherheit der Website.',

      invalidBadge: 'SYSTEMHINWEIS',
      invalidState: 'SYSTEMHINWEIS',
      invalidTitle: 'Ungültige Webadresse',
      invalidLead: 'Antipisher prüft ausschließlich standardisierte HTTP- und HTTPS-Adressen.',

      labelTarget: 'Zieladresse',
      labelFinding: 'Befund',
      labelOfficial: 'Offizielle Domain',
      unknownBrand: 'Unbekannte Marke',

      btnOpenOfficial: 'Offizielle Seite öffnen',
      btnBack: 'Zurück',
      disclosureToggle: 'Erweitert: Risiko verstehen und fortfahren',
      disclosureToggleWarn: 'Trotzdem fortfahren (unverifiziert)',
      confirmHeading: 'Warnung vor Datenverlust',
      confirmDesc: 'Die Seite kann Anmeldedaten, Sitzungscookies oder 2FA-Codes abfangen. Öffne sie nur, wenn du die Domain selbst kontrollierst.',
      btnProceedOnce: 'Einmalig fortfahren',
      releaseFailed: 'FREIGABE FEHLGESCHLAGEN',
      releaseErrorPrefix: 'Navigation konnte nicht freigegeben werden: ',

      footerOffline: '100 % offline',
      footerZeroTelemetry: 'Zero telemetry',
      versionText: 'Version 0.2.2 · Alpha',

      statusActive: 'Schutz aktiv',
      statusActiveSub: 'Verdächtige Seiten werden blockiert, sichere Seiten laden direkt.',
      statusDegraded: 'Schutz eingeschränkt',
      statusDegradedSub: 'Vorabprüfung nicht installiert – Best-Effort-Erkennung aktiv. Bitte Erweiterung neu laden.',
      statusReduced: 'Best-Effort-Modus',
      statusReducedSub: 'Nur Beobachtung ohne präventive Blockade.',
      pillOn: 'AN',
      pillOff: 'AUS',
      pillDegraded: 'EINGESCHRÄNKT',

      metricBrands: 'Marken',
      metricBlocked: 'Abgewehrt',
      metricTrackers: 'Werbung & Tracker',
      metricTrackersScope: 'Tab: {tab} · Gesamt: {total}',

      settingPreflight: 'Strenger Preflight-Modus',
      noticeActive: 'Aktiv: Verdächtige Seiten werden geblockt, sichere Seiten öffnen direkt ohne Vollbild-Redirect.',
      noticeInactive: 'Inaktiv: keine präventive Blockade.',
      noticeStrictActive: 'Streng: Jede Navigation durchläuft die Vollbild-Vorabprüfung.',
      noticeStrictInactive: 'Standard: Flüssiges Surfen ohne Vollbild-Unterbrechung bei sicheren Seiten.',
      settingSafeToast: 'Status-Toast bei sicheren Seiten',
      noticeSafeToast: 'Blendet beim Öffnen verifizierter Websites kurz ein dezentes Glas-Badge ein.',
      toastSafeTitle: 'Domain verifiziert',
      toastSafeSub: 'Antipisher · Geschützt',
      settingAegis: 'AEGIS Anti-Fingerprinting',
      noticeAegis: 'Offline-Schutz vor Canvas-, WebGL-, Audio- & Schriftarten-Fingerprinting und Tracking.',
      btnRotateSeed: 'Identität neu würfeln',
      toastAegisRotated: 'Identitäts-Seed erneuert',
      settingTrackers: 'AEGIS Werbe- & Tracker-Schutz',
      noticeTrackers: 'Blockiert Werbenetzwerke, Banner, Analyse-Dienste und entfernt Tracking-Parameter aus URLs.',
      settingGeDefense: 'GeDefense Light (DOM- & Script-Schutz)',
      noticeGeDefense: 'Schützt JavaScript vor schädlicher DOM-Manipulation, Self-XSS, Prototypen-Angriffen und bösartigen Skript-Injektionen.',

      // Options Page
      optionsTitle: 'Einstellungen',
      optionsSubtitle: 'Lokale Konfiguration & VGT Schutzparameter',
      tabGeneral: 'Phishing & Basis-Schutz',
      tabAds: 'Werbeblocker',
      tabTrackers: 'Tracker & Telemetrie',
      tabGeDefense: 'GeDefense (DOM & Skripte)',
      tabFingerprinting: 'Anti-Fingerprinting',
      tabWhitelist: 'Ausnahmen & Whitelist',
      tabData: 'System & Daten',
      savedToast: 'Einstellungen gespeichert',

      optFormShieldTitle: 'In-Page Form Shield',
      optFormShieldNote: 'Fängt verdächtige Passworteingaben und Formulare ab, bevor sie an Phishing-Ziele gesendet werden.',
      optToastDurationTitle: 'Toast-Anzeigedauer',
      optToastDurationNote: 'Wie lange das dezente Glas-Badge auf verifizierten Seiten sichtbar bleibt.',
      optDurationFast: 'Schnell (1.5 Sekunden)',
      optDurationNormal: 'Standard (2.5 Sekunden)',
      optDurationLong: 'Lang (4 Sekunden)',

      // VGT Ad Shield
      lblSecAds: 'VGT Ad Shield (Werbeblocker)',
      lblSecAdsNote: 'Netzwerk-Filterung, Zero-Flicker kosmetische Element-Ausblendung und Anti-Adblock-Entschärfung.',
      optAdMasterTitle: 'VGT Ad Shield Master-Schutz',
      optAdMasterNote: 'Blockiert Werbenetzwerke, Videoanzeigen, gesponserte Feeds und Werbe-Exchanges.',
      optCosmeticTitle: 'Kosmetische Element-Ausblendung',
      optCosmeticNote: 'Entfernt leere Anzeigenrahmen, Banner-Slots und Sponsoring-Container ohne Flackern.',
      optAntiAdblockTitle: 'Anti-Adblock-Bypass & Skripthärtung',
      optAntiAdblockNote: 'Umgeht Adblock-Erkennungsmauern und entschärft künstliche Köder-Elemente (Bait Traps).',
      optPopunderTitle: 'Popunder- & Klickfalle-Abwehr',
      optPopunderNote: 'Neutralisiert unaufgeforderte Hintergrund-Popups und unsichtbare Klick-Überlagerungen.',

      optUrlStripTitle: 'URL-Tracking-Token Stripper',
      optUrlStripNote: 'Entfernt utm_*, fbclid, gclid und 16 weitere Parameter automatisch aus der Adresszeile.',
      optBeaconTitle: 'sendBeacon-Abfang',
      optBeaconNote: 'Verwirft Hintergrund-Telemetriedaten und schützt vor stillen Tracking-Requests beim Schließen von Seiten.',
      optBadgeTitle: 'Toolbar-Badge Zähler',
      optBadgeNote: 'Zeigt die Anzahl abgewehrter Tracker live auf dem Browser-Icon an.',

      optSelfXssTitle: 'Self-XSS DevTools-Schutz',
      optSelfXssNote: 'Warnt in der Entwickler-Konsole vor betrügerischen Copy-Paste-Skripten.',
      optProtocolTitle: 'DOM-Protokoll-Schutz',
      optProtocolNote: 'Blockiert gefährliche javascript:- und vbscript:-Injektionen in Links und Attributen.',

      optCanvasTitle: 'Canvas Farbling',
      optCanvasNote: 'Subtile, deterministische Rausch-Injektion gegen Canvas-Fingerprinting.',
      optWebGLTitle: 'WebGL GPU-Maskierung',
      optWebGLNote: 'Tarnt den Grafikchip-Hersteller und Renderer mit neutralen Werten.',
      optAudioTitle: 'AudioContext Farbling',
      optAudioNote: 'Verhindert akustisches Hardware-Fingerprinting über Web Audio.',

      optWhitelistTitle: 'Benutzerdefinierte Ausnahmen (Whitelist)',
      optWhitelistNote: 'Domains in dieser Liste werden niemals als Phishing eingestuft oder geblockt.',
      optWhitelistAdd: 'Hinzufügen',
      optWhitelistPlaceholder: 'z. B. intern.meinefirma.de',
      optWhitelistEmpty: 'Keine benutzerdefinierten Ausnahmen vorhanden.',
      optWhitelistItemNote: 'Ausnahme aktiv (inkl. Subdomains)',
      optWhitelistDelete: 'Entfernen',

      optLangTitle: 'Sprache',
      optLangNote: 'Wähle die Sprache der Benutzeroberfläche.',
      optStatsTitle: 'Schutzstatistiken',
      optStatsDesc: '{phish} Phishing-Versuche abgewehrt · {trackers} Tracker neutralisiert',
      optBtnResetStats: 'Statistiken zurücksetzen',
      optBtnResetDefaults: 'Auf Werkseinstellungen zurücksetzen',
      optBtnExport: 'Konfiguration exportieren',
      optBtnImport: 'Konfiguration importieren',
      optConfirmReset: 'Möchtest du wirklich alle Einstellungen und Statistiken zurücksetzen?',

      checkLabel: 'Adresse prüfen',
      checkPlaceholder: 'paypa1.com',
      btnCheck: 'Prüfen',
      resSuspicious: 'Verdächtig: Imitation von {site} ({official}).',
      resWarn: 'Prüfung eingeschränkt: Ähnlich zu {site} ({official}). Domain nicht eindeutig verifizierbar.',
      resSafe: 'Kein Treffer in der lokalen Schutzliste – keine Garantie für Sicherheit.',
      resSkip: 'Ungültige oder nicht unterstützte Webadresse.',

      shieldEyebrow: 'Formularübertragung gestoppt',
      shieldHeading: 'Diese Eingabe wurde angehalten',
      shieldDescDefault: 'Diese Adresse imitiert eine geschützte Marke oder nutzt eine verdächtige Domainstruktur.',
      shieldTarget: 'Zieladresse',
      shieldBrand: 'Bekannte Marke',
      shieldOfficial: 'Offizielle Domain',
      shieldBtnCancel: 'Abbrechen – Daten bleiben erhalten',
      shieldBtnProceed: 'Trotzdem senden',
      shieldFooter: 'Lokal geprüft · keine Übertragung an Antipisher · VisionGaiaTechnology',
      shieldBadgeText: 'Mögliche Phishing-Seite · Antipisher warnt',
      shieldEngineUnavailable: 'Die lokale Prüf-Engine ist nicht verfügbar. Aus Sicherheitsgründen wird die Übertragung von Passwortdaten blockiert. Bitte lade die Erweiterung neu.',

      reasons: {
        unicode: 'Die Adresse verwendet Zeichen aus fremden Alphabeten oder diakritische Varianten, die einer geschützten Marke täuschend ähneln.',
        'unicode-hidden': 'Die Adresse enthält unsichtbare Unicode-Steuerzeichen zur Verschleierung.',
        'bidi-override': 'Die Adresse enthält bidirektionale Steuerzeichen, die den tatsächlichen Domainnamen optisch verschleiern.',
        'foreign-domain': 'Ein geschützter Markenname wird auf einer fremden Domain oder Subdomain verwendet.',
        'brand-variant': 'Die Domain imitiert einen Markennamen mit abweichender Schreibweise oder Zeichenersetzung.',
        'credential-bait': 'Die Adresse kombiniert einen Markennamen mit typischen Anmelde-, Konto- oder Sicherheitsbegriffen.',
        typosquat: 'Die Domain unterscheidet sich nur durch minimale Tippfehler vom offiziellen Original.',
        bitsquat: 'Die Domain unterscheidet sich durch einen einzelnen Bitfehler von einer geschützten Marke.',
        'path-impersonation': 'Der Pfad der Adresse imitiert einen Anmelde- oder Verifizierungsvorgang einer Marke auf einer fremden Domain.',
        userinfo: 'Vor dem @-Zeichen werden Marken- oder Anmeldedaten vorgetäuscht, um eine vertrauenswürdige Adresse zu suggerieren.',
        suspicious: 'Verdächtige Domain-Manipulation oder Imitationsmuster erkannt.'
      }
    },

    ru: {
      appName: 'Antipisher',
      appDesc: 'Локальная офлайн-защита от фишинга, поддельных доменов, IDN-гомографов и тайпосквоттинга.',
      brandOrg: 'VisionGaiaTechnology',
      brandProduct: 'Antipisher',
      brandTag: 'Domain Trust',
      formShieldTitle: 'Защита форм',

      checkingBadge: 'Проверка безопасности',
      checkingState: 'Идет проверка безопасности',
      checkingTitle: 'Проверка адреса',
      checkingLead: 'Целевой адрес проверяется локально в браузере — без облака и без сбора истории.',

      blockedBadge: 'ЗАЩИТА АКТИВНА',
      blockedState: 'УГРОЗА ЗАБЛОКИРОВАНА',
      blockedTitle: 'Возможное доменное мошенничество предотвращено',
      blockedLead: 'Этот адрес имитирует защищенный бренд или использует подозрительную структуру домена.',

      warnBadge: 'ПРЕДУПРЕЖДЕНИЕ',
      warnState: 'ПРОВЕРКА ОГРАНИЧЕНА',
      warnTitle: 'Домен невозможно однозначно подтвердить',
      warnLead: 'Адрес похож на защищенный бренд, но не подтвержден как официальный домен. Проверьте адрес перед продолжением.',

      safeBadge: 'ЗАЩИТА ВКЛЮЧЕНА',
      safeState: 'АДРЕС ПРОВЕРЕН',
      safeTitle: 'Адрес проверен',
      safeLead: 'Совпадений в локальном списке защиты нет. Это не гарантирует абсолютную безопасность сайта.',

      invalidBadge: 'СИСТЕМНОЕ СООБЩЕНИЕ',
      invalidState: 'СИСТЕМНОЕ СООБЩЕНИЕ',
      invalidTitle: 'Недействительный веб-адрес',
      invalidLead: 'Antipisher проверяет исключительно стандартные адреса HTTP и HTTPS.',

      labelTarget: 'Целевой адрес',
      labelFinding: 'Результат проверки',
      labelOfficial: 'Официальный домен',
      unknownBrand: 'Неизвестный бренд',

      btnOpenOfficial: 'Открыть официальный сайт',
      btnBack: 'Назад',
      disclosureToggle: 'Дополнительно: понять риск и продолжить',
      disclosureToggleWarn: 'Продолжить в любом случае (не подтверждено)',
      confirmHeading: 'Предупреждение об утечке данных',
      confirmDesc: 'Этот сайт может перехватить пароли, сессионные куки или коды 2FA. Открывайте только если вы контролируете этот домен.',
      btnProceedOnce: 'Перейти один раз',
      releaseFailed: 'ОШИБКА РАЗРЕШЕНИЯ',
      releaseErrorPrefix: 'Не удалось разрешить переход: ',

      footerOffline: '100% офлайн',
      footerZeroTelemetry: 'Без телеметрии',
      versionText: 'Версия 0.2.2 · Альфа',

      statusActive: 'Защита активна',
      statusActiveSub: 'Подозрительные домены блокируются, безопасные сайты открываются мгновенно.',
      statusDegraded: 'Защита ограничена',
      statusDegradedSub: 'Предпроверка не установлена — режим наблюдения. Перезагрузите расширение.',
      statusReduced: 'Режим наблюдения',
      statusReducedSub: 'Только наблюдение без превентивной блокировки.',
      pillOn: 'ВКЛ',
      pillOff: 'ВЫКЛ',
      pillDegraded: 'ОГРАНИЧЕНО',

      metricBrands: 'Бренды',
      metricBlocked: 'Отражено',
      metricTrackers: 'Реклама и трекеры',
      metricTrackersScope: 'Вкладка: {tab} · Всего: {total}',

      settingPreflight: 'Строгий режим предпроверки',
      noticeActive: 'Активно: Подозрительные сайты блокируются, безопасные открываются сразу без задержки.',
      noticeInactive: 'Неактивно: превентивная блокировка отключена.',
      noticeStrictActive: 'Строгий: Все переходы проходят полноэкранную предпроверку.',
      noticeStrictInactive: 'Стандартный: Плавный серфинг без полноэкранных задержек на безопасных сайтах.',
      settingSafeToast: 'Уведомление для безопасных сайтов',
      noticeSafeToast: 'Кратковременно показывает аккуратный стеклянный бейдж при открытии проверенных сайтов.',
      toastSafeTitle: 'Домен проверен',
      toastSafeSub: 'Antipisher · Защищено',
      settingAegis: 'AEGIS Защита от фингерпринтинга',
      noticeAegis: 'Офлайн-защита от отслеживания через Canvas, WebGL, Audio и системные шрифты.',
      btnRotateSeed: 'Сменить цифровой след',
      toastAegisRotated: 'Цифровой след обновлен',
      settingTrackers: 'AEGIS Защита от рекламы и трекеров',
      noticeTrackers: 'Блокирует рекламные сети, баннеры, аналитику и удаляет метки отслеживания из URL.',
      settingGeDefense: 'GeDefense Light (Защита DOM и скриптов)',
      noticeGeDefense: 'Защищает JavaScript от вредоносных манипуляций с DOM, Self-XSS, атак на прототипы и инъекций скриптов.',

      // Options Page
      optionsTitle: 'Настройки',
      optionsSubtitle: 'Локальная конфигурация и параметры защиты VGT',
      tabGeneral: 'Фишинг и защита',
      tabAds: 'Блокировщик рекламы',
      tabTrackers: 'Трекеры и телеметрия',
      tabGeDefense: 'GeDefense (DOM и скрипты)',
      tabFingerprinting: 'Антифингерпринтинг',
      tabWhitelist: 'Исключения и белый список',
      tabData: 'Система и данные',
      savedToast: 'Настройки сохранены',

      optFormShieldTitle: 'Защита форм (Form Shield)',
      optFormShieldNote: 'Перехватывает подозрительный ввод паролей и формы до отправки на фишинговые сайты.',
      optToastDurationTitle: 'Длительность уведомления',
      optToastDurationNote: 'Сколько времени аккуратный стеклянный бейдж виден на проверенных сайтах.',
      optDurationFast: 'Быстро (1.5 секунды)',
      optDurationNormal: 'Стандартно (2.5 секунды)',
      optDurationLong: 'Долго (4 секунды)',

      // VGT Ad Shield
      lblSecAds: 'VGT Ad Shield (Блокировка рекламы)',
      lblSecAdsNote: 'Сетевая фильтрация, скрытие рекламных элементов без мерцания и обход анти-блокировщиков.',
      optAdMasterTitle: 'Мастер-защита VGT Ad Shield',
      optAdMasterNote: 'Блокирует баннерные сети, видеорекламу, спонсорские блоки и рекламные биржи.',
      optCosmeticTitle: 'Косметическое скрытие элементов',
      optCosmeticNote: 'Скрывает пустые рекламные блоки, баннеры и спонсорские контейнеры без мерцания.',
      optAntiAdblockTitle: 'Нейтрализация анти-блокировщиков',
      optAntiAdblockNote: 'Обходит экраны обнаружения блокировщиков и нейтрализует проверочные ловушки.',
      optPopunderTitle: 'Защита от попандеров и клик-ловушек',
      optPopunderNote: 'Блокирует фоновые всплывающие окна и скрытые клик-ловушки.',

      optUrlStripTitle: 'Очистка URL от меток слежения',
      optUrlStripNote: 'Автоматически удаляет utm_*, fbclid, gclid и еще 16 параметров из адреса.',
      optBeaconTitle: 'Перехват sendBeacon',
      optBeaconNote: 'Сбрасывает фоновую телеметрию и защищает от скрытой отправки данных при закрытии страниц.',
      optBadgeTitle: 'Счетчик на панели инструментов',
      optBadgeNote: 'Отображает число заблокированных трекеров прямо на значке расширения.',

      optSelfXssTitle: 'Защита от Self-XSS в консоли',
      optSelfXssNote: 'Предупреждает в консоли разработчика об опасности копирования мошеннического кода.',
      optProtocolTitle: 'Защита протоколов DOM',
      optProtocolNote: 'Блокирует опасные инъекции javascript: и vbscript: в ссылках и атрибутах.',

      optCanvasTitle: 'Canvas Farbling',
      optCanvasNote: 'Внесение незаметного псевдослучайного шума против фингерпринтинга Canvas.',
      optWebGLTitle: 'Маскировка WebGL GPU',
      optWebGLNote: 'Подменяет модель видеокарты и производителя нейтральными значениями.',
      optAudioTitle: 'AudioContext Farbling',
      optAudioNote: 'Предотвращает акустический фингерпринтинг через Web Audio.',

      optWhitelistTitle: 'Пользовательский белый список',
      optWhitelistNote: 'Домены из этого списка никогда не будут блокироваться или помечаться как фишинг.',
      optWhitelistAdd: 'Добавить',
      optWhitelistPlaceholder: 'например, internal.mycompany.local',
      optWhitelistEmpty: 'Нет добавленных исключений.',
      optWhitelistItemNote: 'Исключение активно (включая поддомены)',
      optWhitelistDelete: 'Удалить',

      optLangTitle: 'Язык',
      optLangNote: 'Выберите язык интерфейса.',
      optStatsTitle: 'Статистика защиты',
      optStatsDesc: 'Отражено фишинга: {phish} · Заблокировано трекеров: {trackers}',
      optBtnResetStats: 'Сбросить статистику',
      optBtnResetDefaults: 'Восстановить настройки по умолчанию',
      optBtnExport: 'Экспорт настроек',
      optBtnImport: 'Импорт настроек',
      optConfirmReset: 'Вы действительно хотите сбросить все настройки и статистику до заводских?',

      checkLabel: 'Проверить адрес',
      checkPlaceholder: 'paypa1.com',
      btnCheck: 'Проверить',
      resSuspicious: 'Подозрительно: Имитация {site} ({official}).',
      resWarn: 'Проверка ограничена: Похоже на {site} ({official}). Домен не подтвержден однозначно.',
      resSafe: 'Совпадений в локальном списке защиты нет — безопасность не гарантирована.',
      resSkip: 'Недействительный или неподдерживаемый веб-адрес.',

      shieldEyebrow: 'Отправка формы приостановлена',
      shieldHeading: 'Отправка данных была приостановлена',
      shieldDescDefault: 'Этот адрес имитирует защищенный бренд или использует подозрительную структуру домена.',
      shieldTarget: 'Целевой адрес',
      shieldBrand: 'Известный бренд',
      shieldOfficial: 'Официальный домен',
      shieldBtnCancel: 'Отмена — сохранить данные',
      shieldBtnProceed: 'Все равно отправить',
      shieldFooter: 'Проверено локально · данные не передаются в Antipisher · VisionGaiaTechnology',
      shieldBadgeText: 'Возможный фишинг · Предупреждение Antipisher',
      shieldEngineUnavailable: 'Локальный модуль проверки недоступен. В целях безопасности отправка паролей заблокирована. Перезагрузите расширение.',

      reasons: {
        unicode: 'Адрес использует символы других алфавитов или диакритические знаки, вводящие в заблуждение схожестью с брендом.',
        'unicode-hidden': 'Адрес содержит невидимые управляющие символы Юникода для сокрытия домена.',
        'bidi-override': 'Адрес содержит символы изменения направления письма, оптически скрывающие настоящее имя домена.',
        'foreign-domain': 'Защищенное имя бренда используется на постороннем домене или поддомене.',
        'brand-variant': 'Домен имитирует имя бренда с измененным написанием или заменой символов.',
        'credential-bait': 'Адрес сочетает имя бренда с ключевыми словами входа, аккаунта или безопасности.',
        typosquat: 'Домен отличается от официального оригинала лишь незначительными опечатками.',
        bitsquat: 'Домен отличается на один бит от имени защищенного бренда (ошибки памяти или DNS).',
        'path-impersonation': 'Путь адреса имитирует процесс авторизации или подтверждения бренда на чужом домене.',
        userinfo: 'Перед символом @ подставлены учетные данные или имя бренда для создания ложного доверия.',
        suspicious: 'Обнаружены подозрительные манипуляции с доменом или признаки подделки.'
      }
    },

    zh: {
      appName: 'Antipisher',
      appDesc: '本地离线防护，抵御钓鱼网站、仿冒域名、IDN 同形异义词攻击和误植域名。',
      brandOrg: 'VisionGaiaTechnology',
      brandProduct: 'Antipisher',
      brandTag: 'Domain Trust',
      formShieldTitle: '表单防护',

      checkingBadge: '安全检查',
      checkingState: '正在进行安全检查',
      checkingTitle: '正在验证网址',
      checkingLead: '目标地址正在浏览器本地进行评估 — 无云端上传，无历史追踪。',

      blockedBadge: '防护已生效',
      blockedState: '已拦截威胁',
      blockedTitle: '已拦截潜在的域名欺诈',
      blockedLead: '该地址假冒受保护的品牌或采用可疑的域名结构。',

      warnBadge: '安全警告',
      warnState: '验证受限',
      warnTitle: '域名无法明确验证',
      warnLead: '该地址与受保护品牌相似，但未确认为官方域名。请在继续访问前仔细核对。',

      safeBadge: '防护已启用',
      safeState: '地址已验证',
      safeTitle: '地址已验证',
      safeLead: '本地保护列表中无匹配项。这并不能完全保证网站的安全性。',

      invalidBadge: '系统提示',
      invalidState: '系统提示',
      invalidTitle: '无效的网络地址',
      invalidLead: 'Antipisher 仅检查标准化的 HTTP 和 HTTPS 地址。',

      labelTarget: '目标地址',
      labelFinding: '检测结果',
      labelOfficial: '官方域名',
      unknownBrand: '未知品牌',

      btnOpenOfficial: '打开官方网站',
      btnBack: '返回上一页',
      disclosureToggle: '高级选项：了解风险并继续',
      disclosureToggleWarn: '仍要继续（未经验证）',
      confirmHeading: '数据泄露风险警告',
      confirmDesc: '该网站可能会截获登录凭据、会话 Cookie 或双重认证代码。仅在您完全控制此域名时继续。',
      btnProceedOnce: '仅继续一次',
      releaseFailed: '授权失败',
      releaseErrorPrefix: '无法授权导航：',

      footerOffline: '100% 离线运行',
      footerZeroTelemetry: '零遥测数据',
      versionText: '版本 0.2.2 · Alpha',

      statusActive: '防护已启用',
      statusActiveSub: '可疑域名被拦截，安全网页直接即时加载。',
      statusDegraded: '防护受限',
      statusDegradedSub: '预检规则未加载 — 当前为尽力检测模式。请重新加载扩展。',
      statusReduced: '尽力检测模式',
      statusReducedSub: '仅进行观察，不进行预防性预检拦截。',
      pillOn: '开启',
      pillOff: '关闭',
      pillDegraded: '受限',

      metricBrands: '品牌数',
      metricBlocked: '已拦截',
      metricTrackers: '广告与追踪器',
      metricTrackersScope: '标签页: {tab} · 总计: {total}',

      settingPreflight: '严格预检模式',
      noticeActive: '已启用：可疑网站被拦截，安全网站直接访问无全屏延迟。',
      noticeInactive: '已停用：不进行预防性预检拦截。',
      noticeStrictActive: '严格：所有 GET 导航均通过全屏预检关卡。',
      noticeStrictInactive: '标准：安全网站流畅直达，无全屏打扰。',
      settingSafeToast: '安全网站状态气泡提示',
      noticeSafeToast: '在访问已验证网站时短暂显示微晶毛玻璃徽标。',
      toastSafeTitle: '域名已验证',
      toastSafeSub: 'Antipisher · 安全守护',
      settingAegis: 'AEGIS 反指纹追踪',
      noticeAegis: '离线抵御 Canvas、WebGL、音频和字体指纹追踪及跨站跟踪。',
      btnRotateSeed: '重置数字身份',
      toastAegisRotated: '数字身份已刷新',
      settingTrackers: 'AEGIS 广告与追踪防护',
      noticeTrackers: '拦截分析网络、广告网络、横幅，并自动清除网址中的追踪参数。',
      settingGeDefense: 'GeDefense Light（DOM 与脚本防御）',
      noticeGeDefense: '防护 JavaScript 免受恶意 DOM 篡改、Self-XSS、原型链攻击和危险脚本注入。',

      // Options Page
      optionsTitle: '设置',
      optionsSubtitle: '本地配置与 VGT 安全防护参数',
      tabGeneral: '钓鱼防护与基础',
      tabAds: '广告拦截器',
      tabTrackers: '追踪器与遥测',
      tabGeDefense: 'GeDefense（DOM 与脚本）',
      tabFingerprinting: '反指纹追踪',
      tabWhitelist: '白名单与例外',
      tabData: '系统与数据',
      savedToast: '设置已保存',

      optFormShieldTitle: '页面表单防御（Form Shield）',
      optFormShieldNote: '在密码或表单提交给可疑钓鱼网站之前进行拦截与确认。',
      optToastDurationTitle: '气泡提示停留时间',
      optToastDurationNote: '控制安全网站验证徽标在屏幕上显示的持续时间。',
      optDurationFast: '快速（1.5 秒）',
      optDurationNormal: '标准（2.5 秒）',
      optDurationLong: '较长（4 秒）',

      // VGT Ad Shield
      lblSecAds: 'VGT Ad Shield（广告拦截）',
      lblSecAdsNote: '网络请求过滤、无闪烁广告元素视觉隐藏与反广告拦截规避。',
      optAdMasterTitle: 'VGT Ad Shield 主保护',
      optAdMasterNote: '拦截横幅广告网络、视频广告、赞助内容和广告交易平台。',
      optCosmeticTitle: '视觉元素隐藏（Element Hiding）',
      optCosmeticNote: '无闪烁折叠空白广告框、横幅展位及赞助容器。',
      optAntiAdblockTitle: '反广告拦截规避与脚本免疫',
      optAntiAdblockNote: '绕过广告拦截检测墙并消除诱饵元素检查。',
      optPopunderTitle: '弹窗与点击陷阱防御',
      optPopunderNote: '阻断未请求的后台弹窗和不可见的隐形点击劫持覆盖层。',

      optUrlStripTitle: '网址追踪参数清理器',
      optUrlStripNote: '自动从网址中清除 utm_*、fbclid、gclid 等 19 种追踪参数。',
      optBeaconTitle: 'sendBeacon 拦截',
      optBeaconNote: '静默丢弃后台遥测信标，防止网页关闭时的隐藏数据追踪。',
      optBadgeTitle: '工具栏徽标计数器',
      optBadgeNote: '在浏览器扩展图标上实时显示当前页面拦截的追踪器数量。',

      optSelfXssTitle: '控制台 Self-XSS 防护',
      optSelfXssNote: '在开发者工具控制台中展示警告，防止用户受骗粘贴恶意代码。',
      optProtocolTitle: 'DOM 协议注入防御',
      optProtocolNote: '拦截链接和属性中危险的 javascript: 与 vbscript: 协议执行。',

      optCanvasTitle: 'Canvas 伪随机噪点微扰',
      optCanvasNote: '对 Canvas 绘图注入微妙的伪随机噪点，阻断指纹采集。',
      optWebGLTitle: 'WebGL 显卡遮蔽',
      optWebGLNote: '将显卡型号与供应商信息伪装为通用中性参数。',
      optAudioTitle: 'AudioContext 音频微扰',
      optAudioNote: '防止通过 Web Audio 接口采集设备声学指纹。',

      optWhitelistTitle: '自定义白名单（信任域名）',
      optWhitelistNote: '此列表中的域名将永远被视为安全，不会被拦截或标记为钓鱼。',
      optWhitelistAdd: '添加',
      optWhitelistPlaceholder: '例如：internal.mycompany.local',
      optWhitelistEmpty: '暂无自定义例外域名。',
      optWhitelistItemNote: '例外已激活（包含子域名）',
      optWhitelistDelete: '删除',

      optLangTitle: '界面语言',
      optLangNote: '选择扩展界面的显示语言。',
      optStatsTitle: '防护统计数据',
      optStatsDesc: '已拦截钓鱼威胁：{phish} 次 · 已防御追踪器：{trackers} 次',
      optBtnResetStats: '重置统计数据',
      optBtnResetDefaults: '恢复出厂默认设置',
      optBtnExport: '导出配置',
      optBtnImport: '导入配置',
      optConfirmReset: '您确定要将所有设置和统计数据恢复为出厂默认值吗？',

      checkLabel: '检查网址',
      checkPlaceholder: 'paypa1.com',
      btnCheck: '检查',
      resSuspicious: '可疑：冒充 {site}（{official}）。',
      resWarn: '验证受限：与 {site}（{official}）相似。域名无法明确验证。',
      resSafe: '本地保护列表中无匹配项 — 无法保证完全安全。',
      resSkip: '无效或不支持的网络地址。',

      shieldEyebrow: '表单提交已暂停',
      shieldHeading: '输入提交已被暂停',
      shieldDescDefault: '该地址假冒受保护的品牌或采用可疑的域名结构。',
      shieldTarget: '目标地址',
      shieldBrand: '已知品牌',
      shieldOfficial: '官方域名',
      shieldBtnCancel: '取消 — 保留输入数据',
      shieldBtnProceed: '仍然发送',
      shieldFooter: '本地验证 · 无数据传输至 Antipisher · VisionGaiaTechnology',
      shieldBadgeText: '疑似钓鱼网站 · Antipisher 提醒',
      shieldEngineUnavailable: '本地验证引擎不可用。为了您的账户安全，密码提交已被阻止。请重新加载扩展。',

      reasons: {
        unicode: '该地址使用了其他字母系统或带音标的字符，极易混淆视听、冒充知名品牌。',
        'unicode-hidden': '该地址包含不可见的 Unicode 控制字符，用于隐匿真实域名。',
        'bidi-override': '该地址包含双向文本控制字符，在视觉上掩盖了实际域名。',
        'foreign-domain': '受保护的品牌名称被非法使用在第三方域名或子域名上。',
        'brand-variant': '该域名采用篡改拼写或近似字符仿冒知名品牌。',
        'credential-bait': '该地址将品牌名称与常见的登录、账户或安全诱饵词拼接。',
        typosquat: '该域名与真实官方域名仅有极其轻微的拼写错误（误植域名）。',
        bitsquat: '该域名与受保护品牌仅相差 1 个比特位的 ASCII 编码（硬件或 DNS 内存故障利用）。',
        'path-impersonation': '该地址的路径在外部域名上伪造了品牌的登录或验证界面。',
        userinfo: '在 @ 符号前伪造品牌或登录凭据，误导用户以为属于可信站点。',
        suspicious: '检测到可疑的域名篡改或仿冒伪造特征。'
      }
    }
  };

  function normalizeLang(lang) {
    if (!lang || typeof lang !== 'string') return DEFAULT_LANG;
    const l = lang.trim().toLowerCase();
    if (l.startsWith('de')) return 'de';
    if (l.startsWith('ru')) return 'ru';
    if (l.startsWith('zh')) return 'zh';
    return 'en';
  }

  function detectLanguage() {
    try {
      const explicit = (typeof localStorage !== 'undefined' && localStorage.getItem('antipisher_lang'));
      if (explicit && SUPPORTED_LANGS.includes(explicit)) return explicit;
    } catch { /* ignore */ }

    const raw = (
      (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function' && chrome.i18n.getUILanguage()) ||
      (typeof browser !== 'undefined' && browser.i18n && typeof browser.i18n.getUILanguage === 'function' && browser.i18n.getUILanguage()) ||
      (typeof navigator !== 'undefined' && ((navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage)) ||
      DEFAULT_LANG
    );
    return normalizeLang(raw);
  }

  function t(key, lang, params = {}) {
    const l = normalizeLang(lang || detectLanguage());
    const pack = DICTIONARY[l] || DICTIONARY[DEFAULT_LANG];
    let val = pack[key];
    if (val === undefined) {
      val = DICTIONARY[DEFAULT_LANG][key] || key;
    }
    if (typeof val === 'string' && params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), String(v));
      }
    }
    return val;
  }

  function getReasonText(reasonCode, lang) {
    const l = normalizeLang(lang || detectLanguage());
    const pack = DICTIONARY[l] || DICTIONARY[DEFAULT_LANG];
    return pack.reasons[reasonCode] || pack.reasons.suspicious;
  }

  const AntipisherI18n = Object.freeze({
    SUPPORTED_LANGS,
    DEFAULT_LANG,
    detectLanguage,
    normalizeLang,
    t,
    getReasonText,
    dictionary: DICTIONARY
  });

  globalThis.AntipisherI18n = AntipisherI18n;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AntipisherI18n;
  }
})();
