/* The deploy script injects a content hash and the exact versioned shell URLs. */
const VERSION = "development";
const CACHE = `lsg-app-${VERSION}`;
const SHELL = ["./", "index.html", "styles.css", "los-santos.css", "property-explorer.css", "collection-tools.css", "collection-plus.css", "workshop-themes.css", "workshop-themes.js", "app.js", "collection-storage.js", "collection-plus.js", "collection-tools.js", "catalog-ui.js", "wheels-ui.js", "vehicle-details.js", "garage-view.js", "garage-themes.js", "property-catalog.js", "property-explorer.js", "manifest.webmanifest", "app-icon.svg", "favicon.svg", "assets/vehicle-catalog.js", "assets/vehicle-reference.js", "assets/wheel-catalog.js", "assets/vehicle-images.js", "assets/interior-images.js", "assets/property-locations.js", "assets/property-images.js", "assets/logo-los-santos-customs.png", "assets/garage-v-logo.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new Request(path,{cache:"reload"})))).then(() => self.skipWaiting()));
  // Activate the complete new shell even when an older tab is still open.
  // Existing pages keep their forms intact; navigation loads the new release.
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("lsg-app-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url), scope = new URL(self.registration.scope);
  if (event.request.method !== "GET" || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Prefer the published page online. A previous offline shell must never hide
    // a deployed menu change indefinitely. Offline navigation uses the saved page.
    if(event.request.mode === "navigate") {
      try {
        const response = await fetch(event.request, {cache:"no-store"});
        if(response.ok) {
          await cache.put("index.html", response.clone());
          return response;
        }
      } catch {}
      const offline = await cache.match("index.html");
      if(offline) return offline;
      return Response.error();
    }
    // Scripts/styles use versioned URLs. Images are cached on use.
    const cached = await cache.match(event.request);
    if(cached) return cached;
    const images = await caches.open("lsg-images-v1");
    const savedImage = await images.match(event.request);
    if(savedImage) return savedImage;
    const response = await fetch(event.request);
    if(response.ok && response.type === "basic") await cache.put(event.request,response.clone());
    return response;
  })());
});
