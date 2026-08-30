<?php

namespace App\Http\Resources;

use App\Enums\LeadService;
use App\Support\Eligibility;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A full lead.
 *
 * Keys are camelCase and named exactly as the website's own form fields, so the
 * Next.js side maps a response onto its `Lead` type without a translation
 * layer. Related collections are only included when eager-loaded, so the list
 * endpoint stays one query.
 *
 * @mixin \App\Models\Lead
 */
class LeadResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $isFinancing = $this->service === LeadService::Financement;

        return [
            'id' => $this->id,
            'reference' => $this->reference,

            'service' => $this->service->value,
            'serviceLabel' => $this->service->label(),
            'source' => $this->service->source(),
            'prestation' => $this->prestation?->value,
            'prestationLabel' => $this->prestation?->label(),

            'status' => $this->status->value,
            'statusLabel' => $this->status->label(),

            'assignedTo' => $this->whenLoaded(
                'assignedTo',
                fn () => $this->assignedTo
                    ? new ResponsableResource($this->assignedTo)
                    : null,
            ),
            'assignedToId' => $this->assigned_to_id,

            // Identity.
            'nom' => $this->nom,
            'prenom' => $this->prenom,
            'email' => $this->email,
            'telephone' => $this->telephone,

            // Company.
            'entreprise' => $this->entreprise,
            'dateCreation' => $this->date_creation?->format('Y-m-d'),
            /** Derived on read, so it is never a stale stored number. */
            'ancienneteMois' => $this->companyAgeMonths(),
            'adresse' => $this->adresse,
            'codePostal' => $this->code_postal,
            'ville' => $this->ville,

            // Financing specifics — absent entirely on a Développement lead.
            $this->mergeWhen($isFinancing, fn () => [
                'chiffreAffaire' => $this->chiffre_affaire,
                'chiffreAffaireValeur' => $this->chiffre_affaire_cents !== null
                    ? $this->chiffre_affaire_cents / 100
                    : null,
                'montant' => $this->montant,
                'montantValeur' => $this->montant_cents !== null
                    ? $this->montant_cents / 100
                    : null,
                'codeCommercial' => $this->code_commercial,
                'siteWeb' => $this->site_web,
                'siteWebUrl' => $this->site_web_url,
                'reseaux' => $this->reseaux,
                'reseauxOu' => $this->reseaux_ou,
                'eligibilite' => [
                    /* What the rules said at submission — kept so raising a
                       threshold later cannot retroactively reject a dossier
                       that was accepted under the old one. */
                    'ageAuDepot' => $this->eligible_age,
                    'revenuAuDepot' => $this->eligible_revenue,
                    'ageActuel' => Eligibility::companyAge(
                        $this->date_creation?->format('Y-m-d'),
                    ),
                    'revenuActuel' => Eligibility::revenue($this->chiffre_affaire),
                    'seuilMois' => Eligibility::MIN_COMPANY_AGE_MONTHS,
                    'seuilRevenu' => Eligibility::MIN_MONTHLY_REVENUE,
                ],
            ]),

            'message' => $this->message,

            'documentCount' => $this->whenCounted('documents'),
            'noteCount' => $this->whenCounted('notes'),

            'documents' => LeadDocumentResource::collection(
                $this->whenLoaded('documents'),
            ),
            'notes' => LeadNoteResource::collection($this->whenLoaded('notes')),
            'activities' => LeadActivityResource::collection(
                $this->whenLoaded('activities'),
            ),

            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
