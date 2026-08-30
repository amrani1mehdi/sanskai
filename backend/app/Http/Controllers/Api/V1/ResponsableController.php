<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ResponsableResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Responsables are `users`, not a table of their own.
 *
 * Read-only over the API: creating an account is an administrative act with a
 * password and MFA attached to it, and that belongs in the Filament panel
 * rather than behind a lead-management endpoint.
 */
class ResponsableController extends Controller
{
    /** GET /api/v1/responsables */
    public function index(): AnonymousResourceCollection
    {
        $users = User::query()
            ->where('is_admin', true)
            ->withCount('assignedLeads')
            ->orderBy('name')
            ->get();

        return ResponsableResource::collection($users);
    }
}
