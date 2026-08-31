<?php

namespace App\Http\Requests\Api;

use App\Support\Eligibility;
use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Validation for a financing submission.
 *
 * Deliberately the same shape and the same rules as the public form, including
 * the eligibility gate: the browser check is a courtesy, this one is the one
 * that counts.
 */
class StoreFinancingLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $file = [
            'file',
            'mimes:'.implode(',', config('leads.accepted_mimes')),
            'max:'.UploadLimits::maxKilobytes(),
        ];

        return [
            'nom' => ['required', 'string', 'max:120'],
            'prenom' => ['required', 'string', 'max:120'],
            'telephone' => ['required', 'string', 'max:40'],
            'email' => ['required', 'email:rfc', 'max:190'],

            'entreprise' => ['required', 'string', 'max:190'],
            'dateCreation' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'adresse' => ['nullable', 'string', 'max:190'],
            'codePostal' => ['required', 'string', 'max:20'],
            'ville' => ['required', 'string', 'max:120'],

            'chiffreAffaire' => ['required', 'string', 'max:60'],
            'montant' => ['required', 'string', 'max:60'],
            'codeCommercial' => ['nullable', 'string', 'max:60'],

            'siteWeb' => ['required', 'boolean'],
            // Required only when they said yes, matching the form's follow-up.
            'siteWebUrl' => ['nullable', 'required_if:siteWeb,true', 'string', 'max:190'],
            'reseaux' => ['required', 'boolean'],
            'reseauxOu' => ['nullable', 'required_if:reseaux,true', 'string', 'max:190'],

            'message' => ['nullable', 'string', 'max:5000'],

            'pieceIdentite' => ['nullable', ...$file],
            'kbis' => ['required', ...$file],
            'relevesBancaires' => ['required', ...$file],
            'documentsComptables' => ['required', ...$file],
        ];
    }

    /**
     * The eligibility gate, reported against the field that failed so the
     * caller can show it where the applicant can act on it.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if (! Eligibility::companyAge($this->input('dateCreation'))) {
                    $validator->errors()->add(
                        'dateCreation',
                        'Votre entreprise doit avoir au moins '
                            .Eligibility::MIN_COMPANY_AGE_MONTHS
                            .' mois d\'activité pour déposer une demande.',
                    );
                }

                if (! Eligibility::revenue($this->input('chiffreAffaire'))) {
                    $validator->errors()->add(
                        'chiffreAffaire',
                        'Votre chiffre d\'affaires mensuel doit atteindre au moins '
                            .number_format(Eligibility::MIN_MONTHLY_REVENUE, 0, ',', ' ')
                            .' € pour déposer une demande.',
                    );
                }
            },
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'dateCreation' => 'date de création',
            'chiffreAffaire' => "chiffre d'affaires mensuel",
            'codePostal' => 'code postal',
            'siteWebUrl' => 'adresse du site web',
            'reseauxOu' => 'réseaux sociaux',
            'kbis' => 'Kbis',
            'relevesBancaires' => 'relevés bancaires',
            'documentsComptables' => 'documents comptables',
            'pieceIdentite' => "pièce d'identité",
        ];
    }
}
