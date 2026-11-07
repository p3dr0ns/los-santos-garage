$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = [IO.Path]::GetFullPath((Join-Path $projectRoot 'dist'))
if ((Split-Path -Parent $destination) -ne [IO.Path]::GetFullPath($projectRoot) -or (Split-Path -Leaf $destination) -ne 'dist') { throw 'Invalid deployment directory.' }
if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $destination 'assets') -Force | Out-Null
$webFiles = @('index.html','styles.css','los-santos.css','property-explorer.css','app.js','catalog-ui.js','wheels-ui.js','vehicle-details.js','garage-view.js','garage-themes.js','property-catalog.js','property-explorer.js')
foreach ($file in $webFiles) { Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $destination $file) }
foreach ($file in @('vehicle-catalog.js','vehicle-reference.js','wheel-catalog.js','vehicle-images.js','interior-images.js','property-locations.js')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot "assets/$file") -Destination (Join-Path $destination "assets/$file")
}
foreach ($directory in @('blips','vehicles-gtabase','interiors','map')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot "assets/$directory") -Destination (Join-Path $destination 'assets') -Recurse
}
Write-Output 'Static site ready in dist.'
