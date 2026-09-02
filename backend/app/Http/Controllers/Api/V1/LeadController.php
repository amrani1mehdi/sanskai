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
     * The status, the fiche's own fields, or both. Everything that changes is
     * recorded in the trail with its before and after, so the history reads as
     * a sentence rather than a diff — and so a correction never loses what the
     * applicant originally sent.
     */
    public function update(UpdateLeadRequest $request, Lead $lead): LeadResource
    {
        if ($request->has('status')) {
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
        }

        /*
         * Corrections, and the record of them.
         *
         * Every changed field is named in the activity entry with both values,
         * so what the applicant originally submitted stays recoverable from the
         * trail. That is the whole reason these fields were closed before, and
         * writing the old value down is what makes opening them safe.
         *
         * Only fields actually present are touched, and only ones whose value
         * really differs — a form that posts every field on every save must not
         * fill the history with "changed X from Y to Y".
         */
        $changes = [];

        foreach (UpdateLeadRequest::EDITABLE as $field => $column) {
            if (! $request->has($field)) {
                continue;
            }

            $value = $request->validated($field);
            $before = $lead->{$column};

            if ($before === $value) {
                continue;
            }

            $lead->{$column} = $value;
            $changes[] = sprintf(
                '%s : « %s » → « %s »',
                $field,
                $before === null || $before === '' ? '—' : $before,
                $value === null || $value === '' ? '—' : $value,
            );
        }

        if ($changes !== []) {
            $lead->save();

            $lead->recordActivity(
                ActivityKind::Modification,
                'Fiche modifiée — '.implode(' ; ', $changes),
                $request->user(),
            );
        }

        /*
         * Contacted, and when.
         *
         * The board keeps a lead highlighted until this is set, so it is the
         * one flag that changes what everyone sees — worth a line in the trail
         * both ways. Marking an already-contacted lead contacted again keeps
         * the first timestamp: when someone was first called back is a fact
         * about the lead, and a second click should not rewrite it.
         */
        if ($request->has('contacted')) {
            $contacted = $request->boolean('contacted');

            if ($contacted && $lead->contacted_at === null) {
                $lead->contacted_at = now();
                $lead->save();

                $lead->recordActivity(
                    ActivityKind::Appel,
                    'Marqué comme contacté',
                    $request->user(),
                );
            }

            if (! $contacted && $lead->contacted_at !== null) {
                $lead->contacted_at = null;
                $lead->save();

                $lead->recordActivity(
                    ActivityKind::Modification,
                    'Remis en « à contacter »',
                    $request->user(),
                );
            }
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
    /**
     * POST /api/v1/leads/{lead}/seen
     *
     * Marks one lead as looked at. Shared: it stops being new for the whole
     * back office, which is the point — two people chasing the same arrival is
     * the thing the badge is meant to prevent.
     *
     * Idempotent, and it keeps the first time rather than the latest: "when did
     * we notice this" is a fact about the lead, and opening it again later does
     * not change it.
     */
    public function markSeen(Lead $lead): JsonResponse
    {
        if ($lead->seen_at === null) {
            $lead->seen_at = now();
            $lead->save();
        }

        return response()->json(['data' => ['seenAt' => $lead->seen_at->toIso8601String()]]);
    }

    /**
     * POST /api/v1/leads/seen
     *
     * Clears the badge in one go. One statement rather than a row at a time,
     * since "mark all read" on a busy morning should not be forty round trips
     * through the model.
     */
    public function markAllSeen(): JsonResponse
    {
        $marked = Lead::whereNull('seen_at')->update(['seen_at' => now()]);

        return response()->json(['data' => ['marked' => $marked]]);
    }

    public function changes(): JsonResponse
    {
        $row = Lead::query()
            ->selectRaw('count(*) as aggregate_count')
            ->selectRaw('max(id) as latest_id')
            ->selectRaw('max(updated_at) as updated_at')
            // Part of the fingerprint too: one administrator opening a lead has
            // to move the other's badge, and nothing else about the row changes
            // when they do.
            ->selectRaw('sum(case when seen_at is null then 1 else 0 end) as unseen_count')
            ->first();

        return response()->json([
            'data' => [
                'count' => (int) $row->aggregate_count,
                'unseen' => (int) $row->unseen_count,
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
