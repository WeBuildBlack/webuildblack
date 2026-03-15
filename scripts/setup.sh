#!/usr/bin/env bash
set -euo pipefail

echo "=== WBB Project Setup ==="

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — please fill in your API keys."
else
  echo ".env already exists."
fi

cd automations && npm install
echo "Installed automation dependencies."

echo "Setup complete!"
