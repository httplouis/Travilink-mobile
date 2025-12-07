# 📦 Files to Move to docs/ Folder

This document lists all files that should be moved from the repository root to the `docs/` folder to keep the repository organized.

## Markdown Files (.md)

Move these files from root to `docs/`:

- `APIS_AND_LIBRARIES.md`
- `ASSIGNMENT_COMPLIANCE.md`
- `CRITICAL_FIXES.md`
- `DATA_SOURCES_VERIFICATION.md`
- `FIXES_APPLIED.md`
- `FIXES_COMPLETE.md`
- `FIXES_SUMMARY.md`
- `GOOGLE_MAPS_CHECKLIST.md`
- `GOOGLE_MAPS_SETUP.md`
- `MAP_API_KEY_GUIDE.md`
- `MAP_FIX_INSTRUCTIONS.md`
- `PROJECT_STATUS.md`
- `TRAVILINK_WEB_ANALYSIS.md`
- `ULTIMATE_PROMPT.md`
- `ULTIMATE_PROMPT_COMPLETE.md`
- `UX_IMPROVEMENTS_SUMMARY.md`
- `WEB_REPO_DEEP_DIVE.md`

## Text Files (.txt)

Move these files from root to `docs/`:

- `GROUPMATE'S PROMPTS.txt`
- `Imagine you're one of the top uiux.txt`
- `LIBRARIES_LIST.txt`

## XML/Draw.io Files

Move these files from root to `docs/`:

- `-- ================================.xml`
- `mxfile host=app.diagrams.net agent=.drawio.txt`
- `mxfile host=app.diagrams.net modifi.xml`
- `mxfile host=app.diagrams.net.xml`

## Other Files

Consider moving or cleaning up:

- `java.util.concurrent.ThreadPoolExecutor$Worker` (appears to be a corrupted file)

---

## Quick Move Command (PowerShell)

Run this from the repository root:

```powershell
# Move markdown files
Move-Item -Path "APIS_AND_LIBRARIES.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "ASSIGNMENT_COMPLIANCE.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "CRITICAL_FIXES.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "DATA_SOURCES_VERIFICATION.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "FIXES_APPLIED.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "FIXES_COMPLETE.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "FIXES_SUMMARY.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "GOOGLE_MAPS_CHECKLIST.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "GOOGLE_MAPS_SETUP.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "MAP_API_KEY_GUIDE.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "MAP_FIX_INSTRUCTIONS.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "PROJECT_STATUS.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "TRAVILINK_WEB_ANALYSIS.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "ULTIMATE_PROMPT.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "ULTIMATE_PROMPT_COMPLETE.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "UX_IMPROVEMENTS_SUMMARY.md" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "WEB_REPO_DEEP_DIVE.md" -Destination "docs\" -ErrorAction SilentlyContinue

# Move text files
Move-Item -Path "GROUPMATE'S PROMPTS.txt" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "Imagine you're one of the top uiux.txt" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "LIBRARIES_LIST.txt" -Destination "docs\" -ErrorAction SilentlyContinue

# Move XML files
Move-Item -Path "-- ================================.xml" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "mxfile host=app.diagrams.net agent=.drawio.txt" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "mxfile host=app.diagrams.net modifi.xml" -Destination "docs\" -ErrorAction SilentlyContinue
Move-Item -Path "mxfile host=app.diagrams.net.xml" -Destination "docs\" -ErrorAction SilentlyContinue
```

## Quick Move Command (Bash/Git Bash)

Run this from the repository root:

```bash
# Move markdown files
mv APIS_AND_LIBRARIES.md docs/ 2>/dev/null
mv ASSIGNMENT_COMPLIANCE.md docs/ 2>/dev/null
mv CRITICAL_FIXES.md docs/ 2>/dev/null
mv DATA_SOURCES_VERIFICATION.md docs/ 2>/dev/null
mv FIXES_APPLIED.md docs/ 2>/dev/null
mv FIXES_COMPLETE.md docs/ 2>/dev/null
mv FIXES_SUMMARY.md docs/ 2>/dev/null
mv GOOGLE_MAPS_CHECKLIST.md docs/ 2>/dev/null
mv GOOGLE_MAPS_SETUP.md docs/ 2>/dev/null
mv MAP_API_KEY_GUIDE.md docs/ 2>/dev/null
mv MAP_FIX_INSTRUCTIONS.md docs/ 2>/dev/null
mv PROJECT_STATUS.md docs/ 2>/dev/null
mv TRAVILINK_WEB_ANALYSIS.md docs/ 2>/dev/null
mv ULTIMATE_PROMPT.md docs/ 2>/dev/null
mv ULTIMATE_PROMPT_COMPLETE.md docs/ 2>/dev/null
mv UX_IMPROVEMENTS_SUMMARY.md docs/ 2>/dev/null
mv WEB_REPO_DEEP_DIVE.md docs/ 2>/dev/null

# Move text files
mv "GROUPMATE'S PROMPTS.txt" docs/ 2>/dev/null
mv "Imagine you're one of the top uiux.txt" docs/ 2>/dev/null
mv LIBRARIES_LIST.txt docs/ 2>/dev/null

# Move XML files
mv "-- ================================.xml" docs/ 2>/dev/null
mv "mxfile host=app.diagrams.net agent=.drawio.txt" docs/ 2>/dev/null
mv "mxfile host=app.diagrams.net modifi.xml" docs/ 2>/dev/null
mv "mxfile host=app.diagrams.net.xml" docs/ 2>/dev/null
```

---

**Note:** After moving files, update any references in code or documentation that point to these files.

