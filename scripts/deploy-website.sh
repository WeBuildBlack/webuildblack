#!/usr/bin/env bash
set -euo pipefail

echo "=== Deploying WBB Website to Netlify ==="
cd website
netlify deploy --prod --dir=src
echo "Deploy complete!"
