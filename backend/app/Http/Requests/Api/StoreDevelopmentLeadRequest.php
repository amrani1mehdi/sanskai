<?php

namespace App\Http\Requests\Api;

use App\Enums\Prestation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Validation for a Développement d'entreprise enquiry. No uploads. */
class StoreDevelopmentLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'service' => ['required', Rule::enum(Prestation::class)],
            'nom' => ['required', 'string', 'max:120'],
            'prenom' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190'],
            'telephone' => ['required', 'string', 'max:40'],
            'entreprise' => ['required', 'string', 'max:190'],
            'message' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['service' => 'sous-service'];
    }
}
