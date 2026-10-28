const CACHE_NAME='tamreenak-cache-v2';
const CORE=[
 './','./index.html','./profile.html','./exercises.html','./plan.html','./calories.html','./posture.html','./progress.html','./coach.html','./settings.html',
 './manifest.webmanifest','./assets/style.css','./assets/app.js','./assets/exercises.json','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tamreenak-cache-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/.netlify/functions/')||url.pathname.includes('/api/'))return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const response=await fetch(req);
    if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(req,response.clone());}
    return response;
   }catch{
    const cache=await caches.open(CACHE_NAME);
    const exact=await cache.match(req);if(exact)return exact;
    const scopeUrl=new URL(self.registration.scope);
    let relative=url.pathname.startsWith(scopeUrl.pathname)?url.pathname.slice(scopeUrl.pathname.length):'';
    relative=relative.split('/').filter(Boolean).pop()||'index.html';
    const byPath=await cache.match(new URL(relative,scopeUrl).href);if(byPath)return byPath;
    return (await cache.match(new URL('index.html',scopeUrl).href))||(await cache.match(new URL('./',scopeUrl).href));
   }
  })());
  return;
 }
 event.respondWith((async()=>{
  const cached=await caches.match(req);if(cached)return cached;
  try{
   const response=await fetch(req);
   if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(req,response.clone());}
   return response;
  }catch{return cached||Response.error();}
 })());
});
