Add-Type -AssemblyName System.Drawing

function Create-LuxuryPwaIcon {
    param(
        [string]$Path,
        [int]$Width,
        [int]$Height,
        [string]$Letter
    )

    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Dark background canvas (#0F172A)
    $darkColor = [System.Drawing.ColorTranslator]::FromHtml("#0F172A")
    $graphics.Clear($darkColor)

    # Icon dimensions (85% of canvas for maskable padding)
    [float]$padding = $Width * 0.08
    [float]$boxW = $Width - ($padding * 2)
    [float]$boxH = $Height - ($padding * 2)
    [float]$radius = $boxW * 0.28

    # Path for rounded rectangle
    $rectPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rectPath.AddArc($padding, $padding, $radius, $radius, 180, 90)
    $rectPath.AddArc($padding + $boxW - $radius, $padding, $radius, $radius, 270, 90)
    $rectPath.AddArc($padding + $boxW - $radius, $padding + $boxH - $radius, $radius, $radius, 0, 90)
    $rectPath.AddArc($padding, $padding + $boxH - $radius, $radius, $radius, 90, 90)
    $rectPath.CloseFigure()

    # Fill Gradient Box (Orange gradient)
    $c1 = [System.Drawing.ColorTranslator]::FromHtml("#F97316")
    $c2 = [System.Drawing.ColorTranslator]::FromHtml("#EA580C")
    $p1 = New-Object System.Drawing.PointF($padding, $padding)
    $p2 = New-Object System.Drawing.PointF(($padding + $boxW), ($padding + $boxH))
    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($p1, $p2, $c1, $c2)

    $graphics.FillPath($gradBrush, $rectPath)

    # Draw White Letter "أ" or "S"
    [float]$fontSize = $boxW * 0.50
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $boxRect = New-Object System.Drawing.RectangleF($padding, $padding, $boxW, $boxH)
    $graphics.DrawString($Letter, $font, $whiteBrush, $boxRect, $sf)

    # Sparkle Dot (Top Left)
    [float]$dotSize = $boxW * 0.08
    [float]$dotX = $padding + ($boxW * 0.15)
    [float]$dotY = $padding + ($boxH * 0.15)
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 255, 255, 255))
    $graphics.FillEllipse($dotBrush, $dotX, $dotY, $dotSize, $dotSize)

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

    $font.Dispose()
    $whiteBrush.Dispose()
    $dotBrush.Dispose()
    $gradBrush.Dispose()
    $rectPath.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()

    Write-Host "Successfully Created Luxury Icon: $Path ($Width x $Height)"
}

$publicDir = Join-Path $PSScriptRoot "..\public"

Create-LuxuryPwaIcon -Path (Join-Path $publicDir "icon-192.png") -Width 192 -Height 192 -Letter "A"
Create-LuxuryPwaIcon -Path (Join-Path $publicDir "icon-512.png") -Width 512 -Height 512 -Letter "A"
Create-LuxuryPwaIcon -Path (Join-Path $publicDir "apple-touch-icon.png") -Width 180 -Height 180 -Letter "A"
Create-LuxuryPwaIcon -Path (Join-Path $publicDir "shortcut-192.png") -Width 192 -Height 192 -Letter "S"
