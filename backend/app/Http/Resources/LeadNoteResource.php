<?php

namespace App\Http\Resources;

use App\Models\LeadNote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin LeadNote */
class LeadNoteResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'leadId' => $this->lead_id,
            'author' => $this->author_name,
            'authorId' => $this->author_id,
            'body' => $this->body,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
