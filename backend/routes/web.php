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
Route::prefix('api/docs')
    ->name('api.docs.')
    // Signed-in admins only in production: the spec names every endpoint and
    // field, which is a map worth not handing to strangers.
    ->middleware(app()->environment('production') ? ['auth'] : [])
    ->group(function () {
        Route::get('/', fn () => view('api.docs'))->name('index');

        Route::get('openapi.yaml', function (): BinaryFileResponse {
            return response()->file(base_path('openapi.yaml'), [
                'Content-Type' => 'application/yaml; charset=UTF-8',
            ]);
        })->name('spec');
    });
