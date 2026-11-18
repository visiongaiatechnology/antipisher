/* Chrome Manifest V3: fail-closed preflight gate for ALL top-level HTTP(S) GET navigations.
 * Warning: DNR redirect/retry changes POST navigation semantics. This is an experimental beta.
 * When disabled, webNavigation is only best-effort and DOES NOT block pre-request.
 */
importScripts('shared/sites.js', 'shared/detector.js');
const RULE_ID=1000;
const ALLOW_START=10001;
const ALLOW_TTL_MS=30000;
const MAX_SECURITY_EVENTS=50;
let strict=false;
let degraded=false;
let counter=ALLOW_START;
const pending=new Map(); // tabId -> temporary DNR rule ID
const pendingTimers=new Map(); // tabId -> TTL timeout handle
const observerBypass=new Map(); // reduced/degraded mode: skip one best-effort redirect
const observerTimers=new Map(); // tabId -> TTL timeout handle for observerBypass
const api=chrome;
function logSecurityEvent(type, detail) {
  try {
    api.storage.local.get('securityEvents').then(res => {
      const list = Array.isArray(res && res.securityEvents) ? res.securityEvents.slice(-(MAX_SECURITY_EVENTS - 1)) : [];
      list.push({ ts: Date.now(), type: String(type || 'event'), detail: String(detail || '') });
      return api.storage.local.set({ securityEvents: list });
    }).catch(() => {});
  } catch {}
}
function markDegraded(err){
  degraded=true;
  api.storage.local.set({protectionDegraded:true}).catch(()=>{});
  logSecurityEvent('degraded', (err && err.message) ? 'dnr-preflight-unavailable' : 'degraded');
  console.warn('Antipisher: DNR preflight unavailable, degraded observer mode active', err&&err.message);
}
function markHealthy(){
  degraded=false;
  api.storage.local.set({protectionDegraded:false}).catch(()=>{});
  logSecurityEvent('healthy', strict ? 'strict-preflight' : 'standard-observer');
}
let configPromise = null;
let configPending = false;
function configure() {
  if (configPromise) {
    configPending = true;
    return configPromise;
  }
  configPromise = (async () => {
    do {
      configPending = false;
      await doConfigure();
    } while (configPending);
  })().finally(() => {
    configPromise = null;
  });
  return configPromise;
}

