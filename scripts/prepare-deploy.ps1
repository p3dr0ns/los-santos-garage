$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$webFiles = @('index.html','styles.css','app.js','catalog-ui.js','wheels-ui.js','vehicle-details.js')
foreach ($file in $webFiles) { Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $destination $file) -Force }
Copy-Item -LiteralPath (Join-Path $projectRoot 'assets') -Destination $destination -Recurse -Force
foreach ($script in @('assets/vehicle-catalog.js','assets/wheel-catalog.js','app.js','catalog-ui.js','wheels-ui.js','vehicle-details.js')) {
    if (!(Test-Path -LiteralPath (Join-Path $destination $script))) { throw "Missing deployed asset: $script" }
}
Write-Output 'Static site ready in dist.'
