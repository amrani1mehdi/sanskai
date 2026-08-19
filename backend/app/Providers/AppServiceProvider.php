<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        /*
         * This app is reached through the Next.js site, which proxies /admin
         * and Filament's assets to it. Without this, Laravel builds URLs from
         * the request host it actually sees — its own port — so asset tags and
         * redirects would send the browser off the public origin.
         */
        if ($root = config('app.url')) {
            URL::forceRootUrl($root);
        }
    }
}
