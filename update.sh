#!/usr/bin/env bash
# Pulls the latest version of Coeus Test Writer from GitHub (main branch).
# Double-click this file (or run `./update.sh`) instead of typing the git command by hand.
cd "$(dirname "$0")"
echo "Updating Coeus Test Writer..."
git pull origin main
echo
read -n 1 -s -r -p "Done. Press any key to close this window."
