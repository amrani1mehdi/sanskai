#!/usr/bin/env bash
#
# Ship the Laravel app from a laptop to the Hostinger VPS.
#
#     bash backend/push-to-vps.sh
#
# The sibling `deploy.sh` runs ON the server and expects a git checkout. There
# isn't one: /var/www/sansekai-crm/backend is a plain directory of files, so
# `git fetch` there fails and deploy.sh quietly skips its own update step. This
# script is the missing half — it does the copying, from here.
#
# Only code is sent. The server's own state is never touched:
#
#   .env             the server's secrets, and the only copy of them
#   storage/         uploaded documents, logs, sessions, compiled views
#   vendor/          installed by composer on the server, for its PHP version
#   public/          carries the storage symlink
#   bootstrap/cache/ generated
#
# If composer.json changed, this says so rather than pretending a file copy was
# enough — the dependency install has to happen on the box.
#
set -euo pipefail

HOST="${HOST:-root@72.60.190.211}"
APP="${APP:-/var/www/sansekai-crm/backend}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step() { printf '\n\033[1m→ %s\033[0m\n' "$1"; }
fail() { printf '\n\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

cd "$HERE"
[ -f artisan ] || fail "No artisan next to this script — wrong directory."

# What a code deploy consists of. Everything absent from this list stays as it
# is on the server, which is the point: an over-broad copy is how a deploy eats
# an uploaded document or a .env.
PATHS=(app config routes database/migrations database/seeders bootstrap/app.php artisan)

for p in "${PATHS[@]}"; do
    [ -e "$p" ] || fail "Missing $p — refusing to ship a partial tree."
done

REV="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

step "Packing $REV ($BRANCH)"
TAR="$(mktemp -t sansekai-XXXXXX).tgz"
trap 'rm -f "$TAR"' EXIT
# Excludes are belt-and-braces: none of these live under PATHS, but a stray
# sqlite file in database/ or a cached view would ride along otherwise.
tar --exclude='*.sqlite' --exclude='*.log' --exclude='__pycache__' \
    -czf "$TAR" "${PATHS[@]}"
printf '  %s\n' "$(du -h "$TAR" | cut -f1) → $HOST:$APP"

step "Uploading"
scp -q "$TAR" "$HOST:/tmp/sansekai-code.tgz"

step "Unpacking and reloading"
# The unpack overlays the listed paths; it does not clear the app directory.
# Laravel's caches are rebuilt, then PHP-FPM is reloaded — OPcache holds the
# old class files per worker, so without that last step the files are new and
# the behaviour is not.
ssh "$HOST" "set -e
    cd '$APP'
    tar -xzf /tmp/sansekai-code.tgz
    rm -f /tmp/sansekai-code.tgz
    printf '%s\n' '$REV ($BRANCH) $(date -u +%FT%TZ)' > .deployed-revision
    php artisan config:clear && php artisan config:cache
    php artisan route:clear  && php artisan route:cache
    php artisan view:clear
    for v in 8.3 8.2; do
        systemctl is-active --quiet \"php\${v}-fpm\" && systemctl reload \"php\${v}-fpm\" && echo \"  reloaded php\${v}-fpm\"
    done
    true"

if ! git diff --quiet HEAD -- composer.json composer.lock 2>/dev/null \
   || [ "$(git log --oneline -1 --name-only 2>/dev/null | grep -c composer)" != "0" ]; then
    printf '\n\033[33m! composer.json/lock moved recently — run on the server if deps changed:\033[0m\n'
    printf '  ssh %s "cd %s && composer install --no-dev --optimize-autoloader"\n' "$HOST" "$APP"
fi

step "Deployed"
ssh "$HOST" "cat '$APP/.deployed-revision'"
