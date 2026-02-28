#!/usr/bin/env bash
set -uo pipefail

EXIT_CODE=0

# Check for hardcoded secrets
if grep -rnE "(api[_-]?key|password|secret|token)\s*[:=]\s*['\"][^'\"]+['\"]" src/ --include="*.ts"; then
  echo "ERROR: Potential hardcoded secrets found!"
  EXIT_CODE=1
fi

# Check for hardcoded bearer tokens
if grep -rnE 'Bearer\s+[A-Za-z0-9_.~+/\-]+' src/ --include="*.ts"; then
  echo "ERROR: Potential hardcoded bearer token found!"
  EXIT_CODE=1
fi

# Check for private keys
if grep -rnE "\-\-\-\-\-BEGIN (RSA |EC |DSA )?PRIVATE KEY\-\-\-\-\-" src/ --include="*.ts"; then
  echo "ERROR: Private key found!"
  EXIT_CODE=1
fi

# Check for AWS credentials
if grep -rnE "(AKIA[0-9A-Z]{16}|aws[_-]?(secret|access)[_-]?key)" src/ --include="*.ts"; then
  echo "ERROR: Potential AWS credentials found!"
  EXIT_CODE=1
fi

# Check for debug console.log statements
CONSOLE_COUNT=$(grep -rc "console\.log" src/ --include="*.ts" 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')
if [ "$CONSOLE_COUNT" -gt 0 ]; then
  echo "WARNING: Found $CONSOLE_COUNT debug console.log statements"
  grep -rn "console\.log" src/ --include="*.ts" || true
fi

exit $EXIT_CODE
