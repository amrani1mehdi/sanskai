<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Bearer tokens for the back office.
 *
 * The Filament panel keeps its session login; this is for the Next.js admin,
 * which is a separate origin and cannot share that cookie.
 *
 * The CRM runs on a single administrator: the account is created at
 * installation with a username and a password, and the password is changed
 * from here afterwards.
 */
class AuthController extends Controller
{
    /**
     * POST /api/v1/auth/token
     *
     * `login` takes the username or the email — the account is handed out with
     * a username, and Filament signs in on email, so both resolve here.
     *
     * Throttled per login and IP, and answering with the same message whether
     * the account is unknown or the password is wrong: a login endpoint should
     * not tell an attacker which half they got right.
     */
    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'login' => ['required', 'string', 'max:190'],
            'password' => ['required', 'string'],
            'deviceName' => ['required', 'string', 'max:100'],
        ]);

        $key = 'auth:'.strtolower($credentials['login']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'login' => 'Trop de tentatives. Réessayez dans '
                    .RateLimiter::availableIn($key).' secondes.',
            ])->status(429);
        }

        $user = User::query()
            ->where('username', $credentials['login'])
            ->orWhere('email', $credentials['login'])
            ->first();

        // The panel gate applies here too: a non-admin user gets no API token.
        if (! $user || ! $user->is_admin || ! Hash::check($credentials['password'], $user->password)) {
            RateLimiter::hit($key);

            throw ValidationException::withMessages([
                'login' => 'Identifiants invalides.',
            ]);
        }

        RateLimiter::clear($key);

        $token = $user->createToken($credentials['deviceName']);

        return response()->json([
            'data' => [
                // Shown once and never retrievable again.
                'token' => $token->plainTextToken,
                'user' => new AdminUserResource($user),
            ],
        ], 201);
    }

    /** GET /api/v1/auth/me */
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new AdminUserResource($request->user()),
        ]);
    }

    /**
     * PATCH /api/v1/auth/password
     *
     * Requires the current password, so a stolen token alone cannot lock the
     * owner out of their own account. Every other token is revoked on success —
     * if the password changed because it leaked, sessions opened with the old
     * one must not survive.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'currentPassword' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = $request->user();

        if (! Hash::check($data['currentPassword'], $user->password)) {
            throw ValidationException::withMessages([
                'currentPassword' => 'Le mot de passe actuel est incorrect.',
            ]);
        }

        $user->forceFill(['password' => Hash::make($data['password'])])->save();

        $current = $request->user()->currentAccessToken();
        $user->tokens()->whereKeyNot($current->getKey())->delete();

        return response()->json([
            'data' => ['message' => 'Mot de passe mis à jour.'],
        ]);
    }

    /** DELETE /api/v1/auth/token — revokes the token that made the call. */
    public function destroy(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
