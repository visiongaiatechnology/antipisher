/* Firefox MV3 still supports webRequestBlocking. Main-frame requests are canceled
 * before leaving the browser and replaced with a local warning page.
 */
'use strict';
const api=browser;
const ALLOW_TTL_MS=30000;
const MAX_SECURITY_EVENTS=50;
const bypass=new Map(); // tabId -> { url, expiresAt }
const bypassTimers=new Map(); // tabId -> timeout handle
const engine = globalThis.Antipisher || globalThis.VGT_DomainGuard;

function logSecurityEvent(type, detail) {
  try {
    api.storage.local.get('securityEvents').then(res => {
      const list = Array.isArray(res && res.securityEvents) ? res.securityEvents.slice(-(MAX_SECURITY_EVENTS - 1)) : [];
      list.push({ ts: Date.now(), type: String(type || 'event'), detail: String(detail || '') });
      return api.storage.local.set({ securityEvents: list });
    }).catch(() => {});
  } catch {}
}

function setBypass(tabId, url) {
  const oldT = bypassTimers.get(tabId);
  if (oldT && typeof clearTimeout === 'function') clearTimeout(oldT);
  bypass.set(tabId, { url, expiresAt: Date.now() + ALLOW_TTL_MS });
  if (typeof setTimeout === 'function') {
    const t = setTimeout(() => { bypass.delete(tabId); bypassTimers.delete(tabId); }, ALLOW_TTL_MS);
    if (t && typeof t.unref === 'function') t.unref();
    bypassTimers.set(tabId, t);
  }
  logSecurityEvent('allow-once', 'webrequest-bypass');
}

function clearBypass(tabId) {
  const oldT = bypassTimers.get(tabId);
  if (oldT && typeof clearTimeout === 'function') clearTimeout(oldT);
  bypassTimers.delete(tabId);
  bypass.delete(tabId);
}

if (engine && engine.setWhitelist) {
  api.storage.local.get(['customWhitelist']).then(res => {
    if (Array.isArray(res?.customWhitelist)) engine.setWhitelist(res.customWhitelist);
  }).catch(()=>{});
  if (api.storage.onChanged) {
    api.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.customWhitelist) {
        engine.setWhitelist(changes.customWhitelist.newValue || []);
      }
    });
  }
}
function analyzeRequest(details) {
  // Only preflight GET navigations. Redirecting a POST through guard.html would
  // replay it as GET on proceed (silent form-data loss). POST is covered by the
  // in-page shield where possible; the residual gap is documented in README.
  if (details.method && details.method !== 'GET') return {};
  const allowed=bypass.get(details.tabId);
  if (allowed) {
    clearBypass(details.tabId);
    const targetUrl = typeof allowed === 'string' ? allowed : allowed.url;
    const validTtl = typeof allowed === 'string' || (typeof allowed.expiresAt === 'number' && Date.now() <= allowed.expiresAt);
    if (validTtl && targetUrl === details.url) return {};
  }
  const activeEngine = engine || globalThis.Antipisher || globalThis.VGT_DomainGuard;
  let result;
  try {
    if (!activeEngine || typeof activeEngine.classify !== 'function') throw Error('Detektor-Engine fehlt');
    result = activeEngine.classify(details.url);
  } catch (err) {
    api.storage.local.set({ protectionDegraded: true }).catch(() => {});
    logSecurityEvent('degraded', 'engine-unavailable');
    const gate = api.runtime.getURL('guard.html') + '?url=' + encodeURIComponent(details.url);
    return { redirectUrl: gate };
  }
  if(result.status!=='block')return {};
  api.storage.local.get('blocked').then(({blocked=0})=>api.storage.local.set({blocked:blocked+1})).catch(()=>{});
  logSecurityEvent('block', result.reason || 'phishing-blocked');
  const gate=api.runtime.getURL('guard.html')+'?url='+encodeURIComponent(details.url);
  return {redirectUrl:gate};
}
api.webRequest.onBeforeRequest.addListener(
  analyzeRequest,
  {urls:['http://*/*','https://*/*'],types:['main_frame']},
  ['blocking']
);

