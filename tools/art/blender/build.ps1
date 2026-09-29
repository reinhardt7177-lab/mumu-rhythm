$ErrorActionPreference = "Stop"

# Runs Blender headless to export numeric stage geometry (no images, no .blend).
$blender = Get-Command blender -ErrorAction SilentlyContinue
if ($blender) {
  $blenderPath = $blender.Source
} else {
  $candidate = Get-ChildItem -LiteralPath "$env:ProgramFiles\Blender Foundation" -Filter blender.exe -Recurse -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $candidate) { throw "Blender 5.x를 찾을 수 없습니다. PATH에 blender를 추가하세요." }
  $blenderPath = $candidate.FullName
}

& $blenderPath --background --factory-startup --python-exit-code 1 --python (Join-Path $PSScriptRoot "export_stage_geometry.py")
if ($LASTEXITCODE -ne 0) { throw "Blender geometry export에 실패했습니다." }
