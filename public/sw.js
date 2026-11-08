const CACHE = 'fc-shell-v1';
self.addEventListener('install', event => {
 event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  const root = new URL('./', self.location).href;
  const response = await fetch(root, {cache:'reload'});
  if (!response.ok) throw new Error('Não foi possível guardar a aplicação.');
  const html = await response.clone().text();
  const assets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
   .map(match => new URL(match[1], root))
   .filter(url => url.origin === self.location.origin);
  await cache.put(root, response);
  await cache.addAll([...new Set([...assets.map(url=>url.href), new URL('icon-192.png',root).href, new URL('icon-512.png',root).href])]);
 })());
});
self.addEventListener('activate', event => {
 event.waitUntil((async()=>{
  for(const key of await caches.keys()) if(key.startsWith('fc-shell-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch', event => {
 if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
 event.respondWith((async()=>{
  const cache = await caches.open(CACHE);
  if(event.request.mode === 'navigate') {
   try { return await fetch(event.request); }
   catch { return (await cache.match(new URL('./',self.location).href)) || Response.error(); }
  }
  const cached = await cache.match(event.request, {ignoreVary:true});
  if(cached) return cached;
  const response = await fetch(event.request);
  if(response.ok) await cache.put(event.request,response.clone());
  return response;
 })());
});
