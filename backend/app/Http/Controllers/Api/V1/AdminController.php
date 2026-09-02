<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreAdminRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * The people who can get into the back office.
 *
 * The CRM ran on a single account created at installation, which was fine until
 * a second person needed in: the only way to give them access was to hand over
 * the first account's password, so the trail on every lead then said "Sansekai
 * Admin" whoever had actually done the work.
 */
class AdminController extends Controller
{
    /**
     * GET /api/v1/admins
     *
     * Everyone who can sign in. Without it the form is a hole you drop accounts
     * into — you could add the same colleague twice and only find out from the
     * uniqueness error.
     */
    public function index(): AnonymousResourceCollection
    {
        return AdminUserResource::collection(
            User::query()->where('is_admin', true)->orderBy('name')->get(),
        );
    }

    /**
     * POST /api/v1/admins
     *
     * The password is set by whoever creates the account and has to be given to
     * its owner out of band; there is no invitation email in this application to
     * send it through. They can change it from their own account menu once in.
     */
    public function store(StoreAdminRequest $request): JsonResponse
    {
        $data = $request->validated();

        /*
         * Assigned rather than mass-created: `User` declares no `$fillable`, so
         * `create()` would silently drop every one of these — and `is_admin` is
         * exactly the attribute you never want set from request data anyway. It
         * is set here, by the code, because this endpoint only makes admins.
         */
        $user = new User;
        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->password = Hash::make($data['password']);
        $user->is_admin = true;
        // No verification flow exists here; an account made by an administrator
        // is verified by the act of an administrator making it.
        $user->email_verified_at = now();
        $user->save();

        Log::info('Administrateur créé', [
            'id' => $user->id,
            'email' => $user->email,
            'by' => $request->user()?->id,
        ]);

        return response()->json(['data' => new AdminUserResource($user)], 201);
    }

    /**
     * DELETE /api/v1/admins/{user}
     *
     * Revokes their tokens as well as the row, so a session already open stops
     * working on its next call rather than lasting until it expires.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        /*
         * You cannot remove yourself.
         *
         * Not politeness — it is the one deletion that can leave the CRM with
         * no way in, since removing the last administrator locks everybody out
         * of a panel whose only account creation route is behind that panel.
         */
        if ($request->user()?->is($user)) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte.',
            ], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
