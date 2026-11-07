param([string[]]$ModelIds, [string]$CacheDirectory)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$raw = [IO.File]::ReadAllText((Join-Path $root 'assets/vehicle-reference.js'))
$references = $raw.Substring($raw.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
$entries = @($references.PSObject.Properties | Where-Object { !$ModelIds -or $_.Name -in $ModelIds })
$collect = {
        param($id, $url, $cache)
        try {
            if ($cache -and (Test-Path (Join-Path $cache "$id.html"))) { $html = [IO.File]::ReadAllText((Join-Path $cache "$id.html")) }
            else { Start-Sleep -Seconds 3; $html = (Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 45).Content }
            $image = [regex]::Match($html, 'property="og:image"\s+content="([^"]+)"').Groups[1].Value
            if (!$image) { $image = [regex]::Match($html, 'name="og:image"\s+content="([^"]+)"').Groups[1].Value }
            $table = [regex]::Match($html, '(?s)<table[^>]*class="fields-container table-border-top"[^>]*>(.*?)</table>').Groups[1].Value
            $groups = @(); $current = $null
            foreach ($row in [regex]::Matches($table, '(?s)<tr\b[^>]*>(.*?)</tr>')) {
                $heading = [regex]::Match($row.Value, '(?s)<th\s+colspan="3"[^>]*>(.*?)</th>')
                if ($heading.Success) {
                    $current = [ordered]@{ name = [Net.WebUtility]::HtmlDecode(($heading.Groups[1].Value -replace '<[^>]+>', '')).Trim(); options = @() }
                    $groups += $current
                } elseif ($current) {
                    $cells = @([regex]::Matches($row.Value, '(?s)<td\b[^>]*>(.*?)</td>') | ForEach-Object { [Net.WebUtility]::HtmlDecode(($_.Groups[1].Value -replace '<[^>]+>', '')).Trim() })
                    if ($cells.Count -ge 3 -and $cells[0] -and $cells[2] -match '\$') { $current.options += @{ name = $cells[0]; price = [int]($cells[2] -replace '[^0-9]', '') } }
                }
            }
            [pscustomobject]@{ id = $id; value = @{ image = [Net.WebUtility]::HtmlDecode($image); url = $url; retrieved = (Get-Date -Format 'yyyy-MM-dd'); groups = @($groups | Where-Object { $_.options.Count -gt 0 }) } }
        } catch { [pscustomobject]@{ id = $id; error = $_.Exception.Message } }
}
$result = [ordered]@{}; $errors = @()
$target = Join-Path $root 'assets/vehicle-customization.js'
if (Test-Path $target) {
    $previous = [IO.File]::ReadAllText($target)
    $previousData = $previous.Substring($previous.IndexOf('{')).Trim().TrimEnd(';') | ConvertFrom-Json
    foreach ($property in $previousData.PSObject.Properties) { $result[$property.Name] = $property.Value }
}
foreach ($entry in $entries) {
    $record = & $collect $entry.Name $entry.Value.url $CacheDirectory
    if ($record.error) {
        $errors += $record
        if ($record.error -match '429') { Write-Warning 'Source rate limit reached. Collection stopped; retry missing ModelIds later.'; break }
    } else {
        $localImage = 'assets/configurator/' + $record.id + '.jpg'
        if (Test-Path (Join-Path $root $localImage)) { $record.value.localImage = $localImage }
        $result[$record.id] = $record.value
    }
}
if ($result.Count -eq 0) { throw 'No customization data collected.' }
$target = Join-Path $root 'assets/vehicle-customization.js'
[IO.File]::WriteAllText($target, ('const VEHICLE_CUSTOMIZATION = ' + (ConvertTo-Json -InputObject $result -Depth 15 -Compress) + ';'), (New-Object Text.UTF8Encoding($false)))
$errors | ConvertTo-Json | Set-Content (Join-Path $root 'assets/customization-errors.json') -Encoding UTF8
Write-Output "Customization collected: $($result.Count); failures: $($errors.Count)"
