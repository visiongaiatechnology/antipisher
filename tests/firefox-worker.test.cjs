const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..','firefox');
function fEvents(){const listeners=[];return {listeners,addListener(fn){listeners.push(fn);}};}
function fakeFirefox(){
 const events={before:fEvents(),removed:fEvents(),message:fEvents()};let local={};
 const browser={
  runtime:{getURL:p=>'moz-extension://fake/'+p,onMessage:events.message},
  webRequest:{onBeforeRequest:events.before},
  tabs:{onRemoved:events.removed,async get(){return {url:'moz-extension://fake/guard.html?url=https%3A%2F%2Fpaypa1.com'};}},
  storage:{local:{async get(key){return {[key]:local[key]};},async set(values){Object.assign(local,values);}}}
 };
 const c={browser,URL,console,Map,Promise};c.globalThis=c;
 const context=vm.createContext(c);
 for(const f of ['shared/sites.js','shared/detector.js','background.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context);
 return {events,browser,local};
}
test('Firefox aborts suspect main frame with local warning and allows exact URL once',async()=>{
 const {events}=fakeFirefox();
 const listener=events.before.listeners[0];
 const clean=listener({url:'https://paypal.com/',tabId:7});
 assert.equal(JSON.stringify(clean),'{}');
 const blocked=listener({url:'https://paypa1.com/',tabId:7});
 assert.match(blocked.redirectUrl,/^moz-extension:\/\/fake\/guard\.html/);
 const confirm=await events.message.listeners[0]({type:'allow-once',url:'https://paypa1.com/',tabId:7},
   {url:'moz-extension://fake/guard.html?url=xx'});
 assert.equal(confirm.ok,true);
 const once=listener({url:'https://paypa1.com/',tabId:7});
 assert.equal(JSON.stringify(once),'{}');
 assert.ok(listener({url:'https://paypa1.com/',tabId:7}).redirectUrl,
   'second attempt is blocked again');
});

test('Firefox manifest contains web_accessible_resources and data_collection_permissions', () => {
 const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
 assert.equal(manifest.manifest_version, 3);
 assert.ok(Array.isArray(manifest.web_accessible_resources), 'web_accessible_resources must be array');
 const hasGuard = manifest.web_accessible_resources.some(entry =>
   Array.isArray(entry.resources) && entry.resources.includes('guard.html')
 );
 assert.ok(hasGuard, 'guard.html must be in web_accessible_resources for webRequest redirect');
 assert.equal(manifest.browser_specific_settings?.gecko?.data_collection_permissions?.required?.[0], 'none');
});
