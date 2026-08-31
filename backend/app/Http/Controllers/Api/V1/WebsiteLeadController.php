<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityKind;
use App\Enums\DocumentKind;
use App\Enums\LeadService;
use App\Enums\LeadStatus;
use App\Enums\Prestation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreContactLeadRequest;
use App\Http\Requests\Api\StoreDevelopmentLeadRequest;
use App\Http\Requests\Api\StoreFinancingLeadRequest;
use App\Models\Lead;
use App\Support\DocumentStore;
use App\Support\Eligibility;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * The website's two submission endpoints.
 *
 * Public in the sense that no user is signed in — the caller is the Next.js
 * server holding the shared API key, never a browser.
 */
class WebsiteLeadController extends Controller
{
    /** Maps a form upload field to the slot it fills. */
    private const UPLOAD_FIELDS = [
        'pieceIdentite' => DocumentKind::PieceIdentite,
        'kbis' => DocumentKind::Kbis,
        'relevesBancaires' => DocumentKind::ReleveBancaire,
        'documentsComptables' => DocumentKind::Comptable,
    ];

    /**
     * Two submissions arriving together can propose the same reference; the
     * unique index rejects the loser, and it simply tries again.
     */
    private const REFERENCE_ATTEMPTS = 3;

    /**
     * POST /api/v1/website/leads/financement
     *
     * The lead, its files and its first activity entry are written in one
     * transaction: a dossier that exists without the documents it was accepted
     * on would be worse than no dossier at all.
     */
    public function financement(StoreFinancingLeadRequest $request): JsonResponse
    {
        $data = $request->validated();
        $store = new DocumentStore;

        $lead = $this->createWithReference(
            LeadService::Financement,
            fn (string $reference) => tap(
                Lead::create([
                    'reference' => $reference,
                    'service' => LeadService::Financement,
                    'status' => LeadStatus::Nouveau,

                    'nom' => $data['nom'],
                    'prenom' => $data['prenom'],
                    'email' => $data['email'],
                    'telephone' => $data['telephone'],

                    'entreprise' => $data['entreprise'],
                    'date_creation' => $data['dateCreation'],
                    'adresse' => $data['adresse'] ?? null,
                    'code_postal' => $data['codePostal'],
                    'ville' => $data['ville'],

                    'chiffre_affaire' => $data['chiffreAffaire'],
                    'chiffre_affaire_cents' => self::toCents($data['chiffreAffaire']),
                    'montant' => $data['montant'],
                    'montant_cents' => self::toCents($data['montant']),
                    'code_commercial' => $data['codeCommercial'] ?? null,

                    'site_web' => $data['siteWeb'],
                    'site_web_url' => $data['siteWebUrl'] ?? null,
                    'reseaux' => $data['reseaux'],
                    'reseaux_ou' => $data['reseauxOu'] ?? null,

                    'message' => $data['message'] ?? null,

                    // Frozen at submission; the resource also reports them live.
                    'eligible_age' => Eligibility::companyAge($data['dateCreation']),
                    'eligible_revenue' => Eligibility::revenue($data['chiffreAffaire']),
                ]),
                function (Lead $lead) use ($request, $store): void {
                    foreach (self::UPLOAD_FIELDS as $field => $kind) {
                        if (! $request->hasFile($field)) {
                            continue;
                        }

                        // `documentsComptables` arrives as an array; the other
                        // three are one file each. Wrapping handles both without
                        // the caller having to know which is which.
                        foreach (Arr::wrap($request->file($field)) as $file) {
                            $store->put($lead, $file, $kind);
                        }
                    }

                    $lead->recordActivity(
                        ActivityKind::Creation,
                        'Demande reçue via le formulaire de financement',
                    );
                },
            ),
            $store,
        );

        Log::info('Lead de financement enregistré', [
            'lead_id' => $lead->id,
            'reference' => $lead->reference,
            'documents' => $lead->documents()->count(),
            'eligible' => $lead->eligible_age && $lead->eligible_revenue,
        ]);

        return $this->created($lead);
    }

    /** POST /api/v1/website/leads/developpement */
    public function developpement(StoreDevelopmentLeadRequest $request): JsonResponse
    {
        $data = $request->validated();

        $lead = $this->createWithReference(
            LeadService::Developpement,
            fn (string $reference) => tap(
                Lead::create([
                    'reference' => $reference,
                    'service' => LeadService::Developpement,
                    'prestation' => Prestation::from($data['service']),
                    'status' => LeadStatus::Nouveau,

                    'nom' => $data['nom'],
                    'prenom' => $data['prenom'],
                    'email' => $data['email'],
                    'telephone' => $data['telephone'],
                    'entreprise' => $data['entreprise'],
                    'message' => $data['message'] ?? null,
                ]),
                fn (Lead $lead) => $lead->recordActivity(
                    ActivityKind::Creation,
                    'Demande reçue via le formulaire de développement',
                ),
            ),
        );

        Log::info('Lead de développement enregistré', [
            'lead_id' => $lead->id,
            'reference' => $lead->reference,
            'prestation' => $lead->prestation?->value,
        ]);

        return $this->created($lead);
    }

