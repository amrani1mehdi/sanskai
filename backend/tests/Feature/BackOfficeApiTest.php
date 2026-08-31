<?php

namespace Tests\Feature;

use App\Enums\DocumentKind;
use App\Enums\LeadService;
use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/** Authentication, authorisation and the management endpoints. */
class BackOfficeApiTest extends TestCase
{
    use RefreshDatabase;

    private function admin(array $overrides = []): User
    {
        return User::forceCreate(array_merge([
            'name' => 'Sansekai Admin',
            'email' => 'admin@example.fr',
            'password' => Hash::make('MotDePasseTest123!'),
            'is_admin' => true,
            'email_verified_at' => now(),
        ], $overrides));
    }

    private function lead(array $overrides = []): Lead
    {
        return Lead::create(array_merge([
            'reference' => Lead::nextReference(LeadService::Financement),
            'service' => LeadService::Financement,
            'status' => LeadStatus::Nouveau,
            'nom' => 'Marchand',
            'prenom' => 'Julien',
            'email' => 'j@example.fr',
            'telephone' => '0642187703',
            'entreprise' => 'Atelier Marchand',
            'date_creation' => '2020-04-14',
            'chiffre_affaire' => '48000',
            'chiffre_affaire_cents' => 4800000,
            'montant' => '75000',
            'montant_cents' => 7500000,
        ], $overrides));
    }

    #[Test]
    public function it_issues_a_token_for_an_email_and_password(): void
    {
        $this->admin();

        $this->postJson('/api/v1/auth/token', [
            'email' => 'admin@example.fr',
            'password' => 'MotDePasseTest123!',
            'deviceName' => 'test',
        ])->assertCreated()->assertJsonStructure(['data' => ['token', 'user']]);
    }

    #[Test]
    public function it_accepts_the_email_whatever_the_case(): void
    {
        $this->admin();

        // Nobody types their own address in the case it was registered in.
        $this->postJson('/api/v1/auth/token', [
            'email' => 'Admin@Example.FR',
            'password' => 'MotDePasseTest123!',
            'deviceName' => 'test',
        ])->assertCreated();
    }

