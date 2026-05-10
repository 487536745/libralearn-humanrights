#!/usr/bin/env bash
set -euo pipefail

echo "Installing OS dependencies..."
apt-get update
apt-get install -y ffmpeg wget unzip

echo "Installing Rhubarb Lip Sync..."

RHUBARB_VERSION="1.14.0"
ZIP_NAME="Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux.zip"
DOWNLOAD_URL="https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/${ZIP_NAME}"

tmp_dir="$(mktemp -d)"
trap "rm -rf ${tmp_dir}" EXIT

wget -O "${tmp_dir}/rhubarb.zip" "${DOWNLOAD_URL}"
unzip -q "${tmp_dir}/rhubarb.zip" -d "${tmp_dir}"

# Try to install to repo bin directory (preferred for Render)
mkdir -p bin
if cp "${tmp_dir}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux/rhubarb" ./bin/rhubarb 2>/dev/null; then
  chmod +x ./bin/rhubarb
  if [ -x ./bin/rhubarb ]; then
    echo "✓ Rhubarb installed successfully at ./bin/rhubarb"
    ./bin/rhubarb --version
    exit 0
  fi
fi

# Fallback: try /usr/local/bin (for traditional Linux deployments)
if install -m 755 "${tmp_dir}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux/rhubarb" /usr/local/bin/rhubarb 2>/dev/null; then
  echo "✓ Rhubarb installed successfully at /usr/local/bin/rhubarb"
  /usr/local/bin/rhubarb --version
  exit 0
fi

# If both fail, exit with error
echo "✗ Failed to install Rhubarb to both ./bin and /usr/local/bin"
exit 1
