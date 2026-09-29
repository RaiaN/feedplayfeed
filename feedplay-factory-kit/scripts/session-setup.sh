#!/bin/bash
# SessionStart hook (see .claude/settings.json). Runs on every cloud session start/resume.
# Does nothing locally. Keeps output short because hook output is added to Claude's context.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then exit 0; fi
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

# Use the browsers the environment setup script cached. Persist the path for Claude's later commands.
if [ -z "${PLAYWRIGHT_BROWSERS_PATH:-}" ] && [ -d /opt/pw-browsers ]; then
  export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
  [ -n "${CLAUDE_ENV_FILE:-}" ] && echo "export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers" >> "$CLAUDE_ENV_FILE"
fi

status="session-setup:"
if [ -f package-lock.json ]; then
  if npm ci --no-audit --no-fund > /tmp/session-npm.log 2>&1; then
    status="$status deps ok;"
  else
    status="$status npm ci FAILED (tail /tmp/session-npm.log);"
  fi
  # No-op if the matching browser is already cached; downloads it otherwise (needs Playwright hosts on the allowlist).
  if [ -x node_modules/.bin/playwright ]; then
    if node_modules/.bin/playwright install chromium > /tmp/session-pw.log 2>&1; then
      status="$status playwright ok;"
    else
      status="$status playwright install FAILED (tail /tmp/session-pw.log);"
    fi
  fi
else
  status="$status no package-lock.json yet (M0 not done);"
fi
echo "$status"
exit 0
