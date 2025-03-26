#!/bin/sh
set -e

# Handle shutdown signals properly
cleanup_exit() {
  echo "Received shutdown signal, cleaning up..."
  
  # Kill any Chrome processes before exiting
  echo "Killing chrome processes with SIGKILL"
  pkill -9 -f chrome || true
  pkill -9 -f google-chrome || true
  pkill -9 -f chromium || true
  
  # Kill any other related processes
  echo "Killing puppeteer processes"
  pkill -9 -f puppeteer || true
  
  # Remove lock files to prevent issues on restart
  echo "Removing lock files"
  rm -f /usr/src/app/.wwebjs_auth/session-whatsapp-bot-new/SingletonLock || true
  rm -f /usr/src/app/.wwebjs_auth/session-whatsapp-bot-new/SingletonCookie || true
  rm -f /usr/src/app/.wwebjs_auth/session-whatsapp-bot-new/SingletonSocket || true
  
  echo "Cleanup complete, exiting"
  exit 0
}

# Setup signal traps (POSIX-compatible syntax)
trap cleanup_exit INT
trap cleanup_exit TERM
trap cleanup_exit QUIT
trap cleanup_exit HUP

# Run cleanup script
echo "Running cleanup..."
node cleanup.js

# Execute the main command
exec "$@" 