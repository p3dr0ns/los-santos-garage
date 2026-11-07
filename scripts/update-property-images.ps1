param([switch]$Offline)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root 'assets/property-images.js'
$destination = Join-Path $root 'assets/properties'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
if ($Offline) {
    $raw = [IO.File]::ReadAllText($manifestPath)
    $manifest = $raw.Substring($raw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
    foreach ($entry in $manifest.PSObject.Properties) {
        if (!(Test-Path -LiteralPath (Join-Path $root $entry.Value.image))) { throw "Missing property image: $($entry.Name)" }
    }
    Write-Output "Property images available offline: $(@($manifest.PSObject.Properties).Count)"
    return
}
function Normalize-PropertyName([string]$name) {
    $name = [Net.WebUtility]::HtmlDecode($name).ToLowerInvariant()
    $name = $name -replace ',?\s*(apt\.?|apartment|penthouse|suite)\s*.*$', ''
    $name = $name.Trim().TrimEnd(':') -replace '^.*[\u00b7:]\s*', '' -replace '^.*\s+-\s+(?=burton|rancho|strawberry|la mesa)', ''
    $name = $name -replace '\b(avenue|ave)\b','av' -replace '\b(boulevard|blvd)\b','bl' -replace '\b(drive|dr)\b','dr' -replace '\b(street|st)\b','st' -replace '\b(road|rd)\b','rd' -replace '\b(parkway|pkwy)\b','pw' -replace '\b(freeway|fwy)\b','fw' -replace '\bs(?= rockford)\b','south'
    $name = $name -replace '\s+[-\u2013]\s+.*$','' -replace '\s*\(layout \d\)',''
    $name = $name -replace '\b(auto shop|nightclub|clubhouse|arcade|tower|facility)\b','' -replace '[^a-z0-9]',''
    return $name -replace '^0+',''
}
function Read-Wiki([string]$page) {
    (Invoke-WebRequest -Uri "https://gta.wiki/w/$page" -UseBasicParsing).Content
}
$pages = [ordered]@{safehouse='Apartments';garage='Garages_in_GTA_Online';agency='Agencies';office='Offices';auto_shop_property='Auto_Shops';property_bunker='Bunkers';biker_clubhouse='Clubhouses';bat_club_property='Nightclubs';arcade='Arcades';hangar='Hangars';facility='Facilities';salvage_yard='Salvage_Yards';warehouse_vehicle='Vehicle_Warehouses'}
$candidates = @{}
foreach ($type in $pages.Keys) {
    $html = Read-Wiki $pages[$type]
    foreach ($row in [regex]::Matches($html,'(?s)<tr\b[^>]*>.*?</tr>')) {
        $cell = [regex]::Match($row.Value,'(?s)<td\b[^>]*>(.*?)</td>')
        if (!$cell.Success) { continue }
        $labelHtml = [regex]::Split($cell.Groups[1].Value,'<br\s*/?>|<p>')[0]
        $label = ([regex]::Replace($labelHtml,'<[^>]+>',' ')).Trim()
        if ($type -eq 'biker_clubhouse' -and $label -match 'Paleto Bay') {
            $label = if ($label -match 'Layout 1') {'Paleto Bay Southwest'} else {'Paleto Bay Northeast'}
        }
        if (!$label -or $label.Length -gt 100) { continue }
        $key = "$type|$(Normalize-PropertyName $label)"
        $image = [regex]::Match($row.Value,'<img[^>]+src="([^"]+)"')
        $link = [regex]::Match($cell.Value,'href="/w/([^"#]+)"')
        if ($image.Success) {
            $url = [Net.WebUtility]::HtmlDecode($image.Groups[1].Value)
            # Business listing pictures are the actual exterior shown by the in-game realtor.
            $width = [regex]::Match($row.Value,'data-file-width="(\d+)"')
            $url = if ($width.Success -and [int]$width.Groups[1].Value -le 480) { $url -replace '/thumb/(.+)/\d+px-[^/?]+', '/$1' } else { $url -replace '/\d+px-', '/480px-' }
            $candidates[$key] = @{url="https://gta.wiki$url";source="https://gta.wiki/w/$($pages[$type])"}
        } elseif ($link.Success) { $candidates[$key] = @{page=$link.Groups[1].Value} }
    }
}
$special = @{
    'safehouse|eclipsetowers'='Eclipse_Towers'; 'safehouse|tinseltowers'='Tinsel_Towers';
    'safehouse|3altast'='3_Alta_Street'; 'safehouse|4integrityway'='Tinkle_Building';
    'casino'='The_Diamond_Casino_%26_Resort'; 'arena_workshop'='Maze_Bank_Arena';
    'eclipse_boulevard'='Eclipse_Boulevard_Garage'; 'vinewood_garage'='The_Vinewood_Club';
    'car_meet'='LS_Car_Meet'; 'kosatka'='Kosatka'
}
$raw = [IO.File]::ReadAllText((Join-Path $root 'assets/property-locations.js'))
$locations = ($raw.Substring($raw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json).locations
$result = [ordered]@{}
$pageImages = @{}
if (Test-Path -LiteralPath $manifestPath) {
    $previousRaw = [IO.File]::ReadAllText($manifestPath)
    $previous = $previousRaw.Substring($previousRaw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
    foreach ($entry in $previous.PSObject.Properties) {
        $page = $entry.Value.sourceUrl -replace '^https://gta.wiki/w/',''
        if ($page -notin $pages.Values) { $pageImages[$page] = $entry.Value.originalUrl }
    }
}
$missing = @()
$targets = @($locations) + @(@{id='type-kosatka';type='kosatka';name='Kosatka'},@{id='type-car_meet';type='car_meet';name='LS Car Meet'})
foreach ($location in $targets) {
    $key = "$($location.type)|$(Normalize-PropertyName $location.name)"
    $candidate = $candidates[$key]
    if ($special.ContainsKey($key)) { $candidate = @{page=$special[$key]} }
    elseif ($special.ContainsKey($location.type)) { $candidate = @{page=$special[$location.type]} }
    if (!$candidate) { $missing += "$($location.id): $($location.name) [$key]"; continue }
    if ($candidate.page) {
        if (!$pageImages.ContainsKey($candidate.page)) {
            $html = Read-Wiki $candidate.page
            $image = [regex]::Match($html,'<meta property="og:image" content="([^"]+)"')
            if (!$image.Success) { throw "Missing building image: $($candidate.page)" }
            $pageImages[$candidate.page] = [Net.WebUtility]::HtmlDecode($image.Groups[1].Value)
        }
        $candidate.url = $pageImages[$candidate.page]
        if ($candidate.url -match '/thumb/') { $candidate.url = $candidate.url -replace '/\d+px-', '/480px-' }
        else { $candidate.url = $candidate.url -replace '/images/([^/?]+)', '/images/thumb/$1/480px-$1' }
        $candidate.source = "https://gta.wiki/w/$($candidate.page)"
    }
    $url = $candidate.url
    if ($location.type -eq 'casino') { $url = 'https://gta.wiki/images/thumb/TheDiamondCasino%26Resort-GTAO-DayView.png/480px-TheDiamondCasino%26Resort-GTAO-DayView.png' }
    $filename = [Uri]::UnescapeDataString(([Uri]$url).AbsolutePath.Split('/')[-1])
    $path = Join-Path $destination $filename
    if (!(Test-Path -LiteralPath $path)) { Invoke-WebRequest -Uri $url -OutFile $path -UseBasicParsing }
    $result[$location.id] = [ordered]@{image="assets/properties/$filename";label=$location.name;sourceUrl=$candidate.source;originalUrl=$url}
}
Write-Output "Property images: $($result.Count)"
$missing | Write-Output
if ($missing.Count) { throw 'Some properties could not be resolved; review the source listings.' }
[IO.File]::WriteAllText($manifestPath, ('const PROPERTY_IMAGES = ' + (ConvertTo-Json -InputObject $result -Depth 4 -Compress) + ';'), (New-Object Text.UTF8Encoding($false)))
