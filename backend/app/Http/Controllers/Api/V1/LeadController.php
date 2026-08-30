<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityKind;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\IndexLeadsRequest;
use App\Http\Requests\Api\UpdateLeadRequest;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Back-office lead management. Every route here requires a signed-in admin. */
class LeadController extends Controller
{
    /**
     * GET /api/v1/leads
     *
     * Paginated and counts-only: the list renders a table, so documents and
     * notes are counted rather than loaded, keeping this to two queries however
     * many rows come back.
     */
    public function index(IndexLeadsRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $leads = Lead::query()
            ->withCount(['documents', 'notes'])
            ->when(
                isset($filters['service']),
                fn ($query) => $query->where('service', $filters['service']),
            )
            ->when(
                isset($filters['status']),
                fn ($query) => $query->where('status', $filters['status']),
            )
            ->when(
                isset($filters['prestation']),
                fn ($query) => $query->where('prestation', $filters['prestation']),
            )
            ->search($filters['search'] ?? null)
            ->latest()
            ->paginate($filters['perPage'] ?? 15)
            ->withQueryString();

        return LeadResource::collection($leads);
    }

    /** GET /api/v1/leads/{lead} — everything the detail page renders. */
    public function show(Lead $lead): LeadResource
    {
        $lead->load([
            'documents',
            'notes' => fn ($query) => $query->latest(),
            'activities' => fn ($query) => $query->latest(),
        ]);

        return new LeadResource($lead);
    }

    /**
     * PATCH /api/v1/leads/{lead}
     *
     * The status, and only the status. Recorded in the trail with the before and
     * after, so the history reads as a sentence rather than a diff.
     */
    public function update(UpdateLeadRequest $request, Lead $lead): LeadResource
    {
        $next = LeadStatus::from($request->validated('status'));

        if ($next !== $lead->status) {
            $from = $lead->status->label();
            $lead->status = $next;
            $lead->save();

            $lead->recordActivity(
                ActivityKind::Statut,
                "Statut passé de {$from} à {$next->label()}",
                $request->user(),
            );
        }

        $lead->load(['documents', 'notes', 'activities']);

        return new LeadResource($lead);
    }

    /**
     * DELETE /api/v1/leads/{lead}
     *
     * Removes the notes, activity and document rows by cascade, and the files
     * with them — a deleted dossier should not leave a bank statement on disk.
     */
    public function destroy(Lead $lead): JsonResponse
    {
        foreach ($lead->documents as $document) {
            $document->deleteWithFile();
        }

        $lead->delete();

        return response()->json(null, 204);
    }

    /**
     * GET /api/v1/stats
     *
     * The dashboard's figures, computed in SQL rather than by pulling every
     * lead into PHP to count them.
     */
    public function stats(Request $request): JsonResponse
    {
        $byStatus = Lead::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $byService = Lead::query()
            ->selectRaw('service, count(*) as total')
            ->groupBy('service')
            ->pluck('total', 'service');

        $byPrestation = Lead::query()
            ->whereNotNull('prestation')
            ->selectRaw('prestation, count(*) as total')
            ->groupBy('prestation')
            ->pluck('total', 'prestation');

        $approuve = (int) ($byStatus[LeadStatus::Approuve->value] ?? 0);
        $refuse = (int) ($byStatus[LeadStatus::Refuse->value] ?? 0);
        $decided = $approuve + $refuse;

        return response()->json([
            'data' => [
                'total' => Lead::count(),
                'byStatus' => $byStatus,
                'byService' => $byService,
                'byPrestation' => $byPrestation,
                'aTraiter' => (int) ($byStatus[LeadStatus::Nouveau->value] ?? 0)
                    + (int) ($byStatus[LeadStatus::AExaminer->value] ?? 0),
                // Null while nothing has been decided — not zero, which would
                // read as "we lose every dossier".
                'tauxReussite' => $decided === 0
                    ? null
                    : (int) round($approuve / $decided * 100),
                'montantDemande' => (int) Lead::sum('montant_cents') / 100,
                'montantApprouve' => (int) Lead::where('status', LeadStatus::Approuve)
                    ->sum('montant_cents') / 100,
            ],
        ]);
    }
}
