<?php

namespace App\Http\Requests\Api;

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
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'nomComplet' => 'nom complet',
            'entreprise' => 'entreprise',
        ];
    }
}