async function doConfigure() {
  // Session allow rules can outlive MV3 service-worker instances. Always purge on startup first (fail-closed).
  try {
    const oldSessions = await api.declarativeNetRequest.getSessionRules();
    const stale = oldSessions.filter(r => r.id >= ALLOW_START).map(r => r.id);
    if (stale.length) await api.declarativeNetRequest.updateSessionRules({ removeRuleIds: stale });
  } catch {}
  pending.clear();
  const { strictMode = false, customWhitelist = [], showBadgeCount = true } = await api.storage.local.get(['strictMode', 'customWhitelist', 'showBadgeCount']);
  strict = strictMode;
  const engine = globalThis.Antipisher || globalThis.VGT_DomainGuard;
  if (engine && engine.setWhitelist && Array.isArray(customWhitelist)) {
    engine.setWhitelist(customWhitelist);
  }
  if (api.declarativeNetRequest && api.declarativeNetRequest.setExtensionActionOptions) {
    try { await api.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: showBadgeCount !== false }); } catch {}
  }
  if (api.action && api.action.setBadgeBackgroundColor) {
    try { await api.action.setBadgeBackgroundColor({ color: '#0ea5e9' }); } catch {}
  }
  if(!strict){
    await api.declarativeNetRequest.updateDynamicRules({removeRuleIds:[RULE_ID]});
    markHealthy();
    return;
  }
  const regex='^(https?://.+)$';
  const supported=await api.declarativeNetRequest.isRegexSupported({regex,requireCapturing:true});
  if(!supported.isSupported) throw Error('DNR regex unsupported: '+supported.reason);
  const rule = {
    id: RULE_ID,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { regexSubstitution: api.runtime.getURL('guard.html') + '#\\1' }
    },
    condition: {
      regexFilter: regex,
      resourceTypes: ['main_frame'],
      requestMethods: ['get']
    }
  };
  await api.declarativeNetRequest.updateDynamicRules({removeRuleIds:[RULE_ID],addRules:[rule]});
  markHealthy();
}
// Retry exact original URL in one tab. The temporary allow rule is scoped to the
// tab (all main_frame requests) and removed on the first commit. This replaces the
// former exact-URL regex allow rule, which could not represent URLs >1900 chars
// and caused the long-URL availability blocker.
async function allowOne(tabId,url) {
  const parsed=new URL(url);
  if(!['http:','https:'].includes(parsed.protocol))throw Error('Ungültige Adresse');
  const oldTimer=pendingTimers.get(tabId);
  if(oldTimer && typeof clearTimeout==='function') clearTimeout(oldTimer);
  pendingTimers.delete(tabId);
  const old=pending.get(tabId);
  if(old) await api.declarativeNetRequest.updateSessionRules({removeRuleIds:[old]});
  const id=++counter;
  await api.declarativeNetRequest.updateSessionRules({addRules:[{
    id,priority:10,action:{type:'allow'},
    condition:{resourceTypes:['main_frame'],tabIds:[tabId]}
  }]});
  pending.set(tabId,id);
  if(typeof setTimeout==='function'){
    const t=setTimeout(()=>{clearOne(tabId);},ALLOW_TTL_MS);
    if(t && typeof t.unref==='function') t.unref();
    pendingTimers.set(tabId,t);
  }
  logSecurityEvent('allow-once','strict-session-rule');
  return true;
}
async function clearOne(tabId){
  const oldTimer=pendingTimers.get(tabId);
  if(oldTimer && typeof clearTimeout==='function') clearTimeout(oldTimer);
  pendingTimers.delete(tabId);
  const id=pending.get(tabId);if(!id)return;
  pending.delete(tabId);
  try{await api.declarativeNetRequest.updateSessionRules({removeRuleIds:[id]});}catch{}
}
function setObserverBypass(tabId,url){
  const oldTimer=observerTimers.get(tabId);
  if(oldTimer && typeof clearTimeout==='function') clearTimeout(oldTimer);
  observerBypass.set(tabId,url);
  if(typeof setTimeout==='function'){
    const t=setTimeout(()=>{observerBypass.delete(tabId);observerTimers.delete(tabId);},ALLOW_TTL_MS);
    if(t && typeof t.unref==='function') t.unref();
    observerTimers.set(tabId,t);
  }
  logSecurityEvent('allow-once','observer-bypass');
}
function clearObserverBypass(tabId){
  const oldTimer=observerTimers.get(tabId);
  if(oldTimer && typeof clearTimeout==='function') clearTimeout(oldTimer);
  observerTimers.delete(tabId);
  observerBypass.delete(tabId);
}
async function countBlock(reason){
  try{const {blocked=0}=await api.storage.local.get('blocked');await api.storage.local.set({blocked:blocked+1});}catch{}
  logSecurityEvent('block',reason||'phishing-blocked');
}
api.runtime.onInstalled.addListener(()=>{configure().catch(err=>{markDegraded(err);console.error(err);});});
api.runtime.onStartup.addListener(()=>{configure().catch(err=>{markDegraded(err);console.error(err);});});
api.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.strictMode || changes.showBadgeCount) configure().catch(err => { markDegraded(err); console.error(err); });
    if (changes.customWhitelist) {
      const engine = globalThis.Antipisher || globalThis.VGT_DomainGuard;
      if (engine && engine.setWhitelist) {
        engine.setWhitelist(changes.customWhitelist.newValue || []);
      }
    }
  }
});
const tabBlockedCounts = new Map();
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

if (api.webRequest && api.webRequest.onBeforeRequest) {
  api.webRequest.onBeforeRequest.addListener(details => {
    if (!isTrackerRequest(details.url)) return;
    api.storage.local.get(['trackersBlocked', 'aegisTrackerShield', 'adShieldEnabled', 'showBadgeCount']).then(res => {
      if (res?.aegisTrackerShield === false && res?.adShieldEnabled === false) return;
      const total = (res?.trackersBlocked || 0) + 1;
      api.storage.local.set({ trackersBlocked: total }).catch(() => {});
      const tabId = details.tabId;
      if (tabId && tabId > 0) {
        const count = (tabBlockedCounts.get(tabId) || 0) + 1;
        tabBlockedCounts.set(tabId, count);
        if (res?.showBadgeCount !== false && api.action && api.action.setBadgeText) {
          api.action.setBadgeText({ tabId, text: String(count) }).catch(() => {});
          api.action.setBadgeBackgroundColor({ tabId, color: '#0ea5e9' }).catch(() => {});
        }
        api.runtime.sendMessage({ type: 'trackers-updated', tabId, count }).catch(() => {});
      }
    }).catch(() => {});
  }, { urls: ['http://*/*', 'https://*/*'] });
}

