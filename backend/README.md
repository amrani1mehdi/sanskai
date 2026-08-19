# Sansekai Solution — backend

Laravel API and admin panel for [the Next.js site](../README.md) in the parent
folder. Currently the admin panel shell and its login; the lead capture the
forms will post to is not built yet.

## Requirements

PHP **8.3+** — Laravel 13 will not boot on anything older.

On this machine the default `php` on `PATH` is XAMPP's 8.0, which fails with
`Composer detected issues in your platform`. Use the 8.3 binary explicitly:

```powershell
C:\BINGO-COMP\php83\php.exe artisan serve
```

Put `C:\BINGO-COMP\php83` ahead of `C:\xampp\php` on `PATH` if you would rather
type `php artisan` — that is a machine-wide change, so it is left to you.

## Getting started

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed          # creates the admin account
php artisan serve            # http://127.0.0.1:8000
```

The database is SQLite at `database/database.sqlite`, so there is nothing to
provision locally. Switch to MySQL by changing `DB_CONNECTION` in `.env`.

## Admin panel

Built with [Filament](https://filamentphp.com). Sign in at
**http://localhost:3000/admin**.

The panel is reached through the Next.js site, which proxies `/admin`, Filament's
assets and Livewire to this app (see `next.config.ts`), so the whole product
sits on one origin. Both servers need to be running: `php artisan serve` here
and `npm run dev` in the parent folder. Port 8000 still works directly, but
Laravel builds its URLs against `APP_URL` — keep that pointing at the public
origin, or asset tags and redirects will send people off it.

Credentials come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`, which
`AdminUserSeeder` reads. No password is committed: leave `ADMIN_PASSWORD` blank
and the seeder generates one and prints it once (local only).

Re-running `php artisan db:seed` updates the existing account rather than
creating a second one, and only touches the password when `ADMIN_PASSWORD` is
set — so re-seeding never silently resets a password you chose.

## Security

- **Panel access is gated.** `User::canAccessPanel()` requires `is_admin`, so a
  future non-admin user — a customer account, a seeded row — cannot reach
  `/admin` just by existing. Without this, Filament lets any authenticated user
  into the panel.
- **Multi-factor is available** via an authenticator app (TOTP, so it needs no
  mail server). Enrol from the user menu. Set `ADMIN_REQUIRE_MFA=true` to force
  every admin to enrol before they can use the panel. Recovery codes are issued
  at enrolment and can be regenerated.
- **Login is rate limited** to 5 attempts, after which even the correct password
  is refused until the lockout expires.
- **Secrets are encrypted at rest** — the authenticator secret and recovery
  codes use encrypted casts, and session payloads are encrypted
  (`SESSION_ENCRYPT`).
- **Sessions last 60 minutes**, with an http-only, same-site-lax cookie.
- **Security headers** — `X-Frame-Options: DENY`, `frame-ancestors 'none'`,
  `nosniff`, `noindex`, and HSTS over HTTPS — are set by
  `App\Http\Middleware\SecurityHeaders`. They live in Laravel rather than on the
  Next.js proxy because Next does not apply its `headers()` config to
  externally rewritten routes.

Before deploying:

1. Set a real `ADMIN_PASSWORD` and re-seed.
2. Set `SESSION_SECURE_COOKIE=true` once the panel is on HTTPS.
3. Set `APP_DEBUG=false` and `APP_ENV=production` — debug pages leak
   configuration and stack traces. `APP_ENV` also switches URL generation to
   HTTPS.
4. Consider `ADMIN_REQUIRE_MFA=true`.


## Not built yet

- Lead model, migration and the endpoint the site's five forms post to
- Email notification on a new lead
- CORS configuration for the Next.js origin

These depend on the scope still being agreed with the client.
