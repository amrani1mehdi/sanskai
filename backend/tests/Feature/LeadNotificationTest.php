<?php

namespace Tests\Feature;

use App\Mail\NewLeadReceived;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

/** The email the team gets when a website form lands a lead. */
class LeadNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The email goes out after the response; run it inline so the test
        // sees it.
        $this->withoutDefer();
    }

    /** @return array<string, mixed> */
    private function developmentPayload(): array
    {
        return [
            'service' => 'site_web',
            'nom' => 'Marchand',
            'prenom' => 'Julien',
            'email' => 'j.marchand@example.fr',
            'telephone' => '0642187703',
            'entreprise' => 'Atelier Marchand SARL',
            'message' => "Un site vitrine [cliquez ici](https://example.com)\nsur deux lignes.",
        ];
    }

    #[Test]
    public function the_team_is_emailed_when_a_lead_lands(): void
    {
        Mail::fake();
        config()->set('leads.notifications.to', ['equipe@sansekaisolution.com', 'direction@sansekaisolution.com']);

        $this->postJson('/api/v1/website/leads/developpement', $this->developmentPayload())
            ->assertCreated();

        $lead = Lead::sole();

        Mail::assertSent(NewLeadReceived::class, function (NewLeadReceived $mail) use ($lead) {
            return $mail->lead->is($lead)
                && $mail->hasTo('equipe@sansekaisolution.com')
                && $mail->hasTo('direction@sansekaisolution.com')
                && $mail->hasReplyTo('j.marchand@example.fr')
                && $mail->hasSubject("Nouveau lead · Développement Digital · Atelier Marchand SARL ({$lead->reference})");
        });
    }

    #[Test]
    public function the_email_carries_the_lead_and_a_link_to_it(): void
    {
        config()->set('leads.notifications.back_office_url', 'https://sansekaisolution.com/admin');

        $this->postJson('/api/v1/website/leads/developpement', $this->developmentPayload())
            ->assertCreated();

        $lead = Lead::sole();
        $mail = new NewLeadReceived($lead);

        $mail->assertSeeInHtml('Atelier Marchand SARL');
        // The board with the lead's panel open, not the lead's own page.
        $mail->assertSeeInHtml("https://sansekaisolution.com/admin/leads?lead={$lead->id}");
        // A visitor's Markdown stays text: no link of theirs in the team's inbox.
        $mail->assertDontSeeInHtml('href="https://example.com"', false);
        $mail->assertSeeInText('Atelier Marchand SARL');
    }

    #[Test]
    public function nobody_is_emailed_until_an_address_is_set(): void
    {
        Mail::fake();
        config()->set('leads.notifications.to', []);

        $this->postJson('/api/v1/website/leads/developpement', $this->developmentPayload())
            ->assertCreated();

        Mail::assertNothingSent();
    }

    #[Test]
    public function a_mail_server_that_fails_does_not_fail_the_submission(): void
    {
        config()->set('leads.notifications.to', ['equipe@sansekaisolution.com']);
        Mail::shouldReceive('to')->andThrow(new RuntimeException('Connection refused'));
        Log::spy();

        $this->postJson('/api/v1/website/leads/developpement', $this->developmentPayload())
            ->assertCreated();

        $this->assertSame(1, Lead::count());
        Log::shouldHaveReceived('error')
            ->withArgs(fn (string $message) => $message === 'Notification de lead non envoyée')
            ->once();
    }
}
