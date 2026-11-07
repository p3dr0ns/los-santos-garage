$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
# Versao fixada para permitir reproduzir o catalogo e auditar a fonte.
$revision = 'b8f9dfaee5139fe372f264df4030506d1450fd8a'
$source = "https://raw.githubusercontent.com/DurtyFree/gta-v-data-dumps/$revision/vehicles.json"
$temporaryFile = Join-Path $env:TEMP ('garage-catalog-' + [guid]::NewGuid().ToString('N') + '.json')
Invoke-WebRequest -Uri $source -OutFile $temporaryFile -UseBasicParsing
$vehicles = [IO.File]::ReadAllText($temporaryFile) | ConvertFrom-Json
$categories = @{
    COMPACT='Compacto'; SEDAN='Sedã'; SUV='SUV'; COUPE='Cupê'; MUSCLE='Muscle';
    SPORT_CLASSIC='Esportivo clássico'; SPORT='Esportivo'; SUPER='Super';
    OFF_ROAD='Off-road'; VAN='Van'; OPEN_WHEEL='Fórmula'; MOTORCYCLE='Motocicleta'
}
$types = @('CAR','BIKE','QUADBIKE','AMPHIBIOUS_QUADBIKE','AMPHIBIOUS_AUTOMOBILE','SUBMARINECAR')
$brandNames = @{ UBERMACHT='Übermacht'; OVERFLOD='Överflöd' }
$displayNames = @{ sentinel3='Sentinel Classic'; kuruma2='Kuruma Blindado' }
$models = @{}
foreach ($vehicle in $vehicles) {
    if ($vehicle.Type -notin $types -or !$categories.ContainsKey($vehicle.Class)) { continue }
    $id = $vehicle.Name.ToLowerInvariant()
    $name = $vehicle.DisplayName.English
    if (!$name) { continue }
    if ($displayNames.ContainsKey($id)) { $name = $displayNames[$id] }
    if ($id.StartsWith('drift')) { $name += ' (Drift)' }
    $brand = $vehicle.ManufacturerDisplayName.English
    if ($brandNames.ContainsKey([string]$vehicle.Manufacturer)) { $brand = $brandNames[[string]$vehicle.Manufacturer] }
    if (!$brand) { $brand = '' }
    $aliases = @($vehicle.DisplayName.English, $vehicle.DisplayName.Portuguese, $id, $name) | Where-Object { $_ } | Sort-Object -Unique
    # Unifica somente nomes/classes/fabricantes iguais. Preserva codigos como aliases.
    $key = "$brand|$name|$($vehicle.Class)"
    if ($models.ContainsKey($key)) {
        $models[$key].aliases = @($models[$key].aliases + $aliases | Sort-Object -Unique)
        $models[$key].models = @($models[$key].models + $id | Sort-Object -Unique)
    } else {
        $models[$key] = [ordered]@{ id=$id; name=$name; brand=$brand; category=$categories[$vehicle.Class]; type= $(if ($vehicle.Type -in @('BIKE','QUADBIKE','AMPHIBIOUS_QUADBIKE')) { 'motorcycle' } else { 'car' }); aliases=@($aliases); models=@($id) }
    }
}
$orderedModels = @($models.Values | Sort-Object { $_.name }, { $_.brand }, { $_.category })
$brands = @($orderedModels | ForEach-Object { $_.brand } | Where-Object { $_ } | Sort-Object -Unique)
$catalog = [ordered]@{ source=$source; revision=$revision; gameVersion='v3717.0 / GTA Online 1.72'; retrieved='2026-11-06'; brands=$brands; vehicles=$orderedModels }
$destination = Join-Path $projectRoot 'assets\vehicle-catalog.js'
$content = '// Catalogo local. Fonte, filtros e atualizacao: CATALOGO.md.' + "`nconst VEHICLE_CATALOG = " + ($catalog | ConvertTo-Json -Depth 8 -Compress) + ";`n"
[IO.File]::WriteAllText($destination, $content, (New-Object Text.UTF8Encoding($false)))
Write-Output "Catalogo: $($orderedModels.Count) modelos, $($brands.Count) marcas."
