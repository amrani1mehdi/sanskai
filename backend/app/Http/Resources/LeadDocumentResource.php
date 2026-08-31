<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\LeadDocument */
class LeadDocumentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'leadId' => $this->lead_id,
            'kind' => $this->kind->value,
            'kindLabel' => $this->kind->label(),
            'name' => $this->original_name,
            'mimeType' => $this->mime_type,
            'size' => $this->size,
            'uploadedAt' => $this->created_at?->toIso8601String(),
            /* Files are on a private disk, so this is an API route that streams
               the file to an authenticated caller, not a public URL. */
            'downloadUrl' => route('api.v1.documents.download', $this->id),
        ];
    }
}
