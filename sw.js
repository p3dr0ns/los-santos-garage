/* The deploy script injects a content hash and the exact versioned shell URLs. */
const VERSION = "development";
const CACHE = `lsg-app-${VERSION}`;
const SHELL = ["./", "index.html", "styles.css", "los-santos.css", "property-explorer.css", "collection-tools.css", "collection-plus.css", "app.js", "collection-storage.js", "collection-plus.js", "collection-tools.js", "catalog-ui.js", "wheels-ui.js", "vehicle-details.js", "garage-view.js", "garage-themes.js", "property-catalog.js", "property-explorer.js", "manifest.webmanifest", "app-icon.svg", "favicon.svg", "assets/vehicle-catalog.js", "assets/vehicle-reference.js", "assets/wheel-catalog.js", "assets/vehicle-images.js", "assets/interior-images.js", "assets/property-locations.js", "assets/property-images.js", "assets/logo-los-santos-customs.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  // Updates wait until all old tabs close, so scripts and data stay compatible.
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("lsg-app-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url), scope = new URL(self.registration.scope);
  if (event.request.method !== "GET" || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Serve a coherent shell for this worker version. Images are cached on use.
    const cached = await cache.match(event.request);
    if(cached) return cached;
    const images = await caches.open("lsg-images-v1");
    const savedImage = await images.match(event.request);
    if(savedImage) return savedImage;
    if(event.request.mode === "navigate") return (await cache.match("index.html")) || fetch(event.request);
    const response = await fetch(event.request);
    if(response.ok && response.type === "basic") await cache.put(event.request,response.clone());
    return response;
  })());
});
