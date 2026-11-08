function Send-Cdp($socket, $method, $parameters) {
    $ErrorActionPreference = 'Stop'
    if ($socket.State -ne [Net.WebSockets.WebSocketState]::Open) { throw 'Browser socket is not connected.' }
    $script:messageId++
    $messageId = $script:messageId
    $json = @{ id = $messageId; method = $method; params = $parameters } | ConvertTo-Json -Depth 15 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $socket.SendAsync((New-Object 'ArraySegment[byte]' -ArgumentList @(,$bytes)), [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    do {
        $stream = New-Object IO.MemoryStream
        do {
            $buffer = New-Object byte[] 65536
            $cancellation = New-Object Threading.CancellationTokenSource(35000)
            try { $part = $socket.ReceiveAsync((New-Object 'ArraySegment[byte]' -ArgumentList @(,$buffer)), $cancellation.Token).GetAwaiter().GetResult() }
            finally { $cancellation.Dispose() }
            $stream.Write($buffer, 0, $part.Count)
        } while (!$part.EndOfMessage)
        $response = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
        $stream.Dispose()
    } while ($response.id -ne $messageId)
    if ($response.error) { throw ($response.error | ConvertTo-Json -Compress) }
    return $response.result
}
function Wait-BrowserCondition($socket, [string]$expression) {
    $deadline = [DateTime]::UtcNow.AddSeconds(25)
    do {
        try {
            $result = Send-Cdp $socket 'Runtime.evaluate' @{ expression = $expression; returnByValue = $true }
            if ($result.result.value -eq $true) { return }
        } catch {
            if ($_.Exception.Message -notmatch 'navigated|context|Cannot find') { throw }
        }
        Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "Browser condition timed out: $expression"
}
