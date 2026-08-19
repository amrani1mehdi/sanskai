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
`AdminUserSeeder` reads. The committed defaults are
`admin@sansekaisolution.com` / `password` — **local development only, change
them before this is deployed anywhere.**

Re-running `php artisan db:seed` updates the existing account rather than
creating a second one, so it is safe to run after changing the password.

## Not built yet

- Lead model, migration and the endpoint the site's five forms post to
- Email notification on a new lead
- CORS configuration for the Next.js origin

These depend on the scope still being agreed with the client.