const TRACKER_DOMAINS = [
  'google-analytics.com', 'googletagmanager.com', 'doubleclick.net', 'googleadservices.com',
  'adservice.google.com', '2mdn.net', 'googlesyndication.com', 'analytics.google.com',
  'connect.facebook.net', 'pixel.facebook.com', 'an.facebook.com',
  'clarity.ms', 'c.clarity.ms', 'bat.bing.com', 'static.ads-twitter.com', 'analytics.twitter.com',
  'analytics.tiktok.com', 'mc.yandex.ru', 'metrika.yandex.net', 'an.yandex.ru',
  'static.hotjar.com', 'script.hotjar.com', 'vars.hotjar.com',
  'mouseflow.com', 'fullstory.com', 'smartlook.com', 'crazyegg.com', 'luckyorange.com',
  'criteo.com', 'criteo.net', 'static.criteo.net', 'bidder.criteo.com', 'dis.criteo.com',
  'scorecardresearch.com', 'sb.scorecardresearch.com',
  'trc.taboola.com', 'taboola.com', 'widgets.outbrain.com', 'log.outbrain.com', 'outbrain.com',
  'quantserve.com', 'pixel.quantserve.com', 'adnxs.com', 'rubiconproject.com', 'pubmatic.com',
  'openx.net', 'casalemedia.com', 'smartadserver.com', 'adform.net', 'yieldmo.com', 'teads.tv',
  'aax.amazon-adsystem.com', 'c.amazon-adsystem.com', 'fls-na.amazon.com',
  'api.segment.io', 'api.mixpanel.com', 'appboy.com', 'braze.com', 'branch.io', 'app.adjust.com', 'onelink.appsflyer.com',
  'optimizely.com', 'logx.optimizely.com', 'browser.sentry-cdn.com', 'bam.nr-data.net',
  'omtrdc.net', 'demdex.net', 'everesttech.net', 'krxd.net', 'chartbeat.com', 'chartbeat.net', 'newrelic.com',
  'adroll.com', 'adblade.com', 'advertising.com', 'adtechus.com', 'inmobi.com', 'popads.net',
  'popcash.net', 'propellerads.com', 'adsterra.com', 'mgid.com', 'revcontent.com', 'bidvertiser.com',
  'media.net', 'buysellads.com', 'carbonads.net', 'exoclick.com', 'juicyads.com', 'zedo.com',
  'serving-sys.com', 'flashtalking.com', 'moatads.com', 'adcolony.com', 'applovin.com', 'ironsrc.com',
  'vungle.com', 'connatix.com', 'sharethrough.com', 'sovrn.com', 'lijit.com', 'triplelift.com', 'gumgum.com',
  'ads.youtube.com',
  '1688360.cc', 'webshell.lol', 'linkforge.cc', 'ios-hack.icu', '5vobauua3ojpklx.icu',
  'eil786npto9u5bq.icu', 'l7bcsnwc7nzr3uo.icu', 'je4ft3gn8vxudum.icu', 'q1ls1ho9x7wsxlu.icu',
  'p55abnw2pnsz0bo.icu', '1y69gy2mdzaltz1.icu', 'gm38duxoihbmy5o.icu'
];

function isTrackerRequest(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return TRACKER_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  } catch { return false; }
}

const tabTrackerCounts = new Map();

function analyzeTrackerRequest(details) {
  if (!isTrackerRequest(details.url)) return {};
  api.storage.local.get(['trackersBlocked', 'aegisTrackerShield', 'adShieldEnabled']).then(res => {
    if (res?.aegisTrackerShield === false && res?.adShieldEnabled === false) return;
    const count = (res?.trackersBlocked || 0) + 1;
    api.storage.local.set({ trackersBlocked: count }).catch(() => {});
  }).catch(() => {});
  const tabId = details.tabId;
  if (tabId && tabId > 0) {
    const tabCount = (tabTrackerCounts.get(tabId) || 0) + 1;
    tabTrackerCounts.set(tabId, tabCount);
    if (api.action && api.action.setBadgeText) {
      api.action.setBadgeText({ tabId, text: String(tabCount) }).catch(() => {});
      api.action.setBadgeBackgroundColor({ tabId, color: '#0ea5e9' }).catch(() => {});
    }
    if (api.runtime && typeof api.runtime.sendMessage === 'function') {
      api.runtime.sendMessage({ type: 'trackers-updated', tabId, count: tabCount }).catch(() => {});
    }
  }
  return { cancel: true };
}

api.webRequest.onBeforeRequest.addListener(
  analyzeTrackerRequest,
  {urls:['http://*/*','https://*/*'],types:['script','xmlhttprequest','sub_frame','ping','image','other']},
  ['blocking']
);
api.tabs.onRemoved.addListener(tabId => {
  clearBypass(tabId);
  tabTrackerCounts.delete(tabId);
});
// Clear a stale one-shot bypass when the tab navigates away/commits a new URL.
if (api.tabs.onUpdated && typeof api.tabs.onUpdated.addListener === 'function') {
  api.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo && (changeInfo.url || changeInfo.status === 'loading')) {
      clearBypass(tabId);
      tabTrackerCounts.delete(tabId);
    }
  });
}
api.runtime.onMessage.addListener(async(req,sender)=>{
  if(!req) return;
  if (req.type === 'tracker-blocked-event') {
    const tabId = sender.tab?.id;
    if (tabId && tabId > 0) {
      const tabCount = (tabTrackerCounts.get(tabId) || 0) + 1;
      tabTrackerCounts.set(tabId, tabCount);
      if (api.action && api.action.setBadgeText) {
        api.action.setBadgeText({ tabId, text: String(tabCount) }).catch(() => {});
        api.action.setBadgeBackgroundColor({ tabId, color: '#0ea5e9' }).catch(() => {});
      }
      if (api.runtime && typeof api.runtime.sendMessage === 'function') {
        api.runtime.sendMessage({ type: 'trackers-updated', tabId, count: tabCount }).catch(() => {});
      }
    }
    return { ok: true };
  }
  if (req.type === 'getTabTrackerStats') {
    const tabId = req.tabId;
    const count = (tabId && tabTrackerCounts.get(tabId)) || 0;
    return { ok: true, count };
  }
  if(req.type!=='allow-once')return;
  if(!sender.url?.startsWith(api.runtime.getURL('guard.html')))return {ok:false,error:'Ungültiger Aufruf'};
  const {url,tabId}=req;
  const tab=await api.tabs.get(tabId);
  if(!tab.url?.startsWith(api.runtime.getURL('guard.html')))return {ok:false,error:'Tab nicht mehr auf der Schutzseite'};
  try {
    const u=new URL(url);
    if(!['http:','https:'].includes(u.protocol))throw Error('Ungültige Adresse');
    setBypass(tabId,url);
    return {ok:true};
  } catch(e){return {ok:false,error:e.message};}
});
