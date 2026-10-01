<?php

namespace App\Mail;

use App\Enums\LeadService;
use App\Models\Lead;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Tells the team a website form just landed a lead.
 *
 * Enough to decide whether to call now — who, which company, how much — and a
 * button to the lead for everything else. The documents stay in the back
 * office: a Kbis or a bank statement has no business sitting in a mailbox.
 *
 * Reply-To is the lead, so answering the email answers them.
 */
class NewLeadReceived extends Mailable
{
    public function __construct(public Lead $lead) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: sprintf(
                'Nouveau lead · %s · %s (%s)',
                $this->lead->service->label(),
                $this->lead->entreprise,
                $this->lead->reference,
            ),
            replyTo: [new Address($this->lead->email, $this->contactName())],
        );
    }

    public function content(): Content
    {
        $data = [
            'rows' => $this->rows(),
            // The board with this lead's panel open over it, as a click on its
            // card would leave it — not the lead's standalone page.
            'url' => config('leads.notifications.back_office_url').'/leads?lead='.$this->lead->id,
            'receivedAt' => $this->lead->created_at
                ?->timezone('Europe/Paris')
                ->format('d/m/Y à H:i'),
        ];

        // Written as plain HTML rather than Markdown: every value below was
        // typed by a stranger, and Markdown would turn their `[text](link)`
        // into a working link in the team's inbox.
        return new Content(
            view: 'mail.new-lead',
            text: 'mail.new-lead-text',
            with: $data,
        );
    }

    /**
     * Label → value, in reading order, blanks left out.
     *
     * @return array<string, string>
     */
    private function rows(): array
    {
        $lead = $this->lead;
        $details = $lead->details ?? [];
        $dossier = in_array($lead->service, [LeadService::Financement, LeadService::Contact], true);
        $partner = $lead->service === LeadService::Partenaire;

        $rows = [
            'Prestation' => $lead->prestation?->label(),
            'Contact' => $this->contactName(),
            'Fonction' => $details['fonction'] ?? null,
            'Statut' => $partner
                ? (($details['independant'] ?? false) ? 'Indépendant' : 'Salarié')
                : null,
            'E-mail' => $lead->email,
            'E-mail de facturation' => $partner ? ($details['emailFacturation'] ?? null) : null,
            'Téléphone' => $lead->telephone,
            'Entreprise' => $lead->entreprise,
            'Secteur' => $details['secteur'] ?? null,
            'Ville' => trim(($lead->code_postal ?? '').' '.($lead->ville ?? '')),
            "Chiffre d'affaires" => self::euros($lead->chiffre_affaire_cents),
            'Montant demandé' => self::euros($lead->montant_cents),
            'Besoins' => implode(', ', $details['besoins'] ?? []),
            'Délai' => $details['delai'] ?? null,
            'Éligible' => $dossier
                ? ($lead->eligible_age && $lead->eligible_revenue ? 'Oui' : 'Non')
                : null,
            // A partner's whole submission is its papers, so the count is
            // worth a line; eligibility means nothing for a partner.
            'Documents' => $dossier || $partner ? (string) $lead->documents()->count() : null,
            'Code commercial' => $lead->code_commercial,
            'Message' => $lead->message,
        ];

        return array_filter($rows, fn (?string $value) => filled($value));
    }

    private function contactName(): string
    {
        return trim("{$this->lead->prenom} {$this->lead->nom}");
    }

    private static function euros(?int $cents): ?string
    {
        return $cents === null
            ? null
            : number_format($cents / 100, 0, ',', "\u{202F}").' €';
    }
}
