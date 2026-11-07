param([ValidateRange(1, 3)][int]$Concurrency = 3, [switch]$Offline)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
function Read-JsData($path) {
    $raw = [IO.File]::ReadAllText($path)
    $raw.Substring($raw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
}
$catalog = Read-JsData (Join-Path $root 'assets/vehicle-catalog.js')
$references = Read-JsData (Join-Path $root 'assets/vehicle-reference.js')
$manifestPath = Join-Path $root 'assets/vehicle-images.js'
$previous = if (Test-Path $manifestPath) { Read-JsData $manifestPath } else { $null }
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
    if (!$Offline -and (Test-Path $cached)) {
        $html = [IO.File]::ReadAllText($cached)
        $url = [regex]::Match($html, '(?:property|name)="og:image"\s+content="([^"]+)"').Groups[1].Value
    }
    $old = $previous.($model.id)
    if (!$url -and $old) { $url = $old.remoteImage }
    if (!$url) { $missing += $model.id; continue }
    $url = [Net.WebUtility]::HtmlDecode($url)
    if ($url -notmatch '^https://www\.gtabase\.com/(?:images|igallery)/') { throw "Unexpected image host: $url" }
    $extension = [IO.Path]::GetExtension(([uri]$url).AbsolutePath)
    $relative = 'assets/vehicles-gtabase/' + $referenceId + $extension
    if ($old -and $old.remoteImage -eq $url -and $old.image -match '^assets/vehicles-gtabase/[a-z0-9]+\.(jpg|jpeg|png|webp)$' -and (Test-Path -LiteralPath (Join-Path $root $old.image))) { $relative = $old.image }
    $records[$model.id] = [ordered]@{ image = $relative; remoteImage = $url; sourceUrl = $reference.url; sharedWith = $(if ($referenceId -ne $model.id) { $referenceId } else { $null }) }
}
if ($missing.Count) { throw "Missing image sources for $($missing -join ', '); existing manifest preserved." }
if ($Offline) {
    foreach ($record in $records.Values) { if (!(Test-Path -LiteralPath (Join-Path $root $record.image))) { throw "Offline image missing: $($record.image)" } }
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
if ($failures.Count) { throw "Image downloads failed; existing manifest preserved: $($failures -join ', ')" }
# Identical bytes share one file; no image is re-encoded or visually changed.
$canonical = @{}; $paths = @{}; $duplicates = @()
foreach ($relative in @($records.Values | ForEach-Object { $_.image } | Sort-Object -Unique)) {
    $hash = (Get-FileHash -LiteralPath (Join-Path $root $relative) -Algorithm SHA256).Hash
    if ($canonical.ContainsKey($hash)) { $paths[$relative] = $canonical[$hash]; $duplicates += $relative }
    else { $canonical[$hash] = $relative; $paths[$relative] = $relative }
}
foreach ($record in $records.Values) { $record.image = $paths[$record.image] }
[IO.File]::WriteAllText($manifestPath, ('const VEHICLE_IMAGES = ' + (ConvertTo-Json -InputObject $records -Depth 5 -Compress) + ';'), (New-Object Text.UTF8Encoding($false)))
foreach ($relative in $duplicates) {
    $path = [IO.Path]::GetFullPath((Join-Path $root $relative))
    if (!$path.StartsWith([IO.Path]::GetFullPath($directory) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid duplicate asset path.' }
    Remove-Item -LiteralPath $path -Force
}
Write-Output "Models: $($records.Count); unique images: $($canonical.Count); duplicate files removed: $($duplicates.Count)."
