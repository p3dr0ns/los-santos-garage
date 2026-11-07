param([ValidateRange(3, 3600)][int]$DelaySeconds = 3, [switch]$Refresh, [switch]$CacheOnly, [string[]]$Urls)
$ErrorActionPreference = 'Stop'
if ($Refresh -and $CacheOnly) { throw 'Use either -Refresh or -CacheOnly, not both.' }
. (Join-Path $PSScriptRoot 'parse-vehicle-reference.ps1')
. (Join-Path $PSScriptRoot 'resolve-vehicle-reference.ps1')
$projectRoot = Split-Path -Parent $PSScriptRoot
$cacheRoot = Join-Path $projectRoot '.cache/gtabase'
New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null
$catalogText = [IO.File]::ReadAllText((Join-Path $projectRoot 'assets/vehicle-catalog.js'))
$catalog = $catalogText.Substring($catalogText.IndexOf('{')).TrimEnd(';', "`r", "`n") | ConvertFrom-Json
$outputPath = Join-Path $projectRoot 'assets/vehicle-reference.js'
$records = @{}
if (Test-Path -LiteralPath $outputPath) {
    $oldText = [IO.File]::ReadAllText($outputPath)
    $old = $oldText.Substring($oldText.IndexOf('{')).TrimEnd(';', "`r", "`n") | ConvertFrom-Json
    foreach ($property in $old.PSObject.Properties) { $records[$property.Name] = $property.Value }
}
function Save-ReferenceData {
    $sorted = [ordered]@{}
    foreach ($key in ($records.Keys | Sort-Object)) { $sorted[$key] = $records[$key] }
    $json = ConvertTo-Json -InputObject $sorted -Depth 6 -Compress
    [IO.File]::WriteAllText($outputPath, "// GTA Base: exact model IDs; see GTABASE.md.`nconst VEHICLE_REFERENCE = $json;`n", (New-Object Text.UTF8Encoding($false)))
}
# Discover real URLs from the sitemap, never construct them from vehicle names.
$linksPath = Join-Path $cacheRoot 'links.json'
if ($Urls) {
    $links = @($Urls)
} elseif ((Test-Path -LiteralPath $linksPath) -and !$Refresh) {
    $loadedLinks = [IO.File]::ReadAllText($linksPath) | ConvertFrom-Json
    $links = @(foreach ($link in $loadedLinks) { if ($link -is [string]) { $link } elseif ($link.value) { [string]$link.value } })
} else {
    if ($CacheOnly) { throw 'No cached sitemap. Run without -CacheOnly first.' }
    $index = [xml](Invoke-WebRequest -UseBasicParsing 'https://www.gtabase.com/sitemap-4seo.xml').Content
    $links = @(foreach ($sitemap in $index.sitemapindex.sitemap.loc) {
        Start-Sleep -Seconds $DelaySeconds
        $xml = [xml](Invoke-WebRequest -UseBasicParsing $sitemap).Content
        $xml.urlset.url.loc | Where-Object { $_ -match '/grand-theft-auto-v/vehicles/[^/]+$|/vehicles/grand-theft-auto-v/[^/]+$' }
    })
    [IO.File]::WriteAllText($linksPath, (ConvertTo-Json -InputObject $links))
}
$priority = @($links | Where-Object { $_ -match 'sentinel-gts$|pegassi-zentorno$|truffade-adder$|karin-kuruma-armored$|annis-elegy-retro-custom$|karin-sultan-rs$|grotti-turismo-r$|vapid-dominator$' }) + @($records.Values | ForEach-Object { $_.url })
if ($Urls) { $priority = @() }
$failures = @()
$unmatched = @()
$ambiguous = @()
$visited = 0
$blocked = $false
foreach ($url in (($priority + $links) | Select-Object -Unique)) {
    $slug = ($url -split '/')[-1]
    $cachePath = Join-Path $cacheRoot ($slug + '.html')
    $cacheDate = Join-Path $cacheRoot ($slug + '.date')
    if (!(Test-Path -LiteralPath $cachePath) -or $Refresh) {
        if ($CacheOnly) { continue }
        Start-Sleep -Seconds $DelaySeconds
        try {
            $response = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 45
            [IO.File]::WriteAllText($cachePath, $response.Content, (New-Object Text.UTF8Encoding($false)))
            [IO.File]::WriteAllText($cacheDate, (Get-Date -Format 'yyyy-MM-dd'))
        } catch {
            $status = 0
            if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
            $failures += [pscustomobject]@{ url = $url; status = $status }
            Write-Output "HTTP $status : $url"
            if ($status -eq 429 -or $status -eq 403) { $blocked = $true; break }
            continue
        }
    }
    $date = [IO.File]::ReadAllText($cacheDate).Trim()
    $row = ConvertFrom-GtaBaseVehicleHtml ([IO.File]::ReadAllText($cachePath)) $url $date
    $visited++
    $matches = @()
    if ($row) { $matches = @(Resolve-VehicleReference $row $catalog.vehicles) }
    foreach ($match in $matches) {
        $previous = $records[$match.model]
        if ($previous -and $previous.url -ne $url -and $previous.matchRank -ge $match.matchRank) {
            $ambiguous += [pscustomobject]@{ model = $match.model; url = $url; retained = $previous.url; reason = 'Preferred exact code and full variant name' }
            continue
        }
        $records[$match.model] = $match
    }
    if ($matches.Count) { Save-ReferenceData } else { $unmatched += [pscustomobject]@{ url = $url; model = $row.model } }
    if ($visited % 20 -eq 0) { Write-Output "$visited fichas consultadas; $($records.Count) modelos associados." }
}
$missing = @($catalog.vehicles | Where-Object { !$records.ContainsKey($_.id) -or $records[$_.id].schemaVersion -ne 2 } | Select-Object id, name, brand)
$report = [ordered]@{ retrieved = (Get-Date -Format 'yyyy-MM-dd'); totalCatalog = $catalog.vehicles.Count; fullSchemaCount = @($records.Values | Where-Object { $_.schemaVersion -eq 2 }).Count; visited = $visited; interruptedBySource = $blocked; failures = $failures; missing = $missing; ambiguous = $ambiguous; unmatched = $unmatched }
[IO.File]::WriteAllText((Join-Path $projectRoot 'assets/vehicle-reference-report.json'), (ConvertTo-Json -InputObject $report -Depth 6), (New-Object Text.UTF8Encoding($false)))
Write-Output "$($report.fullSchemaCount)/$($catalog.vehicles.Count) modelos no novo formato; $($missing.Count) pendentes. Coleta interrompida pelo site: $blocked."
