<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Re-checks panel access on every authenticated request.
 *
 * The login endpoint refuses a non-admin, but that is a check made once. A token
 * issued while `is_admin` was true keeps working after the flag is revoked,
 * which is exactly backwards: revoking access should take effect on the next
 * request, not whenever the holder happens to sign in again.
 */
class EnsureIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user?->is_admin) {
            // Drop the token that should never have worked.
            $user?->currentAccessToken()?->delete();

            abort(403, "Ce compte n'a pas accès au back office.");
        }

        return $next($request);
    }
}
