$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$raw = [IO.File]::ReadAllText((Join-Path $root 'assets/property-locations.js'))
$map = $raw.Substring($raw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
if ($map.source -ne 'https://gta-5-map.com/' -or $map.width -ne 2816 -or $map.height -ne 2816) { throw 'Map source or dimensions changed unexpectedly.' }
if (@($map.locations.id | Select-Object -Unique).Count -ne $map.locations.Count) { throw 'Property IDs must be unique.' }
foreach ($location in $map.locations) {
    if ($location.x -lt 0 -or $location.y -lt 0 -or $location.x -gt $map.width -or $location.y -gt $map.height -or $location.capacity -lt 0) { throw "Invalid map location: $($location.id)" }
    if ($location.sourceUrl -notmatch '^https://gta-5-map\.com/\?locationIds=\d+$') { throw "Missing original location reference: $($location.id)" }
    if ($location.type -eq 'agency' -and $location.dealer -ne 'executive') { throw 'Agencies must belong to Dynasty 8 Executive.' }
    if ($location.type -eq 'property_bunker' -and $location.capacity -ne 0) { throw 'Bunkers must not receive permanent common vehicle slots.' }
}
if (@($map.locations | Where-Object {$_.type -eq 'auto_shop_property'}).Count -ne 5 -or @($map.locations | Where-Object {$_.type -eq 'arena_workshop'}).Count -ne 1) { throw 'The Arena must not be classified as a sixth Auto Shop.' }
Add-Type -AssemblyName System.Drawing
foreach ($x in 0..10) { foreach($y in 0..10) {
    $image = [Drawing.Image]::FromFile((Join-Path $root "assets/map/$x-$y.png"))
    try { if ($image.Width -ne 256 -or $image.Height -ne 256) { throw "Invalid tile: $x-$y" } }
    finally { $image.Dispose() }
} }
Write-Output "PASS: $($map.locations.Count) source-linked properties and 121 local map tiles."
