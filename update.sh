#!/usr/bin/env bash
# Pulls the latest version of Coeus Test Writer from GitHub (main branch).
# Double-click this file (or run `./update.sh`) instead of typing the git command by hand.
cd "$(dirname "$0")"

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "This folder isn't a git repository, so it can't be updated with 'git pull'."
    echo "This usually happens when the app was downloaded as a ZIP file instead of"
    echo "cloned with git. To fix it, delete this folder and re-download the app with:"
    echo
    echo "    git clone https://github.com/drussoperio/CoeusTestWriter.git"
    echo
    read -n 1 -s -r -p "Press any key to close this window."
    exit 1
fi

echo "Updating Coeus Test Writer..."
git pull origin main
echo
read -n 1 -s -r -p "Done. Press any key to close this window."
