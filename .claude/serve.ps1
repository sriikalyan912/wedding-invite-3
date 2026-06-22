# Minimal static file server for previewing the site (no Node/Python needed).
# Bound to 0.0.0.0 so it's reachable from other devices on the same WiFi.
# Handles each connection on its own thread (runspace) with read timeouts,
# so a slow/idle client can never block the whole server. No admin required.
$port = 5050
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
$listener.Start()
Write-Host "Serving $root on http://0.0.0.0:$port/  (reachable from this WiFi)"

# Worker scriptblock: handle ONE client connection start-to-finish.
$worker = {
  param($client, $root)

  $mime = @{
    ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8";
    ".js" = "application/javascript; charset=utf-8"; ".json" = "application/json";
    ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"; ".png" = "image/png";
    ".svg" = "image/svg+xml"; ".txt" = "text/plain; charset=utf-8";
    ".ico" = "image/x-icon"; ".webp" = "image/webp"; ".gif" = "image/gif"
  }

  try {
    $client.ReceiveTimeout = 3000
    $client.SendTimeout = 5000
    $stream = $client.GetStream()
    $stream.ReadTimeout = 3000

    $reader = New-Object System.IO.StreamReader($stream)
    $requestLine = $reader.ReadLine()
    if (-not [string]::IsNullOrEmpty($requestLine)) {
      $parts = $requestLine.Split(" ")
      $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { "/" }
      $rawPath = $rawPath.Split("?")[0]
      $rel = [System.Uri]::UnescapeDataString($rawPath.TrimStart("/"))
      if ([string]::IsNullOrEmpty($rel)) { $rel = "index.html" }
      $rel = $rel -replace "/", "\"

      $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
      if (-not $full.StartsWith($root)) { $full = $null }  # block path traversal

      if ($full -and (Test-Path $full -PathType Leaf)) {
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $ct = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
        $header = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nCache-Control: no-cache`r`n`r`n"
        $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($hb, 0, $hb.Length)
        $stream.Write($bytes, 0, $bytes.Length)
      } else {
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rel")
        $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($hb, 0, $hb.Length)
        $stream.Write($body, 0, $body.Length)
      }
      $stream.Flush()
    }
  } catch { }
  finally { try { $client.Close() } catch {} }
}

# Shared runspace pool so each connection runs concurrently.
$pool = [RunspaceFactory]::CreateRunspacePool(1, 16)
$pool.Open()

while ($true) {
  try {
    $client = $listener.AcceptTcpClient()
    $ps = [PowerShell]::Create()
    $ps.RunspacePool = $pool
    [void]$ps.AddScript($worker).AddArgument($client).AddArgument($root)
    [void]$ps.BeginInvoke()   # fire-and-forget; runspace pool reclaims it
  } catch { }
}
