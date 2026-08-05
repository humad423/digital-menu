
$file = 'src\app\restaurant-panel\[id]\page.tsx'
$content = Get-Content $file -Raw
$marker = "`n}`n`n               🏪"
$idx = $content.IndexOf($marker)
if ($idx -gt 0) {
    $content.Substring(0, $idx + 3) | Set-Content $file -Encoding UTF8 -NoNewline
    Write-Host "Done: removed duplicate starting at $idx"
} else {
    Write-Host "Marker not found, trying alternative..."
    $marker2 = "🏪`r`n"
    $lines = Get-Content $file
    $cutLine = 809
    $lines[0..($cutLine-1)] | Set-Content $file -Encoding UTF8
    Write-Host "Truncated to line $cutLine"
}
