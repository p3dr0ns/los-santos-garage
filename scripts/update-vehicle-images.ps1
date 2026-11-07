param([ValidateRange(1, 3)][int]$Concurrency = 3)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
function Read-JsData($path) {
    $raw = [IO.File]::ReadAllText($path)
    $raw.Substring($raw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
}
$catalog = Read-JsData (Join-Path $root 'assets/vehicle-catalog.js')
$references = Read-JsData (Join-Path $root 'assets/vehicle-reference.js')
$directory = Join-Path $root 'assets/vehicles-gtabase'
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$records = [ordered]@{}; $missing = @()
foreach ($model in $catalog.vehicles) {
    $referenceId = $model.id
    if ($referenceId -eq 'driftvorschlag') { $referenceId = 'vorschlaghammer' }
    if (!$references.($referenceId) -and $referenceId.StartsWith('drift')) { $referenceId = $referenceId.Substring(5) }
    $reference = $references.($referenceId)
    if (!$reference) { $missing += $model.id; continue }
    $url = $null
    $cached = Join-Path $root ('.cache/gtabase/' + ($reference.url -split '/')[-1] + '.html')
    if (Test-Path $cached) {
        $html = [IO.File]::ReadAllText($cached)
        $url = [regex]::Match($html, '(?:property|name)="og:image"\s+content="([^"]+)"').Groups[1].Value
    }
    if (!$url) { $missing += $model.id; continue }
    $url = [Net.WebUtility]::HtmlDecode($url)
    if ($url -notmatch '^https://www\.gtabase\.com/(?:images|igallery)/') { throw "Unexpected image host: $url" }
    $extension = [IO.Path]::GetExtension(([uri]$url).AbsolutePath)
    $relative = 'assets/vehicles-gtabase/' + $referenceId + $extension
    $local = Join-Path $root $relative
    $records[$model.id] = [ordered]@{ image = $relative; remoteImage = $url; sourceUrl = $reference.url; sharedWith = $(if ($referenceId -ne $model.id) { $referenceId } else { $null }) }
}
$pool = [RunspaceFactory]::CreateRunspacePool(1, $Concurrency); $pool.Open()
$state = [hashtable]::Synchronized(@{ blocked = $false })
$unique = @($records.Values | Group-Object { $_.image } | ForEach-Object { $_.Group[0] })
$jobs = foreach ($record in $unique) {
    $worker = [PowerShell]::Create(); $worker.RunspacePool = $pool
    [void]$worker.AddScript({
        param($record, $root, $state)
        $target = Join-Path $root $record.image
        if ((Test-Path $target) -and (Get-Item $target).Length -gt 0) { return }
        if ($state.blocked) { return $record.image }
        try {
            Start-Sleep -Milliseconds 700
            $response = Invoke-WebRequest $record.remoteImage -UseBasicParsing -TimeoutSec 30
            if ($response.Headers['Content-Type'] -notmatch '^image/') { throw 'Not an image' }
            [IO.File]::WriteAllBytes($target, $response.Content)
        } catch {
            if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -in @(403,429)) { $state.blocked = $true }
            $record.image
        }
    }).AddArgument($record).AddArgument($root).AddArgument($state)
    @{ worker = $worker; handle = $worker.BeginInvoke() }
}
$failures = @()
foreach ($job in $jobs) { $failures += @($job.worker.EndInvoke($job.handle)); $job.worker.Dispose() }
$pool.Close(); $pool.Dispose()
foreach ($id in @($records.Keys)) { if (!(Test-Path (Join-Path $root $records[$id].image))) { $records[$id].image = $records[$id].remoteImage } }
[IO.File]::WriteAllText((Join-Path $root 'assets/vehicle-images.js'), ('const VEHICLE_IMAGES = ' + (ConvertTo-Json -InputObject $records -Depth 5 -Compress) + ';'), (New-Object Text.UTF8Encoding($false)))
Write-Output "Models: $($records.Count); local files: $((Get-ChildItem $directory -File).Count); missing models: $($missing -join ','); download failures: $($failures.Count)"
if ($failures.Count) { Write-Warning ($failures -join ', ') }
