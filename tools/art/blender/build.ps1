$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$blender = Get-Command blender -ErrorAction SilentlyContinue
if ($blender) {
  $blenderPath = $blender.Source
} else {
  $candidate = Get-ChildItem -LiteralPath "$env:ProgramFiles\Blender Foundation" -Filter blender.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $candidate) { throw "Blender 5.x를 찾을 수 없습니다." }
  $blenderPath = $candidate.FullName
}

& $blenderPath --background --python (Join-Path $PSScriptRoot "render_neon_stage.py")
if ($LASTEXITCODE -ne 0) { throw "Blender 렌더에 실패했습니다." }

$source = Join-Path $root "tmp\blender\neon-run-stage.png"
$outputDirectory = Join-Path $root "public\assets\art\synth"
$output = Join-Path $outputDirectory "neon-run-stage.webp"
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
& ffmpeg -y -loglevel error -i $source -vf "eq=contrast=1.06:saturation=1.16:brightness=0.005" -c:v libwebp -quality 90 -compression_level 6 $output
if ($LASTEXITCODE -ne 0) { throw "WebP 변환에 실패했습니다." }

Write-Output "Blender stage asset created: $output"
