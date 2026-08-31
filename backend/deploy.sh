#!/usr/bin/env bash
#
# Deploy the CRM on the VPS.
#
# Run it from the Laravel directory on the server, not from a laptop:
#
#     cd /path/to/backend && bash deploy.sh
#
# Idempotent — running it twice changes nothing the second time.
#
# The admin password is NOT in this file and never should be: it would be in
# git, and git is not a password manager. Set it in `.env` on the server, or
# pass it for this run only:
#
#     ADMIN_PASSWORD=... bash deploy.sh
#
set -euo pipefail

BRANCH="${BRANCH:-admin-dashboard-backend}"

step() { printf '\n\033[1m→ %s\033[0m\n' "$1"; }
fail() { printf '\n\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

[ -f artisan ] || fail "No artisan here. Run this from the Laravel directory."
[ -f .env ]    || fail "No .env here. The server's environment file is missing."

# On the Hostinger VPS the app is at /var/www/sansekai-crm/backend, and that box
# also hosts ~10 unrelated Laravel apps — symloop, rais, zerotouch and others.
# Never resolve the directory by searching for `artisan` and taking the first
# hit; it lands in somebody else's project and migrates their database.

if [ -d .git ]; then
    step "Pulling $BRANCH"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
else
    # The VPS deployment is a file copy, not a clone. Upload the archive and
    # unpack it over the app before running this:
    #
    #     scp sansekai-update.tgz root@<host>:/tmp/
    #     cd /var/www/sansekai-crm/backend && tar -xzf /tmp/sansekai-update.tgz
    step "No .git here — assuming the files were copied in already"
fi

step "Reconciling .env"

# The username login is gone; leaving the variable behind is a dead setting
# that reads as if it still does something.
if grep -q '^ADMIN_USERNAME=' .env; then
    sed -i '/^ADMIN_USERNAME=/d' .env
    echo "  removed ADMIN_USERNAME"
fi

# The email is the only login now, so it has to be present.
if ! grep -q '^ADMIN_EMAIL=' .env; then
    echo 'ADMIN_EMAIL=admin@sansekaisolution.com' >> .env
    echo "  added ADMIN_EMAIL"
fi

# An override for this run only, so the password never has to live in a file
# that anyone might commit.
if [ -n "${ADMIN_PASSWORD:-}" ]; then
    if grep -q '^ADMIN_PASSWORD=' .env; then
        sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASSWORD}|" .env
    else
        echo "ADMIN_PASSWORD=${ADMIN_PASSWORD}" >> .env
    fi
    echo "  set ADMIN_PASSWORD from the environment"
fi

# Blank outside local means the seeder declines to create the account and says
# so — better to stop here than to migrate and find out at the login screen.
grep -q '^ADMIN_PASSWORD=.\+' .env \
    || fail "ADMIN_PASSWORD is empty in .env. Set it, or pass ADMIN_PASSWORD=... to this script."

step "Migrating"
# Drops the username column and its unique index.
php artisan migrate --force

step "Seeding the administrator"
# updateOrCreate on the email, so this updates the existing row rather than
# adding a second one — and resets the password to ADMIN_PASSWORD.
php artisan db:seed --class=AdminUserSeeder --force

step "Rebuilding caches"
# The step people skip. A stale config cache keeps serving the old admin
# settings and a stale route cache keeps the old validation, so the code is
# deployed and the behaviour is not.
php artisan config:clear && php artisan config:cache
php artisan route:clear  && php artisan route:cache
php artisan view:clear

step "Reloading PHP-FPM"
# OPcache holds the old class files in memory per worker, so on a box with
# opcache enabled the new code does not take effect until the pool restarts —
# the caches above are Laravel's, not PHP's. This has to happen before the
# check below, or the check interrogates workers still running the old code.
for v in 8.3 8.2; do
    if systemctl is-active --quiet "php${v}-fpm" 2>/dev/null; then
        systemctl reload "php${v}-fpm" && echo "  reloaded php${v}-fpm"
    fi
done

step "Checking the new contract is live"
# One word is the whole test: the token endpoint should now ask for `email`.
# Host header included because this box serves ~10 vhosts off one address, and
# a bare request to 127.0.0.1 lands on the default server, not this app.
answer="$(curl -fsS -X POST http://127.0.0.1/api/v1/auth/token \
    -H 'Host: api.sansekai.72-60-190-211.sslip.io' \
    -H 'Content-Type: application/json' -H 'Accept: application/json' \
    -d '{}' 2>/dev/null || true)"

case "$answer" in
    *'"email"'*) printf '\n\033[32m✓ Deployed. The API asks for `email`.\033[0m\n' ;;
    *'"login"'*) fail "The API still asks for \`login\`. A cache survived the reload." ;;
    *)           printf '\n\033[33m! Deployed, but the local check could not reach the API.\033[0m\n'
                 printf '  Verify from outside:\n'
                 printf '  curl -X POST https://api.sansekai.72-60-190-211.sslip.io/api/v1/auth/token \\\n'
                 printf "      -H 'Content-Type: application/json' -d '{}'\n" ;;
esac
