<?php

namespace Tests\Feature;

use App\Enums\DocumentKind;
use App\Http\Resources\LeadResource;
use App\Mail\NewLeadReceived;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/** The partner form, as the /devenir-partenaire page submits it. */
class PartnerLeadTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = '/api/v1/website/leads/partenaire';

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('leads.documents_disk', 'documents-test');
        Storage::fake('documents-test');
    }

    private static function pdf(string $name): UploadedFile
    {
        return UploadedFile::fake()->create($name, 12, 'application/pdf');
    }

    /** @return array<string, mixed> */
    private function submission(array $overrides = []): array
    {
        return array_merge([
            'entreprise' => 'Cabinet Durand Conseil',
            'nom' => 'Durand',
            'prenom' => 'Sophie',
            'telephone' => '06 42 18 77 03',
            // Multipart carries booleans as text, the way the form sends them.
            'independant' => '0',
            'emailContrat' => 'sophie@durand-conseil.fr',
            'emailFacturation' => 'compta@durand-conseil.fr',
            'kbis' => self::pdf('kbis.pdf'),
            // Recto and verso, photographed separately.
            'pieceIdentite' => [
                UploadedFile::fake()->create('cni-recto.jpg', 12, 'image/jpeg'),
                UploadedFile::fake()->create('cni-verso.png', 12, 'image/png'),
            ],
            'attestationEmployeur' => self::pdf('attestation-employeur.pdf'),
            'attestationHebergement' => self::pdf('attestation-hebergement.pdf'),
            'rib' => self::pdf('rib.pdf'),
        ], $overrides);
    }

    #[Test]
    public function it_stores_a_partner_with_their_papers(): void
    {
        $this->post(self::ENDPOINT, $this->submission(), ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.reference', 'PAR-'.now()->year.'-0001')
            ->assertJsonPath('data.status', 'nouveau');

        $lead = Lead::firstOrFail();

        $this->assertSame('partenaire', $lead->service->value);
        $this->assertSame('Cabinet Durand Conseil', $lead->entreprise);
        $this->assertSame('Durand', $lead->nom);
        $this->assertSame('Sophie', $lead->prenom);
        $this->assertSame('06 42 18 77 03', $lead->telephone);
        // The contract address is the partner's, so it is the lead's email.
        $this->assertSame('sophie@durand-conseil.fr', $lead->email);
        $this->assertSame([
            'independant' => false,
            'emailFacturation' => 'compta@durand-conseil.fr',
        ], $lead->details);

        foreach ([
            DocumentKind::Kbis->value => 1,
            DocumentKind::PieceIdentite->value => 2,
            DocumentKind::AttestationEmployeur->value => 1,
            DocumentKind::AttestationHebergement->value => 1,
            DocumentKind::Rib->value => 1,
        ] as $kind => $count) {
            $this->assertSame(
                $count,
                $lead->documents()->where('kind', $kind)->count(),
                "expected {$count} {$kind}",
            );
        }

        foreach ($lead->documents as $document) {
            Storage::disk('documents-test')->assertExists($document->path);
        }

        // The trail opens on submission, like the other forms.
        $this->assertSame(1, $lead->activities()->count());
    }

    #[Test]
    public function the_back_office_reads_the_partner_answers(): void
    {
        $this->post(self::ENDPOINT, $this->submission(), ['Accept' => 'application/json'])
            ->assertCreated();

        // resolve(), not toArray(): the conditional blocks only merge in there.
        $resource = (new LeadResource(Lead::firstOrFail()))->resolve(request());

        $this->assertSame('Partenaire', $resource['serviceLabel']);
        $this->assertSame('/devenir-partenaire', $resource['source']);
        $this->assertSame(false, $resource['details']['independant']);
        $this->assertSame('compta@durand-conseil.fr', $resource['details']['emailFacturation']);
    }

    /*
     * The attestation is optional like every other paper, so an employee who
     * has not got hold of theirs yet is still a partner worth recording.
     */
    #[Test]
    public function an_employee_may_apply_before_their_attestation_arrives(): void
    {
        $payload = $this->submission(['independant' => '0']);
        unset($payload['attestationEmployeur']);

        $this->post(self::ENDPOINT, $payload, ['Accept' => 'application/json'])
            ->assertCreated();

        $this->assertSame(1, Lead::count());
    }

    #[Test]
    public function an_independent_needs_no_attestation_and_one_sent_is_not_kept(): void
    {
        $withoutIt = $this->submission(['independant' => '1']);
        unset($withoutIt['attestationEmployeur']);

        $this->post(self::ENDPOINT, $withoutIt, ['Accept' => 'application/json'])
            ->assertCreated();

        // Picked before switching the answer to independent: not stored.
        $this->post(self::ENDPOINT, $this->submission([
            'independant' => '1',
            'emailContrat' => 'autre@durand-conseil.fr',
        ]), ['Accept' => 'application/json'])->assertCreated();

        $this->assertSame(2, Lead::count());
        $this->assertSame(
            0,
            Lead::query()
                ->get()
                ->sum(fn (Lead $lead) => $lead->documents()
                    ->where('kind', DocumentKind::AttestationEmployeur)
                    ->count()),
        );
        $this->assertTrue(Lead::firstOrFail()->details['independant']);
    }

    #[Test]
    public function the_contact_details_are_required_but_the_papers_are_not(): void
    {
        $this->postJson(self::ENDPOINT, [])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'entreprise', 'nom', 'prenom', 'telephone', 'independant',
                'emailContrat', 'emailFacturation',
            ])
            ->assertJsonMissingValidationErrors([
                'kbis', 'pieceIdentite', 'attestationHebergement', 'rib',
            ]);

        $this->assertSame(0, Lead::count());
    }

    /*
     * A cabinet that applies without its papers is a partner to chase the
     * documents from, not a form to refuse. The lead is created and simply
     * carries none — the back office can attach what is missing later.
     */
    #[Test]
    public function it_accepts_a_partner_who_sends_no_papers_at_all(): void
    {
        $bare = array_diff_key($this->submission(), array_flip([
            'kbis', 'pieceIdentite', 'attestationEmployeur',
            'attestationHebergement', 'rib',
        ]));

        $this->post(self::ENDPOINT, $bare, ['Accept' => 'application/json'])
            ->assertCreated();

        $this->assertSame(0, Lead::firstOrFail()->documents()->count());
    }

    #[Test]
    public function the_identity_card_takes_one_or_two_files_not_three(): void
    {
        $this->post(self::ENDPOINT, $this->submission([
            'pieceIdentite' => [self::pdf('cni.pdf')],
        ]), ['Accept' => 'application/json'])->assertCreated();

        $this->post(self::ENDPOINT, $this->submission([
            'emailContrat' => 'trois@durand-conseil.fr',
            'pieceIdentite' => [
                self::pdf('1.pdf'),
                self::pdf('2.pdf'),
                self::pdf('3.pdf'),
            ],
        ]), ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('pieceIdentite');

        $this->assertSame(1, Lead::count());
    }

    #[Test]
    public function only_pdf_jpg_and_png_are_accepted(): void
    {
        $this->post(self::ENDPOINT, $this->submission([
            'rib' => UploadedFile::fake()->create('rib.docx', 12, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ]), ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('rib');

        $this->assertSame(0, Lead::count());
        // Nothing was written for a submission that was refused.
        $this->assertSame([], Storage::disk('documents-test')->allFiles());
    }

    #[Test]
    public function both_addresses_must_be_real_email_addresses(): void
    {
        $this->post(self::ENDPOINT, $this->submission([
            'emailContrat' => 'sophie at durand',
            'emailFacturation' => 'compta',
        ]), ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['emailContrat', 'emailFacturation']);
    }

    #[Test]
    public function the_team_is_emailed_about_a_new_partner(): void
    {
        Mail::fake();
        config()->set('leads.notifications.to', ['equipe@sansekaisolution.com']);
        $this->withoutDefer();

        $this->post(self::ENDPOINT, $this->submission(), ['Accept' => 'application/json'])
            ->assertCreated();

        $lead = Lead::firstOrFail();

        Mail::assertSent(NewLeadReceived::class, fn (NewLeadReceived $mail) => $mail->lead->is($lead)
            && $mail->hasReplyTo('sophie@durand-conseil.fr')
            && $mail->hasSubject("Nouveau lead · Partenaire · Cabinet Durand Conseil ({$lead->reference})"));

        $mail = new NewLeadReceived($lead);
        $mail->assertSeeInText('Statut : Salarié');
        $mail->assertSeeInText('E-mail de facturation : compta@durand-conseil.fr');
        $mail->assertSeeInText('Documents : 6');
        $mail->assertDontSeeInText('Éligible');
    }
}
