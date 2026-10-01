<?php

namespace App\Enums;

/**
 * The ways an enquiry reaches the CRM.
 *
 * Fixed domain values owned by the code, not rows in a table: adding one is a
 * deploy either way, and a lookup table would only add a join.
 */
enum LeadService: string
{
    case Financement = 'financement';
    case Developpement = 'developpement';
    case Contact = 'contact';
    /* The client sheet handed out at trade shows, filled in on the page a
       stand's QR code opens. */
    case Salon = 'salon';
    /* A cabinet starting a collaboration, sending the documents the
       partnership needs from the /devenir-partenaire page. */
    case Partenaire = 'partenaire';

    public function label(): string
    {
        return match ($this) {
            self::Financement => 'Demande de financement',
            self::Developpement => 'Développement Digital',
            self::Contact => 'Message de contact',
            self::Salon => 'Fiche salon',
            self::Partenaire => 'Partenaire',
        };
    }

    /** The page the lead was submitted from. */
    public function source(): string
    {
        return match ($this) {
            self::Financement => '/financement',
            // Moved from /developpement-entreprise with the offer's rename;
            // the old address redirects here.
            self::Developpement => '/developpement-digital',
            self::Contact => '/contact',
            self::Salon => '/fiche-client',
            self::Partenaire => '/devenir-partenaire',
        };
    }

    /** Prefix for the human-readable reference, e.g. CON-2026-0001. */
    public function referencePrefix(): string
    {
        return match ($this) {
            self::Financement => 'FIN',
            self::Developpement => 'DEV',
            self::Contact => 'CON',
            self::Salon => 'SAL',
            self::Partenaire => 'PAR',
        };
    }
}
