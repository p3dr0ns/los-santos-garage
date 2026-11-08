param([string]$SiteRoot = (Split-Path -Parent $PSScriptRoot), [switch]$Published)
$ErrorActionPreference = 'Stop'
$SiteRoot = (Resolve-Path -LiteralPath $SiteRoot).Path
$repoRoot = Split-Path -Parent $PSScriptRoot
foreach ($directory in @('scripts','tests')) {
    foreach ($script in Get-ChildItem -LiteralPath (Join-Path $repoRoot $directory) -Filter '*.ps1' -File) {
        $tokens = $null; $syntaxErrors = $null
        [void][Management.Automation.Language.Parser]::ParseFile($script.FullName,[ref]$tokens,[ref]$syntaxErrors)
        if ($syntaxErrors.Count) { throw "PowerShell syntax error in $($script.Name): $($syntaxErrors.Message -join '; ')" }
    }
}
function Assert-LocalFile([string]$relative) {
    $target = [IO.Path]::GetFullPath((Join-Path $SiteRoot $relative))
    if (!$target.StartsWith($SiteRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw "File outside site root: $relative" }
    if (!(Test-Path -LiteralPath $target -PathType Leaf) -or (Get-Item -LiteralPath $target).Length -eq 0) { throw "Missing or empty runtime file: $relative" }
}
$html = [IO.File]::ReadAllText((Join-Path $SiteRoot 'index.html'))
foreach ($match in [regex]::Matches($html,'<(?:script|link|img)\b[^>]*(?:src|href)="([^"]+)"')) {
    $path = $match.Groups[1].Value
    if ($path -notmatch '^(https?:|//|#)') {
        if ($Published -and $path -match '\.(js|css)' -and $path -notmatch '\?v=[a-f0-9]{12}$') { throw "Unversioned runtime resource: $path" }
        Assert-LocalFile ([regex]::Split($path,'[?#]')[0])
    }
}
foreach ($manifest in @('vehicle-images.js','interior-images.js','property-images.js')) {
    $raw = [IO.File]::ReadAllText((Join-Path $SiteRoot "assets/$manifest"))
    $records = $raw.Substring($raw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
    foreach ($entry in $records.PSObject.Properties) { Assert-LocalFile $entry.Value.image }
}
foreach ($x in 0..10) { foreach ($y in 0..10) { Assert-LocalFile "assets/map/$x-$y.png" } }
if ($Published) {
    $unnecessary = @(Get-ChildItem -LiteralPath $SiteRoot -Recurse -File | Where-Object {$_.Extension -notin @('.html','.css','.js','.png','.jpg','.jpeg','.webp','.svg','.webmanifest')})
    if ($unnecessary.Count) { throw "Non-runtime files in publication: $($unnecessary.Name -join ', ')" }
}
$appManifest = [IO.File]::ReadAllText((Join-Path $SiteRoot 'manifest.webmanifest')) | ConvertFrom-Json
foreach ($icon in $appManifest.icons) { Assert-LocalFile $icon.src }
Assert-LocalFile 'sw.js'
Write-Output 'PASS: PowerShell syntax, entrypoint resources, image manifests and map assets.'
