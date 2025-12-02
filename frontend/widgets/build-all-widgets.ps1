# Build All Widgets
# This builds all widget types in the project

Write-Host "Building all widgets..." -ForegroundColor Green

# Get the frontend root directory (parent of widgets/)
$frontendRoot = Split-Path -Parent $PSScriptRoot

# Change to frontend directory
Set-Location $frontendRoot

$builtWidgets = @()
$failedWidgets = @()

# Build chat widget
Write-Host ""
Write-Host "Building chat widget..." -ForegroundColor Cyan
try {
    npm run build:widget:chat
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Chat widget built successfully!" -ForegroundColor Green
        $builtWidgets += "chat"
    } else {
        Write-Host "Chat widget build failed!" -ForegroundColor Red
        $failedWidgets += "chat"
    }
} catch {
    Write-Host "Error building chat widget: $($_.Exception.Message)" -ForegroundColor Red
    $failedWidgets += "chat"
}

# Build form widget
Write-Host ""
Write-Host "Building form widget..." -ForegroundColor Cyan
try {
    npm run build:widget:form
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Form widget built successfully!" -ForegroundColor Green
        $builtWidgets += "form"
    } else {
        Write-Host "Form widget build failed!" -ForegroundColor Red
        $failedWidgets += "form"
    }
} catch {
    Write-Host "Error building form widget: $($_.Exception.Message)" -ForegroundColor Red
    $failedWidgets += "form"
}

Write-Host ""
Write-Host "Build Summary:" -ForegroundColor White

if ($builtWidgets.Count -gt 0) {
    Write-Host "Successfully built widgets:" -ForegroundColor Green
    foreach ($widgetName in $builtWidgets) {
        Write-Host "  - $widgetName" -ForegroundColor Green
    }
}

if ($failedWidgets.Count -gt 0) {
    Write-Host "Failed to build widgets:" -ForegroundColor Red
    foreach ($widgetName in $failedWidgets) {
        Write-Host "  - $widgetName" -ForegroundColor Red
    }
}

if ($failedWidgets.Count -eq 0) {
    Write-Host ""
    Write-Host "All widgets built successfully!" -ForegroundColor Green
    Write-Host "Run 'npm run copy:widgets' to copy them to public directory" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Some widgets failed to build. Check the errors above." -ForegroundColor Yellow
    exit 1
}