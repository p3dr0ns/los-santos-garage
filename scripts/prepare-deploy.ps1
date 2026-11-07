$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$webFiles = @('index.html','styles.css','app.js','catalog-ui.js','wheels-ui.js','vehicle-details.js','photo-enhancer.js','configurator.js')
foreach ($file in $webFiles) { Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $destination $file) -Force }
Copy-Item -LiteralPath (Join-Path $projectRoot 'assets') -Destination $destination -Recurse -Force
foreach ($script in @('assets/vehicle-catalog.js','assets/vehicle-reference.js','assets/wheel-catalog.js','app.js','catalog-ui.js','wheels-ui.js','vehicle-details.js')) {
    if (!(Test-Path -LiteralPath (Join-Path $destination $script))) { throw "Missing deployed asset: $script" }
}
Write-Output 'Static site ready in dist.'
$downloads = Join-Path $destination 'assets/downloads'
New-Item -ItemType Directory -Path $downloads -Force | Out-Null
$package = Join-Path ([IO.Path]::GetTempPath()) ('garage-print-package-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $package 'capture') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'Iniciar captura.cmd') -Destination $package
foreach ($source in @('CaptureAssistant.cs','site-url.txt')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot "capture/$source") -Destination (Join-Path $package 'capture')
}
Compress-Archive -Path (Join-Path $package '*') -DestinationPath (Join-Path $downloads 'prints-windows.zip') -Force
