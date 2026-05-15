#!/bin/bash
exec >> /tmp/paperclip-launchd.log 2>&1
echo ""
echo "=== $(date) launchd-start.sh invoked ==="
echo "cwd-before: $(pwd)"
echo "PATH: $PATH"
echo "HOME: $HOME"
echo "USER: $USER"
which pnpm node
cd /Users/openclaw/Documents/paperclip || { echo "cd failed: $?"; exit 90; }
echo "cwd-after: $(pwd)"
echo "--- launching pnpm ---"
exec /opt/homebrew/bin/pnpm --filter @paperclipai/server exec tsx ../scripts/dev-runner.ts watch --bind loopback
