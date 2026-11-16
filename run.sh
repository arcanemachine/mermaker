#!/usr/bin/env bash
# Run Mermaker from this checkout: ./run.sh <file.mmd> [port], or ./run.sh serve [port] [host].
exec node "$(dirname "$0")/bin/mermaker.js" "$@"
