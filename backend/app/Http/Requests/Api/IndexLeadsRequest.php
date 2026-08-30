<?php

namespace App\Http\Requests\Api;

use App\Enums\LeadService;
use App\Enums\LeadStatus;
use App\Enums\Prestation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Filters for the lead list.
 *
 * Validated rather than trusted so an unknown value fails loudly instead of
 * quietly returning everything, which is how a filtered list ends up lying.
 */
class IndexLeadsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'service' => ['sometimes', Rule::enum(LeadService::class)],
            'status' => ['sometimes', Rule::enum(LeadStatus::class)],
            'prestation' => ['sometimes', Rule::enum(Prestation::class)],
            'search' => ['sometimes', 'string', 'max:190'],
            'perPage' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
