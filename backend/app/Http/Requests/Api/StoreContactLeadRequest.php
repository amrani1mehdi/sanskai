<?php

namespace App\Http\Requests\Api;

use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation for the /contact form.
 *
 * The lightest of the three: someone asking a question, not opening a dossier.
 * Only the company, the name and the email are required — a message is welcome
 * but a blank one still tells you who to call back.
 */
class StoreContactLeadRequest extends FormRequest
{
    /**
     * Ceiling on the invoices slot.
     *
     * "As many as you have" still needs a number, or one request can park an
     * unbounded number of 10 MB files on the disk. Matches the financing form's
     * accounting slot, for one rule instead of two.
     */
    public const MAX_INVOICES = 20;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'entreprise' => ['required', 'string', 'max:190'],
            /*
             * Nine digits in France, often typed with spaces. Kept as a string
             * and not validated for length: a foreign company has no SIREN, and
             * refusing a contact message over a company number would be absurd.
             */
            'siren' => ['nullable', 'string', 'max:32'],
            /*
             * The form asks for one "nom complet" field, so that is what the
             * API takes. Splitting it into nom/prenom is the server's job —
             * see WebsiteLeadController::splitName().
             */
            'nomComplet' => ['required', 'string', 'max:190'],
            'email' => ['required', 'email:rfc', 'max:190'],
            'telephone' => ['nullable', 'string', 'max:40'],
            'message' => ['nullable', 'string', 'max:5000'],

            /*
             * Invoices, optional and however many there are — the form's own
             * label says "factures", plural.
             *
             * Types and size come from the same config as every other upload in
             * the app rather than the label's "(PDF)": a photographed invoice is
             * a real case, and one extra rule to remember buys nothing.
             */
            'factures' => ['nullable', 'array', 'max:'.self::MAX_INVOICES],
            'factures.*' => [
                'file',
                'mimes:'.implode(',', config('leads.accepted_mimes')),
                'max:'.UploadLimits::maxKilobytes(),
            ],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'nomComplet' => 'nom complet',
            'entreprise' => 'entreprise',
            'factures' => 'factures',
            'factures.*' => 'facture',
        ];
    }
}
