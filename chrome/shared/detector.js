/*
 * Antipisher 0.1 (Alpha): Advanced Offline Anti-Phishing & Homograph Detector
 * Licensed under the GNU Affero General Public License v3.0 (AGPLv3)
 * VisionGaiaTechnology · Intelligence Master · Diamant VGT Supreme Quality Gate
 * No remote requests, no telemetry, no tracking. High-performance deterministic engine.
 */
(() => {
  'use strict';

  const sites = globalThis.VGT_SITES || [];
  const brandLabels = new Set(sites.map(site => site.brand));

  // Deduplicated and expanded TR39 & visual lookalikes
  const homoglyphs = {
    // Cyrillic to Latin lookalikes
    'а':'a','А':'a','α':'a','Α':'a','ɑ':'a','Ꭺ':'a','а́':'a','ӓ':'a',
    'о':'o','О':'o','ο':'o','Ο':'o','օ':'o','ӧ':'o','Ӧ':'o',
    'е':'e','Е':'e','ε':'e','Ε':'e','ё':'e','Ё':'e','є':'e','Є':'e','ѐ':'e','Ѐ':'e','ϵ':'e',
    'р':'p','Р':'p','ρ':'p','Ρ':'p','ϱ':'p',
    'с':'c','С':'c','ϲ':'c','Ϲ':'c','Ꮯ':'c',
    'х':'x','Х':'x','χ':'x','Χ':'x',
    'у':'y','У':'y','γ':'y','Ү':'y','ү':'y','ӱ':'y','Ӱ':'y','ʏ':'y',
    'ѕ':'s','Ѕ':'s',
    'і':'i','І':'i','ι':'i','Ι':'i','ї':'i','Ї':'i','ɩ':'i','ɪ':'i','ῑ':'i','ı':'i',
    'ј':'j','Ј':'j','Ꭻ':'j',
    'һ':'h','Н':'h','н':'h','Ꮋ':'h',
    'ԁ':'d','Ԁ':'d',
    'ԛ':'q','Ԛ':'q',
    'ѡ':'w','ԝ':'w','Ԝ':'w','Ꮃ':'w',
    'ν':'v','Ν':'v','ѵ':'v','Ѵ':'v',
    'м':'m','М':'m','μ':'m','Ꮇ':'m',
    'τ':'t','Τ':'t','т':'t','Т':'t','ҭ':'t','Ҭ':'t','Ꭲ':'t',
    'в':'b','В':'b','Ь':'b','Β':'b',
    'κ':'k','Κ':'k','к':'k','К':'k','ϰ':'k','Ꮶ':'k',
    'ԍ':'g','ɡ':'g','Ԍ':'g',
    'ʀ':'r','ᴜ':'u','ⅼ':'l','ӏ':'l','Ӏ':'l','ł':'l','ℓ':'l',
    'п':'n','П':'n','г':'r','Г':'r',
    // Circled alphanumeric lookalikes
    'ⓐ':'a','ⓑ':'b','ⓒ':'c','ⓓ':'d','ⓔ':'e','ⓕ':'f','ⓖ':'g','ⓗ':'h','ⓘ':'i',
    'ⓙ':'j','ⓚ':'k','ⓛ':'l','ⓜ':'m','ⓝ':'n','ⓞ':'o','ⓟ':'p','ⓠ':'q','ⓡ':'r',
    'ⓢ':'s','ⓣ':'t','ⓤ':'u','ⓥ':'v','ⓦ':'w','ⓧ':'x','ⓨ':'y','ⓩ':'z',
    // Latin diacritics commonly abused in IDN spoofs (UTS #39)
    'á':'a','é':'e','í':'i','ó':'o','ú':'u','ý':'y',
    'à':'a','è':'e','ì':'i','ò':'o','ù':'u',
    'â':'a','ê':'e','î':'i','ô':'o','û':'u',
    // Leetspeak lookalike mappings
    '0':'o','1':'l','3':'e','4':'a','5':'s','7':'t','8':'b'
  };

  // Invisible and zero-width characters used in Unicode obfuscation attacks
  const invisibleCharsRegex = /[\u00AD\u200B\u200C\u200D\u2060-\u2064\uFEFF]/u;

  // Common legitimate words whose diacritic-stripped skeleton collides with a short
  // brand (über/uber, café/cafe). Keeps the generic diacritic check from blocking them.
  const legitDiacriticWords = new Set([
    'uber', 'cafe', 'resume', 'fiance', 'naive', 'creme', 'decor', 'hotel', 'uberde'
  ]);
  // Strong overrides (LRO/RLO/isolates) are never legitimate in a URL; weak marks
  // (LRM/RLM/ALM) occur in real RTL text and are only suspicious inside the host.
  const bidiStrongRegex = /[\u202A-\u202E\u2066-\u2069]/u;
  const bidiWeakRegex = /[\u061C\u200E\u200F]/u;

  function isBitFlip(a, b) {
    if (a.length !== b.length || a === b) return false;
    let flips = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a.charCodeAt(i) ^ b.charCodeAt(i);
      if (diff !== 0) {
        if ((diff & (diff - 1)) !== 0) return false;
        flips++;
        if (flips > 1) return false;
      }
    }
    return flips === 1;
  }

  // Words that are legitimate dictionary terms frequently used as generic corporate subdomains
  const genericSubdomains = new Set(['office', 'line', 'medium', 'zoom', 'notion', 'target']);

  // Phishing bait vocabulary (English + German/EU). Deliberately broader than the
  // former test-case tokens; matching is token- and fuzzy-based (see isBaitToken),
  // so unknown compounds/typos are covered without enumerating fixtures.
  const words = new Set([
    'login', 'logon', 'signin', 'sign-in', 'log-in', 'account', 'accounts',
    'verify', 'verification', 'verify-account', 'secure', 'security', 'support',
    'helpdesk', 'help', 'center', 'center', 'password', 'passwort', 'reset',
    'wallet', 'billing', 'payment', 'zahlung', 'zahlungen', 'auth', 'authentication',
    '2fa', 'mfa', 'oauth', 'update', 'update-konto', 'customer', 'service',
    'kundenservice', 'kundennummer', 'customerservice', 'banking', 'confirm',
    'confirmation', 'bestaetigen', 'bestätigen', 'unlock', 'portal', 'access',
    'session', 'validate', 'validation', 'recover', 'recovery', 'claim', 'alert',
    'notice', 'compliance', 'official', 'connect', 'checkout',
    'id', 'identity', 'safe', 'protection',
    // German / EU payment, parcel, tax and account bait
    'konto', 'konten', 'kontoauszug', 'sicherheit', 'sicherheits', 'zoll',
    'zollgebuehr', 'zollgebühr', 'tracking', 'sendung', 'paket', 'lieferung',
    'rechnung', 'mahnung', 'ueberweisung', 'überweisung', 'tan', 'pin',
    'gesperrt', 'verifizieren', 'verifizierung', 'rueckerstattung', 'rückerstattung',
    'erstattung', 'kundigung', 'kuendigung', 'kündigung', 'vertrag',
    'deutschland', 'oesterreich', 'österreich', 'schweiz', 'europa',
    // Commerce / crypto / generic append tokens
    'refund', 'invoice', 'delivery', 'parcel', 'airdrop', 'claim', 'seed',
    'wallet-seed', 'prime', 'inc', 'plus', 'express', 'online', 'kunde',
    'appleid', 'abmelden', 'anmelden', 'passwort-reset', 'free', 'gift',
    'promo', 'bonus', 'verify', 'wallet-connect', 'support-center',
    'shop', 'deals', 'sale', 'beratung', 'kundencenter', 'ratgeber',
    'schnell', 'lieferung', 'bestellung', 'abholung', 'retoure', 'umtausch',
    'anmeldung', 'abmeldung', 'registrierung', 'aktivierung', 'freischaltung',
    'termin', 'bescheid', 'entsperren', 'gutschein', 'abo', 'sperre',
    'paketstation', 'sendungsverfolgung', 'kyc'
  ]);

  // TLD tokens that attackers concatenate with a brand (paypalcom.net, sparkassede.de).
  const tldTokens = new Set([
    'com', 'de', 'net', 'org', 'co', 'io', 'eu', 'info', 'biz', 'online', 'site', 'app'
  ]);

  // Public multi-tenant hosting platforms where user-generated subdomains reside
  const multiTenantSuffixes = [
    'github.io', 'gitlab.io', 'pages.dev', 'vercel.app', 'webflow.io',
    'netlify.app', 'firebaseapp.com', 'blogspot.com', 'wordpress.com',
    'myshopify.com', 'azurewebsites.net', 'cloudfront.net', 's3.amazonaws.com',
    // Shared-hosting roots where customers (not the brand) control the subdomain.
    // force.com = Salesforce Sites/Communities; *.(my.)salesforce.com = Org-Tenants.
    'force.com', 'my.salesforce.com', 'my.site.com', 'notion.site'
  ];

  function punycodeDecode(label) {
    if (!label.startsWith('xn--')) return label;
    const src = label.slice(4);
    let n = 128, i = 0, bias = 72, result = [];
    const cut = src.lastIndexOf('-');
    let pos = cut < 0 ? 0 : cut + 1;
    if (cut >= 0) {
      for (const c of src.slice(0, cut)) {
        if (c.codePointAt(0) > 127) return label;
        result.push(c.codePointAt(0));
      }
    }
    function digit(cp) {
      if (cp >= 48 && cp <= 57) return cp - 22;
      if (cp >= 65 && cp <= 90) return cp - 65;
      if (cp >= 97 && cp <= 122) return cp - 97;
      return 36;
    }
    function adapt(delta, count, first) {
      delta = first ? Math.floor(delta / 700) : Math.floor(delta / 2);
      delta += Math.floor(delta / count);
      let k = 0;
      while (delta > 455) { delta = Math.floor(delta / 35); k += 36; }
      return k + Math.floor(36 * delta / (delta + 38));
    }
    try {
      while (pos < src.length) {
        const old = i;
        let w = 1, k = 36;
        for (;; k += 36) {
          if (pos >= src.length) return label;
          const d = digit(src.charCodeAt(pos++));
          if (d >= 36) return label;
          i += d * w;
          if (!Number.isSafeInteger(i)) return label;
          const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
          if (d < t) break;
          w *= 36 - t;
          if (!Number.isSafeInteger(w)) return label;
        }
        bias = adapt(i - old, result.length + 1, old === 0);
        n += Math.floor(i / (result.length + 1));
        i %= result.length + 1;
        if (n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return label;
        result.splice(i, 0, n);
        i++;
        if (result.length > 64) return label;
      }
      return String.fromCodePoint(...result);
    } catch {
      return label;
    }
  }

  function skeleton(text) {
    let s = '';
    for (const c of text.normalize('NFKD').toLowerCase()) {
      if (/\p{M}/u.test(c)) continue;
      s += homoglyphs[c] || c;
    }
    return s.normalize('NFKD');
  }

  // Damerau-Levenshtein distance <= 1: supports insertion, deletion, substitution, and adjacent transposition
  function damerauDistanceOne(a, b) {
    if (a === b) return false;
    const lenDiff = Math.abs(a.length - b.length);
    if (lenDiff > 1) return false;

    // Substitution or Adjacent Transposition (equal length)
    if (a.length === b.length) {
      let diffIndex = -1;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          if (diffIndex === -1) {
            diffIndex = i;
          } else if (diffIndex === i - 1 && a[diffIndex] === b[i] && a[i] === b[diffIndex]) {
            return a.slice(i + 1) === b.slice(i + 1);
          } else {
            return false;
          }
        }
      }
      return diffIndex !== -1;
    }

    // Single Insertion / Deletion (length difference of 1)
    const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
    let i = 0, j = 0, diff = 0;
    while (i < shorter.length && j < longer.length) {
      if (shorter[i] === longer[j]) {
        i++;
        j++;
      } else {
        diff++;
        if (diff > 1) return false;
        j++;
      }
    }
    return true;
  }

  // Bait matching is deliberate fuzzy: exact token, skeleton/leet spelling, or
  // Damerau-Levenshtein-1 to a >=4-letter bait word. This generalises to unknown
  // compounds without appending fixture tokens to the lexicon.
  const baitSkeletons = [...new Set([...words].map(w => skeleton(w)))];
  function isBaitToken(value) {
    if (!value) return false;
    const s = skeleton(value);
    if (words.has(value) || baitSkeletons.includes(s)) return true;
    if (s.length < 4) return false;
    return baitSkeletons.some(w => w.length >= 4 && damerauDistanceOne(s, w));
  }

  function isTranspositionOne(a, b) {
    if (a === b || a.length !== b.length) return false;
    let first = -1;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === b[i]) continue;
      if (first === -1) {
        first = i;
      } else if (first === i - 1 && a[first] === b[i] && a[i] === b[first]) {
        return a.slice(i + 1) === b.slice(i + 1);
      } else {
        return false;
      }
    }
    return false;
  }

  // Optimal-string-alignment distance with early exit at max (used for 2-edit lookalikes).
  function distanceAtMostTwo(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return false;
    let prev2 = null, prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      let rowMin = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          v = Math.min(v, prev2[j - 2] + 1);
        }
        cur[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > 2) return false;
      prev2 = prev;
      prev = cur;
    }
    return prev[n] <= 2;
  }

  function withinDomain(host, domain) {
    if (host === domain) return true;
    if (multiTenantSuffixes.includes(domain)) {
      // Subdomains of public multi-tenant suffixes do not inherit ownership from the root suffix
      return false;
    }
    return host.endsWith('.' + domain);
  }

  // True only for hosts under a curated official domain that is not itself a
  // shared-hosting/public-suffix root (or an explicitly listed official subdomain).
  function isOfficialHost(host) {
    const listed = sites.some(s => s.domains.some(d => withinDomain(host, d)));
    if (!listed) return false;
    const explicitlyListed = sites.some(s => s.domains.includes(host));
    const underSharedTenant = multiTenantSuffixes.some(root => host.endsWith('.' + root));
    if (underSharedTenant && !explicitlyListed) return false;
    return true;
  }

  function domainBaseIndex(labels) {
    if (labels.length >= 3) {
      const two = labels.slice(-2).join('.');
      if (multiTenantSuffixes.includes(two)) {
        return labels.length - 3;
      }
      const last = labels[labels.length - 1];
      const prior = labels[labels.length - 2];
      if (/^[a-z]{2}$/.test(last) &&
        new Set(['co', 'com', 'org', 'net', 'ac', 'edu', 'gov', 'gv', 'priv']).has(prior)) {
        return labels.length - 3;
      }
    }
    return labels.length - 2;
  }

  function validPublicUrl(input) {
    try {
      const u = new URL(input);
      if (!['http:', 'https:'].includes(u.protocol) || !u.hostname) return null;
      return u;
    } catch {
      return null;
    }
  }

  function buildReasonObj(code, site, host, extra) {
    const siteName = site?.name || (typeof site === 'string' ? site : '');
    const officialDomain = site?.domains?.[0] || site?.official || '';
    let expDe = '', expEn = '', expRu = '', expZh = '', detailStr = '';

    switch (code) {
      case 'userinfo':
        detailStr = 'RFC 3986 Benutzerdaten-Täuschung im URL-Präfix vor dem @-Zeichen';
        expDe = 'Die Adresse nutzt Anmeldedaten vor dem @-Symbol, um eine vertrauenswürdige Marke vorzutäuschen, leitet aber tatsächlich zu einer fremden Domain weiter.';
        expEn = 'The address embeds credentials before the @ symbol to deceptively suggest a trusted brand, but actually navigates to a foreign domain.';
        expRu = 'Адрес использует учетные данные перед символом @ для создания ложного доверия, но ведет на посторонний домен.';
        expZh = '该地址在 @ 符号前嵌入登录凭据，误导用户以为属于可信站点，实际却跳转至外部域名。';
        break;
      case 'unicode-hidden':
        detailStr = 'Unsichtbare Zero-Width- oder Trennzeichen im Domain-Label';
        expDe = 'Die Webadresse enthält unsichtbare Steuerzeichen, die im Browser nicht sichtbar sind, um Phishing-Filter zu umgehen.';
        expEn = 'The web address contains invisible zero-width control characters to evade phishing detection.';
        expRu = 'Веб-адрес содержит невидимые управляющие символы нулевой ширины для обхода фильтров безопасности.';
        expZh = '该网址包含在浏览器中不可见的零宽控制字符，用于绕过反钓鱼过滤器。';
        break;
      case 'bidi-override':
        detailStr = 'Bidirektionale Steuerzeichen erkannt (Bidi-Spoofing)';
        expDe = 'Die Webadresse enthält unsichtbare Richtungsumkehr-Steuerzeichen, die den tatsächlichen Domainnamen im Browser spiegeln oder verschleiern.';
        expEn = 'The address contains bidirectional override characters that visually reverse or obscure the actual domain name.';
        expRu = 'Адрес содержит символы изменения направления письма, оптически искажающие настоящее имя домена.';
        expZh = '该网址包含双向文本控制字符，在视觉上反转或混淆真实域名。';
        break;
      case 'foreign-domain':
        detailStr = `Unautorisierte Verwendung der geschützten Marke ${siteName} auf einer Fremddomain`;
        expDe = `Der Name oder die offizielle Domain von ${siteName || 'der Zielmarke'} wird als Subdomain oder Pfadbestandteil auf einem fremden Server (${host}) missbraucht.`;
        expEn = `The name or official domain of ${siteName || 'the target brand'} is misused as a subdomain or path element on an unauthorized server (${host}).`;
        expRu = `Имя или официальный домен ${siteName || 'бренда'} используется как поддомен или путь на постороннем сервере (${host}).`;
        expZh = `${siteName || '目标品牌'} 的名称或官方域名被非法用作第三方服务器（${host}）的子域名或路径。`;
        break;
      case 'unicode':
        detailStr = `IDN-Homograph-Angriff mit optisch identischen Unicode-Zeichen auf ${siteName}`;
        expDe = `Der Domainname verwendet kyrillische, griechische oder Sonderzeichen, die im Browser wie ${officialDomain || 'die Originaladresse'} aussehen, aber zu einem anderen Server führen.`;
        expEn = `The domain uses Cyrillic, Greek, or special Unicode characters that visually mimic ${officialDomain || 'the authentic address'} but navigate to a different server.`;
        expRu = `Доменное имя использует кириллицу, греческие или специальные символы Юникода, похожие на ${officialDomain || 'оригинал'}, но ведет на другой сервер.`;
        expZh = `该域名使用了西里尔字母、希腊字母或特殊 Unicode 字符，在视觉上仿冒 ${officialDomain || '官方正品地址'}，实际导向不同服务器。`;
        break;
      case 'brand-variant':
        detailStr = `Visuelle Confusable-Substitution oder Ligatur (z. B. rn/m, vv/w) für ${siteName}`;
        expDe = `Buchstabenkombinationen wurden gezielt gewählt, um im Browser optisch wie die Marke ${siteName} zu wirken.`;
        expEn = `Character combinations or visual ligatures were crafted to visually resemble the brand ${siteName}.`;
        expRu = `Комбинации символов или лигатуры подобраны специально для оптического сходства с брендом ${siteName}.`;
        expZh = `刻意构造字符组合或视觉合字，使其在浏览器中视觉上酷似品牌 ${siteName}。`;
        break;
      case 'credential-bait':
        detailStr = `Kombination aus geschützter Marke ${siteName} und Phishing-Köderbegriff`;
        expDe = `Die Domain verknüpft den Markennamen mit Sicherheits- oder Anmeldebegriffen (z. B. login, secure, konto), um Vertrauen vorzutäuschen.`;
        expEn = `The domain couples the brand name with security or login bait keywords (e.g. login, verify, secure) to fabricate trust.`;
        expRu = `Домен объединяет имя бренда со словами входа или безопасности (напр. login, verify, secure) для создания ложного доверия.`;
        expZh = `该域名将品牌名称与安全或登录诱饵词（如 login, verify, secure）拼接以诱骗信任。`;
        break;
      case 'typosquat':
        detailStr = `Tippfehler-Domain (Typosquatting / Damerau-Levenshtein 1) zu ${siteName}`;
        expDe = `Der Domainname unterscheidet sich nur durch einen minimalen Tippfehler oder Buchstabenvertauschung von ${officialDomain || 'der echten Domain'}.`;
        expEn = `The domain differs only by minor typographical errors or character transpositions from ${officialDomain || 'the genuine domain'}.`;
        expRu = `Доменное имя отличается от ${officialDomain || 'подлинного домена'} лишь незначительной опечаткой или перестановкой букв.`;
        expZh = `该域名与 ${officialDomain || '真实官方域名'} 仅有极其微小的拼写错误或字母颠倒。`;
        break;
      case 'bitsquat':
        detailStr = `Bitsquatting (1-Bit-Speicher-/Übertragungsfehler) zu ${siteName}`;
        expDe = `Die Domain unterscheidet sich um exakt 1 Bit im ASCII-Code von ${officialDomain || 'der Zielmarke'} und fängt typische Hardware- oder DNS-Speicherfehler ab.`;
        expEn = `The domain differs by exactly 1 flipped ASCII bit from ${officialDomain || 'the target brand'}, capturing single-bit memory or transmission faults.`;
        expRu = `Домен отличается ровно на 1 бит ASCII от ${officialDomain || 'целевого бренда'}, перехватывая ошибки памяти или DNS.`;
        expZh = `该域名与 ${officialDomain || '目标品牌'} 仅相差 1 个 ASCII 比特位，利用单比特内存翻转或传输故障进行拦截。`;
        break;
      case 'path-impersonation':
        detailStr = `Täuschender Markenpfad für ${siteName} auf Fremddomain (${host})`;
        expDe = `Der Webseiten-Pfad imitiert einen Anmelde- oder Verifizierungsprozess von ${siteName}, läuft jedoch auf einer fremden Domain (${host}).`;
        expEn = `The URL path mimics a login or verification process for ${siteName}, but is hosted on an unauthorized foreign domain (${host}).`;
        expRu = `Путь URL имитирует процесс авторизации или проверки для ${siteName}, но расположен на постороннем домене (${host}).`;
        expZh = `该 URL 路径伪造了 ${siteName} 的登录或验证流程，但实际寄生于未经授权的外部域名（${host}）。`;
        break;
      default:
        detailStr = `Verdächtige Aktivität bezüglich ${siteName}`;
        expDe = 'Die Domain weist typische Merkmale einer Phishing- oder Täuschungsadresse auf.';
        expEn = 'The domain exhibits typical indicators of a deceptive or phishing address.';
        expRu = 'Домен демонстрирует типичные признаки фишингового или мошеннического адреса.';
        expZh = '该域名表现出典型的网络钓鱼或欺诈网址特征。';
        break;
    }

    const defaultLang = (globalThis.AntipisherI18n?.detectLanguage?.()) || 'de';
    let chosen = expDe;
    if (defaultLang === 'en') chosen = expEn;
    else if (defaultLang === 'ru') chosen = expRu;
    else if (defaultLang === 'zh') chosen = expZh;

    return {
      code: code || 'suspicious',
      weight: extra?.weight || 90,
      detail: detailStr,
      explanation_de: expDe,
      explanation_en: expEn,
      explanation_ru: expRu,
      explanation_zh: expZh,
      explanation: chosen
    };
  }

  function formatVerdict({ status, action, host, site, official, reason, weight, decodedHost, isIDN, extra }) {
    if (status === 'skip') {
      return {
        status: 'skip',
        action: 'skip',
        score: 0,
        confidence: 'low',
        host: host || '',
        weight: 0,
        reasons: []
      };
    }
    if (status === 'safe') {
      return {
        status: 'safe',
        action: 'allow',
        score: 0,
        confidence: 'high',
        host: host || '',
        weight: 0,
        reasons: [],
        punycode: host || '',
        decodedHost: decodedHost || host || '',
        isIDN: Boolean(isIDN)
      };
    }
    const w = weight || 90;
    const act = action || (w >= 90 ? 'block' : 'warn');
    const score = Math.min(100, Math.round(w * 0.95));
    const confidence = w >= 95 ? 'high' : 'medium';
    const siteObj = typeof site === 'object' && site !== null ? site : { name: site || '', domains: official ? [official] : [] };
    const siteName = siteObj.name || (typeof site === 'string' ? site : '');
    const officialDomain = official || siteObj.domains?.[0] || '';
    const reasonItem = buildReasonObj(reason, siteObj, host, { weight: w, ...extra });

    return {
      status: 'block',
      action: act,
      score,
      confidence,
      host: host || '',
      site: siteName,
      official: officialDomain,
      reason: reason || 'suspicious',
      weight: w,
      reasons: [reasonItem],
      punycode: host || '',
      decodedHost: decodedHost || host || '',
      isIDN: Boolean(isIDN)
    };
  }

  let activeWhitelist = new Set();

  function setWhitelist(list) {
    if (Array.isArray(list)) {
      activeWhitelist = new Set(list.map(s => String(s || '').trim().toLowerCase().replace(/\.$/, '')).filter(Boolean));
    } else if (list instanceof Set) {
      activeWhitelist = new Set(Array.from(list).map(s => String(s || '').trim().toLowerCase().replace(/\.$/, '')).filter(Boolean));
    }
  }

  function getWhitelist() {
    return Array.from(activeWhitelist);
  }

  function isWhitelisted(host, customList) {
    let list = activeWhitelist;
    if (Array.isArray(customList)) {
      list = new Set(customList.map(s => String(s || '').trim().toLowerCase().replace(/\.$/, '')).filter(Boolean));
    } else if (customList && typeof customList === 'object' && Array.isArray(customList.whitelist)) {
      list = new Set(customList.whitelist.map(s => String(s || '').trim().toLowerCase().replace(/\.$/, '')).filter(Boolean));
    }
    if (!list || list.size === 0) return false;
    const cleanHost = String(host || '').trim().toLowerCase().replace(/\.$/, '');
    if (!cleanHost) return false;
    if (list.has(cleanHost)) return true;
    for (const item of list) {
      if (cleanHost === item || withinDomain(cleanHost, item)) return true;
    }
    return false;
  }

  function classify(input, options) {
    const url = validPublicUrl(input);
    if (!url) return formatVerdict({ status: 'skip' });

    const host = url.hostname.toLowerCase().replace(/\.$/, '');

    // User-configured Whitelist exemption: trusted domains are never flagged
    if (isWhitelisted(host, options)) {
      return formatVerdict({ status: 'safe', host, decodedHost: host, isIDN: false });
    }

    // Check RFC 3986 userinfo deception: https://brand.com@evil.com/
    // Skip this on the brand's own official domains (e.g. https://paypal@paypal.com/)
    // to avoid false positives for legitimate userinfo on official hosts.
    if ((url.username || url.password) && !isOfficialHost(host)) {
      const rawUserinfo = (url.username + ':' + url.password).toLowerCase();
      let decodedUserinfo = rawUserinfo;
      try { decodedUserinfo = decodeURIComponent(rawUserinfo); } catch {}
      const impersonated = sites.find(site => {
        for (const d of site.domains) {
          const escapedD = d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp('(?:^|[^a-z0-9.-])' + escapedD + '(?:$|[^a-z0-9.-])');
          if (regex.test(rawUserinfo) || regex.test(decodedUserinfo)) return true;
        }
        // Only a username that is exactly the brand is treated as deception. A brand
        // word in the password (user:paypal@example.com) is not domain impersonation.
        const usernameLower = url.username.toLowerCase();
        if (site.brand.length >= 4 && usernameLower === site.brand) return true;
        return false;
      });
      if (impersonated) {
        return formatVerdict({
          status: 'block',
          host,
          site: impersonated,
          official: impersonated.domains[0],
          reason: 'userinfo',
          weight: 125,
          decodedHost: host,
          isIDN: /[^\x00-\x7F]/.test(host)
        });
      }
    }

    // Direct visit to multi-tenant platform roots (e.g. github.io, vercel.app, netlify.app) is safe
    if (multiTenantSuffixes.includes(host)) {
      return formatVerdict({ status: 'safe', host, decodedHost: host, isIDN: false });
    }

    // Direct match against official curated brand domains and their authentic subdomains
    if (isOfficialHost(host)) {
      return formatVerdict({ status: 'safe', host, decodedHost: host, isIDN: false });
    }

    const labels = host.split('.');
    if (labels.length < 2 || /^\d+(?:\.\d+){3}$/.test(host) || host.includes(':')) {
      return formatVerdict({ status: 'safe', host, decodedHost: host, isIDN: false });
    }

    const decoded = labels.map(punycodeDecode);
    const hasUnicode = /[^\x00-\x7F]/.test(host) || labels.some(l => l.startsWith('xn--'));

    // Immediate check for invisible / zero-width characters in decoded labels
    for (const label of decoded) {
      if (invisibleCharsRegex.test(label)) {
        return formatVerdict({
          status: 'block',
          action: 'block',
          host,
          site: { name: 'Sicherheitshinweis', domains: ['Unsichtbare Zeichen erkannt'] },
          official: 'Unsichtbare Zeichen erkannt',
          reason: 'unicode-hidden',
          weight: 130,
          decodedHost: decoded.join('.'),
          isIDN: true
        });
      }
    }

    // Check for bidirectional override characters (UTS #39 / RFC 8264 Bidi spoofing).
    // Weak RTL marks in paths/queries are legitimate; strong overrides never are.
    let decodedUrlStr = '';
    try { decodedUrlStr = decodeURI(url.href); } catch {}
    const bidiInHost = bidiStrongRegex.test(host) || bidiWeakRegex.test(host);
    const bidiStrong = bidiStrongRegex.test(url.href) || bidiStrongRegex.test(input) || bidiStrongRegex.test(decodedUrlStr);
    if (bidiInHost || bidiStrong) {
      return formatVerdict({
        status: 'block',
        action: 'block',
        host,
        site: { name: 'Sicherheitswarnung', domains: ['Bidi-Override erkannt'] },
        official: 'Bidi-Override erkannt',
        reason: 'bidi-override',
        weight: 120,
        decodedHost: decoded.join('.'),
        isIDN: hasUnicode
      });
    }

    const baseIndex = domainBaseIndex(labels);
    const isMultiTenant = multiTenantSuffixes.some(suf => withinDomain(host, suf));

    for (const site of sites) {
      // If the host is legitimately within one of the site's official domains:
      if (site.domains.some(d => withinDomain(host, d))) {
        continue;
      }

      const brand = site.brand;
      const brandSkeleton = skeleton(brand);
      let reason = null, weight = 0, action = null;

      // An official domain hidden inside an unrelated host: e.g. paypal.com.attacker.com
      // A trailing two-letter ccTLD label (google.com.pe) is a real regional domain,
      // not a concealed third-party host; let the exact-brand/ccTLD logic classify it.
      const hiddenOfficial = site.domains.some(d => {
        if (host.startsWith(d + '.')) {
          const rest = host.slice(d.length + 1).split('.')[0];
          return !/^[a-z]{2}$/.test(rest);
        }
        const marker = '.' + d + '.';
        if (host.includes(marker)) {
          const rest = host.slice(host.indexOf(marker) + marker.length).split('.')[0];
          return !/^[a-z]{2}$/.test(rest);
        }
        return false;
      });
      if (hiddenOfficial) {
        return formatVerdict({
          status: 'block',
          host,
          site,
          official: site.domains[0],
          reason: 'foreign-domain',
          weight: 115,
          decodedHost: decoded.join('.'),
          isIDN: hasUnicode
        });
      }

      for (let j = 0; j <= baseIndex; j++) {
        const isBase = (j === baseIndex);
        const original = decoded[j].toLowerCase();
        const sk = skeleton(original);
        const normalized = original.normalize('NFKC');
        const isExactBrand = (original === brand || normalized.replace(/-/g, '') === brand);

        // 1. Lookalike unicode substitutions or diacritics matching brand skeleton
        if (sk === brandSkeleton && original !== brand) {
          const hasTableChar = [...original].some(ch => Object.prototype.hasOwnProperty.call(homoglyphs, ch));
          const isNonAscii = /[^\x00-\x7F]/.test(original);
          // For brands >= 5 chars any non-ASCII skeleton collision is treated as a
          // homograph/diacritic spoof (e.g. p\u00e4ypal, appl\u00e8, m\u00efcrosoft). Short
          // brands stay table-only to avoid blocking legitimate words like "über".
          if (hasTableChar || (isNonAscii && (brandSkeleton.length >= 5 || !legitDiacriticWords.has(sk)))) {
            reason = isNonAscii ? 'unicode' : 'brand-variant';
            weight = 110;
            break;
          }
        }

        // 2. Exact brand on a foreign host or subdomain
        if (isExactBrand) {
          if (isBase) {
            // Exact brand as registrable label on a foreign TLD. Offline official-domain
            // data cannot be complete for country-code spaces, so ccTLD cases are a
            // warning (user may proceed) instead of a hard block. Generic TLDs stay block.
            const tld = labels[labels.length - 1];
            const prior = labels.length >= 3 ? labels[labels.length - 2] : '';
            const isCcTld = /^[a-z]{2}$/.test(tld) &&
              (labels.length === 2 || prior === brand ||
               ['com', 'co', 'org', 'net', 'gov', 'ac', 'edu'].includes(prior));
            // Global brands maintain official presences across many ccTLDs. For those,
            // exact brand + ccTLD is treated as official (data completes over time);
            // ccTLDs that are commonly re-registered like gTLDs (co, io, me, tv, ...)
            // are excluded and stay at warning level.
            const genericLikeCctld = new Set(['co', 'io', 'me', 'tv', 'cc', 'ws', 'ai', 'ly', 'to', 'fm', 'gg']);
            const officialCcTldCount = site.domains.filter(d => /\.[a-z]{2}$/i.test(d)).length;
            if (isCcTld && !genericLikeCctld.has(tld) && officialCcTldCount >= 3) {
              return formatVerdict({ status: 'safe', host, decodedHost: decoded.join('.'), isIDN: hasUnicode });
            }
            reason = 'foreign-domain';
            weight = isCcTld ? 88 : 105;
            action = isCcTld ? 'warn' : 'block';
            break;
          } else {
            // Brand appears as a subdomain (e.g. apple.attacker.com or paypal.github.io)
            if (!genericSubdomains.has(brand) || isMultiTenant) {
              reason = 'foreign-domain';
              weight = 100;
              break;
            }
          }
        }

        // Visual ligatures: e.g. "rn" resembling "m" (arnazon.com, rnicrosoft.com)
        if (isBase) {
          const ligature = original.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/cl/g, 'd');
          if (ligature !== original && skeleton(ligature) === brandSkeleton) {
            reason = 'brand-variant';
            weight = 105;
            break;
          }
        }

        // 3. Credential bait words appended (with separator or directly concatenated)
        const segments = original.split(/[-_.]/).filter(Boolean);
        const segmentSkeletons = segments.map(skeleton);
        const matchesBrandSegment = segments.some((s, idx) => {
          if (s === brand || segmentSkeletons[idx] === brandSkeleton) return true;
          // Brand used as prefix of a longer segment (microsoft365, amazonprime, appleid).
          if (s.length > brand.length && s.startsWith(brand)) return true;
          // Visual ligatures inside a segment (arnazon-login -> amazon-login).
          const ligated = segmentSkeletons[idx].replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/cl/g, 'd');
          if (ligated === brandSkeleton) return true;
          if (s.length >= 4 && brand.length >= 4 && damerauDistanceOne(segmentSkeletons[idx], brandSkeleton)) return true;
          return false;
        });
        if (matchesBrandSegment && (segments.some(isBaitToken) || segments.includes('www'))) {
          reason = 'credential-bait';
          weight = 98;
          break;
        }

        // Brand-like subdomain labels (e.g. rnicrosoft.evil.test, microsoft365.evil.test).
        // Generic dictionary brands and hyphenated documentation labels keep their
        // subdomain exemption to avoid false positives (mail.proton.me, paypal-guides.*).
        if (!isBase && brand.length >= 4 && !genericSubdomains.has(brand) &&
            !original.includes('-') && !brandLabels.has(original)) {
          const ligated = sk.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/cl/g, 'd');
          const sameLength = original.length === brand.length;
          if (original.startsWith(brand) || sk.startsWith(brandSkeleton) ||
              ligated === brandSkeleton || (sameLength && damerauDistanceOne(sk, brandSkeleton))) {
            reason = 'foreign-domain';
            weight = 100;
            break;
          }
        }

        // Direct concatenation without separator: e.g. paypalsupport.com, dhlpaket.de
        if (isBase && brand.length >= 3) {
          if (original.startsWith(brand)) {
            const remainder = original.slice(brand.length);
            if (isBaitToken(remainder) || tldTokens.has(remainder) ||
                baitSkeletons.some(w => w.length >= 4 && remainder.startsWith(w))) {
              reason = 'credential-bait';
              weight = 98;
              break;
            }
          }
          if (original.endsWith(brand)) {
            const remainder = original.slice(0, original.length - brand.length);
            if (isBaitToken(remainder) || tldTokens.has(remainder) ||
                baitSkeletons.some(w => w.length >= 4 && remainder.startsWith(w))) {
              reason = 'credential-bait';
              weight = 98;
              break;
            }
          }
          if (sk.startsWith(brandSkeleton) && sk !== brandSkeleton) {
            const remainder = sk.slice(brandSkeleton.length);
            if (isBaitToken(remainder)) {
              reason = 'credential-bait';
              weight = 98;
              break;
            }
          }
          if (sk.endsWith(brandSkeleton) && sk !== brandSkeleton) {
            const remainder = sk.slice(0, sk.length - brandSkeleton.length);
            if (isBaitToken(remainder)) {
              reason = 'credential-bait';
              weight = 98;
              break;
            }
          }
        }

        // Also check if adjacent subdomain labels combine brand + bait word
        if (j > 0 && (original === brand || sk === brandSkeleton) && isBaitToken(decoded[j - 1])) {
          reason = 'credential-bait';
          weight = 97;
          break;
        }
        if (j < decoded.length - 2 && (original === brand || sk === brandSkeleton) && isBaitToken(decoded[j + 1])) {
          reason = 'credential-bait';
          weight = 97;
          break;
        }

        // Visual substitution of lowercase 'l' for 'i' (vlsa -> VISA, lng -> ING).
        // 3-letter brands stay warning-level to avoid hard-blocking legitimate words.
        if (brand.length >= 3 && original.length === brand.length && !brandLabels.has(original)) {
          if (sk.replace(/l/g, 'i') === brandSkeleton.replace(/l/g, 'i') && sk !== brandSkeleton) {
            reason = 'brand-variant';
            weight = brand.length >= 4 ? 100 : 84;
            break;
          }
        }

        // 4. Bitsquatting: block for brands >=5, warning for 3-4 letter brands.
        if (isBase && brand.length >= 3 && original.length === brand.length && !brandLabels.has(original)) {
          if (isBitFlip(original, brand) || isBitFlip(sk, brandSkeleton)) {
            reason = 'bitsquat';
            weight = brand.length >= 5 ? 94 : 84;
            break;
          }
        }

        // 5. Typosquatting via Damerau-Levenshtein 1. For 3-letter brands only an
        // adjacent transposition (dbk -> dkb) is used; 4-letter brands warn.
        if (isBase && original.length >= 3 && !brandLabels.has(original) &&
            Math.abs(original.length - brand.length) <= 1) {
          const isTypo = brand.length >= 4
            ? damerauDistanceOne(sk, brandSkeleton)
            : isTranspositionOne(sk, brandSkeleton);
          if (isTypo) {
            reason = 'typosquat';
            weight = brand.length >= 5 ? 92 : (brand.length === 4 ? 86 : 84);
            break;
          }
        }

        // 5b. Digit-containing brands (n26, o2, 1&1): a one-character edit is a strong
        // phishing signal because legitimate digit brands are rare.
        if (isBase && /\d/.test(brand) && original.length === brand.length &&
            !brandLabels.has(original) && damerauDistanceOne(sk, brandSkeleton)) {
          reason = 'typosquat';
          weight = 86;
          break;
        }

        // 6. Two-edit lookalikes for longer brands are warning-level (peypel, geegle,
        // sparkazze) instead of being silently accepted.
        if (isBase && brand.length >= 6 && !brandLabels.has(original) &&
            original.length >= brand.length - 1 &&
            original.length <= brand.length + 1 && distanceAtMostTwo(original, brand)) {
          reason = 'typosquat';
          weight = 84;
          break;
        }
      }

      if (reason) {
        return formatVerdict({
          status: 'block',
          action: action || undefined,
          host,
          site,
          official: site.domains[0],
          reason,
          weight,
          decodedHost: decoded.join('.'),
          isIDN: hasUnicode
        });
      }
    }

    // Layer 3: Path phishing on foreign hosts.
    // Signal = brand (or official domain) as a *standalone path segment* plus an
    // auth/verification action segment. Article slugs such as
    // "how-to-fix-paypal-login" no longer match, query strings are ignored
    // (search engines) and there is no /blog|docs exemption that attackers can prepend.
    const pathLower = url.pathname.toLowerCase();
    const pathSegments = pathLower.split('/').filter(Boolean);
    const sensitiveActions = new Set([
      'login', 'logon', 'signin', 'sign-in', 'log-in', 'auth', 'authentication',
      'verify', 'verification', 'password', 'passwort', 'reset-password', 'reset',
      'credential', 'banking', 'wallet', 'unlock', 'konto', 'sicherheit',
      'confirm', 'bestaetigen', 'bestätigen', 'update', 'tan', 'pin'
    ]);
    const isActionSegment = seg => sensitiveActions.has(seg) ||
      /^(?:password|passwort|login|signin|sign-in|verify|verification|konto|sicherheit|tan|pin)(?:[-_.]|$)/.test(seg);
    const hasActionSegment = pathSegments.some(isActionSegment);

    if (hasActionSegment) {
      for (const site of sites) {
        if (site.domains.some(d => withinDomain(host, d))) continue;
        const brand = site.brand;
        if (brand.length < 3) continue;

        const brandAsSegment = pathSegments.some(seg =>
          seg === brand || seg === brand + '.com' || seg === brand + '.de' || seg === brand + '.org'
        );
        const officialDomainAsSegment = site.domains.some(d =>
          pathSegments.includes(d) || pathSegments.includes(d + '.com')
        );

        if (brandAsSegment || officialDomainAsSegment) {
          return formatVerdict({
            status: 'block',
            action: 'warn',
            host,
            site,
            official: site.domains[0],
            reason: 'path-impersonation',
            weight: 88,
            decodedHost: decoded.join('.'),
            isIDN: hasUnicode
          });
        }
      }

      // A login/verification path on a shared-hosting tenant is never a brand-official
      // path; surface it as a warning even when no curated brand segment is present.
      const onSharedTenant = multiTenantSuffixes.some(root => host.endsWith('.' + root));
      if (onSharedTenant) {
        return formatVerdict({
          status: 'block',
          action: 'warn',
          host,
          site: { name: 'Geteilte Hosting-Domain', domains: [] },
          official: '',
          reason: 'path-impersonation',
          weight: 80,
          decodedHost: decoded.join('.'),
          isIDN: hasUnicode
        });
      }
    }

    return formatVerdict({
      status: 'safe',
      host,
      decodedHost: decoded.join('.'),
      isIDN: hasUnicode
    });
  }

  const Antipisher = Object.freeze({
    classify,
    setWhitelist,
    getWhitelist,
    isWhitelisted,
    punycodeDecode,
    skeleton,
    editDistanceOne: damerauDistanceOne, // backwards compatible export name
    damerauDistanceOne,
    isBitFlip,
    isBaitToken,
    distanceAtMostTwo,
    withinDomain
  });

  globalThis.Antipisher = Antipisher;
  globalThis.VGT_DomainGuard = Antipisher; // backwards compatibility alias

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Antipisher;
  }
})();
