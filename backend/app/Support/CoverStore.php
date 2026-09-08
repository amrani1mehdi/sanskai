<?php

namespace App\Support;

use App\Models\BlogPost;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Writes and replaces article cover images.
 *
 * Covers live on the same private disk as lead documents and are streamed by an
 * endpoint rather than linked from public storage — `storage:link` is a symlink
 * and this application reaches the VPS as copied files, which is precisely what
 * loses a symlink.
 *
 * Replacing a cover deletes the old file. That is deliberate and it is why this
 * is not `DocumentStore`: a lead keeps every document ever attached to it, an
 * article has exactly one cover and the previous one is nothing but bytes.
 */
final class CoverStore
{
    /** @var list<string> paths written during the current request */
    private array $written = [];

    public function disk(): string
    {
        return config('leads.documents_disk');
    }

    /**
     * Puts a new cover on an article, replacing whatever it had.
     *
     * The model is only mutated, never saved: the caller is inside a
     * transaction and owns the write, so a failure after this point rolls the
     * row back and `discard()` takes the bytes with it.
     */
    public function put(BlogPost $post, UploadedFile $file): void
    {
        $previous = $post->cover_path;

        $path = $file->store('blog-covers', $this->disk());

        $this->written[] = $path;

        $post->cover_path = $path;
        $post->cover_name = DocumentStore::safeName($file->getClientOriginalName());
        // Sniffed from the file's own contents, never the browser's claim —
        // this value is echoed back as the Content-Type of a public response.
        $post->cover_mime = $file->getMimeType() ?: 'application/octet-stream';
        $post->cover_size = $file->getSize();

        /*
         * The old file goes only once the new one is safely written. Deleting
         * first would leave the article with no picture at all if the upload
         * then failed.
         */
        if (filled($previous)) {
            Storage::disk($this->disk())->delete($previous);
        }
    }

    /** Takes the picture off and deletes the bytes. */
    public function remove(BlogPost $post): void
    {
        if (blank($post->cover_path)) {
            return;
        }

        Storage::disk($this->disk())->delete($post->cover_path);

        $post->cover_path = null;
        $post->cover_name = null;
        $post->cover_mime = null;
        $post->cover_size = null;
    }

    /** Removes everything written so far. Call when the transaction rolls back. */
    public function discard(): void
    {
        foreach ($this->written as $path) {
            Storage::disk($this->disk())->delete($path);
        }

        $this->written = [];
    }
}
