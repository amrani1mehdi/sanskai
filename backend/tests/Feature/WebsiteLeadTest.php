<?php

namespace Tests\Feature;

use App\Enums\DocumentKind;
use App\Http\Requests\Api\StoreFinancingLeadRequest;
use App\Models\Lead;
use App\Models\LeadDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/** The two endpoints the public website posts to. */
class WebsiteLeadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('leads.documents_disk', 'documents-test');
        Storage::fake('documents-test');
    }

    /** @return array<string, mixed> */
    private function financingPayload(array $overrides = []): array
    {
        return array_merge([
            'nom' => 'Marchand',
            'prenom' => 'Julien',
            'telephone' => '0642187703',
            'email' => 'j.marchand@example.fr',
            'entreprise' => 'Atelier Marchand SARL',
            'dateCreation' => '2020-04-14',
            'codePostal' => '69003',
            'ville' => 'Lyon',
            'chiffreAffaire' => '48000',
            'montant' => '75000',
            'siteWeb' => false,
            'reseaux' => false,
            'kbis' => UploadedFile::fake()->create('kbis.pdf', 12, 'application/pdf'),
            'relevesBancaires' => UploadedFile::fake()->create('releves.pdf', 12, 'application/pdf'),
            // The accounting slot is a list, however many pieces there are.
            'documentsComptables' => [
                UploadedFile::fake()->create('bilan.pdf', 12, 'application/pdf'),
            ],
        ], $overrides);
    }

    #[Test]
    public function the_submission_endpoints_need_no_credential(): void
    {
        // Open by design — the public form's browser has nothing to present.
        // A bare POST reaches validation rather than being turned away at the
        // door, which is what a 422 here proves.
        $this->postJson('/api/v1/website/leads/developpement', [])
            ->assertStatus(422);

        $this->assertSame(0, Lead::count());
    }

    #[Test]
    public function the_submission_endpoints_are_rate_limited(): void
    {
        // With no key in front of them, the throttle is the only guard left, so
        // it is worth a test of its own rather than trusting the annotation.
        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/v1/website/leads/developpement', []);
        }

        $this->postJson('/api/v1/website/leads/developpement', [])
            ->assertStatus(429);
    }

    #[Test]
    public function it_stores_a_financing_lead_with_its_documents(): void
    {
        $response = $this->post('/api/v1/website/leads/financement', $this->financingPayload());

        $response->assertCreated()
            ->assertJsonPath('data.reference', 'FIN-'.now()->year.'-0001')
            ->assertJsonPath('data.status', 'nouveau');

        $lead = Lead::firstOrFail();

        $this->assertSame('financement', $lead->service->value);
        // Kept verbatim and parsed, so evidence and arithmetic both survive.
        $this->assertSame('48000', $lead->chiffre_affaire);
        $this->assertSame(4800000, $lead->chiffre_affaire_cents);
        $this->assertTrue($lead->eligible_age);
        $this->assertTrue($lead->eligible_revenue);

        $this->assertCount(3, $lead->documents);
        foreach ($lead->documents as $document) {
            Storage::disk('documents-test')->assertExists($document->path);
        }
        $this->assertSame(1, $lead->activities()->count());
    }

    #[Test]
    public function it_rejects_a_company_younger_than_six_months(): void
    {
        $this->post('/api/v1/website/leads/financement', $this->financingPayload([
            'dateCreation' => now()->subMonths(2)->format('Y-m-d'),
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('dateCreation');

        $this->assertSame(0, Lead::count());
    }

    #[Test]
    public function it_rejects_revenue_below_the_floor(): void
    {
        $this->post('/api/v1/website/leads/financement', $this->financingPayload([
            'chiffreAffaire' => '4200',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('chiffreAffaire');
    }

    #[Test]
    public function it_accepts_a_submission_with_no_documents_at_all(): void
    {
        $payload = $this->financingPayload();
        unset(
            $payload['kbis'],
            $payload['relevesBancaires'],
            $payload['documentsComptables'],
        );

        // Every slot is optional: a dossier missing its papers is a lead to
        // chase, not a submission to refuse.
        $this->post('/api/v1/website/leads/financement', $payload)
            ->assertCreated();

        $this->assertSame(0, Lead::firstOrFail()->documents()->count());
    }

    #[Test]
    public function the_accounting_slot_takes_several_files(): void
    {
        $payload = $this->financingPayload([
            'documentsComptables' => [
                UploadedFile::fake()->create('bilan.pdf', 12, 'application/pdf'),
                UploadedFile::fake()->create('compte-resultat.pdf', 12, 'application/pdf'),
                UploadedFile::fake()->create('liasse.pdf', 12, 'application/pdf'),
            ],
        ]);

        $this->post('/api/v1/website/leads/financement', $payload)
            ->assertCreated();

        $lead = Lead::firstOrFail();

        $this->assertSame(
            3,
            $lead->documents()->where('kind', DocumentKind::Comptable)->count(),
        );
        // One each for identity-less payload: kbis + statement + the three.
        $this->assertCount(5, $lead->documents);
    }

    #[Test]
    public function it_rejects_more_accounting_files_than_the_ceiling(): void
    {
        $tooMany = array_map(
            fn (int $n) => UploadedFile::fake()->create("piece-{$n}.pdf", 12, 'application/pdf'),
            range(1, StoreFinancingLeadRequest::MAX_ACCOUNTING_FILES + 1),
        );

        $this->post('/api/v1/website/leads/financement', $this->financingPayload([
            'documentsComptables' => $tooMany,
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('documentsComptables');
    }

    #[Test]
    public function it_leaves_no_file_behind_when_the_lead_cannot_be_written(): void
    {
        // Force the insert to fail after the files are on disk.
        Lead::creating(fn () => throw new \RuntimeException('boom'));

        try {
            $this->post('/api/v1/website/leads/financement', $this->financingPayload());
        } catch (\Throwable) {
            // The failure is the point; what matters is the disk afterwards.
        }

        $this->assertSame(0, Lead::count());
        $this->assertEmpty(
            Storage::disk('documents-test')->allFiles(),
            'A rolled-back submission must not leave documents on disk.',
        );
    }

    #[Test]
    public function it_stores_the_sniffed_mime_type_not_the_clients_claim(): void
    {
        // A real file, not UploadedFile::fake(): the fake derives its MIME type
        // from the filename, which is exactly the behaviour under test.
        $path = tempnam(sys_get_temp_dir(), 'sniff');
        file_put_contents($path, base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        ));

        // PNG bytes, a .pdf name, and a client type claiming PDF.
        $liar = new UploadedFile($path, 'kbis.pdf', 'application/pdf', null, true);

        $this->post('/api/v1/website/leads/financement', $this->financingPayload([
            'kbis' => $liar,
        ]))
            ->assertCreated();

        $kbis = LeadDocument::where('kind', DocumentKind::Kbis)->firstOrFail();

        $this->assertSame('image/png', $kbis->mime_type);
    }

    #[Test]
    public function it_sanitises_a_hostile_filename(): void
    {
        $this->post('/api/v1/website/leads/financement', $this->financingPayload([
            'kbis' => UploadedFile::fake()->create(
                '../../etc/passwd"; rm -rf /.pdf', 12, 'application/pdf',
            ),
        ]))
            ->assertCreated();

        $name = LeadDocument::where('kind', DocumentKind::Kbis)->value('original_name');

        $this->assertStringNotContainsString('/', $name);
        $this->assertStringNotContainsString('..', $name);
        $this->assertStringNotContainsString('"', $name);
    }

    #[Test]
    public function it_numbers_references_in_sequence(): void
    {
        foreach (range(1, 3) as $expected) {
            $this->postJson('/api/v1/website/leads/developpement', [
                'service' => 'site_web',
                'nom' => 'Bertrand',
                'prenom' => 'Alice',
                'email' => 'alice@example.fr',
                'telephone' => '0788214015',
                'entreprise' => 'Bertrand Immobilier',
            ])
                ->assertCreated()
                ->assertJsonPath(
                    'data.reference',
                    sprintf('DEV-%d-%04d', now()->year, $expected),
                );
        }
    }

    #[Test]
    public function it_rejects_an_unknown_sub_service(): void
    {
        $this->postJson('/api/v1/website/leads/developpement', [
            'service' => 'consulting_quantique',
            'nom' => 'A', 'prenom' => 'B',
            'email' => 'a@b.fr', 'telephone' => '06', 'entreprise' => 'C',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('service');
    }

    #[Test]
    public function it_stores_a_contact_message(): void
    {
        $this->postJson('/api/v1/website/leads/contact', [
            'entreprise' => 'Atelier Marchand SARL',
            'siren' => '812 345 678',
            'nomComplet' => 'Julien Marchand',
            'email' => 'j.marchand@example.fr',
            'message' => 'Bonjour, je souhaite un rappel.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.reference', 'CON-'.now()->year.'-0001')
            ->assertJsonPath('data.status', 'nouveau');

        $lead = Lead::firstOrFail();

        $this->assertSame('contact', $lead->service->value);
        $this->assertSame('Atelier Marchand SARL', $lead->entreprise);
        $this->assertSame('812 345 678', $lead->siren);
        $this->assertSame('Bonjour, je souhaite un rappel.', $lead->message);
        // The trail opens on submission, like the other two forms.
        $this->assertSame(1, $lead->activities()->count());
    }

    #[Test]
    public function it_splits_the_full_name_into_a_first_and_last_name(): void
    {
        $cases = [
            'Julien Marchand' => ['Julien', 'Marchand'],
            // Everything after the first token stays together.
            'Marie Claire Dupont-Fontaine' => ['Marie', 'Claire Dupont-Fontaine'],
            // A single word is a surname, not a forename.
            'Marchand' => ['', 'Marchand'],
            // Stray whitespace must not become part of a name.
            '  Julien   Marchand  ' => ['Julien', 'Marchand'],
        ];

        foreach ($cases as $full => [$prenom, $nom]) {
            $this->postJson('/api/v1/website/leads/contact', [
                'entreprise' => 'X',
                'nomComplet' => $full,
                'email' => 'a@b.fr',
            ])->assertCreated();

            $lead = Lead::latest('id')->firstOrFail();

            $this->assertSame($prenom, $lead->prenom, "prenom for '{$full}'");
            $this->assertSame($nom, $lead->nom, "nom for '{$full}'");
        }
    }

    #[Test]
    public function a_contact_message_needs_a_company_a_name_and_an_email(): void
    {
        // The message itself is optional — a blank one still says who to call.
        $this->postJson('/api/v1/website/leads/contact', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['entreprise', 'nomComplet', 'email']);

        $this->postJson('/api/v1/website/leads/contact', [
            'entreprise' => 'X',
            'nomComplet' => 'Julien Marchand',
            'email' => 'j@example.fr',
        ])->assertCreated();
    }

    #[Test]
    public function contact_references_are_numbered_separately_from_the_others(): void
    {
        // Each service counts its own sequence, so a contact message does not
        // consume a FIN- number and leave a gap in the financing dossiers.
        $this->post('/api/v1/website/leads/financement', $this->financingPayload());

        $this->postJson('/api/v1/website/leads/contact', [
            'entreprise' => 'X', 'nomComplet' => 'A B', 'email' => 'a@b.fr',
        ])->assertJsonPath('data.reference', 'CON-'.now()->year.'-0001');
    }
}
