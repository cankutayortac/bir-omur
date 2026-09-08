$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'icons'
New-Item -ItemType Directory -Force -Path $iconDirectory | Out-Null
foreach ($iconSpec in @(@{Size=192;Name='icon-192.png'},@{Size=512;Name='icon-512.png'},@{Size=512;Name='icon-maskable.png'},@{Size=180;Name='apple-touch-icon.png'})) {
  $iconBitmap = [System.Drawing.Bitmap]::new($iconSpec.Size,$iconSpec.Size)
  $iconGraphics = [System.Drawing.Graphics]::FromImage($iconBitmap)
  $iconGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $iconGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#315a48'))
  $iconGraphics.ScaleTransform($iconSpec.Size / 512.0,$iconSpec.Size / 512.0)
  $iconPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#f1e8ce'),18)
  $iconPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $iconPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $iconGraphics.DrawLine($iconPen,256,372,256,211)
  $iconGraphics.DrawBezier($iconPen,256,286,139,284,145,155,145,155)
  $iconGraphics.DrawBezier($iconPen,145,155,263,154,269,248,256,286)
  $iconGraphics.DrawBezier($iconPen,256,232,254,120,374,122,374,122)
  $iconGraphics.DrawBezier($iconPen,374,122,381,230,295,237,256,232)
  $iconBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#b8c799'))
  $iconGraphics.FillEllipse($iconBrush,153,372,206,14)
  $iconBitmap.Save((Join-Path $iconDirectory $iconSpec.Name),[System.Drawing.Imaging.ImageFormat]::Png)
  $iconBrush.Dispose(); $iconPen.Dispose(); $iconGraphics.Dispose(); $iconBitmap.Dispose()
}
Write-Output 'Created 192px, 512px, maskable and Apple touch icons.'
