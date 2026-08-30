<?php

namespace App\Http\Requests\Api;

use App\Enums\LeadStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The only two things the back office changes on a lead.
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
            'status' => ['sometimes', Rule::enum(LeadStatus::class)],
            // Explicit null unassigns.
            'assignedToId' => [
                'sometimes', 'nullable', 'integer',
                Rule::exists('users', 'id')->where('is_admin', true),
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'assignedToId.exists' => 'Ce responsable est introuvable.',
        ];
    }
}
