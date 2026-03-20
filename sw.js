/* Dashwey Service Worker v9.5.3 */
const CACHE_NAME='dashwey-v9-5-3',HTML_URL='Dashwey_v82.html',VERSION_URL='version.txt';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll([HTML_URL,VERSION_URL]).catch(()=>{})).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',e=>{if(e.data?.action==='skipWaiting')self.skipWaiting();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.pathname.endsWith(VERSION_URL)){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));return;}
  if(url.pathname.endsWith(HTML_URL)||url.pathname.endsWith('/')){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(res=>{if(res?.status===200){const c=res.clone();caches.open(CACHE_NAME).then(ca=>ca.put(e.request,c));}return res;}).catch(()=>caches.match(e.request)));return;
  }
  e.respondWith(caches.match(e.request).then(cached=>{if(cached)return cached;return fetch(e.request).then(res=>{if(res?.status===200&&res.type!=='opaque'){const c=res.clone();caches.open(CACHE_NAME).then(ca=>ca.put(e.request,c));}return res;});}));
});
