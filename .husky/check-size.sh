#!/bin/bash

echo "[Husky] Enforcing file length guardrails..."
HAS_ERROR=0

# Get all added, copied, or modified staged files
staged_files=$(git diff --cached --name-only --diff-filter=ACM)

for file in $staged_files; do
  if [ -f "$file" ]; then
    # Ignore auto-generated files and dependencies
    if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *"package-lock.json"* ]] || [[ "$file" == *".next"* ]] || [[ "$file" == *"dist"* ]] || [[ "$file" == *".prisma"* ]]; then
      continue
    fi
    
    lines=$(wc -l < "$file" | tr -d ' ')
    if [ "$lines" -gt 800 ]; then
      echo "❌ ERROR: File too large. $file is $lines lines long (Max: 800). Please refactor."
      HAS_ERROR=1
    elif [ "$lines" -gt 600 ]; then
      echo "⚠️  WARNING: $file is $lines lines long. Approaching maximum modular capacity (Threshold: 600)."
    fi
  fi
done

if [ "$HAS_ERROR" -eq 1 ]; then
  echo "[Husky] Commit rejected. Fix the file size constraints above to proceed."
  exit 1
fi

echo "[Husky] File length checks passed."
exit 0
