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
use Illuminate\Support\Str;

class LeadNoteController extends Controller
{
    /**
     * How much of a note the activity trail quotes.
     *
     * A note is worth up to 5000 characters and `label` is a VARCHAR(255), so
     * the body cannot go in whole — at this length the entry still fits with
     * the surrounding wording to spare, and the fiche carries the full text a
     * few centimetres below.
     */
    private const EXCERPT = 160;

    /** GET /api/v1/leads/{lead}/notes */
    public function index(Lead $lead): AnonymousResourceCollection
    {
        return LeadNoteResource::collection($lead->notes()->latest()->get());
    }

    /** POST /api/v1/leads/{lead}/notes */
    public function store(StoreLeadNoteRequest $request, Lead $lead): JsonResponse
    {
        $user = $request->user();
        $body = $request->validated('body');

        $note = $lead->notes()->create([
            'author_id' => $user?->id,
            // Denormalised so a deleted user's notes still say who wrote them.
            'author_name' => $user?->name ?? 'Inconnu',
            'body' => $body,
        ]);

        $lead->recordActivity(ActivityKind::Note, self::quote('ajoutée', $body), $user);

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
        $body = $note->body;
        $note->delete();

        $lead->recordActivity(
            ActivityKind::Note,
            self::quote('supprimée', $body),
            $request->user(),
        );

        return response()->noContent();
    }

    /**
     * The trail line for a note, quoting the note itself.
     *
     * Saying only that a note was added meant the history could not be read
     * without opening every one of them. The body is squished onto a single
     * line first: it comes from a textarea, and a label is rendered as one
     * line of the timeline, so its newlines would otherwise collapse into
     * ragged gaps.
     */
    private static function quote(string $verb, string $body): string
    {
        $excerpt = Str::limit(Str::squish($body), self::EXCERPT, '…');

        return "Note interne {$verb} — « {$excerpt} »";
    }
}
