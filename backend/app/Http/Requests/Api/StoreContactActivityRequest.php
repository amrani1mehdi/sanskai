<?php

namespace App\Http\Requests\Api;

use App\Enums\ActivityKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Records that someone rang or emailed the applicant.
 *
 * Only the kind is accepted — the label is composed server-side from the lead's
 * own contact details. Letting the client supply the text would put arbitrary
 * strings into an audit trail whose whole value is that it cannot be authored.
 */
class StoreContactActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'kind' => [
                'required',
                Rule::enum(ActivityKind::class)->only([
                    ActivityKind::Appel,
                    ActivityKind::Email,
                ]),
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'kind.Illuminate\Validation\Rules\Enum' => 'Seuls un appel ou un email peuvent être consignés.',
        ];
    }
}
