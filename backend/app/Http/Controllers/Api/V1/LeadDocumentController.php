<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityKind;
use App\Enums\DocumentKind;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreLeadDocumentRequest;
use App\Http\Resources\LeadDocumentResource;
use App\Models\Lead;
use App\Models\LeadDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadDocumentController extends Controller
{
    /** GET /api/v1/leads/{lead}/documents */
    public function index(Lead $lead): AnonymousResourceCollection
    {
        return LeadDocumentResource::collection($lead->documents()->latest()->get());
    }

    /**
     * GET /api/v1/documents
     *
     * Every document across every lead — the back office's Documents page,
     * which answers "which dossiers are still missing a Kbis?".
     */
    public function all(Request $request): AnonymousResourceCollection
    {
        $documents = LeadDocument::query()
            ->with('lead:id,reference,entreprise,service')
            ->when(
                $request->filled('kind'),
                fn ($query) => $query->where('kind', $request->string('kind')),
            )
            ->latest()
            ->paginate((int) $request->integer('perPage', 20))
            ->withQueryString();

        return LeadDocumentResource::collection($documents);
    }

    /** POST /api/v1/leads/{lead}/documents — an admin attaching a missing piece. */
    public function store(StoreLeadDocumentRequest $request, Lead $lead): JsonResponse
    {
        $file = $request->file('file');
        $kind = DocumentKind::from($request->validated('kind'));

        $document = $lead->documents()->create([
            'kind' => $kind,
            'original_name' => $file->getClientOriginalName(),
            'path' => $file->store("leads/{$lead->id}", config('leads.documents_disk')),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'uploaded_by_id' => $request->user()?->id,
        ]);

        $lead->recordActivity(
            ActivityKind::Document,
            "Document ajouté : {$document->original_name}",
            $request->user(),
        );

        return response()->json(['data' => new LeadDocumentResource($document)], 201);
    }

    /**
     * GET /api/v1/documents/{document}/download
     *
     * Streams from the private disk under the caller's own authentication —
     * there is no public URL for any of these files.
     */
    public function download(Request $request, LeadDocument $document): StreamedResponse
    {
        abort_unless(
            Storage::disk($document->disk())->exists($document->path),
            404,
            'Fichier introuvable.',
        );

        $document->lead->recordActivity(
            ActivityKind::Document,
            "Document consulté : {$document->original_name}",
            $request->user(),
        );

        return Storage::disk($document->disk())->download(
            $document->path,
            $document->original_name,
        );
    }

    /** DELETE /api/v1/documents/{document} */
    public function destroy(Request $request, LeadDocument $document): JsonResponse
    {
        $lead = $document->lead;
        $name = $document->original_name;

        $document->deleteWithFile();

        $lead->recordActivity(
            ActivityKind::Document,
            "Document supprimé : {$name}",
            $request->user(),
        );

        return response()->json(null, 204);
    }
}
