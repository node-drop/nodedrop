# Copy All Widgets to Public Directory
# This makes all widgets accessible via the frontend dev server

Write-Host "Copying all widgets to public directory..." -ForegroundColor Green

# Get the frontend root directory (parent of widgets/)
$frontendRoot = Split-Path -Parent $PSScriptRoot

$copiedWidgets = @()
$failedWidgets = @()

# Copy chat widget
Write-Host "Processing chat widget..." -ForegroundColor Cyan
$chatSourceDir = Join-Path $frontendRoot "dist/chat"
$chatPublicDir = Join-Path $frontendRoot "public/widgets/chat"

if (Test-Path $chatSourceDir) {
    if (-Not (Test-Path $chatPublicDir)) {
        New-Item -ItemType Directory -Path $chatPublicDir -Force | Out-Null
    }
    
    try {
        Get-ChildItem -Path $chatSourceDir -File | Copy-Item -Destination $chatPublicDir -Force
        Write-Host "Chat widget copied successfully!" -ForegroundColor Green
        $copiedWidgets += "chat"
    } catch {
        Write-Host "Error copying chat widget: $($_.Exception.Message)" -ForegroundColor Red
        $failedWidgets += "chat"
    }
} else {
    Write-Host "Chat widget not built. Run 'npm run build:widget:chat' first" -ForegroundColor Yellow
    $failedWidgets += "chat"
}

# Copy form widget
Write-Host "Processing form widget..." -ForegroundColor Cyan
$formSourceDir = Join-Path $frontendRoot "dist/form"
$formPublicDir = Join-Path $frontendRoot "public/widgets/form"

if (Test-Path $formSourceDir) {
    if (-Not (Test-Path $formPublicDir)) {
        New-Item -ItemType Directory -Path $formPublicDir -Force | Out-Null
    }
    
    try {
        Get-ChildItem -Path $formSourceDir -File | Copy-Item -Destination $formPublicDir -Force
        Write-Host "Form widget copied successfully!" -ForegroundColor Green
        $copiedWidgets += "form"
    } catch {
        Write-Host "Error copying form widget: $($_.Exception.Message)" -ForegroundColor Red
        $failedWidgets += "form"
    }
} else {
    Write-Host "Form widget not built. Run 'npm run build:widget:form' first" -ForegroundColor Yellow
    $failedWidgets += "form"
}

Write-Host ""
Write-Host "Copy Summary:" -ForegroundColor White

if ($copiedWidgets.Count -gt 0) {
    Write-Host "Successfully copied widgets:" -ForegroundColor Green
    foreach ($widgetName in $copiedWidgets) {
        Write-Host "  - $widgetName" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Widgets are now accessible at:" -ForegroundColor Cyan
    if ($copiedWidgets -contains "chat") {
        Write-Host "  -> http://localhost:3001/widgets/chat/nd-chat-widget.umd.js" -ForegroundColor Gray
    }
    if ($copiedWidgets -contains "form") {
        Write-Host "  -> http://localhost:3001/widgets/form/nd-form-widget.umd.js" -ForegroundColor Gray
    }
}

if ($failedWidgets.Count -gt 0) {
    Write-Host "Failed to copy widgets:" -ForegroundColor Red
    foreach ($widgetName in $failedWidgets) {
        Write-Host "  - $widgetName" -ForegroundColor Red
    }
}

if ($copiedWidgets.Count -eq 0) {
    Write-Host "No widgets were copied. Make sure to build them first." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host ""
    Write-Host "Widget copy completed!" -ForegroundColor Green
}