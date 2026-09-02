<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * A new administrator, created by one who is already signed in.
 *
 * The route sits behind `auth:sanctum` and `admin`, so the only people who can
 * reach it are administrators — which is the whole authorisation model here.
 * There are no roles below admin to escalate from.
 */
class StoreAdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:190'],

            /*
             * The email is the account's only identifier — it is what the login
             * form and the token endpoint both sign in with — so a duplicate
             * would create an account nobody could reach. Compared in lower
             * case, matching `prepareForValidation`, or two addresses differing
             * only in case would both be accepted and only one would work.
             */
            'email' => [
                'required', 'string', 'email:rfc', 'max:190',
                Rule::unique('users', 'email'),
            ],

            // The same strength the existing admin's own password change asks
            // for, so the two cannot drift apart.
            'password' => ['required', 'confirmed', Password::min(8)],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => mb_strtolower(trim($this->input('email')))]);
        }
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'email.unique' => 'Un administrateur utilise déjà cette adresse.',
        ];
    }
}