    #[Test]
    public function it_rejects_a_login_that_is_not_an_email(): void
    {
        $this->admin();

        // The username is gone: 'admin' is no longer a credential.
        $this->postJson('/api/v1/auth/token', [
            'email' => 'admin',
            'password' => 'MotDePasseTest123!',
            'deviceName' => 'test',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    #[Test]
    public function it_gives_the_same_answer_for_an_unknown_account_and_a_wrong_password(): void
    {
        $this->admin();

        $wrongPassword = $this->postJson('/api/v1/auth/token', [
            'email' => 'admin@example.fr', 'password' => 'faux', 'deviceName' => 't',
        ]);

        $unknownAccount = $this->postJson('/api/v1/auth/token', [
            'email' => 'personne@example.fr', 'password' => 'faux', 'deviceName' => 't',
        ]);

        $wrongPassword->assertStatus(422);
        $unknownAccount->assertStatus(422);
        $this->assertSame(
            $wrongPassword->json('errors.email'),
            $unknownAccount->json('errors.email'),
        );
    }

    #[Test]
    public function it_refuses_a_token_to_a_non_admin(): void
    {
        $this->admin(['is_admin' => false, 'email' => 's@example.fr']);

        $this->postJson('/api/v1/auth/token', [
            'email' => 's@example.fr', 'password' => 'MotDePasseTest123!', 'deviceName' => 't',
        ])->assertStatus(422);
    }

    #[Test]
    public function a_token_stops_working_the_moment_admin_access_is_revoked(): void
    {
        $user = $this->admin();
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/leads')->assertOk();

        $user->forceFill(['is_admin' => false])->save();

        // The check is per request, not per sign-in.
        $this->getJson('/api/v1/leads')->assertForbidden();
    }

    #[Test]
    public function it_requires_authentication_everywhere_else(): void
    {
        foreach (['/api/v1/leads', '/api/v1/stats', '/api/v1/documents', '/api/v1/activities'] as $url) {
            $this->getJson($url)->assertUnauthorized();
        }
    }

    #[Test]
    public function it_filters_and_paginates_leads(): void
    {
        Sanctum::actingAs($this->admin());

        $this->lead();
        $this->lead(['reference' => 'DEV-2026-0001', 'service' => LeadService::Developpement, 'prestation' => 'logo']);

        $this->getJson('/api/v1/leads?service=financement')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.service', 'financement');

        $this->getJson('/api/v1/leads?perPage=1')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 2);
    }

    #[Test]
    public function an_unknown_filter_value_is_rejected_rather_than_ignored(): void
    {
        Sanctum::actingAs($this->admin());

        // Silently returning everything is how a filtered list ends up lying.
        $this->getJson('/api/v1/leads?status=inconnu')
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    #[Test]
    public function it_records_a_status_change_in_the_trail(): void
    {
        Sanctum::actingAs($this->admin());
        $lead = $this->lead();

        $this->patchJson("/api/v1/leads/{$lead->id}", ['status' => 'qualifie'])
            ->assertOk()
            ->assertJsonPath('data.status', 'qualifie');

        $this->assertDatabaseHas('lead_activities', [
            'lead_id' => $lead->id,
            'kind' => 'statut',
            'label' => 'Statut passé de Nouveau à Qualifié',
        ]);
    }

    #[Test]
    public function it_refuses_an_unknown_status(): void
    {
        Sanctum::actingAs($this->admin());
        $lead = $this->lead();

        $this->patchJson("/api/v1/leads/{$lead->id}", ['status' => 'archive'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    #[Test]
    public function submitted_values_cannot_be_edited_through_the_api(): void
    {
        Sanctum::actingAs($this->admin());
        $lead = $this->lead();

        $this->patchJson("/api/v1/leads/{$lead->id}", [
            'status' => 'qualifie',
            'montant' => '999999',
            'email' => 'attacker@example.fr',
        ])->assertOk();

        $lead->refresh();
        $this->assertSame('75000', $lead->montant);
        $this->assertSame('j@example.fr', $lead->email);
    }

    #[Test]
    public function notes_take_their_author_from_the_token(): void
    {
        Sanctum::actingAs($this->admin());
        $lead = $this->lead();

        $this->postJson("/api/v1/leads/{$lead->id}/notes", ['body' => 'Dossier complet.'])
            ->assertCreated()
            ->assertJsonPath('data.author', 'Sansekai Admin');

        $this->postJson("/api/v1/leads/{$lead->id}/notes", ['body' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('body');
    }

    #[Test]
    public function deleting_a_lead_empties_everything_attached_to_it(): void
    {
        Sanctum::actingAs($this->admin());
        $lead = $this->lead();
        $lead->notes()->create(['author_name' => 'A', 'body' => 'x']);

        $this->deleteJson("/api/v1/leads/{$lead->id}")->assertNoContent();

        $this->assertDatabaseCount('leads', 0);
        $this->assertDatabaseCount('lead_notes', 0);
        $this->assertDatabaseCount('lead_activities', 0);
    }

    #[Test]
    public function it_reports_a_missing_lead_as_not_found(): void
    {
        Sanctum::actingAs($this->admin());

        $this->getJson('/api/v1/leads/999999')->assertNotFound();
    }

    #[Test]
    public function stats_report_no_success_rate_until_something_is_decided(): void
    {
        Sanctum::actingAs($this->admin());
        $this->lead();

        // Null, not zero — zero would read as "we lose every dossier".
        $this->getJson('/api/v1/stats')
            ->assertOk()
            ->assertJsonPath('data.tauxReussite', null)
            ->assertJsonPath('data.total', 1);
    }

    #[Test]
    public function changing_the_password_revokes_the_other_tokens_but_not_this_one(): void
    {
        $user = $this->admin();
        $user->createToken('autre-appareil');
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/auth/password', [
            'currentPassword' => 'MotDePasseTest123!',
            'password' => 'NouveauMotDePasse456!',
            'password_confirmation' => 'NouveauMotDePasse456!',
        ])->assertOk();

        $this->assertTrue(Hash::check('NouveauMotDePasse456!', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->where('name', 'autre-appareil')->count());
    }

    #[Test]
    public function it_refuses_a_password_change_without_the_current_one(): void
    {
        Sanctum::actingAs($this->admin());

        $this->patchJson('/api/v1/auth/password', [
            'currentPassword' => 'faux',
            'password' => 'NouveauMotDePasse456!',
            'password_confirmation' => 'NouveauMotDePasse456!',
        ])->assertStatus(422)->assertJsonValidationErrors('currentPassword');
    }

    #[Test]
    public function logging_a_call_records_it_on_the_lead(): void
    {
        Sanctum::actingAs($this->admin());
        $lead = $this->lead();

        // Regression: the controller type-hinted StoreContactActivityRequest
        // without importing it, so PHP looked for the class in the controller's
        // own namespace and every call to this endpoint was a 500.
        $this->postJson("/api/v1/leads/{$lead->id}/activities", ['kind' => 'appel'])
            ->assertCreated();

        $this->assertSame(
            1,
            $lead->activities()->where('kind', 'appel')->count(),
        );
    }

    #[Test]
    public function an_unauthenticated_request_gets_401_even_without_an_accept_header(): void
    {
        // Regression: with no `Accept: application/json`, Laravel tried to
        // redirect the guest to a `login` route that does not exist in this
        // app, and RouteNotFoundException surfaced as a 500.
        $this->get('/api/v1/leads')->assertStatus(401);
        $this->get('/api/v1/documents/1/download')->assertStatus(401);
    }

    #[Test]
    public function a_single_file_slot_refuses_a_second_document(): void
    {
        config()->set('leads.documents_disk', 'documents-test');
        Storage::fake('documents-test');
        Sanctum::actingAs($this->admin());

        $lead = $this->lead();
        $url = "/api/v1/leads/{$lead->id}/documents";

        $this->post($url, [
            'kind' => DocumentKind::Kbis->value,
            'file' => UploadedFile::fake()->create('kbis.pdf', 12, 'application/pdf'),
        ])->assertCreated();

        // A second Kbis would leave two on the dossier with nothing saying
        // which is current; the first has to be deleted deliberately.
        $this->post($url, [
            'kind' => DocumentKind::Kbis->value,
            'file' => UploadedFile::fake()->create('kbis-2.pdf', 12, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('kind');

        $this->assertSame(1, $lead->documents()->count());
    }

    #[Test]
    public function the_accounting_slot_stacks_as_many_as_needed(): void
    {
        config()->set('leads.documents_disk', 'documents-test');
        Storage::fake('documents-test');
        Sanctum::actingAs($this->admin());

        $lead = $this->lead();

        foreach (['bilan.pdf', 'compte-resultat.pdf', 'liasse.pdf'] as $name) {
            $this->post("/api/v1/leads/{$lead->id}/documents", [
                'kind' => DocumentKind::Comptable->value,
                'file' => UploadedFile::fake()->create($name, 12, 'application/pdf'),
            ])->assertCreated();
        }

        $this->assertSame(3, $lead->documents()->count());
    }
}
