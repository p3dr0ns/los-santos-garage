$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = [IO.Path]::GetFullPath((Join-Path $projectRoot 'dist'))
if ((Split-Path -Parent $destination) -ne [IO.Path]::GetFullPath($projectRoot) -or (Split-Path -Leaf $destination) -ne 'dist') { throw 'Invalid deployment directory.' }
if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $destination 'assets') -Force | Out-Null
$webFiles = @('index.html','favicon.svg','app-icon.svg','manifest.webmanifest','sw.js','styles.css','los-santos.css','property-explorer.css','collection-tools.css','collection-plus.css','collection-storage.js','collection-plus.js','app.js','catalog-ui.js','wheels-ui.js','vehicle-details.js','garage-view.js','garage-themes.js','property-catalog.js','property-explorer.js','collection-tools.js')
foreach ($file in $webFiles) { Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $destination $file) }
Copy-Item -LiteralPath (Join-Path $projectRoot 'assets/logo-los-santos-customs.png') -Destination (Join-Path $destination 'assets/logo-los-santos-customs.png')
foreach ($file in @('vehicle-catalog.js','vehicle-reference.js','wheel-catalog.js','interior-images.js','property-locations.js','property-images.js')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot "assets/$file") -Destination (Join-Path $destination "assets/$file")
}
# Source URLs remain in the repository manifest; the browser only needs these fields.
$imageSource = [IO.File]::ReadAllText((Join-Path $projectRoot 'assets/vehicle-images.js'))
$images = $imageSource.Substring($imageSource.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
$runtimeImages = [ordered]@{}
foreach ($entry in $images.PSObject.Properties) {
    $record = [ordered]@{ image = $entry.Value.image }
    if ($entry.Value.sharedWith) { $record.sharedWith = $entry.Value.sharedWith }
    $runtimeImages[$entry.Name] = $record
}
[IO.File]::WriteAllText((Join-Path $destination 'assets/vehicle-images.js'), ('const VEHICLE_IMAGES = ' + (ConvertTo-Json -InputObject $runtimeImages -Depth 4 -Compress) + ';'), (New-Object Text.UTF8Encoding($false)))
foreach ($directory in @('blips','vehicles-gtabase','interiors','map')) {
    $assetDestination = Join-Path $destination "assets/$directory"
    New-Item -ItemType Directory -Path $assetDestination -Force | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $projectRoot "assets/$directory") -File |
        Where-Object { $_.Extension -in @('.png','.jpg','.jpeg','.webp','.svg') } |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $assetDestination }
}
$propertySource = [IO.File]::ReadAllText((Join-Path $projectRoot 'assets/property-images.js'))
$propertyImages = $propertySource.Substring($propertySource.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
New-Item -ItemType Directory -Path (Join-Path $destination 'assets/properties') -Force | Out-Null
foreach ($path in @($propertyImages.PSObject.Properties | ForEach-Object { $_.Value.image } | Sort-Object -Unique)) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $path) -Destination (Join-Path $destination $path)
}
# Version scripts and styles so a new manifest cannot be paired with cached old code.
$entrypoint = Join-Path $destination 'index.html'
$html = [IO.File]::ReadAllText($entrypoint)
$html = [regex]::Replace($html, '(<(?:script|link)\b[^>]*(?:src|href)=")((?!https?:|//)[^"?]+\.(?:js|css))(")', [Text.RegularExpressions.MatchEvaluator]{
    param($match)
    $hash = (Get-FileHash -LiteralPath (Join-Path $destination $match.Groups[2].Value) -Algorithm SHA256).Hash.Substring(0,12).ToLowerInvariant()
    $match.Groups[1].Value + $match.Groups[2].Value + '?v=' + $hash + $match.Groups[3].Value
})
[IO.File]::WriteAllText($entrypoint, $html, (New-Object Text.UTF8Encoding($false)))
# Cache the exact script/style versions used by this release, including offline navigation.
$shell = @('./','index.html','favicon.svg','app-icon.svg','manifest.webmanifest','assets/logo-los-santos-customs.png')
$shell += @([regex]::Matches($html,'<(?:script|link)\b[^>]*(?:src|href)="((?!https?:|//)[^"]+\.(?:js|css)\?v=[a-f0-9]{12})"') | ForEach-Object { $_.Groups[1].Value })
$workerPath = Join-Path $destination 'sw.js'
$worker = [IO.File]::ReadAllText($workerPath)
$releaseHash = (Get-FileHash -LiteralPath $entrypoint -Algorithm SHA256).Hash.Substring(0,16).ToLowerInvariant()
$worker = $worker.Replace('const VERSION = "development";', 'const VERSION = "' + $releaseHash + '";')
$worker = [regex]::Replace($worker, 'const SHELL = \[[^;]+\];', 'const SHELL = ' + (ConvertTo-Json -InputObject @($shell) -Compress) + ';')
[IO.File]::WriteAllText($workerPath, $worker, (New-Object Text.UTF8Encoding($false)))
Write-Output 'Static site ready in dist.'
