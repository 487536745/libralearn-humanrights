#!/usr/bin/env bash
set -euo pipefail

echo "Installing OS dependencies..."
apt-get update
apt-get install -y ffmpeg wget unzip

echo "Installing Rhubarb Lip Sync..."
RHUBARB_VERSION="1.13.0"
ZIP_NAME="Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux.zip"
DOWNLOAD_URL="https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/${ZIP_NAME}"

tmp_dir="$(mktemp -d)"
wget -O "${tmp_dir}/rhubarb.zip" "${DOWNLOAD_URL}"
unzip -q "${tmp_dir}/rhubarb.zip" -d "${tmp_dir}"
install "${tmp_dir}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux/rhubarb" /usr/local/bin/rhubarb
chmod +x /usr/local/bin/rhubarb

echo "Rhubarb installed at /usr/local/bin/rhubarb"
ffmpeg -version
/usr/local/bin/rhubarb --version
