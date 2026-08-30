<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\LeadActivityResource;
use App\Models\Lead;
use App\Models\LeadActivity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ActivityController extends Controller
{
    /** GET /api/v1/leads/{lead}/activities — one dossier's history. */
    public function index(Lead $lead): AnonymousResourceCollection
    {
        return LeadActivityResource::collection($lead->activities()->latest()->get());
    }

    /**
     * GET /api/v1/activities
     *
     * The team feed: everything that happened, newest first, with the lead
     * eager-loaded so each row links back without an N+1.
     */
    public function all(Request $request): AnonymousResourceCollection
    {
        $activities = LeadActivity::query()
            ->with('lead:id,reference,entreprise')
            ->when(
                $request->filled('kind'),
                fn ($query) => $query->where('kind', $request->string('kind')),
            )
            ->latest()
            ->paginate((int) $request->integer('perPage', 25))
            ->withQueryString();

        return LeadActivityResource::collection($activities);
    }
}
