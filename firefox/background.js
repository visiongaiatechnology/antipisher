/* Firefox MV3 still supports webRequestBlocking. Main-frame requests are canceled
 * before leaving the browser and replaced with a local warning page.
 */
'use strict';
const api=browser;
const bypass=new Map(); // tabId -> exactly one URL
const engine = globalThis.Antipisher || globalThis.VGT_DomainGuard;
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
  if(allowed===details.url){bypass.delete(details.tabId);return {};}
  const result = engine.classify(details.url);
  if(result.status!=='block')return {};
  api.storage.local.get('blocked').then(({blocked=0})=>api.storage.local.set({blocked:blocked+1})).catch(()=>{});
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
  'clarity.ms', 'bat.bing.com', 'static.ads-twitter.com', 'analytics.twitter.com',
  'analytics.tiktok.com', 'mc.yandex.ru', 'metrika.yandex.net', 'static.hotjar.com',
  'script.hotjar.com', 'criteo.com', 'criteo.net', 'scorecardresearch.com',
  'trc.taboola.com', 'taboola.com', 'widgets.outbrain.com', 'outbrain.com', 'quantserve.com',
  'adnxs.com', 'rubiconproject.com', 'pubmatic.com', 'openx.net', 'casalemedia.com',
  'smartadserver.com', 'adform.net', 'yieldmo.com', 'teads.tv', 'aax.amazon-adsystem.com',
  'api.segment.io', 'api.mixpanel.com', 'appboy.com', 'branch.io', 'app.adjust.com', 'onelink.appsflyer.com',
  'adroll.com', 'adblade.com', 'advertising.com', 'adtechus.com', 'inmobi.com', 'popads.net',
  'popcash.net', 'propellerads.com', 'adsterra.com', 'mgid.com', 'revcontent.com', 'bidvertiser.com',
  'media.net', 'buysellads.com', 'carbonads.net', 'exoclick.com', 'juicyads.com', 'zedo.com',
  'serving-sys.com', 'flashtalking.com', 'moatads.com', 'adcolony.com', 'applovin.com', 'ironsrc.com',
  'vungle.com', 'connatix.com', 'sharethrough.com', 'sovrn.com', 'lijit.com', 'triplelift.com', 'gumgum.com'
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
    api.runtime.sendMessage({ type: 'trackers-updated', tabId, count: tabCount }).catch(() => {});
  }
  return { cancel: true };
}

api.webRequest.onBeforeRequest.addListener(
  analyzeTrackerRequest,
  {urls:['http://*/*','https://*/*'],types:['script','xmlhttprequest','sub_frame','ping','image','other']},
  ['blocking']
);
api.tabs.onRemoved.addListener(tabId => {
  bypass.delete(tabId);
  tabTrackerCounts.delete(tabId);
});
// Clear a stale one-shot bypass when the tab navigates away/commits a new URL.
if (api.tabs.onUpdated && typeof api.tabs.onUpdated.addListener === 'function') {
  api.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo && (changeInfo.url || changeInfo.status === 'loading')) {
      bypass.delete(tabId);
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
      api.runtime.sendMessage({ type: 'trackers-updated', tabId, count: tabCount }).catch(() => {});
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
    bypass.set(tabId,url);
    return {ok:true};
  } catch(e){return {ok:false,error:e.message};}
});
