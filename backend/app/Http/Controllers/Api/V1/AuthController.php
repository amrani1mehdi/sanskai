<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ResponsableResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Bearer tokens for the back office.
 *
 * The Filament panel keeps its session login; this is for the Next.js admin,
 * which is a separate origin and cannot share that cookie.
 */
class AuthController extends Controller
{
    /**
     * POST /api/v1/auth/token
     *
     * Throttled per email and IP, and answering with the same message whether
     * the address is unknown or the password is wrong — a login endpoint should
     * not tell an attacker which half they got right.
     */
    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'deviceName' => ['required', 'string', 'max:100'],
        ]);

        $key = 'auth:'.strtolower($credentials['email']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'email' => 'Trop de tentatives. Réessayez dans '
                    .RateLimiter::availableIn($key).' secondes.',
            ])->status(429);
        }

        $user = User::where('email', $credentials['email'])->first();

        // The panel gate applies here too: a non-admin user gets no API token.
        if (! $user || ! $user->is_admin || ! Hash::check($credentials['password'], $user->password)) {
            RateLimiter::hit($key);

            throw ValidationException::withMessages([
                'email' => 'Identifiants invalides.',
            ]);
        }

        RateLimiter::clear($key);

        $token = $user->createToken($credentials['deviceName']);

        return response()->json([
            'data' => [
                // Shown once and never retrievable again.
                'token' => $token->plainTextToken,
                'user' => new ResponsableResource($user),
            ],
        ], 201);
    }

    /** GET /api/v1/auth/me */
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new ResponsableResource($request->user()),
        ]);
    }

    /** DELETE /api/v1/auth/token — revokes the token that made the call. */
    public function destroy(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }
}
