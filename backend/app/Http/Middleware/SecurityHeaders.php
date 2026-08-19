<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Security headers for the admin panel.
 *
 * These are set here rather than on the Next.js proxy in front, because Next
 * does not apply its `headers()` config to externally rewritten routes — and
 * setting them here means they hold however the panel is reached.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Nothing legitimately embeds the panel, so refuse framing outright.
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Content-Security-Policy', "frame-ancestors 'none'");
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'same-origin');

        // Keep the panel out of search results.
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow');

        // Tell browsers to stay on HTTPS once they have seen it.
        if ($request->secure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains',
            );
        }

        return $response;
    }
}
