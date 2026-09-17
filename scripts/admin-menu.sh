#!/usr/bin/env bash
# Wrapper redirecting admin-menu to master multi-role menu
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$DIR/role-menu.sh" "$@"
