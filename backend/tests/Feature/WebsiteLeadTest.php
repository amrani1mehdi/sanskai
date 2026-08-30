<?php

namespace Tests\Feature;

use App\Enums\DocumentKind;
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

        config()->set('leads.website_api_key', 'test-key');
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
            'documentsComptables' => UploadedFile::fake()->create('comptes.pdf', 12, 'application/pdf'),
        ], $overrides);
    }

    #[Test]
    public function it_refuses_a_submission_without_the_api_key(): void
    {
        $this->postJson('/api/v1/website/leads/developpement', [])
            ->assertUnauthorized();

        $this->assertSame(0, Lead::count());
    }

    #[Test]
    public function it_stores_a_financing_lead_with_its_documents(): void
    {
        $response = $this
            ->withHeader('X-Api-Key', 'test-key')
            ->post('/api/v1/website/leads/financement', $this->financingPayload());

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
        $this->withHeader('X-Api-Key', 'test-key')
            ->post('/api/v1/website/leads/financement', $this->financingPayload([
                'dateCreation' => now()->subMonths(2)->format('Y-m-d'),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('dateCreation');

        $this->assertSame(0, Lead::count());
    }

    #[Test]
    public function it_rejects_revenue_below_the_floor(): void
    {
        $this->withHeader('X-Api-Key', 'test-key')
            ->post('/api/v1/website/leads/financement', $this->financingPayload([
                'chiffreAffaire' => '4200',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('chiffreAffaire');
    }

    #[Test]
    public function it_requires_the_three_mandatory_uploads(): void
    {
        $payload = $this->financingPayload();
        unset($payload['kbis']);

        $this->withHeader('X-Api-Key', 'test-key')
            ->post('/api/v1/website/leads/financement', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('kbis');
    }

    #[Test]
    public function it_leaves_no_file_behind_when_the_lead_cannot_be_written(): void
    {
        // Force the insert to fail after the files are on disk.
        Lead::creating(fn () => throw new \RuntimeException('boom'));

        try {
            $this->withHeader('X-Api-Key', 'test-key')
                ->post('/api/v1/website/leads/financement', $this->financingPayload());
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

        $this->withHeader('X-Api-Key', 'test-key')
            ->post('/api/v1/website/leads/financement', $this->financingPayload([
                'kbis' => $liar,
            ]))
            ->assertCreated();

        $kbis = LeadDocument::where('kind', DocumentKind::Kbis)->firstOrFail();

        $this->assertSame('image/png', $kbis->mime_type);
    }

    #[Test]
    public function it_sanitises_a_hostile_filename(): void
    {
        $this->withHeader('X-Api-Key', 'test-key')
            ->post('/api/v1/website/leads/financement', $this->financingPayload([
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
            $this->withHeader('X-Api-Key', 'test-key')
                ->postJson('/api/v1/website/leads/developpement', [
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
        $this->withHeader('X-Api-Key', 'test-key')
            ->postJson('/api/v1/website/leads/developpement', [
                'service' => 'consulting_quantique',
                'nom' => 'A', 'prenom' => 'B',
                'email' => 'a@b.fr', 'telephone' => '06', 'entreprise' => 'C',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('service');
    }
}
