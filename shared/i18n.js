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
      versionText: 'Version 0.1.1 · Alpha',

      // Popup
      statusActive: 'Protection Active',
      statusActiveSub: 'GET navigations and forms are verified locally.',
      statusDegraded: 'Protection Degraded',
      statusDegradedSub: 'Preflight not active – best-effort mode. Please reload extension.',
      statusReduced: 'Best-Effort Mode',
      statusReducedSub: 'Observation only without preventive preflight.',
      pillOn: 'ON',
      pillOff: 'OFF',
      pillDegraded: 'LIMITED',

      metricBrands: 'Brands',
      metricBlocked: 'Blocked',

      settingPreflight: 'Preflight Check',
      noticeActive: 'Active: GET navigations are classified before request.',
      noticeInactive: 'Inactive: no preventive preflight.',

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
      versionText: 'Version 0.1.1 · Alpha',

      statusActive: 'Schutz aktiv',
      statusActiveSub: 'GET-Navigationen werden lokal geprüft.',
      statusDegraded: 'Schutz eingeschränkt',
      statusDegradedSub: 'Vorabprüfung nicht installiert – Best-Effort-Erkennung aktiv. Bitte Erweiterung neu laden.',
      statusReduced: 'Best-Effort-Modus',
      statusReducedSub: 'Nur Beobachtung ohne präventive Blockade.',
      pillOn: 'AN',
      pillOff: 'AUS',
      pillDegraded: 'EINGESCHRÄNKT',

      metricBrands: 'Marken',
      metricBlocked: 'Abgewehrt',

      settingPreflight: 'Vorabprüfung',
      noticeActive: 'Aktiv: GET-Navigationen werden vor der Anfrage klassifiziert.',
      noticeInactive: 'Inaktiv: keine präventive Blockade.',

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
      versionText: 'Версия 0.1.1 · Альфа',

      statusActive: 'Защита активна',
      statusActiveSub: 'GET-навигация и формы проверяются локально.',
      statusDegraded: 'Защита ограничена',
      statusDegradedSub: 'Предпроверка не установлена — режим наблюдения. Перезагрузите расширение.',
      statusReduced: 'Режим наблюдения',
      statusReducedSub: 'Только наблюдение без превентивной блокировки.',
      pillOn: 'ВКЛ',
      pillOff: 'ВЫКЛ',
      pillDegraded: 'ОГРАНИЧЕНО',

      metricBrands: 'Бренды',
      metricBlocked: 'Отражено',

      settingPreflight: 'Предпроверка',
      noticeActive: 'Активно: GET-навигация проверяется перед отправкой запроса.',
      noticeInactive: 'Неактивно: превентивная блокировка отключена.',

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
      versionText: '版本 0.1.1 · Alpha',

      statusActive: '防护已启用',
      statusActiveSub: 'GET 导航与表单均在本地进行验证。',
      statusDegraded: '防护受限',
      statusDegradedSub: '预检规则未加载 — 当前为尽力检测模式。请重新加载扩展。',
      statusReduced: '尽力检测模式',
      statusReducedSub: '仅进行观察，不进行预防性预检拦截。',
      pillOn: '开启',
      pillOff: '关闭',
      pillDegraded: '受限',

      metricBrands: '品牌数',
      metricBlocked: '已拦截',

      settingPreflight: '预检拦截',
      noticeActive: '已启用：GET 导航在发起网络请求前完成分类。',
      noticeInactive: '已停用：不进行预防性预检拦截。',

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
