param([string]$SiteRoot = (Split-Path -Parent $PSScriptRoot), [switch]$Documentation)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'project-check.ps1') -SiteRoot $SiteRoot
& (Join-Path $PSScriptRoot 'reference-check.ps1')
& (Join-Path $PSScriptRoot 'image-check.ps1')
& (Join-Path $PSScriptRoot 'interior-check.ps1')
& (Join-Path $PSScriptRoot 'property-map-check.ps1')
& (Join-Path $PSScriptRoot 'property-image-check.ps1') -SiteRoot $SiteRoot
$browserPath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (!(Test-Path -LiteralPath $browserPath)) { throw 'Google Chrome not found at its default path.' }
$sitePath = (Resolve-Path -LiteralPath $SiteRoot).Path
$baseUri = ([Uri]($sitePath + '\')).AbsoluteUri
$html = [IO.File]::ReadAllText((Join-Path $sitePath 'index.html')).Replace('<head>', '<head><base href="' + $baseUri + '"><script>window.projectRuntimeErrors=[];addEventListener("error",event=>{if(event.message)projectRuntimeErrors.push(event.message)});addEventListener("unhandledrejection",event=>projectRuntimeErrors.push(String(event.reason)));</script>')
$testScript = ([Uri](Join-Path $PSScriptRoot 'app-check.js')).AbsoluteUri
$collectionScript = ([Uri](Join-Path $PSScriptRoot 'collection-check.js')).AbsoluteUri
$plusScript = ([Uri](Join-Path $PSScriptRoot 'collection-plus-check.js')).AbsoluteUri
$html = $html.Replace('</body>', '<script src="' + $collectionScript + '"></script><script src="' + $plusScript + '"></script><script src="' + $testScript + '"></script></body>')
$runDirectory = Join-Path $env:TEMP ('lsg-check-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runDirectory | Out-Null
$testPage = Join-Path $runDirectory 'check.html'
[IO.File]::WriteAllText($testPage, $html, (New-Object Text.UTF8Encoding($false)))
$script:messageId = 0
. (Join-Path $PSScriptRoot 'browser-helper.ps1')
$viewportIndex = 0
function Save-DocumentationScreenshot([string]$name) {
    if (!$Documentation -or $tag -ne '1440-1100') { return }
    $directory = Join-Path $PSScriptRoot '../docs/images'
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    Send-Cdp $socket 'Runtime.evaluate' @{ expression = "Promise.race([Promise.all(Array.from(document.querySelectorAll('img')).filter(img=>{const r=img.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0;}).map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,5000))])"; awaitPromise = $true } | Out-Null
    $picture = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'jpeg'; quality = 82 }
    [IO.File]::WriteAllBytes((Join-Path $directory "$name.jpg"), [Convert]::FromBase64String($picture.data))
}
foreach ($viewport in @('1440,1100', '900,1000', '360,900')) {
    $tag = $viewport.Replace(',', '-')
    $port = 47841 + $viewportIndex
    $viewportIndex++
    $profilePath = Join-Path $runDirectory "profile-$tag"
    $arguments = @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=$profilePath", "--remote-debugging-port=$port", "--window-size=$viewport", 'about:blank')
    $process = Start-Process -FilePath $browserPath -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $runDirectory "$tag.log")
    $socket = New-Object Net.WebSockets.ClientWebSocket
    try {
        $page = $null
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            try { $pages = Invoke-RestMethod "http://127.0.0.1:$port/json/list"; $page = $pages | Where-Object { $_.type -eq 'page' } | Select-Object -First 1; if ($page.webSocketDebuggerUrl) { break } } catch { }
            Start-Sleep -Milliseconds 150
        }
        if (!$page.webSocketDebuggerUrl) { throw 'Browser debugging endpoint did not start.' }
        $socket.ConnectAsync([Uri]$page.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
        $dimensions = $viewport.Split(',')
        Send-Cdp $socket 'Emulation.setDeviceMetricsOverride' @{ width = [int]$dimensions[0]; height = [int]$dimensions[1]; deviceScaleFactor = 1; mobile = $false } | Out-Null
        Send-Cdp $socket 'Page.navigate' @{ url = ([Uri]$testPage).AbsoluteUri } | Out-Null
        $expression = "new Promise(resolve => { const check = () => { const result = document.querySelector('#app-check-result'); if(result) { clearInterval(timer); resolve(result.textContent); } }; const timer = setInterval(check, 50); check(); setTimeout(() => { clearInterval(timer); resolve('TIMEOUT'); }, 25000); })"
        $result = Send-Cdp $socket 'Runtime.evaluate' @{ expression = $expression; awaitPromise = $true; returnByValue = $true }
        $value = $result.result.value
        $actualViewport = Send-Cdp $socket 'Runtime.evaluate' @{ expression = 'innerWidth'; returnByValue = $true }
        if ($actualViewport.result.value -ne [int]$dimensions[0]) { throw "Unexpected viewport width: $($actualViewport.result.value)" }
        Write-Output "$tag $value"
        $screenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "$tag.png"), [Convert]::FromBase64String($screenshot.data))
        $dom = Send-Cdp $socket 'Runtime.evaluate' @{ expression = 'document.documentElement.outerHTML'; returnByValue = $true }
        [IO.File]::WriteAllText((Join-Path $runDirectory "$tag.html"), $dom.result.value)
        if ($value -notlike 'PASS:*') { throw "App tests failed. Inspect $runDirectory" }
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "dismissToast(); window.scrollTo(0,0);" } | Out-Null
        Save-DocumentationScreenshot 'visao-geral'
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "data.vehicles.push({id:'preview-sentinel',catalogId:'sentinel5',name:'Sentinel GTS',category:'Esportivo',garageId:'g1'}); openVehicleDetails('preview-sentinel'); document.querySelector('#detailsMechanical').scrollIntoView({block:'start'});" } | Out-Null
        $performanceScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "performance-$tag.png"), [Convert]::FromBase64String($performanceScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "data.vehicles.pop();" } | Out-Null
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "closeVehiclePortfolio(); openVehicleDialog(); document.querySelector('#vehicleName').value='sentinel'; document.querySelector('#vehicleName').dispatchEvent(new Event('input')); document.querySelector('#vehicleName').focus();" } | Out-Null
        $catalogScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "catalog-$tag.png"), [Convert]::FromBase64String($catalogScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "closeCatalogSuggestions(); document.querySelector('#vehicleCustomizationDetails').open=true; document.querySelector('#vehicleWheelType').value='street'; document.querySelector('#vehicleWheelType').dispatchEvent(new Event('change')); document.querySelector('#vehicleWheels').value=wheelGroup('street').wheels[0].name; document.querySelector('.wheel-fields').scrollIntoView({block:'center'});" } | Out-Null
        $wheelScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "wheels-$tag.png"), [Convert]::FromBase64String($wheelScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('#vehicleCustomizationDetails').open=false; document.querySelector('#vehicleName').value='Sentinel GTS'; selectedCatalogModelId='sentinel5'; document.querySelector('#vehicleCategory').value='Esportivo'; document.querySelector('#vehicleBrand').value='Übermacht'; updateVehiclePreview(); document.querySelector('#vehicleDialog').scrollTop=0;" } | Out-Null
        $vehicleScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "vehicle-form-$tag.png"), [Convert]::FromBase64String($vehicleScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('#vehicleDialog').close(); openGarageDialog('g1'); document.querySelector('#garageTags').value='JDM, Drift'; document.querySelector('#garageTags').scrollIntoView({block:'center'});" } | Out-Null
        $garageScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "garage-form-$tag.png"), [Convert]::FromBase64String($garageScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('#garageDialog').close(); data.vehicles.push({id:'map-preview-a',name:'Sentinel GTS',catalogId:'sentinel5',category:'Esportivo',garageId:'g1',parking:{garageId:'g1',slot:0}},{id:'map-preview-b',name:'Cypher',catalogId:'cypher',category:'Esportivo',garageId:'g1',parking:{garageId:'g1',slot:5}},{id:'map-preview-c',name:'Rhinehart',catalogId:'rhinehart',category:'Sedã',garageId:'g1',parking:{garageId:'g1',slot:7}}); document.querySelector('[data-filter=garages]').click(); document.querySelector('.garage-card[data-garage-id=g1] .garage-open').click(); selectParkingSlot(0);" } | Out-Null
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "Promise.all(Array.from(document.querySelectorAll('#garageRoom img'),img=>img.decode().catch(()=>{})))"; awaitPromise = $true } | Out-Null
        $mapScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "garage-map-$tag.png"), [Convert]::FromBase64String($mapScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "dismissToast(); data.garages.push({id:'interior-preview',name:'Oficina de Tuning',type:'auto_shop_property',capacity:10,interiorStyle:'route-68'}); data.vehicles.push({id:'interior-car-a',name:'Jester RR',catalogId:'jester4',category:'Esportivo',garageId:'interior-preview'},{id:'interior-car-b',name:'Sultan RS',catalogId:'sultanrs',category:'Super',garageId:'interior-preview'}); document.querySelector('[data-filter=garages]').click(); document.querySelector('.garage-card[data-garage-id=interior-preview] .garage-open').click(); document.querySelector('#garageRoom').scrollIntoView({block:'start'});" } | Out-Null
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "Promise.all(Array.from(document.querySelectorAll('#garageRoom img'),img=>img.decode().catch(()=>{})))"; awaitPromise = $true } | Out-Null
        $routeScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "route-68-$tag.png"), [Convert]::FromBase64String($routeScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('#garageDecoration').value='super-chibi'; document.querySelector('#garageDecoration').dispatchEvent(new Event('change',{bubbles:true})); dismissToast();" } | Out-Null
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "Promise.all(Array.from(document.querySelectorAll('#garageRoom img'),img=>img.decode().catch(()=>{})))"; awaitPromise = $true } | Out-Null
        $chibiScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "super-chibi-$tag.png"), [Convert]::FromBase64String($chibiScreenshot.data))
        Save-DocumentationScreenshot 'garagem'
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "openGarageDialog('interior-preview'); document.querySelector('#garageInteriorField').scrollIntoView({block:'start'});" } | Out-Null
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "Promise.all(Array.from(document.querySelectorAll('#garageInteriorPicker img'),img=>img.decode().catch(()=>{})))"; awaitPromise = $true } | Out-Null
        $pickerScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "decoration-picker-$tag.png"), [Convert]::FromBase64String($pickerScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('#garageDialog').close(); dismissToast(); Object.assign(propertyMapState,{query:'',type:'all',owned:false}); document.querySelector('[data-filter=map]').click(); selectMapProperty(PROPERTY_MAP.locations.find(location=>location.name==='Eclipse Towers').id,true); document.querySelector('#mapSection').scrollIntoView({block:'start'});" } | Out-Null
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))"; awaitPromise = $true } | Out-Null
        $propertyScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "property-map-$tag.png"), [Convert]::FromBase64String($propertyScreenshot.data))
        Save-DocumentationScreenshot 'mapa'
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "openEyefind();" } | Out-Null
        $eyefindScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "eyefind-$tag.png"), [Convert]::FromBase64String($eyefindScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('[data-eyefind-dealer=foreclosures]').click(); document.querySelector('[data-eyefind-type=auto_shop_property]').click();" } | Out-Null
        $dealerScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "eyefind-properties-$tag.png"), [Convert]::FromBase64String($dealerScreenshot.data))
        Save-DocumentationScreenshot 'eyefind'
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('#eyefindDialog').close(); data.wishlist=['adder','sentinel5']; document.querySelector('#wishlistModel').value=''; document.querySelector('#openWishlist').click(); dismissToast();" } | Out-Null
        Save-DocumentationScreenshot 'desejos'
        $toolScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "wishlist-$tag.png"), [Convert]::FromBase64String($toolScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('#wishlistDialog').close(); document.querySelector('#compareModelA').value='Zentorno'; document.querySelector('#compareModelB').value='Adder'; document.querySelector('#openCompare').click();" } | Out-Null
        Save-DocumentationScreenshot 'comparacao'
        $toolScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "comparison-$tag.png"), [Convert]::FromBase64String($toolScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('#compareDialog').close(); openBatchMove(); filteredBatchVehicles().slice(0,2).forEach(vehicle=>batchSelection.add(vehicle.id)); renderBatchVehicles(); document.querySelector('#batchDestination').value='g2'; updateBatchSummary();" } | Out-Null
        Save-DocumentationScreenshot 'transferencia'
        $toolScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "batch-move-$tag.png"), [Convert]::FromBase64String($toolScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('#batchMoveDialog').close(); document.querySelector('[data-filter=settings]').click(); const previewFile=new File([JSON.stringify(makeCollectionBackup())],'minha-colecao.json',{type:'application/json'}); const previewTransfer=new DataTransfer(); previewTransfer.items.add(previewFile); document.querySelector('#backupFile').files=previewTransfer.files; previewBackupFile(previewFile); document.querySelector('#backupPanel').scrollIntoView({block:'start'});"; awaitPromise = $true } | Out-Null
        Save-DocumentationScreenshot 'backup'
        $toolScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "backup-$tag.png"), [Convert]::FromBase64String($toolScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "window.scrollTo(0,0);" } | Out-Null
        Save-DocumentationScreenshot 'configuracoes'
        $settingsScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "settings-$tag.png"), [Convert]::FromBase64String($settingsScreenshot.data))
    } finally {
        if ($socket.State -eq [Net.WebSockets.WebSocketState]::Open) {
            try { Send-Cdp $socket 'Browser.close' @{} | Out-Null } catch { }
        }
        $socket.Dispose()
    }
}
Write-Output "Artifacts: $runDirectory"
& (Join-Path $PSScriptRoot 'pwa-check.ps1') -SiteRoot $SiteRoot
