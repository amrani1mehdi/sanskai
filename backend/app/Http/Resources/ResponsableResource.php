<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * A `users` row, as the CRM's "responsable".
 *
 * Only the fields the back office renders — never the email verification,
 * MFA or password columns.
 *
 * @mixin \App\Models\User
 */
class ResponsableResource extends JsonResource
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
            'leadCount' => $this->whenCounted('assignedLeads'),
        ];
    }
}
