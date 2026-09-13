<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation for the trade-show client sheet (/fiche-client).
 *
 * The paper sheet handed out at stands, as the page a QR code opens. It asks far
 * less up front than the financing form — whoever is at the stand is not about
 * to go and find a Kbis. What it cannot do without is a company, a person, a way
 * to reach them, and what they came to talk about.
 *
 * The choice values are the ones `src/lib/leads/salon.ts` offers on the site.
 */
class StoreSalonLeadRequest extends FormRequest
{
    /** Company age, as the sheet's tick boxes put it. */
    public const ANCIENNETES = ['moins_6_mois', '1_3_ans', '3_5_ans', '5_10_ans', 'plus_10_ans'];

    /** "Besoin principal" — several may be ticked. */
    public const BESOINS = ['financement', 'site_web', 'migration', 'developpement_commercial', 'autre'];

    /** Why the financing is wanted — several may be ticked. */
    public const MOTIFS = ['tresorerie', 'developpement', 'materiel', 'stock', 'recrutement', 'investissement', 'autre'];

    public const DELAIS = ['urgent', 'moins_1_mois', '1_3_mois', 'plus_3_mois'];

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'entreprise' => ['required', 'string', 'max:190'],
            'secteur' => ['nullable', 'string', 'max:190'],
            'siteWebUrl' => ['nullable', 'string', 'max:190'],
            'ville' => ['nullable', 'string', 'max:120'],
            'emailEntreprise' => ['nullable', 'email:rfc', 'max:190'],
            'anciennete' => ['nullable', Rule::in(self::ANCIENNETES)],
            // A figure or a range — "8", "10-20" — as people answer it.
            'salaries' => ['nullable', 'string', 'max:20'],

            'nomDirigeant' => ['required', 'string', 'max:190'],
            'fonction' => ['nullable', 'string', 'max:120'],
            'mobile' => ['required', 'string', 'max:40'],
            'fixe' => ['nullable', 'string', 'max:40'],
            'email' => ['required', 'email:rfc', 'max:190'],

            'besoins' => ['required', 'array', 'min:1'],
            'besoins.*' => ['string', 'distinct', Rule::in(self::BESOINS)],
            /*
             * `required_if` compares a field to a value and cannot see inside an
             * array, so "Autre" being among the boxes ticked is checked here.
             */
            'besoinAutre' => [
                Rule::requiredIf(fn () => $this->ticked('besoins', 'autre')),
                'nullable', 'string', 'max:190',
            ],

            'montant' => ['nullable', 'string', 'max:60'],
            'motifs' => ['nullable', 'array'],
            'motifs.*' => ['string', 'distinct', Rule::in(self::MOTIFS)],
            'motifAutre' => [
                Rule::requiredIf(fn () => $this->ticked('motifs', 'autre')),
                'nullable', 'string', 'max:190',
            ],
            'delai' => ['nullable', Rule::in(self::DELAIS)],
        ];
    }

    /** True when `$value` is among the boxes ticked in `$field`. */
    private function ticked(string $field, string $value): bool
    {
        return in_array($value, (array) $this->input($field, []), true);
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'nomDirigeant' => 'nom du dirigeant',
            'emailEntreprise' => "e-mail de l'entreprise",
            'siteWebUrl' => 'site web',
            'besoinAutre' => 'autre besoin',
            'motifAutre' => 'autre motif',
        ];
    }
}
