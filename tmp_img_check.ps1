Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($args[0])
Write-Host "$($img.Width)x$($img.Height)"
$img.Dispose()
