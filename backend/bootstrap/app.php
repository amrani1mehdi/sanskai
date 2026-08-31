<?php

use App\Http\Middleware\EnsureIsAdmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => EnsureIsAdmin::class,
        ]);

        /*
         * Never redirect a guest — answer 401.
         *
         * There is no `login` route in this application: it is an API plus a
         * Filament panel, and the panel redirects its own guests. Laravel's
         * default builds the AuthenticationException by calling
         * `route('login')` whenever the request does not send
         * `Accept: application/json`, which throws RouteNotFoundException
         * inside the middleware — so an unauthenticated browser hitting a
         * document link got a 500 instead of being told to sign in, and the
         * `shouldRenderJsonWhen` rule below never got the chance to run.
         */
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
