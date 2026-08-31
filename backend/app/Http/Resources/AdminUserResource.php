<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * The signed-in administrator.
 *
 * Only what the back office renders — never the password, the email
 * verification or the MFA columns, all of which the model hides anyway.
 *
 * @mixin \App\Models\User
 */
class AdminUserResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'initials' => Str::of($this->name)
                ->explode(' ')
                ->filter()
                ->take(2)
                ->map(fn (string $part) => Str::upper(Str::substr($part, 0, 1)))
                ->implode(''),
        ];
    }
}
