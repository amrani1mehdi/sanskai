<?php

namespace App\Http\Requests\Api;

use App\Enums\Prestation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Validation for a Développement Digital enquiry. No uploads. */
class StoreDevelopmentLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * A sub-service posted under an old name is read as the current one.
     *
     * Done before validation rather than after, so the enquiry passes the enum
     * rule instead of being rejected as an invalid choice. See
     * `Prestation::LEGACY_VALUES` for why a stale name still arrives.
     */
    protected function prepareForValidation(): void
    {
        $service = $this->input('service');

        if (is_string($service)) {
            $this->merge(['service' => Prestation::normalise($service)]);
        }
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
