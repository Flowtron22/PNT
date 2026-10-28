# Branded PWA icons. Android uses these for the mandatory system launch splash,
# so the background intentionally matches the first painted game frame.
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot 'assets\pnt\logo.png'
$outputFolder = Join-Path $projectRoot 'assets\pnt\icons'
New-Item -ItemType Directory -Force -Path $outputFolder | Out-Null
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
try {
    foreach ($iconSize in @(192, 512)) {
        $bitmap = [System.Drawing.Bitmap]::new($iconSize, $iconSize)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#171329'))
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $safeSize = $iconSize * 0.78
            $ratio = [Math]::Min($safeSize / $sourceImage.Width, $safeSize / $sourceImage.Height)
            $width = [single]($sourceImage.Width * $ratio)
            $height = [single]($sourceImage.Height * $ratio)
            $graphics.DrawImage($sourceImage, [single](($iconSize - $width) / 2), [single](($iconSize - $height) / 2), $width, $height)
            $bitmap.Save((Join-Path $outputFolder "icon-$iconSize-brand.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $graphics.Dispose()
            $bitmap.Dispose()
        }
    }
} finally {
    $sourceImage.Dispose()
}