    /**
     * POST /api/v1/website/leads/contact
     *
     * The /contact form: a question, not a dossier. No uploads, no eligibility
     * gate, and only the company, name and email are required — everything the
     * back office needs to call someone back.
     */
    public function contact(StoreContactLeadRequest $request): JsonResponse
    {
        $data = $request->validated();
        [$prenom, $nom] = self::splitName($data['nomComplet']);

        $lead = $this->createWithReference(
            LeadService::Contact,
            fn (string $reference) => tap(
                Lead::create([
                    'reference' => $reference,
                    'service' => LeadService::Contact,
                    'status' => LeadStatus::Nouveau,

                    'nom' => $nom,
                    'prenom' => $prenom,
                    'email' => $data['email'],
                    'telephone' => $data['telephone'] ?? null,

                    'entreprise' => $data['entreprise'],
                    'siren' => $data['siren'] ?? null,

                    'message' => $data['message'] ?? null,
                ]),
                fn (Lead $lead) => $lead->recordActivity(
                    ActivityKind::Creation,
                    'Message reçu via le formulaire de contact',
                ),
            ),
        );

        Log::info('Message de contact enregistré', [
            'lead_id' => $lead->id,
            'reference' => $lead->reference,
        ]);

        return $this->created($lead);
    }

    /**
     * Splits "Mahdi Amrani" into a first and last name.
     *
     * The contact form asks for one field, the CRM stores two, and something
     * has to bridge them. First token is the given name, the rest is the family
     * name — right for most French entries and wrong for some, which is why the
     * whole string is preserved across the two columns rather than truncated:
     * nothing the visitor typed is lost, even when the split lands oddly.
     *
     * A single word becomes the family name with an empty given name, since
     * "Amrani" is far more likely to be a surname than a forename here.
     *
     * @return array{0: string, 1: string}
     */
    private static function splitName(string $full): array
    {
        $parts = preg_split('/\s+/u', trim($full), 2, PREG_SPLIT_NO_EMPTY) ?: [];

        return match (count($parts)) {
            0 => ['', ''],
            1 => ['', $parts[0]],
            default => [$parts[0], $parts[1]],
        };
    }

    /**
     * Runs `$make` in a transaction, retrying when the reference collides.
     *
     * Files written before a rollback are discarded: the database forgets the
     * row, and the disk must forget the bytes, or every failed submission
     * leaves a bank statement nobody can reach or account for.
     *
     * @param  callable(string): Lead  $make
     */
    private function createWithReference(
        LeadService $service,
        callable $make,
        ?DocumentStore $store = null,
    ): Lead {
        for ($attempt = 1; ; $attempt++) {
            try {
                return DB::transaction(
                    fn (): Lead => $make(Lead::nextReference($service)),
                );
            } catch (UniqueConstraintViolationException $e) {
                $store?->discard();

                if ($attempt >= self::REFERENCE_ATTEMPTS) {
                    Log::error('Référence de lead introuvable après plusieurs essais', [
                        'service' => $service->value,
                        'attempts' => $attempt,
                    ]);

                    throw $e;
                }

                Log::warning('Collision de référence, nouvelle tentative', [
                    'service' => $service->value,
                    'attempt' => $attempt,
                ]);
            } catch (Throwable $e) {
                $store?->discard();

                Log::error('Échec de création du lead', [
                    'service' => $service->value,
                    'exception' => $e::class,
                    'message' => $e->getMessage(),
                ]);

                throw $e;
            }
        }
    }

    /**
     * Only the reference goes back to the website.
     *
     * The submitter already knows what they typed, and the browser has no
     * business seeing internal ids or the audit trail — but the reference is
     * worth showing them, and worth quoting on the phone.
     */
    private function created(Lead $lead): JsonResponse
    {
        return response()->json([
            'data' => [
                'id' => $lead->id,
                'reference' => $lead->reference,
                'status' => $lead->status->value,
                'createdAt' => $lead->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    /** Integer cents, so totals and sorting never touch a float. */
    private static function toCents(?string $amount): ?int
    {
        $value = Eligibility::parseAmount($amount);

        return $value === null ? null : (int) round($value * 100);
    }
}
