#!/bin/bash
# DEVELOPMENT ENVIRONMENT SETUP
# =============================
#
# This script sets up the complete development environment for Todo Guard,
# including all dependencies for the main package and language-specific reporters.
#
# SETUP INCLUDES:
# - Network firewall configuration
# - Node.js dependencies and build
# - PHPUnit reporter dependencies
# - pytest reporter dependencies
# - Go reporter dependencies
#
# REQUIREMENTS:
# - Must be run from the workspace root
# - Requires sudo access for firewall setup
# - Node.js, PHP, Python, and Go must be pre-installed
#
# EXIT CODES:
# - 0: Success
# - 1: General failure
# - 2: Missing prerequisites

set -euo pipefail  # Exit on error, undefined vars, and pipeline failures
IFS=$'\n\t'       # Stricter word splitting

echo "Starting Todo Guard development environment setup..."

# 1. Initialize firewall
echo ""
echo "📡 Initializing network firewall..."
sudo /usr/local/bin/init-firewall.sh

# 2. Install Node.js dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
npm ci

# 3. Build TypeScript packages
echo ""
echo "🔨 Building TypeScript packages..."
npm run build

# 4. Install PHPUnit reporter dependencies
echo ""
echo "🐘 Installing PHPUnit reporter dependencies..."
composer install -d reporters/phpunit

# 5. Set up Python environment for pytest reporter
echo ""
echo "🐍 Setting up Python environment for pytest reporter..."
python3 -m venv reporters/pytest/.venv
reporters/pytest/.venv/bin/pip install -e reporters/pytest pytest

# 6. Download Go dependencies for Go reporter
echo ""
echo "🐹 Setting up Go reporter dependencies..."
go mod download -C reporters/go

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "You can now run:"
echo "  • npm test               - Run all tests"
echo "  • npm run test:unit      - Run unit tests only"
echo "  • npm run test:reporters - Run reporter tests"
echo "  • npm run checks         - Run all quality checks"
