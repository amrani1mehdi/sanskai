<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityKind;
use App\Enums\LeadService;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\IndexLeadsRequest;
use App\Http\Requests\Api\UpdateLeadRequest;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;

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
            $from = $lead->status->labelFor($lead->service);
            $lead->status = $next;
            $lead->save();

            $lead->recordActivity(
                ActivityKind::Statut,
                "Statut passé de {$from} à {$next->labelFor($lead->service)}",
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
    public function destroy(Lead $lead): Response
    {
        foreach ($lead->documents as $document) {
            $document->deleteWithFile();
        }

        $lead->delete();

        return response()->noContent();
    }

    /**
     * GET /api/v1/changes
     *
     * A fingerprint of the CRM's current state, for the back office to poll.
     *
     * Three aggregates over one table — the cost does not grow with the number
     * of leads, which is the whole point: the panel can ask every few seconds
     * without re-downloading a list that has not changed. It refetches only
     * when one of these moves.
     *
     * `count` catches deletions, `latestId` catches insertions, and
     * `updatedAt` catches an edit that changes neither — a status moved on the
     * Kanban, say. Any one alone would miss a case.
     */
    public function changes(): JsonResponse
    {
        $row = Lead::query()
            ->selectRaw('count(*) as aggregate_count')
            ->selectRaw('max(id) as latest_id')
            ->selectRaw('max(updated_at) as updated_at')
            ->first();

        return response()->json([
            'data' => [
                'count' => (int) $row->aggregate_count,
                'latestId' => $row->latest_id === null ? null : (int) $row->latest_id,
                // ISO 8601 like every other timestamp the API returns, rather
                // than the driver's raw datetime string.
                'updatedAt' => $row->updated_at === null
                    ? null
                    : Carbon::parse($row->updated_at)->toIso8601String(),
            ],
        ]);
    }

    /**
     * GET /api/v1/stats
     *
     * The dashboard's figures, computed in SQL rather than by pulling every
     * lead into PHP to count them.
     */
    public function stats(Request $request): JsonResponse
    {
        /*
         * Service enquiries only.
         *
         * A contact message is somebody writing in, not a service the company
         * sells, so counting it here would make `total` disagree with
         * `byService` — which cannot contain a value that is not a service. It
         * is reported separately as `messages`.
         */
        $dossiers = fn () => Lead::query()->where('service', '!=', LeadService::Contact);

        $byStatus = $dossiers()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $byService = $dossiers()
            ->selectRaw('service, count(*) as total')
            ->groupBy('service')
            ->pluck('total', 'service');

        $byPrestation = $dossiers()
            ->whereNotNull('prestation')
            ->selectRaw('prestation, count(*) as total')
            ->groupBy('prestation')
            ->pluck('total', 'prestation');

        $approuve = (int) ($byStatus[LeadStatus::Approuve->value] ?? 0);
        $refuse = (int) ($byStatus[LeadStatus::Refuse->value] ?? 0);
        $decided = $approuve + $refuse;

        return response()->json([
            'data' => [
                'total' => $dossiers()->count(),
                'messages' => Lead::where('service', LeadService::Contact)->count(),
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
                // Amounts only exist on financing dossiers, so the contact
                // exclusion makes no difference here — kept for consistency.
                'montantDemande' => (int) $dossiers()->sum('montant_cents') / 100,
                'montantApprouve' => (int) $dossiers()
                    ->where('status', LeadStatus::Approuve)
                    ->sum('montant_cents') / 100,
            ],
        ]);
    }
}
