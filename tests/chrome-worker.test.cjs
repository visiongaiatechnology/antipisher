const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..','chrome');
const delay=(ms=30)=>new Promise(resolve=>setTimeout(resolve,ms));
function fakeEvents(){
 const listeners=[];
 return {listeners,addListener(fn){listeners.push(fn);}};
}
function sandbox(opts={}) {
 const events={installed:fakeEvents(),start:fakeEvents(),changed:fakeEvents(),removed:fakeEvents(),committed:fakeEvents(),before:fakeEvents(),message:fakeEvents()};
 const local={}; const dynamic=[];const session=[];const updated=[];
 const chrome={
  runtime:{id:'fakeid',getURL:(p)=>'chrome-extension://fakeid/'+p,
    onInstalled:events.installed,onStartup:events.start,onMessage:events.message},
  storage:{local:{async get(keys){
    const ks=typeof keys==='string'?[keys]:Array.isArray(keys)?keys:Object.keys(keys);
    return Object.fromEntries(ks.filter(k=>k in local).map(k=>[k,local[k]]));
  },async set(values){Object.assign(local,values);}},onChanged:events.changed},
  tabs:{onRemoved:events.removed,async get(){return {url:'chrome-extension://fakeid/guard.html#https://paypa1.com'};},
    async update(tabId,changes){updated.push({tabId,...changes});}},
  webNavigation:{onCommitted:events.committed,onBeforeNavigate:events.before},
  declarativeNetRequest:{
    async getDynamicRules(){return [...dynamic];},async getSessionRules(){return [...session];},
    async isRegexSupported(){return opts.regexUnsupported?{isSupported:false,reason:'test'}:{isSupported:true};},
    async updateDynamicRules({removeRuleIds=[],addRules=[]}) {
      for(const id of removeRuleIds){const k=dynamic.findIndex(x=>x.id===id);if(k>=0)dynamic.splice(k,1);}
      for(const r of addRules){
        if(dynamic.some(x=>x.id===r.id)) throw new Error('Rule with id '+r.id+' does not have a unique ID.');
      }
      dynamic.push(...addRules);
    },
    async updateSessionRules({removeRuleIds=[],addRules=[]}) {
      for(const id of removeRuleIds){const k=session.findIndex(x=>x.id===id);if(k>=0)session.splice(k,1);}
      for(const r of addRules){
        if(session.some(x=>x.id===r.id)) throw new Error('Rule with id '+r.id+' does not have a unique ID.');
      }
      session.push(...addRules);
    }
  }
 };
 const ctx={chrome,URL,console,Map,Set,Promise};ctx.globalThis=ctx;
 const context=vm.createContext(ctx);
 ctx.importScripts=(...names)=>{
  for(const file of names)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
 };
 vm.runInContext(fs.readFileSync(path.join(root,'background.js'),'utf8'),context);
 return {chrome,local,dynamic,session,updated,events};
}
test('Chrome installs pre-request DNR gate and temporary exact-tab bypass',async()=>{
 const x=sandbox();await delay();
 assert.equal(x.dynamic.length,1);
 assert.equal(x.dynamic[0].action.type,'redirect');
 assert.equal(x.dynamic[0].condition.resourceTypes[0],'main_frame');
 assert.deepEqual(JSON.parse(JSON.stringify(x.dynamic[0].condition.requestMethods)),['get']);
 const messageListener=x.events.message.listeners[0];
 const response=await new Promise(resolve=>messageListener(
  {type:'allow-once',url:'https://paypa1.com/#fragment',tabId:7},
  {url:'chrome-extension://fakeid/guard.html'},resolve));
 assert.equal(response.ok,true);
 assert.equal(x.session.length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(x.session[0].condition.tabIds)),[7]);
 assert.deepEqual(JSON.parse(JSON.stringify(x.session[0].condition.resourceTypes)),['main_frame']);
 assert.equal(x.session[0].condition.regexFilter, undefined,
   'tab-scoped wildcard allow must not depend on an exact-URL regex');
 x.events.committed.listeners[0]({tabId:7,frameId:0,url:'https://paypa1.com/'});
 await delay();
 assert.equal(x.session.length,0,'bypass is cleared on first navigation commit');
});
test('Chrome reduced mode removes DNR and only makes best-effort tab redirect',async()=>{
 const x=sandbox();await delay();
 x.local.strictMode=false;
 for(const f of x.events.changed.listeners)f({strictMode:{newValue:false}},'local');
 await delay();
 assert.equal(x.dynamic.length,0);
 x.events.before.listeners[0]({frameId:0,tabId:5,url:'https://paypa1.com/'});
 await delay();
 assert.equal(x.updated.length,1);
 assert.match(x.updated[0].url,/chrome-extension:\/\/fakeid\/guard\.html/);
});
test('Chrome allows arbitrarily long URLs without the former 1900-char regex blocker',async()=>{
 const x=sandbox();await delay();
 const longUrl='https://example.com/?q='+('a'.repeat(5000));
 const messageListener=x.events.message.listeners[0];
 const response=await new Promise(resolve=>messageListener(
  {type:'allow-once',url:longUrl,tabId:9},
  {url:'chrome-extension://fakeid/guard.html'},resolve));
 assert.equal(response.ok,true);
 assert.equal(x.session.length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(x.session[0].condition.tabIds)),[9]);
});
test('Chrome configure failure marks degraded and falls back to observer mode',async()=>{
 const x=sandbox({regexUnsupported:true});await delay();
 assert.equal(x.local.protectionDegraded,true,'degraded flag must be persisted for the popup');
 assert.equal(x.dynamic.length,0,'no redirect rule may be silently claimed');
 x.events.before.listeners[0]({frameId:0,tabId:11,url:'https://paypa1.com/'});
 await delay();
 assert.equal(x.updated.length,1,'degraded mode must still perform best-effort guard redirect');
 assert.match(x.updated[0].url,/chrome-extension:\/\/fakeid\/guard\.html/);
});
test('Chrome concurrent startup/onInstalled configure calls do not produce duplicate rule errors',async()=>{
 const x=sandbox();await delay();
 await Promise.all([
  ...x.events.installed.listeners.map(l=>l()),
  ...x.events.start.listeners.map(l=>l())
 ]);
 await delay();
 assert.equal(x.dynamic.length,1);
 assert.equal(x.local.protectionDegraded||false,false);
});
