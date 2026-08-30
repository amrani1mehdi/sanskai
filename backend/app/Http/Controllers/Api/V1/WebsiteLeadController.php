<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityKind;
use App\Enums\DocumentKind;
use App\Enums\LeadService;
use App\Enums\LeadStatus;
use App\Enums\Prestation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDevelopmentLeadRequest;
use App\Http\Requests\Api\StoreFinancingLeadRequest;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use App\Support\Eligibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

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
     * POST /api/v1/website/leads/financement
     *
     * The lead, its files and its first activity entry are written in one
     * transaction: a dossier that exists without the documents it was accepted
     * on would be worse than no dossier at all.
     */
    public function financement(StoreFinancingLeadRequest $request): JsonResponse
    {
        $data = $request->validated();

        $lead = DB::transaction(function () use ($request, $data): Lead {
            $lead = Lead::create([
                'reference' => Lead::nextReference(LeadService::Financement),
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
            ]);

            foreach (self::UPLOAD_FIELDS as $field => $kind) {
                if ($request->hasFile($field)) {
                    self::storeDocument($lead, $request->file($field), $kind);
                }
            }

            $lead->recordActivity(
                ActivityKind::Creation,
                'Demande reçue via le formulaire de financement',
            );

            return $lead;
        });

        return $this->created($lead);
    }

    /** POST /api/v1/website/leads/developpement */
    public function developpement(StoreDevelopmentLeadRequest $request): JsonResponse
    {
        $data = $request->validated();

        $lead = DB::transaction(function () use ($data): Lead {
            $lead = Lead::create([
                'reference' => Lead::nextReference(LeadService::Developpement),
                'service' => LeadService::Developpement,
                'prestation' => Prestation::from($data['service']),
                'status' => LeadStatus::Nouveau,

                'nom' => $data['nom'],
                'prenom' => $data['prenom'],
                'email' => $data['email'],
                'telephone' => $data['telephone'],
                'entreprise' => $data['entreprise'],
                'message' => $data['message'] ?? null,
            ]);

            $lead->recordActivity(
                ActivityKind::Creation,
                'Demande reçue via le formulaire de développement',
            );

            return $lead;
        });

        return $this->created($lead);
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

    private static function storeDocument(Lead $lead, UploadedFile $file, DocumentKind $kind): void
    {
        $disk = config('leads.documents_disk');

        $lead->documents()->create([
            'kind' => $kind,
            'original_name' => $file->getClientOriginalName(),
            // Hashed name: two applicants both sending "kbis.pdf" must not collide,
            // and the stored name should not leak the applicant's own filename.
            'path' => $file->store("leads/{$lead->id}", $disk),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]);
    }

    /** Integer cents, so totals and sorting never touch a float. */
    private static function toCents(?string $amount): ?int
    {
        $value = Eligibility::parseAmount($amount);

        return $value === null ? null : (int) round($value * 100);
    }
}
