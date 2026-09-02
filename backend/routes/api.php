<?php

use App\Http\Controllers\Api\V1\ActivityController;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\LeadDocumentController;
use App\Http\Controllers\Api\V1\LeadNoteController;
use App\Http\Controllers\Api\V1\WebsiteLeadController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| CRM API v1
|--------------------------------------------------------------------------
|
| Two audiences, two ways in:
|
|  - `website/*` is the public site submitting a form. No user is signed in and
|    no key is required; the rate limit is the only thing in front of it.
|  - everything else is the back office, on a Sanctum bearer token.
|
| Versioned in the path so the website can keep calling v1 while a v2 is built
| alongside it.
|
*/

Route::prefix('v1')->name('api.v1.')->group(function () {
    /*
     * Website -> CRM. Open by design: these three endpoints take a form from
     * the public site, and the browser has no credential to offer.
     *
     * The throttle is therefore the only guard. Six submissions a minute per IP
     * is far above what a human filling in a financing form can do, and far
     * below what a script wants. They only ever write — nothing here reads a
     * lead back, so an abusive caller can create junk, not read anyone's file.
     */
    Route::middleware(['throttle:6,1'])
        ->prefix('website/leads')
        ->name('website.leads.')
        ->group(function () {
            Route::post('financement', [WebsiteLeadController::class, 'financement'])
                ->name('financement');
            Route::post('developpement', [WebsiteLeadController::class, 'developpement'])
                ->name('developpement');
            Route::post('contact', [WebsiteLeadController::class, 'contact'])
                ->name('contact');
        });

    // Signing in is public by necessity; the endpoint throttles itself.
    Route::post('auth/token', [AuthController::class, 'store'])->name('auth.store');

    // `admin` re-checks is_admin on every request: revoking access should take
    // effect on the next call, not whenever the holder next signs in.
    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'show'])->name('auth.me');

        /*
         * Who can get into the back office.
         *
         * Behind the same `admin` gate as everything else: an administrator is
         * the only thing that can make another one, and there is no lesser role
         * to escalate from.
         */
        Route::get('admins', [AdminController::class, 'index'])->name('admins.index');
        Route::post('admins', [AdminController::class, 'store'])->name('admins.store');
        Route::delete('admins/{user}', [AdminController::class, 'destroy'])
            ->name('admins.destroy');

        Route::patch('auth/password', [AuthController::class, 'updatePassword'])
            ->name('auth.password');
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
        Route::post('leads/{lead}/activities', [ActivityController::class, 'store'])
            ->name('leads.activities.store');

        // Cross-lead views, for the Documents page and the team feed.
        Route::get('documents', [LeadDocumentController::class, 'all'])->name('documents.index');
        Route::get('documents/{document}/download', [LeadDocumentController::class, 'download'])
            ->name('documents.download');
        Route::delete('documents/{document}', [LeadDocumentController::class, 'destroy'])
            ->name('documents.destroy');

        Route::delete('notes/{note}', [LeadNoteController::class, 'destroy'])->name('notes.destroy');

        Route::get('activities', [ActivityController::class, 'all'])->name('activities.index');
        Route::get('stats', [LeadController::class, 'stats'])->name('stats');

        /*
         * Read markers, shared by the whole back office.
         *
         * `leads/seen` is declared before `leads/{lead}/seen` so the literal
         * wins: otherwise "seen" binds as a lead id and the route resolves to a
         * lead that does not exist.
         */
        Route::post('leads/seen', [LeadController::class, 'markAllSeen'])
            ->name('leads.seen.all');
        Route::post('leads/{lead}/seen', [LeadController::class, 'markSeen'])
            ->name('leads.seen');

        // Polled by the back office every few seconds; deliberately cheap.
        Route::get('changes', [LeadController::class, 'changes'])->name('changes');
    });
});