api.tabs.onRemoved.addListener(tabId=>{clearOne(tabId);clearObserverBypass(tabId);tabBlockedCounts.delete(tabId);});
api.webNavigation.onCommitted.addListener(info=>{
  if(info.frameId!==0)return;
  if(pending.has(info.tabId))clearOne(info.tabId);
  tabBlockedCounts.set(info.tabId, 0);
});
api.webNavigation.onBeforeNavigate.addListener(info=>{
  // In degraded mode (DNR preflight could not be installed) fall back to the
  // best-effort observer instead of silently doing nothing.
  if(info.frameId!==0||info.tabId<0)return;
  if(strict && !degraded)return;
  if(observerBypass.has(info.tabId)){
    const allowedUrl=observerBypass.get(info.tabId);
    clearObserverBypass(info.tabId);
    if(allowedUrl===info.url)return;
  }
  const engine = globalThis.Antipisher || globalThis.VGT_DomainGuard;
  let result;
  try {
    if(!engine || typeof engine.classify !== 'function') throw Error('Detektor-Engine fehlt');
    result = engine.classify(info.url);
  } catch (err) {
    markDegraded(err);
    api.tabs.update(info.tabId,{url:api.runtime.getURL('guard.html')+'?url='+encodeURIComponent(info.url)}).catch(()=>{});
    return;
  }
  if(result.status!=='block')return;
  countBlock(result.reason);
  api.tabs.update(info.tabId,{url:api.runtime.getURL('guard.html')+'?url='+encodeURIComponent(info.url)}).catch(()=>{});
});
api.runtime.onMessage.addListener((request,sender,reply)=>{
  if(!request)return;
  if (request.type === 'tracker-blocked-event') {
    const tabId = sender.tab?.id;
    if (tabId && tabId > 0) {
      const count = (tabBlockedCounts.get(tabId) || 0) + 1;
      tabBlockedCounts.set(tabId, count);
      api.storage.local.get('showBadgeCount').then(({ showBadgeCount = true } = {}) => {
        if (showBadgeCount !== false && api.action && api.action.setBadgeText) {
          api.action.setBadgeText({ tabId, text: String(count) }).catch(()=>{});
          api.action.setBadgeBackgroundColor({ tabId, color: '#0ea5e9' }).catch(()=>{});
        }
        api.runtime.sendMessage({ type: 'trackers-updated', tabId, count }).catch(() => {});
      }).catch(()=>{});
    }
    return;
  }
  if (request.type === 'getTabTrackerStats') {
    const tabId = request.tabId;
    const count = (tabId && tabBlockedCounts.get(tabId)) || 0;
    reply({ ok: true, count });
    return;
  }
  if(request.type!=='allow-once')return;
  (async()=>{
    if(!sender.url?.startsWith(api.runtime.getURL('guard.html')))
      throw Error('Freigabe nur von der Schutzseite');
    const {url,tabId,recordBlock=false}=request;
    const parsed=new URL(url);
    if(!['http:','https:'].includes(parsed.protocol))throw Error('Ungültige Adresse');
    const tab=await api.tabs.get(tabId);
    if(!tab.url?.startsWith(api.runtime.getURL('guard.html')))throw Error('Tab ist nicht mehr auf der Schutzseite');
    if(!strict || degraded) {setObserverBypass(tabId,url); if(recordBlock)await countBlock('strict-guard'); reply({ok:true}); return; }
    await allowOne(tabId,url);
    if(recordBlock)await countBlock('strict-guard');
    reply({ok:true});
  })().catch(e=>reply({ok:false,error:String(e.message||e)}));
  return true;
});
// Do not await this at module root; events are registered synchronously first.
configure().catch(err=>{markDegraded(err);console.error(err);});
