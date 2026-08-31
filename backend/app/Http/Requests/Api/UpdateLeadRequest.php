<?php

namespace App\Http\Requests\Api;

use App\Enums\LeadStatus;
use App\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The only thing the back office changes on a lead.
 *
 * Submitted values are never editable through the API: what the applicant sent
 * is evidence, and silently correcting it would break the audit trail.
 */
class UpdateLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(LeadStatus::class)],
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
