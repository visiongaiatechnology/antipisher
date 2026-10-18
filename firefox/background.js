/* Firefox MV3 still supports webRequestBlocking. Main-frame requests are canceled
 * before leaving the browser and replaced with a local warning page.
 */
'use strict';
const api=browser;
const bypass=new Map(); // tabId -> exactly one URL
function analyzeRequest(details) {
  // Only preflight GET navigations. Redirecting a POST through guard.html would
  // replay it as GET on proceed (silent form-data loss). POST is covered by the
  // in-page shield where possible; the residual gap is documented in README.
  if (details.method && details.method !== 'GET') return {};
  const allowed=bypass.get(details.tabId);
  if(allowed===details.url){bypass.delete(details.tabId);return {};}
  const engine = globalThis.Antipisher || globalThis.VGT_DomainGuard;
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
api.tabs.onRemoved.addListener(tabId=>bypass.delete(tabId));
// Clear a stale one-shot bypass when the tab navigates away/commits a new URL.
if (api.tabs.onUpdated && typeof api.tabs.onUpdated.addListener === 'function') {
  api.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo && (changeInfo.url || changeInfo.status === 'complete')) bypass.delete(tabId);
  });
}
api.runtime.onMessage.addListener(async(req,sender)=>{
  if(!req||req.type!=='allow-once')return;
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
