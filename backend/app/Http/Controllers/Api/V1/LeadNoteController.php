<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityKind;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreLeadNoteRequest;
use App\Http\Resources\LeadNoteResource;
use App\Models\Lead;
use App\Models\LeadNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LeadNoteController extends Controller
{
    /** GET /api/v1/leads/{lead}/notes */
    public function index(Lead $lead): AnonymousResourceCollection
    {
        return LeadNoteResource::collection($lead->notes()->latest()->get());
    }

    /** POST /api/v1/leads/{lead}/notes */
    public function store(StoreLeadNoteRequest $request, Lead $lead): JsonResponse
    {
        $user = $request->user();

        $note = $lead->notes()->create([
            'author_id' => $user?->id,
            // Denormalised so a deleted user's notes still say who wrote them.
            'author_name' => $user?->name ?? 'Inconnu',
            'body' => $request->validated('body'),
        ]);

        $lead->recordActivity(ActivityKind::Note, 'Note interne ajoutée', $user);

        return response()->json(['data' => new LeadNoteResource($note)], 201);
    }

    /**
     * DELETE /api/v1/notes/{note}
     *
     * The note goes; the trail keeps the fact that one existed and was removed.
     */
    public function destroy(Request $request, LeadNote $note): Response
    {
        $lead = $note->lead;
        $note->delete();

        $lead->recordActivity(
            ActivityKind::Note,
            'Note interne supprimée',
            $request->user(),
        );

        return response()->noContent();
    }
}
