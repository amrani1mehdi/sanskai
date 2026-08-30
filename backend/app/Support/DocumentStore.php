<?php

namespace App\Support;

use App\Enums\DocumentKind;
use App\Models\Lead;
use App\Models\LeadDocument;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Writes uploaded files and keeps the disk consistent with the database.
 *
 * Two problems this exists to solve.
 *
 * A file written inside a database transaction outlives a rollback: the row
 * disappears, the bytes stay. Callers register what they wrote and call
 * `discard()` on failure, so the disk never keeps a document no lead points to.
 *
 * And the browser's Content-Type is a claim, not a fact — it is set by whatever
 * posted the form. The stored type is sniffed from the file's own contents
 * instead, so a `.pdf` header on an executable cannot make it look like a PDF
 * to everything downstream.
 */
final class DocumentStore
{
    /** @var list<string> paths written during the current request */
    private array $written = [];

    public function disk(): string
    {
        return config('leads.documents_disk');
    }

    /**
     * Stores one upload and records it against the lead.
     */
    public function put(
        Lead $lead,
        UploadedFile $file,
        DocumentKind $kind,
        ?User $uploadedBy = null,
    ): LeadDocument {
        // Hashed name: two applicants both sending "kbis.pdf" must not collide,
        // and the stored name should not carry the applicant's own filename.
        $path = $file->store("leads/{$lead->id}", $this->disk());

        $this->written[] = $path;

        return $lead->documents()->create([
            'kind' => $kind,
            'original_name' => self::safeName($file->getClientOriginalName()),
            'path' => $path,
            // Sniffed from content, never the client's claim.
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'size' => $file->getSize(),
            'uploaded_by_id' => $uploadedBy?->id,
        ]);
    }

    /** Removes everything written so far. Call when the transaction rolls back. */
    public function discard(): void
    {
        foreach ($this->written as $path) {
            Storage::disk($this->disk())->delete($path);
        }

        $this->written = [];
    }

    /**
     * A filename safe to echo back in a Content-Disposition header.
     *
     * The original is attacker-supplied: it can carry path separators, control
     * characters or newlines, and it is later returned to a browser as a
     * download name. Strip it to a basename and a conservative character set.
     */
    public static function safeName(string $name): string
    {
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';
        $name = trim(preg_replace('/[^\p{L}\p{N}._ -]+/u', '_', $name) ?? '');

        if ($name === '' || str_starts_with($name, '.')) {
            $name = 'document'.$name;
        }

        return Str::limit($name, 180, '');
    }
}
