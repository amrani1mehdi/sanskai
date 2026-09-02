<?php

namespace App\Http\Requests\Api;

use App\Enums\LeadStatus;
use App\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * What the back office may change on a lead.
 *
 * This used to be the status and nothing else, on the principle that what the
 * applicant sent is evidence and correcting it silently would break the audit
 * trail. The trail is the part that mattered, not the read-only-ness: an
 * administrator on the phone to a company whose accountant typed the SIREN
 * wrong has to be able to fix it, and refusing meant the correction happened in
 * a note nobody could act on instead.
 *
 * So the fields open up, and `LeadController::update` writes an activity entry
 * naming every field it changed and both values. Nothing is corrected quietly —
 * the original is still recoverable from the trail.
 *
 * Uploaded documents stay out of it. Those are the evidence proper, and they
 * have their own endpoints.
 */
class UpdateLeadRequest extends FormRequest
{
    /**
     * Editable fields, mapped from the API's camelCase to the column behind it.
     *
     * The order is the order the activity entry lists them in, which is the
     * order they appear on the lead's own screen.
     */
    public const EDITABLE = [
        'nom' => 'nom',
        'prenom' => 'prenom',
        'email' => 'email',
        'telephone' => 'telephone',
        'entreprise' => 'entreprise',
        'siren' => 'siren',
        'adresse' => 'adresse',
        'codePostal' => 'code_postal',
        'ville' => 'ville',
        'message' => 'message',
    ];

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // `sometimes`: a status move and a field correction are separate
            // actions, and neither should have to send the other's payload.
            'status' => ['sometimes', 'required', Rule::enum(LeadStatus::class)],

            'nom' => ['sometimes', 'required', 'string', 'max:120'],
            'prenom' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email:rfc', 'max:190'],
            'telephone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'entreprise' => ['sometimes', 'required', 'string', 'max:190'],
            'siren' => ['sometimes', 'nullable', 'string', 'max:32'],
            'adresse' => ['sometimes', 'nullable', 'string', 'max:190'],
            'codePostal' => ['sometimes', 'nullable', 'string', 'max:20'],
            'ville' => ['sometimes', 'nullable', 'string', 'max:120'],
            'message' => ['sometimes', 'nullable', 'string', 'max:5000'],

            /* Sent as a boolean; stored as the moment it became true, so the
               history keeps when the call happened and not merely that it did. */
            'contacted' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * A status has to mean something for the lead it is being set on.
     *
     * The six pipeline stages belong to a service enquiry; a contact message
     * has two, answered and not. Without this the enum rule alone would happily
     * mark a question "Approuvé" or a financing dossier "Répondu" — nonsense
     * the pipeline and the dashboard would then have to render.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->has('status')) {
                    return;
                }

                $status = LeadStatus::tryFrom((string) $this->input('status'));
                $lead = $this->route('lead');

                if (! $status || ! $lead instanceof Lead) {
                    return;
                }

                if (! $status->allowedFor($lead->service)) {
                    $allowed = implode(', ', array_map(
                        fn (LeadStatus $one) => $one->labelFor($lead->service),
                        LeadStatus::forService($lead->service),
                    ));

                    $validator->errors()->add(
                        'status',
                        "Le statut « {$status->label()} » ne s'applique pas à "
                            ."« {$lead->service->label()} ». Valeurs possibles : {$allowed}.",
                    );
                }
            },
        ];
    }
}
