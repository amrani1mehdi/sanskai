<?php

namespace App\Http\Requests\Api;

use App\Enums\LeadStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
}
