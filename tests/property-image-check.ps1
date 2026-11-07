param([string]$SiteRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$raw = [IO.File]::ReadAllText((Join-Path $SiteRoot 'assets/property-images.js'))
$images = $raw.Substring($raw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
$mapRaw = [IO.File]::ReadAllText((Join-Path $SiteRoot 'assets/property-locations.js'))
$locations = ($mapRaw.Substring($mapRaw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json).locations
Add-Type -AssemblyName System.Drawing
foreach ($entry in $images.PSObject.Properties) {
    if ($entry.Value.image -notmatch '^assets/properties/[^/\\]+\.(png|jpg|jpeg|webp)$' -or $entry.Value.sourceUrl -notmatch '^https://gta\.wiki/w/') { throw "Invalid property reference: $($entry.Name)" }
    $bitmap = [Drawing.Image]::FromFile((Join-Path $SiteRoot $entry.Value.image))
    try { if ($bitmap.Width -lt 100 -or $bitmap.Height -lt 60) { throw "Invalid property image: $($entry.Name)" } }
    finally { $bitmap.Dispose() }
}
foreach ($location in $locations) { if (!$images.($location.id)) { throw "Property exterior missing: $($location.name)" } }
Write-Output "PASS: all $($locations.Count) property locations have valid local exterior images."
