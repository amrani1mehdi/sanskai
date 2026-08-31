<?php

use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

Route::get('/', function () {
    return view('welcome');
});

/*
 * API reference.
 *
 * Swagger UI is loaded from a CDN and the spec is served as a static file, so
 * the documentation costs the application no PHP dependency and cannot drift
 * from `openapi.yaml`. Kept out of production unless explicitly opened up:
 * the spec names every endpoint and field, which is a map worth not handing to
 * strangers.
 */
/*
 * Reachable without a session, deliberately.
 *
 * An earlier version guarded this with `auth` in production, which cannot work:
 * there is no session login in an API-only app, so the middleware redirected to
 * a `login` route that does not exist and returned a 500 instead of a prompt.
 *
 * Nothing here is secret — the same specification ships as a static file at
 * /swagger.html — and every endpoint it documents is itself authenticated. To
 * keep the reference off the public internet, restrict it at the web server
 * (an `allow`/`deny` block or basic auth on this location) rather than with
 * application middleware that has no credential to check.
 */
Route::prefix('api/docs')
    ->name('api.docs.')
    ->group(function () {
        Route::get('/', fn () => view('api.docs'))->name('index');

        Route::get('openapi.yaml', function (): BinaryFileResponse {
            return response()->file(base_path('openapi.yaml'), [
                'Content-Type' => 'application/yaml; charset=UTF-8',
            ]);
        })->name('spec');
    });
