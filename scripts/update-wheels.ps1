$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$projectRoot = Split-Path -Parent $PSScriptRoot
$groups = @(
    @{id='sport';label='Esportivas';type=0}, @{id='muscle';label='Muscle';type=1},
    @{id='lowrider';label='Lowrider';type=2}, @{id='suv';label='SUV';type=3},
    @{id='offroad';label='Off-road';type=4}, @{id='tuner';label='Tuning';type=5},
    @{id='bike';label='Motos';type=6}, @{id='bike-rear';label='Motos - traseiras';type=6},
    @{id='high-end';label='Luxo / High End';type=7},
    @{id='bennys-original';label="Benny's Original";type=8}, @{id='bennys-bespoke';label="Benny's Bespoke";type=9},
    @{id='open-wheel';label='Formula / Open Wheel';type=10}, @{id='street';label='Rua / Street';type=11},
    @{id='track';label='Pista / Track';type=12}
)
$client = New-Object Net.Http.HttpClient
$client.DefaultRequestHeaders.UserAgent.ParseAdd('MinhaGaragemCatalog/1.0')
$client.Timeout = [TimeSpan]::FromSeconds(40)
try {
    $pending = @{}
    foreach ($group in $groups) { $pending[$group.id] = $client.GetStringAsync("https://gtahash.com/vehicle-mods/wheels/$($group.id)") }
    $pages = @{}
    foreach ($group in $groups) { $pages[$group.id] = @($pending[$group.id].GetAwaiter().GetResult()) }
    $nextPages = @()
    foreach ($group in $groups) {
        $count = [regex]::Match($pages[$group.id][0], 'type \d+ [^<]*slot \d+ [^<]*?(\d+) rims</p>')
        if (!$count.Success) { throw "Wheel count missing for $($group.id)" }
        $totalPages = [Math]::Ceiling([int]$count.Groups[1].Value / 48.0)
        for ($number=2; $number -le $totalPages; $number++) {
            $nextPages += @{ group=$group.id; task=$client.GetStringAsync("https://gtahash.com/vehicle-mods/wheels/$($group.id)?page=$number") }
        }
    }
    foreach ($request in $nextPages) { $pages[$request.group] += $request.task.GetAwaiter().GetResult() }
    $result = @()
    foreach ($group in $groups) {
        $byName = @{}
        foreach ($html in $pages[$group.id]) {
            $matches = [regex]::Matches($html, 'class="v2-asset-name[^>]+title="([^"]+)" href="/vehicle-mods/wheels/([^"]+)"')
            if (!$matches.Count) { throw "Wheel entries missing for $($group.id)" }
            foreach ($match in $matches) {
                $name = [Net.WebUtility]::HtmlDecode($match.Groups[1].Value)
                if (!$byName.ContainsKey($name)) { $byName[$name] = [ordered]@{ name=$name; models=@() } }
                $byName[$name].models += $match.Groups[2].Value
            }
        }
        $wheels = @($byName.Values | Sort-Object { $_.name })
        foreach ($wheel in $wheels) { $wheel.models = @($wheel.models | Sort-Object -Unique) }
        $result += [ordered]@{ id=$group.id; label=$group.label; gameType=$group.type; wheels=$wheels }
    }
    $catalog = [ordered]@{ source='https://gtahash.com/vehicle-mods/wheels'; retrieved='2026-11-06'; groups=$result }
    $content = '// Catalogo local de rodas. Fonte e criterios: RODAS.md.' + "`nconst WHEEL_CATALOG = " + ($catalog | ConvertTo-Json -Depth 9 -Compress) + ";`n"
    [IO.File]::WriteAllText((Join-Path $projectRoot 'assets\wheel-catalog.js'), $content, (New-Object Text.UTF8Encoding($false)))
    Write-Output "Wheel catalog: $($result.Count) groups, $(($result | ForEach-Object { $_.wheels.Count } | Measure-Object -Sum).Sum) names."
} finally { $client.Dispose() }
