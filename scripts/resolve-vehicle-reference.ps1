function ConvertTo-ReferenceName([string]$Value) {
    $plain = $Value.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
    return ([regex]::Replace($plain.ToLowerInvariant(), '[^a-z0-9]+', ' ')).Trim()
}

function Resolve-VehicleReference {
    param($Reference, $Catalog)
    $candidates = @{}
    foreach ($code in $Reference.modelIds) {
        foreach ($model in @($Catalog | Where-Object { $_.models -contains $code })) {
            $rank = if ($model.id -eq $code) { 100 } else { 80 }
            if ($Reference.modelIds.Count -eq 1) { $rank += 5 }
            $name = ConvertTo-ReferenceName ($model.brand + ' ' + $model.name)
            if ($name -eq (ConvertTo-ReferenceName $Reference.sourceName)) { $rank += 40 }
            if (!$candidates.ContainsKey($model.id) -or $candidates[$model.id].rank -lt $rank) {
                $candidates[$model.id] = @{ rank = $rank; method = 'modelCode' }
            }
        }
    }
    # Exact complete name + manufacturer can resolve an incorrect ID in the source.
    if (!$candidates.Count -and $Reference.sourceName) {
        $byName = @($Catalog | Where-Object { $_.brand -and (ConvertTo-ReferenceName ($_.brand + ' ' + $_.name)) -eq (ConvertTo-ReferenceName $Reference.sourceName) })
        if ($byName.Count -eq 1) { $candidates[$byName[0].id] = @{ rank = 60; method = 'exactNameAndBrand' } }
    }
    # Arena pages explicitly publish a common sheet for these named variants.
    foreach ($name in $Reference.variants) {
        if ($name -notmatch '^(Apocalypse|Future Shock|Nightmare) ') { continue }
        $variants = @($Catalog | Where-Object { (ConvertTo-ReferenceName $_.name) -eq (ConvertTo-ReferenceName $name) })
        if ($variants.Count -eq 1 -and !$candidates.ContainsKey($variants[0].id)) {
            $candidates[$variants[0].id] = @{ rank = 30; method = 'sharedArenaVariant' }
        }
    }
    foreach ($id in $candidates.Keys) {
        $copy = [ordered]@{}
        foreach ($property in $Reference.PSObject.Properties) { $copy[$property.Name] = $property.Value }
        $copy.model = $id
        $copy.matchedBy = $candidates[$id].method
        $copy.matchRank = $candidates[$id].rank
        [pscustomobject]$copy
    }
}
