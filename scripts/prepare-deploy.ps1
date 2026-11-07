$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = [IO.Path]::GetFullPath((Join-Path $projectRoot 'dist'))
if ((Split-Path -Parent $destination) -ne [IO.Path]::GetFullPath($projectRoot) -or (Split-Path -Leaf $destination) -ne 'dist') { throw 'Invalid deployment directory.' }
if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $destination 'assets') -Force | Out-Null
$webFiles = @('index.html','styles.css','los-santos.css','property-explorer.css','app.js','catalog-ui.js','wheels-ui.js','vehicle-details.js','garage-view.js','garage-themes.js','property-catalog.js','property-explorer.js')
foreach ($file in $webFiles) { Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $destination $file) }
foreach ($file in @('vehicle-catalog.js','vehicle-reference.js','wheel-catalog.js','interior-images.js','property-locations.js')) {
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
# Version scripts and styles so a new manifest cannot be paired with cached old code.
$entrypoint = Join-Path $destination 'index.html'
$html = [IO.File]::ReadAllText($entrypoint)
$html = [regex]::Replace($html, '(<(?:script|link)\b[^>]*(?:src|href)=")((?!https?:|//)[^"?]+\.(?:js|css))(")', [Text.RegularExpressions.MatchEvaluator]{
    param($match)
    $hash = (Get-FileHash -LiteralPath (Join-Path $destination $match.Groups[2].Value) -Algorithm SHA256).Hash.Substring(0,12).ToLowerInvariant()
    $match.Groups[1].Value + $match.Groups[2].Value + '?v=' + $hash + $match.Groups[3].Value
})
[IO.File]::WriteAllText($entrypoint, $html, (New-Object Text.UTF8Encoding($false)))
Write-Output 'Static site ready in dist.'
