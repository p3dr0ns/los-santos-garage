$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'reference-check.ps1')
$projectRoot = Split-Path -Parent $PSScriptRoot
$browserPath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (!(Test-Path -LiteralPath $browserPath)) { throw 'Google Chrome not found at its default path.' }
$baseUri = ([Uri]($projectRoot + '\')).AbsoluteUri
$html = [IO.File]::ReadAllText((Join-Path $projectRoot 'index.html')).Replace('<head>', '<head><base href="' + $baseUri + '">')
$html = $html.Replace('</body>', '<script src="tests/gallery-check.js"></script></body>')
$runDirectory = Join-Path $env:TEMP ('garage-gallery-check-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runDirectory | Out-Null
$testPage = Join-Path $runDirectory 'check.html'
[IO.File]::WriteAllText($testPage, $html, (New-Object Text.UTF8Encoding($false)))
$script:messageId = 0
function Send-Cdp($socket, $method, $parameters) {
    $script:messageId++
    $messageId = $script:messageId
    $json = @{ id = $messageId; method = $method; params = $parameters } | ConvertTo-Json -Depth 15 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $socket.SendAsync((New-Object 'ArraySegment[byte]' -ArgumentList @(,$bytes)), [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    do {
        $stream = New-Object IO.MemoryStream
        do {
            $buffer = New-Object byte[] 65536
            $cancellation = New-Object Threading.CancellationTokenSource(35000)
            try { $part = $socket.ReceiveAsync((New-Object 'ArraySegment[byte]' -ArgumentList @(,$buffer)), $cancellation.Token).GetAwaiter().GetResult() }
            finally { $cancellation.Dispose() }
            $stream.Write($buffer, 0, $part.Count)
        } while (!$part.EndOfMessage)
        $response = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
        $stream.Dispose()
    } while ($response.id -ne $messageId)
    if ($response.error) { throw ($response.error | ConvertTo-Json -Compress) }
    return $response.result
}
foreach ($viewport in @('1440,1100', '500,1000')) {
    $tag = $viewport.Replace(',', '-')
    $port = if ($tag -eq '1440-1100') { 47841 } else { 47842 }
    $profilePath = Join-Path $runDirectory "profile-$tag"
    $arguments = @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=$profilePath", "--remote-debugging-port=$port", "--window-size=$viewport", ('"' + ([Uri]$testPage).AbsoluteUri + '"'))
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
        $expression = "new Promise(resolve => { const check = () => { const result = document.querySelector('#gallery-check-result'); if(result) { clearInterval(timer); resolve(result.textContent); } }; const timer = setInterval(check, 50); check(); setTimeout(() => { clearInterval(timer); resolve('TIMEOUT: ' + document.querySelector('#studioStatus')?.textContent); }, 25000); })"
        $result = Send-Cdp $socket 'Runtime.evaluate' @{ expression = $expression; awaitPromise = $true; returnByValue = $true }
        $value = $result.result.value
        Write-Output "$tag $value"
        $screenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "$tag.png"), [Convert]::FromBase64String($screenshot.data))
        $dom = Send-Cdp $socket 'Runtime.evaluate' @{ expression = 'document.documentElement.outerHTML'; returnByValue = $true }
        [IO.File]::WriteAllText((Join-Path $runDirectory "$tag.html"), $dom.result.value)
        if ($value -notlike 'PASS:*') { throw "Gallery tests failed. Inspect $runDirectory" }
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "data.vehicles.push({id:'preview-sentinel',catalogId:'sentinel5',name:'Sentinel GTS',category:'Esportivo',garageId:'g1'}); openVehicleDetails('preview-sentinel'); document.querySelector('#detailsMechanical').scrollIntoView({block:'start'});" } | Out-Null
        $performanceScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "performance-$tag.png"), [Convert]::FromBase64String($performanceScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "data.vehicles.push({id:'preview-config',catalogId:'zentorno',name:'Zentorno',category:'Super',garageId:'g1'}); openVehicleDetails('preview-config'); openConfigurator();" } | Out-Null
        $configScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "configurator-$tag.png"), [Convert]::FromBase64String($configScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('#configDialog').close(); data.vehicles.pop(); openVehicleDetails('preview-sentinel');" } | Out-Null
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "(async () => { await openPhotoStudio(); await uploadPhoto(window.galleryTestPhoto, 'cinematicFront'); openPhotoEnhancer('cinematicFront'); for(let i=0;document.querySelector('#applyEnhance').disabled && i<60;i++) await new Promise(resolve=>setTimeout(resolve,30)); })()"; awaitPromise = $true } | Out-Null
        $enhanceScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "enhance-$tag.png"), [Convert]::FromBase64String($enhanceScreenshot.data))
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "closePhotoEnhancer(); closePhotoStudio();" } | Out-Null
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
        Send-Cdp $socket 'Runtime.evaluate' @{ expression = "document.querySelector('#vehicleDialog').close(); openGarageDialog('g1'); document.querySelector('#garageApartment').value='31'; document.querySelector('#garageTags').value='JDM, Drift'; document.querySelector('#garageApartment').dispatchEvent(new Event('input')); document.querySelector('#garageApartment').scrollIntoView({block:'center'});" } | Out-Null
        $garageScreenshot = Send-Cdp $socket 'Page.captureScreenshot' @{ format = 'png' }
        [IO.File]::WriteAllBytes((Join-Path $runDirectory "garage-form-$tag.png"), [Convert]::FromBase64String($garageScreenshot.data))
    } finally {
        if ($socket.State -eq [Net.WebSockets.WebSocketState]::Open) {
            try { Send-Cdp $socket 'Browser.close' @{} | Out-Null } catch { }
        }
        $socket.Dispose()
    }
}
Write-Output "Artifacts: $runDirectory"
