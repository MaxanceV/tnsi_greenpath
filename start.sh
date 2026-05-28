#!/usr/bin/env bash
# Wrapper macOS/Linux : appelle le launcher Python cross-platform.
cd "$(dirname "$0")"
exec python3 start.py "$@"
