<?php

use App\Http\Controllers\Api\V1\ActivityController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\LeadDocumentController;
use App\Http\Controllers\Api\V1\LeadNoteController;
use App\Http\Controllers\Api\V1\ResponsableController;
use App\Http\Controllers\Api\V1\WebsiteLeadController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| CRM API v1
|--------------------------------------------------------------------------
|
| Two audiences, two ways in:
|
|  - `website/*` is the public site submitting a form. No user is signed in,
|    so it is guarded by the shared `X-Api-Key` and throttled hard.
|  - everything else is the back office, on a Sanctum bearer token.
|
| Versioned in the path so the website can keep calling v1 while a v2 is built
| alongside it.
|
*/

Route::prefix('v1')->name('api.v1.')->group(function () {
    /*
     * Website -> CRM. Six submissions a minute per IP is far above what a human
     * filling in a financing form can do, and far below what a script wants.
     */
    Route::middleware(['website.key', 'throttle:6,1'])
        ->prefix('website/leads')
        ->name('website.leads.')
        ->group(function () {
            Route::post('financement', [WebsiteLeadController::class, 'financement'])
                ->name('financement');
            Route::post('developpement', [WebsiteLeadController::class, 'developpement'])
                ->name('developpement');
        });

    // Signing in is public by necessity; the endpoint throttles itself.
    Route::post('auth/token', [AuthController::class, 'store'])->name('auth.store');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'show'])->name('auth.me');
        Route::delete('auth/token', [AuthController::class, 'destroy'])->name('auth.destroy');

        Route::get('leads', [LeadController::class, 'index'])->name('leads.index');
        Route::get('leads/{lead}', [LeadController::class, 'show'])->name('leads.show');
        Route::patch('leads/{lead}', [LeadController::class, 'update'])->name('leads.update');
        Route::delete('leads/{lead}', [LeadController::class, 'destroy'])->name('leads.destroy');

        Route::get('leads/{lead}/documents', [LeadDocumentController::class, 'index'])
            ->name('leads.documents.index');
        Route::post('leads/{lead}/documents', [LeadDocumentController::class, 'store'])
            ->name('leads.documents.store');

        Route::get('leads/{lead}/notes', [LeadNoteController::class, 'index'])
            ->name('leads.notes.index');
        Route::post('leads/{lead}/notes', [LeadNoteController::class, 'store'])
            ->name('leads.notes.store');

        Route::get('leads/{lead}/activities', [ActivityController::class, 'index'])
            ->name('leads.activities.index');

        // Cross-lead views, for the Documents page and the team feed.
        Route::get('documents', [LeadDocumentController::class, 'all'])->name('documents.index');
        Route::get('documents/{document}/download', [LeadDocumentController::class, 'download'])
            ->name('documents.download');
        Route::delete('documents/{document}', [LeadDocumentController::class, 'destroy'])
            ->name('documents.destroy');

        Route::delete('notes/{note}', [LeadNoteController::class, 'destroy'])->name('notes.destroy');

        Route::get('activities', [ActivityController::class, 'all'])->name('activities.index');
        Route::get('responsables', [ResponsableController::class, 'index'])->name('responsables.index');
        Route::get('stats', [LeadController::class, 'stats'])->name('stats');
    });
});
