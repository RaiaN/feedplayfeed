#!/bin/bash
# Paste into the Setup script box: claude.ai/code → cloud icon → feedplay environment → settings.
# Runs as root on Ubuntu 24.04 before Claude starts. It must exit 0 and should finish in under ~5 minutes,
# because only then is the result cached for later sessions (the cache is rebuilt about every 7 days).
export DEBIAN_FRONTEND=noninteractive
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"

# Chromium plus its system libraries for Playwright e2e tests and gameplay clip recording.
# If the repo pins a different Playwright version, scripts/session-setup.sh fetches the matching browser.
npx -y playwright@latest install --with-deps chromium > /tmp/setup-playwright.log 2>&1 \
  || echo "playwright install failed; see /tmp/setup-playwright.log"

# ffmpeg converts recorded clips (webm) to mp4 for feed posts.
(apt-get update -qq && apt-get install -y -qq ffmpeg) > /tmp/setup-ffmpeg.log 2>&1 \
  || echo "ffmpeg install failed; see /tmp/setup-ffmpeg.log"

chmod -R a+rwX "$PLAYWRIGHT_BROWSERS_PATH" || true
exit 0
