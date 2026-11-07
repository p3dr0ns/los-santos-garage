$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/parse-vehicle-reference.ps1')
. (Join-Path $PSScriptRoot '../scripts/resolve-vehicle-reference.ps1')
$fixture = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'fixtures/sentinel-gts.html'))
$row = ConvertFrom-GtaBaseVehicleHtml $fixture 'https://www.gtabase.com/vehicles/grand-theft-auto-v/sentinel-gts' '2026-11-07'
if ($row.model -ne 'sentinel5' -or $row.price -ne 2172000 -or $row.tradePrice -ne 1629000 -or $row.topSpeedKmh -ne 212.84) { throw 'Sentinel: prices or tested speed do not match the source.' }
if ($row.basedOn -ne 'BMW M3 (G80)' -or $row.seats -ne 4 -or $row.weightKg -ne 1870 -or $row.drivetrain -ne 'RWD' -or $row.gears -ne 6) { throw 'Sentinel: technical specifications do not match the source.' }
if ($row.stats.speed -ne 89.44 -or $row.stats.acceleration -ne 82.5 -or $row.stats.braking -ne 23.33 -or $row.stats.handling -ne 75.76 -or $row.stats.overall -ne 67.76) { throw 'Sentinel: statistics do not match the source.' }
$zentorno = ConvertFrom-GtaBaseVehicleHtml ([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'fixtures/pegassi-zentorno.html'))) 'https://www.gtabase.com/grand-theft-auto-v/vehicles/pegassi-zentorno' '2026-11-07'
if ($null -ne $zentorno.tradePrice -or $zentorno.price -ne 725000 -or $zentorno.stats.overall -ne 71.92) { throw 'Zentorno: an absent trade price must remain unknown.' }
$unknown = ConvertFrom-GtaBaseVehicleHtml '<li class="field-entry in-game-model-name "><span class="field-label">Model ID</span><span class="field-value">test</span></li><li class="field-entry price "><span class="field-value">$0</span></li>' 'https://example.test' '2026-11-07'
if ($unknown.price -ne 0 -or $null -ne $unknown.tradePrice -or $null -ne $unknown.stats.speed -or $null -ne $unknown.seats) { throw 'Unknown fields must not become zero or inherit another vehicle.' }
if ($null -ne (ConvertFrom-GtaBaseVehicleHtml '<h1>Not a vehicle</h1>' 'https://example.test' '2026-11-07')) { throw 'Pages without a model ID must be excluded.' }
$otherFields = '<li class="field-entry price-story "><span class="field-value">$1</span></li><li class="field-entry top-speed "><span class="field-value">999.00 km/h</span></li><li class="field-entry top-speed-broughy-hsw "><span class="field-value">777.00 km/h</span></li>'
$normal = ConvertFrom-GtaBaseVehicleHtml ($otherFields + $fixture) 'https://example.test' '2026-11-07'
if ($normal.price -ne 2172000 -or $normal.topSpeedKmh -ne 212.84) { throw 'Story price, HSW and game-file speed must not replace Online price and tested standard speed.' }
$free = ConvertFrom-GtaBaseVehicleHtml ($fixture -replace '\$2,172,000', 'Free') 'https://example.test' '2026-11-07'
if ($free.price -ne 0 -or $free.tradePrice -ne 1629000) { throw 'A published free price must remain zero.' }
$testCatalog = @(
    [pscustomobject]@{ id = 'sentinel5'; name = 'Sentinel GTS'; brand = 'Ubermacht'; models = @('sentinel5', 'sentinel5alt') },
    [pscustomobject]@{ id = 'driftsentinel5'; name = 'Sentinel GTS (Drift)'; brand = 'Ubermacht'; models = @('driftsentinel5') }
)
$composite = ConvertFrom-GtaBaseVehicleHtml ($fixture.Replace('>sentinel5<', '>sentinel5alt, sentinel5<')) 'https://example.test' '2026-11-07'
$resolved = @(Resolve-VehicleReference $composite $testCatalog)
if ($resolved.Count -ne 1 -or $resolved[0].model -ne 'sentinel5') { throw 'Explicit composite IDs must resolve once, without inheriting into Drift variants.' }
$alternateField = ConvertFrom-GtaBaseVehicleHtml ($fixture.Replace('in-game-model-name', 'model-id')) 'https://example.test' '2026-11-07'
if ($alternateField.model -ne 'sentinel5') { throw 'The alternate model-id field must be supported.' }
Write-Output 'PASS: vehicle reference parser (source fixtures, missing fields and zero).'
