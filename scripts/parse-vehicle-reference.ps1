function ConvertFrom-GtaBaseVehicleHtml {
    param([string]$Html, [string]$Url, [string]$Retrieved)
    function Get-ReferenceField([string]$Name) {
        $entry = [regex]::Match($Html, '(?s)<li\b[^>]*class="field-entry\s+' + [regex]::Escape($Name) + '(?:\s+[^"]*)?"[^>]*>(.*?)</li>')
        $value = [regex]::Match($entry.Groups[1].Value, '(?s)<(?:span|div)\b[^>]*class="field-value(?:\s+[^"]*)?"[^>]*>(.*)')
        if (!$value.Success) { return $null }
        $text = [Net.WebUtility]::HtmlDecode([regex]::Replace($value.Groups[1].Value, '<[^>]+>', ' '))
        return ([regex]::Replace($text, '\s+', ' ')).Trim()
    }
    function Get-ReferenceNumber([string]$Text, [string]$Pattern = '^([\d,.]+)') {
        $match = [regex]::Match($Text, $Pattern)
        if (!$match.Success) { return $null }
        return [double]::Parse($match.Groups[1].Value.Replace(',', ''), [Globalization.CultureInfo]::InvariantCulture)
    }
    function Get-ReferencePrice([string]$Text) {
        if ($Text -match '^Free\b') { return 0 }
        return Get-ReferenceNumber $Text '\$([\d,]+)'
    }
    $model = Get-ReferenceField 'in-game-model-name'
    if (!$model) { $model = Get-ReferenceField 'model-id' }
    if (!$model) { return $null }
    $heading = [regex]::Match($Html, '(?s)<h1\b[^>]*>(.*?)</h1>')
    $sourceName = ([regex]::Replace([Net.WebUtility]::HtmlDecode([regex]::Replace($heading.Groups[1].Value, '<[^>]+>', ' ')), '\s+', ' ')).Trim()
    $variants = @([regex]::Matches($Html, '(?s)<span class="field-entry variant-name"[^>]*>\s*<span class="field-label">.*?</span>\s*<span class="field-value\s*">(.*?)</span>') | ForEach-Object { [Net.WebUtility]::HtmlDecode([regex]::Replace($_.Groups[1].Value, '<[^>]+>', '')).Trim() } | Select-Object -Unique)
    $stats = [ordered]@{}
    foreach ($field in @('speed', 'acceleration', 'braking', 'handling', 'overall')) { $stats[$field] = Get-ReferenceNumber (Get-ReferenceField $field) }
    [pscustomobject]@{
        schemaVersion = 2
        model = $model
        modelIds = @($model -split '\s*,\s*')
        sourceName = $sourceName
        variants = $variants
        url = $Url
        retrieved = $Retrieved
        price = Get-ReferencePrice (Get-ReferenceField 'price')
        tradePrice = Get-ReferencePrice (Get-ReferenceField 'trade-price')
        topSpeedKmh = Get-ReferenceNumber (Get-ReferenceField 'top-speed-broughy') '([\d.]+) km/h'
        basedOn = Get-ReferenceField 'based-on'
        seats = Get-ReferenceNumber (Get-ReferenceField 'seats')
        weightKg = Get-ReferenceNumber (Get-ReferenceField 'weight')
        drivetrain = Get-ReferenceField 'drivetrain'
        gears = Get-ReferenceNumber (Get-ReferenceField 'gears')
        stats = $stats
    }
}
