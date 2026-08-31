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
    /**
     * Ceiling on the accounting slot.
     *
     * "As many as you have" still needs a number, or one request can park an
     * unbounded number of 10 MB files on the disk.
     */
    public const MAX_ACCOUNTING_FILES = 20;

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

            /*
             * Every slot is optional. A dossier that arrives without its Kbis
             * is a lead to chase, not a submission to refuse — the back office
             * can attach what is missing later.
             *
             * One file each for identity, Kbis and the bank statement; the
             * statement covers six months in a single export. Financial and
             * accounting papers come in as many pieces as the applicant has.
             */
            'pieceIdentite' => ['nullable', ...$file],
            'kbis' => ['nullable', ...$file],
            'relevesBancaires' => ['nullable', ...$file],
            'documentsComptables' => ['nullable', 'array', 'max:'.self::MAX_ACCOUNTING_FILES],
            'documentsComptables.*' => $file,
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
            'relevesBancaires' => 'relevé bancaire',
            'documentsComptables' => 'informations financières / comptables',
            'documentsComptables.*' => 'information financière / comptable',
            'pieceIdentite' => "pièce d'identité",
        ];
    }
}
