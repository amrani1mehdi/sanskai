<?php

namespace App\Models;

use App\Enums\DocumentKind;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['kind', 'original_name', 'path', 'mime_type', 'size', 'uploaded_by_id'])]
/** The storage path is an internal detail; downloads go through the API. */
#[Hidden(['path'])]
class LeadDocument extends Model
{
    protected function casts(): array
    {
        return ['kind' => DocumentKind::class, 'size' => 'integer'];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_id');
    }

    public function disk(): string
    {
        return config('leads.documents_disk');
    }

    /** Removes the row and the file together, so no orphan is left on disk. */
    public function deleteWithFile(): void
    {
        Storage::disk($this->disk())->delete($this->path);
        $this->delete();
    }
}
