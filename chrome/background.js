/* Chrome Manifest V3: fail-closed preflight gate for ALL top-level HTTP(S) GET navigations.
 * Warning: DNR redirect/retry changes POST navigation semantics. This is an experimental beta.
 * When disabled, webNavigation is only best-effort and DOES NOT block pre-request.
 */
importScripts('shared/sites.js', 'shared/detector.js');
const RULE_ID=1000;
const ALLOW_START=10001;
let strict=false;
let degraded=false;
let counter=ALLOW_START;
const pending=new Map(); // tabId -> temporary DNR rule ID
const observerBypass=new Map(); // reduced/degraded mode: skip one best-effort redirect
const api=chrome;
function markDegraded(err){
  degraded=true;
  api.storage.local.set({protectionDegraded:true}).catch(()=>{});
  console.warn('Antipisher: DNR preflight unavailable, degraded observer mode active', err&&err.message);
}
function markHealthy(){
  degraded=false;
  api.storage.local.set({protectionDegraded:false}).catch(()=>{});
}
let configPromise = null;
function configure() {
  if (configPromise) return configPromise;
  configPromise = doConfigure().finally(() => {
    configPromise = null;
  });
  return configPromise;
}

async function doConfigure() {
  const { strictMode = false, customWhitelist = [], showBadgeCount = true } = await api.storage.local.get(['strictMode', 'customWhitelist', 'showBadgeCount']);
  strict = strictMode;
  const engine = globalThis.Antipisher || globalThis.VGT_DomainGuard;
  if (engine && engine.setWhitelist && Array.isArray(customWhitelist)) {
    engine.setWhitelist(customWhitelist);
  }
  // Session allow rules can outlive MV3 service-worker instances. Fail closed on startup.
  const oldSessions=await api.declarativeNetRequest.getSessionRules();
  const stale=oldSessions.filter(r=>r.id>=ALLOW_START).map(r=>r.id);
  if(stale.length)await api.declarativeNetRequest.updateSessionRules({removeRuleIds:stale});
  pending.clear();
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
  const old=pending.get(tabId);
  if(old) await api.declarativeNetRequest.updateSessionRules({removeRuleIds:[old]});
  const id=++counter;
  await api.declarativeNetRequest.updateSessionRules({addRules:[{
    id,priority:10,action:{type:'allow'},
    condition:{resourceTypes:['main_frame'],tabIds:[tabId]}
  }]});
  pending.set(tabId,id);
  return true;
}
async function clearOne(tabId){
  const id=pending.get(tabId);if(!id)return;
  pending.delete(tabId);
  try{await api.declarativeNetRequest.updateSessionRules({removeRuleIds:[id]});}catch{}
}
async function countBlock(){
  try{const {blocked=0}=await api.storage.local.get('blocked');await api.storage.local.set({blocked:blocked+1});}catch{}
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
  'static.hotjar.com', 'script.hotjar.com', 'vars.hotjar.com', 'criteo.com', 'criteo.net',
  'scorecardresearch.com', 'trc.taboola.com', 'widgets.outbrain.com', 'quantserve.com',
  'adnxs.com', 'rubiconproject.com', 'pubmatic.com', 'openx.net', 'api.segment.io',
  'api.mixpanel.com', 'appboy.com', 'branch.io', 'app.adjust.com', 'onelink.appsflyer.com',
  'mouseflow.com', 'fullstory.com', 'smartlook.com', 'crazyegg.com', 'luckyorange.com'
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
    api.storage.local.get(['trackersBlocked', 'aegisTrackerShield', 'showBadgeCount']).then(res => {
      if (res?.aegisTrackerShield === false) return;
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

api.tabs.onRemoved.addListener(tabId=>{clearOne(tabId);observerBypass.delete(tabId);tabBlockedCounts.delete(tabId);});
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
  if(observerBypass.get(info.tabId)===info.url){observerBypass.delete(info.tabId);return;}
  const engine = globalThis.Antipisher || globalThis.VGT_DomainGuard;
  const result = engine.classify(info.url);
  if(result.status!=='block')return;
  countBlock();
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
    const tab=await api.tabs.get(tabId);
    if(!tab.url?.startsWith(api.runtime.getURL('guard.html')))throw Error('Tab ist nicht mehr auf der Schutzseite');
    if(!strict || degraded) {observerBypass.set(tabId,url); if(recordBlock)await countBlock(); reply({ok:true}); return; }
    await allowOne(tabId,url);
    if(recordBlock)await countBlock();
    reply({ok:true});
  })().catch(e=>reply({ok:false,error:String(e.message||e)}));
  return true;
});
// Do not await this at module root; events are registered synchronously first.
configure().catch(err=>{markDegraded(err);console.error(err);});
