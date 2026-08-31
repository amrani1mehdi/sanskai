<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\LeadActivity */
class LeadActivityResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'leadId' => $this->lead_id,
            'kind' => $this->kind->value,
            'label' => $this->label,
            'actor' => $this->actor_name,
            'at' => $this->created_at?->toIso8601String(),
            'lead' => $this->whenLoaded('lead', fn () => [
                'id' => $this->lead->id,
                'reference' => $this->lead->reference,
                'entreprise' => $this->lead->entreprise,
            ]),
        ];
    }
}
