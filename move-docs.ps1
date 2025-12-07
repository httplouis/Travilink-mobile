# Script to move documentation files to docs/ folder
# Run this from the repository root

Write-Host "Moving documentation files to docs/ folder..." -ForegroundColor Cyan

# Create docs folder if it doesn't exist
if (-not (Test-Path "docs")) {
    New-Item -ItemType Directory -Path "docs" | Out-Null
    Write-Host "Created docs/ folder" -ForegroundColor Green
}

# Array of markdown files to move
$mdFiles = @(
    "APIS_AND_LIBRARIES.md",
    "ASSIGNMENT_COMPLIANCE.md",
    "CRITICAL_FIXES.md",
    "DATA_SOURCES_VERIFICATION.md",
    "FIXES_APPLIED.md",
    "FIXES_COMPLETE.md",
    "FIXES_SUMMARY.md",
    "GOOGLE_MAPS_CHECKLIST.md",
    "GOOGLE_MAPS_SETUP.md",
    "MAP_API_KEY_GUIDE.md",
    "MAP_FIX_INSTRUCTIONS.md",
    "PROJECT_STATUS.md",
    "TRAVILINK_WEB_ANALYSIS.md",
    "ULTIMATE_PROMPT.md",
    "ULTIMATE_PROMPT_COMPLETE.md",
    "UX_IMPROVEMENTS_SUMMARY.md",
    "WEB_REPO_DEEP_DIVE.md"
)

# Array of text files to move
$txtFiles = @(
    "GROUPMATE'S PROMPTS.txt",
    "Imagine you're one of the top uiux.txt",
    "LIBRARIES_LIST.txt"
)

# Array of XML/draw.io files to move
$xmlFiles = @(
    "-- ================================.xml",
    "mxfile host=app.diagrams.net agent=.drawio.txt",
    "mxfile host=app.diagrams.net modifi.xml",
    "mxfile host=app.diagrams.net.xml"
)

$movedCount = 0
$notFoundCount = 0

# Move markdown files
Write-Host "`nMoving markdown files..." -ForegroundColor Yellow
foreach ($file in $mdFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs\" -Force
        Write-Host "  ✓ Moved: $file" -ForegroundColor Green
        $movedCount++
    } else {
        Write-Host "  ✗ Not found: $file" -ForegroundColor Gray
        $notFoundCount++
    }
}

# Move text files
Write-Host "`nMoving text files..." -ForegroundColor Yellow
foreach ($file in $txtFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs\" -Force
        Write-Host "  ✓ Moved: $file" -ForegroundColor Green
        $movedCount++
    } else {
        Write-Host "  ✗ Not found: $file" -ForegroundColor Gray
        $notFoundCount++
    }
}

# Move XML files
Write-Host "`nMoving XML/draw.io files..." -ForegroundColor Yellow
foreach ($file in $xmlFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs\" -Force
        Write-Host "  ✓ Moved: $file" -ForegroundColor Green
        $movedCount++
    } else {
        Write-Host "  ✗ Not found: $file" -ForegroundColor Gray
        $notFoundCount++
    }
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Files moved: $movedCount" -ForegroundColor Green
Write-Host "  Files not found: $notFoundCount" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nDone! Documentation files have been organized." -ForegroundColor Green

