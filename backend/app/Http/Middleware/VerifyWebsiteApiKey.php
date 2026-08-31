<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the public submission endpoints with a shared key.
 *
 * These endpoints create rows without a signed-in user, so something has to
 * stand between them and the open internet. The key is checked with a
 * timing-safe comparison, and a missing key in production fails closed rather
 * than waving everything through.
 */
class VerifyWebsiteApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('leads.website_api_key');

        if (blank($expected)) {
            // Convenient locally, never in production.
            if (app()->environment('production')) {
                abort(500, 'WEBSITE_API_KEY is not configured.');
            }

            return $next($request);
        }

        $provided = $request->header('X-Api-Key', '');

        if (! is_string($provided) || ! hash_equals($expected, $provided)) {
            abort(401, 'Clé API invalide ou absente.');
        }

        return $next($request);
    }
}
