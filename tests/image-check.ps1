$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
function Read-Data($relative) {
    $raw = [IO.File]::ReadAllText((Join-Path $root $relative))
    $raw.Substring($raw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
}
$catalog = Read-Data 'assets/vehicle-catalog.js'
$images = Read-Data 'assets/vehicle-images.js'
foreach ($model in $catalog.vehicles) {
    $image = $images.($model.id)
    if (!$image) { throw "Image missing for model $($model.id)" }
    if ($image.remoteImage -notmatch '^https://www\.gtabase\.com/(images|igallery)/' -or $image.sourceUrl -notmatch '^https://www\.gtabase\.com/') { throw "Invalid image source: $($model.id)" }
    if ($image.image -notmatch '^assets/vehicles-gtabase/[a-z0-9]+\.(jpg|jpeg|png|webp)$') { throw "Image must be local: $($model.id)" }
    if (!(Test-Path -LiteralPath (Join-Path $root $image.image))) { throw "Local image missing: $($image.image)" }
    if ($image.sharedWith -and $image.image -ne $images.($image.sharedWith).image) { throw "Base image mismatch: $($model.id)" }
}
Add-Type -AssemblyName System.Drawing
foreach ($path in @($images.PSObject.Properties.Value.image | Select-Object -Unique)) {
    $bitmap = [Drawing.Image]::FromFile((Join-Path $root $path))
    try { if ($bitmap.Width -lt 100 -or $bitmap.Height -lt 60) { throw "Image too small: $path" } }
    finally { $bitmap.Dispose() }
}
Write-Output "PASS: GTA Base images cover $($catalog.vehicles.Count) models; all local files decode."
