Add-Type -AssemblyName System.Drawing

function Create-PwaIcon {
    param(
        [string]$Path,
        [int]$Width,
        [int]$Height,
        [string]$BgColorHex,
        [string]$Text
    )

    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml($BgColorHex)
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $graphics.FillRectangle($bgBrush, 0, 0, $Width, $Height)

    # Text if provided
    if ($Text) {
        $fontSize = [int]($Width * 0.25)
        $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
        $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

        $rect = New-Object System.Drawing.RectangleF(0, 0, $Width, $Height)
        $graphics.DrawString($Text, $font, $textBrush, $rect, $sf)
        $font.Dispose()
        $textBrush.Dispose()
    }

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $bgBrush.Dispose()
    $bitmap.Dispose()
    Write-Host "Created valid PNG: $Path ($Width x $Height)"
}

$publicDir = Join-Path $PSScriptRoot "..\public"

Create-PwaIcon -Path (Join-Path $publicDir "icon-192.png") -Width 192 -Height 192 -BgColorHex "#F97316" -Text "A"
Create-PwaIcon -Path (Join-Path $publicDir "icon-512.png") -Width 512 -Height 512 -BgColorHex "#F97316" -Text "A"
Create-PwaIcon -Path (Join-Path $publicDir "apple-touch-icon.png") -Width 180 -Height 180 -BgColorHex "#F97316" -Text "A"
Create-PwaIcon -Path (Join-Path $publicDir "shortcut-192.png") -Width 192 -Height 192 -BgColorHex "#F97316" -Text "S"

Create-PwaIcon -Path (Join-Path $publicDir "screenshot-mobile.png") -Width 640 -Height 1136 -BgColorHex "#0F172A" -Text "Alfsouq App"
Create-PwaIcon -Path (Join-Path $publicDir "screenshot-desktop.png") -Width 1280 -Height 800 -BgColorHex "#0F172A" -Text "Alfsouq Web"
