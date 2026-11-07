$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$raw = [IO.File]::ReadAllText((Join-Path $root 'assets/interior-images.js'))
$images = $raw.Substring($raw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
Add-Type -AssemblyName System.Drawing
foreach ($entry in $images.PSObject.Properties) {
    if ($entry.Value.image -notmatch '^assets/interiors/[a-z0-9-]+\.(png|jpg)$' -or $entry.Value.sourceUrl -notmatch '^https://gta\.wiki/w/') { throw "Invalid interior reference: $($entry.Name)" }
    $bitmap = [Drawing.Image]::FromFile((Join-Path $root $entry.Value.image))
    try { if ($bitmap.Width -lt 100 -or $bitmap.Height -lt 60) { throw "Invalid interior image: $($entry.Name)" } }
    finally { $bitmap.Dispose() }
}
foreach ($id in @('undressed','flawless','polished','concrete-chic','nostalgia-trip','route-68','super-chibi','wildstyle','race-and-chase')) {
    if (!$images.($id)) { throw "Auto Shop style missing: $id" }
}
Write-Output "PASS: $($images.PSObject.Properties.Name.Count) local interior references, including all nine Auto Shop styles."
