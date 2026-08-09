#!/usr/bin/env bash
# Deploy dist/ to NAS over SSH (replaces SMB mount workflow).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=../../gorfednet.github/scripts/nas-ssh-deploy.sh
source "${PROJECT_ROOT}/../gorfednet.github/scripts/nas-ssh-deploy.sh"

cd "${PROJECT_ROOT}"
DIST=dist

if [[ ! -d "${DIST}" ]]; then
  echo "Run 'make build' first (or 'make deploy' to build and deploy)." >&2
  exit 1
fi

nas_ssh_load_env "${PROJECT_ROOT}"
NAS_SITE_DIR="${NAS_SITE_DIR:-gorfed.net}"

nas_ssh_preflight "${NAS_SITE_DIR}"
nas_ssh_rsync "${NAS_SITE_DIR}" "${DIST}/"
echo "Deploy complete: $(nas_ssh_target "${NAS_SITE_DIR}")"
