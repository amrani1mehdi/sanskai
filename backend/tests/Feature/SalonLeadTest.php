<?php

namespace Tests\Feature;

use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/** The trade-show client sheet, as the /fiche-client page submits it. */
class SalonLeadTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = '/api/v1/website/leads/salon';

    /** @return array<string, mixed> */
    private function sheet(array $overrides = []): array
    {
        return array_merge([
            'entreprise' => 'Boulangerie Martin',
            'secteur' => 'Boulangerie',
            'siteWebUrl' => 'boulangerie-martin.fr',
            'ville' => 'Lyon',
            'emailEntreprise' => 'contact@boulangerie-martin.fr',
            'anciennete' => '3_5_ans',
            'salaries' => '8',
            'nomDirigeant' => 'Claire Martin',
            'fonction' => 'Gérante',
            'mobile' => '06 42 18 77 03',
            'fixe' => '04 78 00 00 00',
            'email' => 'claire@boulangerie-martin.fr',
            'besoins' => ['financement', 'site_web'],
            'montant' => '45000',
            'motifs' => ['materiel', 'stock'],
            'delai' => '1_3_mois',
        ], $overrides);
    }

    #[Test]
    public function it_stores_a_salon_sheet(): void
    {
        $this->postJson(self::ENDPOINT, $this->sheet())
            ->assertCreated()
            ->assertJsonPath('data.reference', 'SAL-'.now()->year.'-0001')
            ->assertJsonPath('data.status', 'nouveau');

        $lead = Lead::firstOrFail();

        $this->assertSame('salon', $lead->service->value);
        // One "Nom du dirigeant" on the sheet, two columns in the CRM.
        $this->assertSame('Claire', $lead->prenom);
        $this->assertSame('Martin', $lead->nom);
        $this->assertSame('claire@boulangerie-martin.fr', $lead->email);
        $this->assertSame('06 42 18 77 03', $lead->telephone);
        $this->assertSame('Lyon', $lead->ville);
        $this->assertSame('boulangerie-martin.fr', $lead->site_web_url);
        $this->assertSame('45000', $lead->montant);
        $this->assertSame(4500000, $lead->montant_cents);

        $this->assertSame('Boulangerie', $lead->details['secteur']);
        $this->assertSame('contact@boulangerie-martin.fr', $lead->details['emailEntreprise']);
        $this->assertSame('3_5_ans', $lead->details['anciennete']);
        $this->assertSame('8', $lead->details['salaries']);
        $this->assertSame('Gérante', $lead->details['fonction']);
        $this->assertSame('04 78 00 00 00', $lead->details['telephoneFixe']);
        $this->assertSame(['financement', 'site_web'], $lead->details['besoins']);
        $this->assertSame(['materiel', 'stock'], $lead->details['motifs']);
        $this->assertSame('1_3_mois', $lead->details['delai']);

        $this->assertSame(1, $lead->activities()->count());
    }

    #[Test]
    public function financing_answers_are_dropped_when_financing_is_not_a_need(): void
    {
        // Filled in, then financing unticked: the answers describe a request
        // nobody is making any more.
        $this->postJson(self::ENDPOINT, $this->sheet(['besoins' => ['migration']]))
            ->assertCreated();

        $lead = Lead::firstOrFail();

        $this->assertNull($lead->montant);
        $this->assertNull($lead->montant_cents);
        $this->assertSame([], $lead->details['motifs']);
        $this->assertNull($lead->details['delai']);
    }

    #[Test]
    public function the_essentials_are_required(): void
    {
        $this->postJson(self::ENDPOINT, [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['entreprise', 'nomDirigeant', 'email', 'mobile', 'besoins']);

        $this->assertSame(0, Lead::count());
    }

    #[Test]
    public function a_sheet_with_only_the_essentials_is_accepted(): void
    {
        $this->postJson(self::ENDPOINT, [
            'entreprise' => 'Atelier Durand',
            'nomDirigeant' => 'Paul Durand',
            'email' => 'paul@atelier-durand.fr',
            'mobile' => '0612345678',
            'besoins' => ['developpement_commercial'],
        ])->assertCreated();

        $lead = Lead::firstOrFail();

        $this->assertNull($lead->details['secteur']);
        $this->assertNull($lead->site_web);
    }

    #[Test]
    public function a_ticked_autre_needs_its_detail(): void
    {
        $this->postJson(self::ENDPOINT, $this->sheet(['besoins' => ['autre']]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('besoinAutre');
    }

    #[Test]
    public function unknown_choices_are_rejected(): void
    {
        $this->postJson(self::ENDPOINT, $this->sheet([
            'besoins' => ['cryptomonnaie'],
            'anciennete' => 'depuis_toujours',
            'delai' => 'hier',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['besoins.0', 'anciennete', 'delai']);
    }

    #[Test]
    public function salon_references_are_numbered_separately_from_the_others(): void
    {
        $this->postJson('/api/v1/website/leads/developpement', [
            'service' => 'site_web',
            'nom' => 'Durand', 'prenom' => 'Paul',
            'email' => 'paul@atelier-durand.fr', 'telephone' => '0612345678',
            'entreprise' => 'Atelier Durand',
        ])->assertCreated();

        $this->postJson(self::ENDPOINT, $this->sheet())
            ->assertJsonPath('data.reference', 'SAL-'.now()->year.'-0001');
    }
}
