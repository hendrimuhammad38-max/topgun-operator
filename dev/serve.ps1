# Server statis kecil untuk uji lokal. Tidak dipakai saat aplikasi berjalan di Apps Script.
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.gs'='text/plain; charset=utf-8' }
$port = if ($env:PORT) { [int]$env:PORT } else { 8130 }
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
while ($true) {
  $client = $listener.AcceptTcpClient()
  $client.ReceiveTimeout = 300
  try {
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream)
    $line = $reader.ReadLine()
    while ($reader.ReadLine()) { }
    $rel = [uri]::UnescapeDataString(($line -split ' ')[1].Split('?')[0]).TrimStart('/')
    if (-not $rel -or $rel.EndsWith('/')) { $rel = "${rel}index.html" }
    $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
    if ($full.StartsWith($root) -and (Test-Path -LiteralPath $full -PathType Leaf)) {
      $body = [System.IO.File]::ReadAllBytes($full)
      $type = $types[[System.IO.Path]::GetExtension($full).ToLower()]
      if (-not $type) { $type = 'application/octet-stream' }
      $status = '200 OK'
    } else {
      $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      $type = 'text/plain'
      $status = '404 Not Found'
    }
    $head = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n")
    $stream.Write($head, 0, $head.Length)
    $stream.Write($body, 0, $body.Length)
    $stream.Flush()
  } catch { } finally { $client.Close() }
}
