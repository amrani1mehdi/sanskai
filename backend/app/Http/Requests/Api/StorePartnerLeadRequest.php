<?php

namespace App\Http\Requests\Api;

use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation for the partner form at /devenir-partenaire.
 *
 * The opposite stance to the financing dossier. There, every document is
 * optional because refusing an applicant over a missing Kbis loses the lead.
 * Here the collaboration is already agreed and the form exists only to collect
 * the papers it needs — a submission without them is not a partner to chase,
 * it is the same email to send again. So the papers are required.
 *
 * The one conditional: an employee proves it with an attestation from their
 * employer, and an independent has no employer to ask.
 */
class StorePartnerLeadRequest extends FormRequest
{
    /** Recto and verso of an identity card, as two photos or one scan. */
    public const MAX_IDENTITY_FILES = 2;

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
            'entreprise' => ['required', 'string', 'max:190'],
            'nom' => ['required', 'string', 'max:120'],
            'prenom' => ['required', 'string', 'max:120'],
            'telephone' => ['required', 'string', 'max:40'],

            'independant' => ['required', 'boolean'],

            // The contract address is the partner's address: it is the one the
            // CRM stores as the lead's email. Billing may be someone else's.
            'emailContrat' => ['required', 'email:rfc', 'max:190'],
            'emailFacturation' => ['required', 'email:rfc', 'max:190'],

            'kbis' => ['nullable', ...$file],
            'pieceIdentite' => ['nullable', 'array', 'max:'.self::MAX_IDENTITY_FILES],
            'pieceIdentite.*' => $file,
            /*
             * Only an employee has an employer to ask. `exclude_if` drops the
             * field from the validated data when they said they are independent,
             * so a file picked before switching the answer is neither checked
             * nor stored.
             */
            'attestationEmployeur' => ['exclude_if:independant,true', 'nullable', ...$file],
            'attestationHebergement' => ['nullable', ...$file],
            'rib' => ['nullable', ...$file],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'entreprise' => 'nom du cabinet',
            'independant' => 'statut indépendant',
            'emailContrat' => 'e-mail à faire figurer sur les contrats',
            'emailFacturation' => 'e-mail de facturation',
            'kbis' => 'extrait de Kbis',
            'pieceIdentite' => "carte d'identité",
            'pieceIdentite.*' => "carte d'identité",
            'attestationEmployeur' => "attestation d'employeur",
            'attestationHebergement' => "attestation d'hébergement",
            'rib' => 'RIB',
        ];
    }
}
