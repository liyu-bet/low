# Start LOW-owned Postgres on 127.0.0.1:5433 (data dir sibling to this repo).
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$lowParent = Split-Path $repoRoot -Parent
$pgBin = Join-Path $lowParent '..\DSD\pgsql\bin'
$pgBin = [System.IO.Path]::GetFullPath($pgBin)
$pgData = Join-Path $lowParent 'pgdata'
$pgLog = Join-Path $lowParent 'pg-local.log'

if (-not (Test-Path (Join-Path $pgBin 'pg_ctl.exe'))) {
  throw "PostgreSQL binaries not found at $pgBin"
}
if (-not (Test-Path (Join-Path $pgData 'PG_VERSION'))) {
  throw "Postgres data dir missing: $pgData"
}

$status = & (Join-Path $pgBin 'pg_ctl.exe') -D $pgData status 2>&1 | Out-String
if ($status -notmatch 'server is running') {
  Write-Host 'Starting LOW PostgreSQL on 127.0.0.1:5433 ...'
  & (Join-Path $pgBin 'pg_ctl.exe') -D $pgData -l $pgLog -o '-p 5433' start
  if ($LASTEXITCODE -ne 0) { throw 'Failed to start PostgreSQL' }
  Start-Sleep -Seconds 2
} else {
  Write-Host 'LOW PostgreSQL already running.'
}

Write-Host 'OK — DATABASE_URL=postgresql://low:CHANGE_ME@127.0.0.1:5433/low'
