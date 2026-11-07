param([switch]$Refresh)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$cache = Join-Path $root '.cache/mapgenie'
New-Item -ItemType Directory -Path $cache -Force | Out-Null
$dataPath = Join-Path $cache 'locations.json'
if ($Refresh -or !(Test-Path $dataPath)) { Invoke-WebRequest 'https://gta-5-map.com/api/v1/maps/27/data' -UseBasicParsing -OutFile $dataPath }
$source = [IO.File]::ReadAllText($dataPath) | ConvertFrom-Json
$types = @{505='safehouse';506='garage';514='property_bunker';519='biker_clubhouse';520='office';518='facility';517='hangar';522='bat_club_property';27041='arcade';27042='agency';27043='auto_shop_property'}
$capacities = @{safehouse=10;garage=10;property_bunker=0;biker_clubhouse=10;office=60;facility=7;hangar=20;bat_club_property=31;arcade=10;agency=20;auto_shop_property=10;arena_workshop=27;casino=10;eclipse_boulevard=50}
$agencyNames = @{2415000='Agência · Rockford Hills';2145000='Agência · Vespucci Canals';2010000='Agência · Little Seoul';2830000='Agência · Hawick'}
$shopNames = @{1705000='Oficina de Tuning · Strawberry';1830000='Oficina de Tuning · Burton';1670000='Oficina de Tuning · Mission Row';1920000='Oficina de Tuning · La Mesa';1750000='Oficina de Tuning · Rancho'}
$locations = @()
foreach ($row in $source.locations) {
    if (!$types.ContainsKey([int]$row.category_id)) { continue }
    $type = $types[[int]$row.category_id]
    $label = $row.title
    if ($label -eq 'Arena Workshop') { $type = 'arena_workshop'; $label = 'Oficina da Arena · Maze Bank Arena' }
    if ($label -eq 'Casino Apartment') { $type = 'casino'; $label = 'Cobertura do Diamond Casino' }
    if ($label -eq 'Eclipse Blvd Garage') { $type = 'eclipse_boulevard'; $label = 'Eclipse Boulevard Garage' }
    $priceMatch = [regex]::Match($row.description, '\$([\d,]+)')
    $price = if ($priceMatch.Success) { [int]$priceMatch.Groups[1].Value.Replace(',','') } else { 0 }
    if ($type -eq 'agency' -and $agencyNames.ContainsKey($price)) { $label = $agencyNames[$price] }
    if ($type -eq 'auto_shop_property' -and $shopNames.ContainsKey($price)) { $label = $shopNames[$price] }
    $capacity = $capacities[$type]
    if ($type -in @('garage','safehouse')) {
        $size = [regex]::Match($row.description, '(?i)(\d+)[- ]car|Size:\*?\*?\s*(\d+) cars')
        if ($size.Success) { $capacity = [int]$(if ($size.Groups[1].Success) { $size.Groups[1].Value } else { $size.Groups[2].Value }) }
    }
    $dealer = if ($type -in @('garage','safehouse','eclipse_boulevard')) { 'dynasty8' } elseif ($type -in @('office','agency')) { 'executive' } elseif ($type -in @('casino','arena_workshop')) { 'special' } else { 'foreclosures' }
    $lat = [double]::Parse($row.latitude,[Globalization.CultureInfo]::InvariantCulture)
    $lon = [double]::Parse($row.longitude,[Globalization.CultureInfo]::InvariantCulture)
    $radians = $lat * [Math]::PI / 180
    $x = ($lon + 180) / 360 * 8192
    $y = (1 - [Math]::Log([Math]::Tan($radians) + 1 / [Math]::Cos($radians)) / [Math]::PI) / 2 * 8192
    if ($x -lt 0 -or $y -lt 0 -or $x -gt 2816 -or $y -gt 2816) { throw "Property outside map bounds: $label" }
    $locations += [ordered]@{ id=('mg-'+$row.id);name=$label;type=$type;dealer=$dealer;capacity=$capacity;capacityMode=$(if ($type -in @('office','bat_club_property','arena_workshop')) {'max'}else{'fixed'});x=[Math]::Round($x,3);y=[Math]::Round($y,3);sourceUrl=('https://gta-5-map.com/?locationIds='+$row.id) }
}
$tiles = Join-Path $root 'assets/map'
New-Item -ItemType Directory -Path $tiles -Force | Out-Null
$pool = [RunspaceFactory]::CreateRunspacePool(1,3); $pool.Open()
$blocked = [hashtable]::Synchronized(@{value=$false})
$jobs = foreach ($x in 0..10) { foreach ($y in 0..10) {
    $worker=[PowerShell]::Create(); $worker.RunspacePool=$pool
    [void]$worker.AddScript({
        param($x,$y,$tiles,$blocked)
        $path=Join-Path $tiles "$x-$y.png"
        if (Test-Path $path) { return }
        if ($blocked.value) { return "$x-$y" }
        try {
            Start-Sleep -Milliseconds 300
            Invoke-WebRequest "https://tiles.mapgenie.io/games/gta5/los-santos/atlas/5/$x/$y.png" -UseBasicParsing -TimeoutSec 25 -OutFile $path
        } catch {
            if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -in @(403,429)) { $blocked.value=$true }
            "$x-$y"
        }
    }).AddArgument($x).AddArgument($y).AddArgument($tiles).AddArgument($blocked)
    @{worker=$worker;handle=$worker.BeginInvoke()}
} }
$failures=@()
foreach($job in $jobs){ $failures+=@($job.worker.EndInvoke($job.handle)); $job.worker.Dispose() }
$pool.Close();$pool.Dispose()
if($failures.Count){throw ('Map tile downloads failed: '+($failures -join ', '))}
$catalog=[ordered]@{source='https://gta-5-map.com/';retrieved='2026-11-07';width=2816;height=2816;tileSize=256;columns=11;rows=11;locations=@($locations | Sort-Object { $_.name })}
[IO.File]::WriteAllText((Join-Path $root 'assets/property-locations.js'),('const PROPERTY_MAP = '+(ConvertTo-Json -InputObject $catalog -Depth 7 -Compress)+';'),(New-Object Text.UTF8Encoding($false)))
Write-Output "Property catalog: $($locations.Count); locations with permanent storage: $(@($locations|Where-Object {$_.capacity -gt 0}).Count); map tiles: 121."
