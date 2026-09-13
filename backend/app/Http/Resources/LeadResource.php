<?php

namespace App\Http\Resources;

use App\Enums\LeadService;
use App\Enums\LeadStatus;
use App\Models\Lead;
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
 * @mixin Lead
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
            /* Contextual: `nouveau` reads "Nouveau" on a dossier and
               "Non répondu" on a contact message. Same stored value. */
            'statusLabel' => $this->status->labelFor($this->service),

            /* Null until somebody in the back office has looked. Shared by the
               whole team, not per viewer: once one of them opens it, it stops
               being new for everybody. */
            'seenAt' => $this->seen_at?->toIso8601String(),
            // Null until someone actually calls them back. The board colours
            // every lead that is still waiting on this.
            'contactedAt' => $this->contacted_at?->toIso8601String(),
            /* What this lead may be set to, so the back office builds its
               picker from the API rather than from a list of its own that
               could drift out of step with what the API will accept. */
            'statusOptions' => array_map(
                fn (LeadStatus $status) => [
                    'value' => $status->value,
                    'label' => $status->labelFor($this->service),
                ],
                LeadStatus::forService($this->service),
            ),

            // Identity.
            'nom' => $this->nom,
            'prenom' => $this->prenom,
            'email' => $this->email,
            'telephone' => $this->telephone,

            // Company.
            'entreprise' => $this->entreprise,
            /** Only the contact form asks for it; null on the other two. */
            'siren' => $this->siren,
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

            /* The trade-show sheet: the amount when financing was one of the
               needs, and the answers that have no column of their own. */
            $this->mergeWhen($this->service === LeadService::Salon, fn () => [
                'montant' => $this->montant,
                'montantValeur' => $this->montant_cents !== null
                    ? $this->montant_cents / 100
                    : null,
                'siteWebUrl' => $this->site_web_url,
                'details' => $this->details,
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
