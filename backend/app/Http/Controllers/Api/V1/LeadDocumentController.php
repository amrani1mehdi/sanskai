<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityKind;
use App\Enums\DocumentKind;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreLeadDocumentRequest;
use App\Http\Resources\LeadDocumentResource;
use App\Models\Lead;
use App\Models\LeadDocument;
use App\Support\DocumentStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

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

    /**
     * POST /api/v1/leads/{lead}/documents
     *
     * For an admin attaching a piece that arrived later, by email say. The row
     * and the file are written together; if the row cannot be written, the
     * bytes are discarded rather than left on disk with nothing pointing at them.
     */
    public function store(StoreLeadDocumentRequest $request, Lead $lead): JsonResponse
    {
        $store = new DocumentStore;

        try {
            $document = DB::transaction(function () use ($request, $lead, $store): LeadDocument {
                $document = $store->put(
                    $lead,
                    $request->file('file'),
                    DocumentKind::from($request->validated('kind')),
                    $request->user(),
                );

                $lead->recordActivity(
                    ActivityKind::Document,
                    "Document ajouté : {$document->original_name}",
                    $request->user(),
                );

                return $document;
            });
        } catch (Throwable $e) {
            $store->discard();

            Log::error("Échec de l'ajout d'un document", [
                'lead_id' => $lead->id,
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]);

            throw $e;
        }

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
        if (! Storage::disk($document->disk())->exists($document->path)) {
            // A row without its file is an inconsistency someone has to fix; a
            // bare 404 would hide it.
            Log::error('Document référencé en base mais absent du disque', [
                'document_id' => $document->id,
                'lead_id' => $document->lead_id,
                'path' => $document->path,
            ]);

            abort(404, 'Fichier introuvable.');
        }

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
    public function destroy(Request $request, LeadDocument $document): Response
    {
        $lead = $document->lead;
        $name = $document->original_name;

        $document->deleteWithFile();

        $lead->recordActivity(
            ActivityKind::Document,
            "Document supprimé : {$name}",
            $request->user(),
        );

        return response()->noContent();
    }
}
