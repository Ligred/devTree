# Run E2E tests and generate an HTML report.
# Uses the built-in VSTest HTML logger (no extra tools required).
# Usage: ./run-e2e-with-report.ps1 [--headed] [--filter "Category=Login"]
# Example (headed, login tests only): ./run-e2e-with-report.ps1 --headed --filter "Category=Login"

param(
    [switch]$Headed,
    [string]$Filter = ""
)

$ErrorActionPreference = "Stop"
$projectDir = $PSScriptRoot
$resultsDir = Join-Path $projectDir "TestResults"
$trxPath = Join-Path $resultsDir "e2e-results.trx"
$reportPath = Join-Path $resultsDir "e2e-report.html"

# Ensure TestResults exists
if (-not (Test-Path $resultsDir)) { New-Item -ItemType Directory -Path $resultsDir | Out-Null }

# Build test command
$trxLoggerArgs = "trx;LogFileName=e2e-results.trx;LogFilePrefix=e2e"
$htmlLoggerArgs = "html;LogFileName=e2e-report.html"
$testArgs = @(
    "test",
    "--no-build",
    "--logger", $trxLoggerArgs,
    "--logger", $htmlLoggerArgs,
    "--results-directory", $resultsDir
)
if ($Headed) {
    $testArgs += "--settings", ".runsettings.headed"
}
if ($Filter) {
    $testArgs += "--filter", $Filter
}

Push-Location $projectDir
try {
    # Build first so --no-build works
    dotnet build -v q
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "Running E2E tests..." -ForegroundColor Cyan
    & dotnet @testArgs
    $testExit = $LASTEXITCODE

    if (Test-Path $reportPath) {
        Write-Host "Report: $reportPath" -ForegroundColor Green
    }

    exit $testExit
} finally {
    Pop-Location
}
