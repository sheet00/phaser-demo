#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd -- "$script_dir/.." && pwd)"
wrangler="$repo_dir/src/node_modules/.bin/wrangler"

if [[ ! -x "$wrangler" ]]; then
  printf 'Wranglerが見つかりません。先に src で npm install を実行してください。\n' >&2
  exit 1
fi

cd "$repo_dir"
exec "$wrangler" dev --config "$script_dir/wrangler.dominion.local.jsonc" --local --ip 0.0.0.0 --port 8787 "$@"
