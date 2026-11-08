param([string]$SiteRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'browser-helper.ps1')
$sitePath = (Resolve-Path -LiteralPath $SiteRoot).Path
$runDirectory = Join-Path $env:TEMP ('lsg-pwa-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runDirectory | Out-Null
$serverPort = Get-Random -Minimum 48000 -Maximum 52000
$debugPort = Get-Random -Minimum 52001 -Maximum 56000
# A local-only HTTP server exercises service workers and same-origin canvas export.
$server = Start-Job -ArgumentList $sitePath,$serverPort -ScriptBlock {
    param($root,$port)
    # Reproduce an older installed app that always serves its cached page.
    $legacyWorker = @'
const LEGACY_CACHE = "lsg-legacy-test";
self.addEventListener("install", event => event.waitUntil(caches.open(LEGACY_CACHE).then(cache => cache.put("index.html", new Response('<!doctype html><html><body><h1 id="legacyPage">Versao anterior</h1><input id="legacyDraft"></body></html>', {headers:{"Content-Type":"text/html"}}))).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => { if(event.request.mode === "navigate") event.respondWith(caches.open(LEGACY_CACHE).then(cache => cache.match("index.html"))); });
'@
    $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,$port)
    $listener.Start()
    try {
        while ($true) {
            if (!$listener.Pending()) { Start-Sleep -Milliseconds 30; continue }
            $client = $listener.AcceptTcpClient()
            $client.ReceiveTimeout = 2000
            $client.SendTimeout = 2000
            try {
                $stream = $client.GetStream()
                $reader = New-Object IO.StreamReader($stream,[Text.Encoding]::ASCII,$false,1024,$true)
                $request = $reader.ReadLine()
                if (!$request) { continue }
                while ($reader.ReadLine()) {}
                $requestPath = [Uri]::UnescapeDataString(($request.Split(' ')[1] -split '\?')[0]).TrimStart('/')
                if (!$requestPath) { $requestPath = 'index.html' }
                # Test under the same project subpath used by GitHub Pages.
                if ($requestPath.StartsWith('los-santos-garage/')) { $requestPath = $requestPath.Substring(18) }
                if (!$requestPath) { $requestPath = 'index.html' }
                $path = [IO.Path]::GetFullPath((Join-Path $root $requestPath))
                $ok = $path.StartsWith($root + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $path -PathType Leaf)
                if ($requestPath -eq '__legacy-sw.js') {
                    $body = [Text.Encoding]::UTF8.GetBytes($legacyWorker)
                    $type = 'text/javascript; charset=utf-8'
                    $status = '200 OK'
                } elseif ($ok) {
                    $body = [IO.File]::ReadAllBytes($path)
                    $type = switch ([IO.Path]::GetExtension($path)) { '.html' {'text/html; charset=utf-8'} '.js' {'text/javascript; charset=utf-8'} '.css' {'text/css; charset=utf-8'} '.webmanifest' {'application/manifest+json'} '.svg' {'image/svg+xml'} '.png' {'image/png'} '.jpg' {'image/jpeg'} default {'application/octet-stream'} }
                    $status = '200 OK'
                } else { $body = [Text.Encoding]::UTF8.GetBytes('Not found'); $type = 'text/plain'; $status = '404 Not Found' }
                $header = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
                $stream.Write($header,0,$header.Length); $stream.Write($body,0,$body.Length)
                $reader.Dispose()
            } catch {} finally { $client.Dispose() }
        }
    } finally { $listener.Stop() }
}
$socket = New-Object Net.WebSockets.ClientWebSocket
$process = $null
try {
    $url = "http://127.0.0.1:$serverPort/los-santos-garage/"
    for ($attempt=0;$attempt -lt 30;$attempt++) { try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3 | Out-Null; break } catch { Start-Sleep -Milliseconds 150 } }
    $arguments = @('--headless=new','--disable-gpu','--no-first-run',"--user-data-dir=$runDirectory/profile", "--remote-debugging-port=$debugPort", 'about:blank')
    $process = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList $arguments -WindowStyle Hidden -PassThru
    for ($attempt=0;$attempt -lt 40;$attempt++) {
        try { $pages = Invoke-RestMethod "http://127.0.0.1:$debugPort/json/list"; $page = $pages | Where-Object {$_.type -eq 'page'} | Select-Object -First 1; if ($page.webSocketDebuggerUrl) {break} } catch {}
        Start-Sleep -Milliseconds 150
    }
    $socket.ConnectAsync([Uri]$page.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    Send-Cdp $socket 'Page.navigate' @{url=$url} | Out-Null
    Wait-BrowserCondition $socket "!!document.querySelector('#collectionProfile') && typeof data !== 'undefined'"
    $worker = Send-Cdp $socket 'Runtime.evaluate' @{expression="Promise.race([navigator.serviceWorker.ready.then(()=>true),new Promise(r=>setTimeout(()=>r(false),20000))])";awaitPromise=$true;returnByValue=$true}
    if (!$worker.result.value) { throw 'Service worker did not install.' }
    $manifest = Send-Cdp $socket 'Page.getAppManifest' @{}
    if ($manifest.errors.Count) { throw ('Invalid app manifest: ' + ($manifest.errors | ConvertTo-Json -Compress)) }
    $install = Send-Cdp $socket 'Page.getInstallabilityErrors' @{}
    if ($install.installabilityErrors.Count) { throw ('App installation requirements failed: ' + ($install.installabilityErrors | ConvertTo-Json -Depth 6 -Compress)) }
    Write-Output 'PASS: manifest and browser installation requirements.'
    $check = Send-Cdp $socket 'Runtime.evaluate' @{expression="(async()=>{data={garages:[{id:'http-g',name:'Fotos offline',type:'garage',capacity:10}],vehicles:[{id:'http-v',name:'Zentorno',catalogId:'zentorno',category:'Super',garageId:'http-g'}]};saveData();const image=await createGarageImage('http-g');const pixels=image.canvas.getContext('2d').getImageData(60,220,230,110).data;let photoPixels=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]!==39||pixels[i+1]!==39||pixels[i+2]!==52)photoPixels++;const cache=await caches.open('lsg-images-v1');await cache.add('assets/map/0-0.png');return image.blob.size>10000 && image.canvas.width===1200 && photoPixels>1000;})()";awaitPromise=$true;returnByValue=$true}
    if (!$check.result.value) { throw ('PNG export with vehicle photos failed: ' + ($check | ConvertTo-Json -Depth 8 -Compress)) }
    Write-Output 'PASS: PNG export with same-origin vehicle photos.'
    Send-Cdp $socket 'Runtime.evaluate' @{expression="navigator.serviceWorker.register('__legacy-sw.js',{scope:'./',updateViaCache:'none'}).then(()=>true)";awaitPromise=$true;returnByValue=$true} | Out-Null
    Wait-BrowserCondition $socket "!!navigator.serviceWorker.controller?.scriptURL.endsWith('/__legacy-sw.js')"
    Send-Cdp $socket 'Page.reload' @{} | Out-Null
    Wait-BrowserCondition $socket "!!document.querySelector('#legacyPage')"
    Send-Cdp $socket 'Runtime.evaluate' @{expression="document.querySelector('#legacyDraft').value='rascunho preservado';navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}).then(()=>true)";awaitPromise=$true;returnByValue=$true} | Out-Null
    Wait-BrowserCondition $socket "!!navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js')"
    $draft = Send-Cdp $socket 'Runtime.evaluate' @{expression="document.querySelector('#legacyDraft')?.value==='rascunho preservado'";returnByValue=$true}
    if (!$draft.result.value) { throw 'Worker migration unexpectedly reloaded an open form.' }
    Send-Cdp $socket 'Page.reload' @{} | Out-Null
    Wait-BrowserCondition $socket "!!document.querySelector('[data-filter=settings]') && typeof data !== 'undefined' && data.vehicles[0]?.id==='http-v'"
    Write-Output 'PASS: an older offline worker is replaced with an open tab, preserving forms and collection data.'
    # Navigation must prefer the deployed HTML even if a stale cached copy exists.
    Send-Cdp $socket 'Runtime.evaluate' @{expression="(async()=>{const keys=await caches.keys();const key=keys.find(k=>k.startsWith('lsg-app-'));const cache=await caches.open(key);const stale=new Response('<html><body id=staleShell>Versao antiga</body></html>',{headers:{'Content-Type':'text/html'}});await cache.put('index.html',stale.clone());await cache.put('./',stale);window.pwaReloadMarker='stale';return true;})()";awaitPromise=$true;returnByValue=$true} | Out-Null
    Send-Cdp $socket 'Page.reload' @{} | Out-Null
    Wait-BrowserCondition $socket "window.pwaReloadMarker !== 'stale' && !!document.querySelector('[data-filter=settings]') && typeof data !== 'undefined'"
    Write-Output 'PASS: online navigation replaces stale cached HTML with the published configuration page.'
    Send-Cdp $socket 'Runtime.evaluate' @{expression="window.pwaReloadMarker = 'online';"} | Out-Null
    Send-Cdp $socket 'Page.reload' @{} | Out-Null
    Wait-BrowserCondition $socket "window.pwaReloadMarker !== 'online' && !!document.querySelector('#collectionProfile') && typeof data !== 'undefined' && !!navigator.serviceWorker.controller"
    Send-Cdp $socket 'Network.enable' @{} | Out-Null
    Send-Cdp $socket 'Network.emulateNetworkConditions' @{offline=$true;latency=0;downloadThroughput=-1;uploadThroughput=-1} | Out-Null
    Send-Cdp $socket 'Runtime.evaluate' @{expression="window.pwaReloadMarker = 'offline';"} | Out-Null
    Send-Cdp $socket 'Page.reload' @{ignoreCache=$true} | Out-Null
    Wait-BrowserCondition $socket "window.pwaReloadMarker !== 'offline' && !!document.querySelector('#collectionProfile') && typeof data !== 'undefined' && data.vehicles.length===1 && data.vehicles[0].id==='http-v' && !!navigator.serviceWorker.controller"
    $map = Send-Cdp $socket 'Runtime.evaluate' @{expression="(async()=>{const img=new Image();img.src='assets/map/0-0.png';try{await img.decode();return img.naturalWidth>0;}catch{return false;}})()";awaitPromise=$true;returnByValue=$true}
    if (!$map.result.value) { throw 'Downloaded map image unavailable offline.' }
    Write-Output 'PASS: service worker under /los-santos-garage/, offline reload and collection persistence.'
    Write-Output 'PASS: downloaded map image decodes without a network connection.'
} finally {
    if ($socket.State -eq [Net.WebSockets.WebSocketState]::Open) {try {Send-Cdp $socket 'Browser.close' @{} | Out-Null} catch {}}
    $socket.Dispose()
    if ($process -and !$process.HasExited) { Stop-Process -Id $process.Id -ErrorAction SilentlyContinue }
    Stop-Job $server -ErrorAction SilentlyContinue
    Remove-Job $server -Force -ErrorAction SilentlyContinue
}
